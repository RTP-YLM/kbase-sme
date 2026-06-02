"""
RAG Pipeline — E3-4
Full pipeline: query → semantic cache → hybrid search → rerank → grounded prompt → log
"""
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional

from monitoring import QueryLog, estimate_cost_usd, log_query
from reranker import NO_ANSWER_THRESHOLD, RERANK_TOP_N, BGEReranker
from supabase_vector_store import ChunkResult, SupabaseVectorStore

logger = logging.getLogger(__name__)

NO_ANSWER_MSG = (
    "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารที่มีอยู่ "
    "กรุณาติดต่อ HR หรือผู้รับผิดชอบโดยตรง"
)

_GROUNDED_PROMPT = """\
คุณคือผู้ช่วย AI ของบริษัท ตอบคำถามจากเอกสารที่ให้มาเท่านั้น

เอกสารอ้างอิง:
{context}

คำถาม: {question}

คำแนะนำ:
- ตอบเป็นภาษาไทย กระชับ ชัดเจน
- ระบุชื่อหัวข้อ/เอกสารที่อ้างอิงท้ายคำตอบ เช่น (อ้างอิง: นโยบาย HR หน้า 3)
- ถ้าเอกสารไม่มีข้อมูลเพียงพอ ให้ตอบว่า "ไม่พบข้อมูลในเอกสารที่มี"
- ห้ามเดาหรือตอบจากความรู้ทั่วไปที่ไม่อยู่ในเอกสาร
"""


@dataclass
class RAGResult:
    answer: str
    sources: list[dict] = field(default_factory=list)
    from_cache: bool = False
    answered: bool = True
    rerank_top_score: float = 0.0
    latency_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    llm_model: str = ""


class RAGPipeline:
    """
    Full RAG pipeline ตาม critical path:
    cache → embed query → hybrid search → rerank → threshold → LLM → log
    """

    def __init__(
        self,
        store: Optional[SupabaseVectorStore] = None,
        reranker: Optional[BGEReranker] = None,
        cache=None,               # SemanticCache (optional)
        embedder=None,            # BGEEmbedder
    ):
        self._store = store or SupabaseVectorStore()
        self._reranker = reranker or BGEReranker()
        self._cache = cache       # None = ปิด cache
        self._embedder = embedder # lazy init ถ้า None

    def _get_embedder(self):
        if self._embedder is None:
            from embedder import BGEEmbedder
            self._embedder = BGEEmbedder()
        return self._embedder

    def _get_llm(self):
        from llm_provider import get_llm_provider
        from config import get_config
        cfg = get_config()
        return get_llm_provider(cfg.get("llm.provider", "openai"), cfg.llm)

    def query(
        self,
        question: str,
        tenant_id: str,
        user_id: Optional[str] = None,
        line_user_id: Optional[str] = None,
        department: Optional[str] = None,
        access_level: int = 2,
        top_k: int = 20,
    ) -> RAGResult:
        t0 = time.perf_counter()

        embedder = self._get_embedder()
        query_embedding = embedder.embed_query(question)

        # 1. Semantic cache check
        if self._cache:
            cached = self._cache.get(tenant_id, question, query_embedding)
            if cached:
                latency_ms = int((time.perf_counter() - t0) * 1000)
                result = RAGResult(
                    answer=cached.answer,
                    sources=cached.sources,
                    from_cache=True,
                    answered=True,
                    latency_ms=latency_ms,
                )
                self._log(question, result, tenant_id, user_id, line_user_id)
                return result

        # 2. Hybrid search
        chunks = self._store.search_hybrid(
            query_embedding=query_embedding,
            query_text=question,
            tenant_id=tenant_id,
            department=department,
            access_level=access_level,
            top_k=top_k,
        )

        # 3. Rerank
        reranked = self._reranker.rerank(question, chunks, top_n=RERANK_TOP_N)
        top_score = self._reranker.top_score(reranked)

        # 4. No-answer threshold
        if top_score < NO_ANSWER_THRESHOLD or not reranked:
            latency_ms = int((time.perf_counter() - t0) * 1000)
            result = RAGResult(
                answer=NO_ANSWER_MSG,
                answered=False,
                rerank_top_score=top_score,
                latency_ms=latency_ms,
            )
            self._log(question, result, tenant_id, user_id, line_user_id)
            return result

        # 5. Build context + grounded prompt
        context = self._build_context(reranked)
        prompt = _GROUNDED_PROMPT.format(context=context, question=question)

        # 6. LLM generate
        llm = self._get_llm()
        answer = llm.generate(prompt)

        # token count (ประมาณ ถ้า provider ไม่ return)
        input_tokens = len(prompt) // 4
        output_tokens = len(answer) // 4

        # 7. Build sources list (สำหรับ citation + log)
        sources = [
            {
                "source_id": c.source_id,
                "section": c.section_title,
                "page": c.page_number,
                "score": round(c.score, 4),
            }
            for c in reranked
        ]

        latency_ms = int((time.perf_counter() - t0) * 1000)
        result = RAGResult(
            answer=answer,
            sources=sources,
            answered=True,
            rerank_top_score=top_score,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            llm_model=llm.model,
        )

        # 8. Cache set
        if self._cache:
            self._cache.set(tenant_id, question, answer, sources, query_embedding)

        self._log(question, result, tenant_id, user_id, line_user_id)
        return result

    @staticmethod
    def _build_context(chunks: list[ChunkResult]) -> str:
        parts = []
        for i, chunk in enumerate(chunks, 1):
            header = f"[{i}]"
            if chunk.section_title:
                header += f" {chunk.section_title}"
            if chunk.page_number:
                header += f" (หน้า {chunk.page_number})"
            parts.append(f"{header}\n{chunk.content}")
        return "\n\n---\n\n".join(parts)

    @staticmethod
    def _log(question: str, result: RAGResult, tenant_id: str, user_id, line_user_id):
        log = QueryLog(
            question=question,
            tenant_id=tenant_id,
            user_id=user_id,
            line_user_id=line_user_id,
            answered=result.answered,
            answer=result.answer if result.answered else None,
            sources=result.sources,
            from_cache=result.from_cache,
            rerank_top_score=result.rerank_top_score or None,
            latency_ms=result.latency_ms,
            llm_model=result.llm_model or None,
            input_tokens=result.input_tokens or None,
            output_tokens=result.output_tokens or None,
        )
        log_query(log)
