"""
Supabase Vector Store — V1 Schema (E3-1)
ใช้ V1 schema: knowledge_sources + knowledge_chunks (1024-dim BGE-M3)
"""
import logging
import os
import uuid
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"
INGEST_BATCH_SIZE = 50  # upsert ทีละ 50 chunks


@dataclass
class ChunkResult:
    """ผลลัพธ์จาก vector search"""
    chunk_id: int
    source_id: str
    content: str
    section_title: Optional[str]
    page_number: Optional[int]
    metadata: dict
    score: float          # similarity (vector) หรือ fts_rank (FTS)
    department: Optional[str]
    access_level: int


class SupabaseVectorStore:
    """
    V1 Vector Store — knowledge_sources + knowledge_chunks
    ใช้ service_role key เท่านั้น (RLS bypass)
    """

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
    ):
        self._url = supabase_url or os.getenv("SUPABASE_URL", "")
        self._key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self._client = None

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    def _ensure_client(self):
        if self._client is not None:
            return
        if not self._url or not self._key:
            raise ValueError(
                "ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env"
            )
        from supabase import create_client
        self._client = create_client(self._url, self._key)
        logger.info(f"Supabase client พร้อมใช้งาน: {self._url}")

    # ------------------------------------------------------------------
    # Upsert — Ingestion path
    # ------------------------------------------------------------------

    def upsert_source(
        self,
        filename: str,
        title: str,
        checksum: str,
        file_size_bytes: int,
        doc_type: str = "file",
        department: str = "general",
        access_level: int = 2,
        page_count: Optional[int] = None,
        tenant_id: str = DEFAULT_TENANT_ID,
        metadata: Optional[dict] = None,
    ) -> str:
        """
        Upsert knowledge_sources row (checksum dedup)
        คืน source_id (uuid string)
        """
        self._ensure_client()

        # checksum dedup — ถ้ามีอยู่แล้วคืน id เดิม
        existing = (
            self._client.table("knowledge_sources")
            .select("id, status")
            .eq("tenant_id", tenant_id)
            .eq("checksum", checksum)
            .limit(1)
            .execute()
        )
        if existing.data:
            source_id = existing.data[0]["id"]
            logger.info(f"checksum ซ้ำ — ข้าม {filename} (source_id={source_id[:8]}...)")
            return source_id

        source_id = str(uuid.uuid4())
        row = {
            "id": source_id,
            "tenant_id": tenant_id,
            "title": title,
            "filename": filename,
            "checksum": checksum,
            "file_size_bytes": file_size_bytes,
            "doc_type": doc_type,
            "department": department,
            "access_level": access_level,
            "status": "active",
            "metadata": metadata or {},
        }
        if page_count is not None:
            row["page_count"] = page_count

        self._client.table("knowledge_sources").insert(row).execute()
        logger.info(f"upsert_source: {filename} → {source_id[:8]}...")
        return source_id

    def upsert_chunks(
        self,
        source_id: str,
        chunks,                    # list[Chunk] จาก document_loader
        embeddings: list[list[float]],
        department: str = "general",
        access_level: int = 2,
        tenant_id: str = DEFAULT_TENANT_ID,
    ):
        """
        Upsert knowledge_chunks rows พร้อม embedding (1024-dim)
        ลบ chunk เก่าของ source นี้ก่อน แล้ว insert ใหม่ทั้งหมด
        """
        self._ensure_client()

        if len(chunks) != len(embeddings):
            raise ValueError(
                f"chunks ({len(chunks)}) กับ embeddings ({len(embeddings)}) จำนวนไม่ตรงกัน"
            )

        # ลบ chunks เก่า (re-ingest)
        self._client.table("knowledge_chunks").delete().eq("source_id", source_id).execute()

        records = []
        for chunk, embedding in zip(chunks, embeddings):
            records.append({
                "source_id": source_id,
                "tenant_id": tenant_id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "embedding": embedding,
                "section_title": chunk.section_title,
                "page_number": chunk.page_number,
                "token_count": chunk.token_count,
                "department": department,
                "access_level": access_level,
                "metadata": chunk.metadata,
            })

        # batch insert
        for i in range(0, len(records), INGEST_BATCH_SIZE):
            batch = records[i: i + INGEST_BATCH_SIZE]
            self._client.table("knowledge_chunks").insert(batch).execute()
            logger.debug(f"  upsert_chunks {i + len(batch)}/{len(records)}")

        logger.info(
            f"upsert_chunks: source={source_id[:8]}... → {len(records)} chunks"
        )

    # ------------------------------------------------------------------
    # Search — Retrieval path
    # ------------------------------------------------------------------

    def search_vector(
        self,
        query_embedding: list[float],
        tenant_id: str = DEFAULT_TENANT_ID,
        department: Optional[str] = None,
        access_level: int = 2,
        top_k: int = 20,
    ) -> list[ChunkResult]:
        """
        Vector search ผ่าน match_chunks_vector RPC
        คืน list[ChunkResult] เรียงตาม cosine similarity มากไปน้อย
        """
        self._ensure_client()

        result = self._client.rpc(
            "match_chunks_vector",
            {
                "query_embedding": query_embedding,
                "p_tenant_id": tenant_id,
                "p_department": department,
                "p_access_level": access_level,
                "match_count": top_k,
            },
        ).execute()

        return [self._row_to_chunk_result(row, score_key="similarity") for row in (result.data or [])]

    def search_fts(
        self,
        query_text: str,
        tenant_id: str = DEFAULT_TENANT_ID,
        department: Optional[str] = None,
        access_level: int = 2,
        top_k: int = 20,
    ) -> list[ChunkResult]:
        """
        Full-text search ผ่าน match_chunks_fts RPC
        คืน list[ChunkResult] เรียงตาม ts_rank มากไปน้อย
        """
        self._ensure_client()

        result = self._client.rpc(
            "match_chunks_fts",
            {
                "query_text": query_text,
                "p_tenant_id": tenant_id,
                "p_department": department,
                "p_access_level": access_level,
                "match_count": top_k,
            },
        ).execute()

        return [self._row_to_chunk_result(row, score_key="fts_rank") for row in (result.data or [])]

    def search_hybrid(
        self,
        query_embedding: list[float],
        query_text: str,
        tenant_id: str = DEFAULT_TENANT_ID,
        department: Optional[str] = None,
        access_level: int = 2,
        top_k: int = 20,
        vector_weight: float = 0.7,
        rrf_k: int = 60,
    ) -> list[ChunkResult]:
        """
        Hybrid search: RRF(vector, FTS) — E3-2
        Reciprocal Rank Fusion: score_rrf = Σ 1/(k + rank_i)
        คืน top_k chunks เรียงตาม RRF score
        """
        vec_results = self.search_vector(query_embedding, tenant_id, department, access_level, top_k * 2)
        fts_results = self.search_fts(query_text, tenant_id, department, access_level, top_k * 2)

        # RRF fusion
        rrf_scores: dict[int, float] = {}
        chunk_map: dict[int, ChunkResult] = {}

        for rank, chunk in enumerate(vec_results):
            rrf_scores[chunk.chunk_id] = rrf_scores.get(chunk.chunk_id, 0) + vector_weight / (rrf_k + rank + 1)
            chunk_map[chunk.chunk_id] = chunk

        fts_weight = 1.0 - vector_weight
        for rank, chunk in enumerate(fts_results):
            rrf_scores[chunk.chunk_id] = rrf_scores.get(chunk.chunk_id, 0) + fts_weight / (rrf_k + rank + 1)
            chunk_map.setdefault(chunk.chunk_id, chunk)

        ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        results = []
        for chunk_id, score in ranked:
            chunk = chunk_map[chunk_id]
            chunk.score = score
            results.append(chunk)
        return results

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def count_chunks(self, tenant_id: str = DEFAULT_TENANT_ID) -> int:
        self._ensure_client()
        result = (
            self._client.table("knowledge_chunks")
            .select("id", count="exact")
            .eq("tenant_id", tenant_id)
            .execute()
        )
        return result.count or 0

    def count_sources(self, tenant_id: str = DEFAULT_TENANT_ID) -> int:
        self._ensure_client()
        result = (
            self._client.table("knowledge_sources")
            .select("id", count="exact")
            .eq("tenant_id", tenant_id)
            .execute()
        )
        return result.count or 0

    @staticmethod
    def _row_to_chunk_result(row: dict, score_key: str) -> ChunkResult:
        return ChunkResult(
            chunk_id=row["id"],
            source_id=row["source_id"],
            content=row["content"],
            section_title=row.get("section_title"),
            page_number=row.get("page_number"),
            metadata=row.get("metadata") or {},
            score=row.get(score_key, 0.0),
            department=row.get("department"),
            access_level=row.get("access_level", 2),
        )
