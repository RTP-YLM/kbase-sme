"""
Celery Worker — Async Ingest Pipeline (E2-5)
Queue: Redis  |  Tasks: ingest_file, reindex_source
"""
import logging
import os

from celery import Celery

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery("kbase", broker=REDIS_URL, backend=REDIS_URL)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,          # re-queue ถ้า worker crash กลางทาง
    worker_prefetch_multiplier=1, # ไม่ดึง task ล่วงหน้า (งาน heavy)
    result_expires=3600,
)


@app.task(bind=True, name="kbase.ingest_file", max_retries=3)
def ingest_file(self, source_id: str, file_path: str, tenant_id: str, department: str = "general"):
    """
    Ingest ไฟล์เดียว: chunk → embed → upsert
    เรียกจาก POST /api/documents หลัง upload

    Args:
        source_id: UUID จาก knowledge_sources (สร้างก่อน enqueue)
        file_path: absolute path ของไฟล์ใน container
        tenant_id: UUID ของ tenant
        department: แผนก (กรอง RLS)
    """
    try:
        from document_loader import DocumentLoader
        from embedder import BGEEmbedder
        from supabase_vector_store import SupabaseVectorStore

        logger.info(f"[ingest_file] start source_id={source_id[:8]} file={file_path}")

        loader = DocumentLoader()
        _, chunks = loader.load_file(file_path)

        if not chunks:
            logger.warning(f"[ingest_file] ไม่มี chunk — {file_path}")
            return {"status": "empty", "chunks": 0}

        embedder = BGEEmbedder()
        texts = [c.content for c in chunks]
        embeddings = embedder.embed_batch(texts)

        store = SupabaseVectorStore()
        store.upsert_chunks(
            source_id=source_id,
            chunks=chunks,
            embeddings=embeddings,
            department=department,
            tenant_id=tenant_id,
        )

        logger.info(f"[ingest_file] done — {len(chunks)} chunks upserted")
        return {"status": "done", "chunks": len(chunks)}

    except Exception as exc:
        logger.error(f"[ingest_file] error: {exc}")
        raise self.retry(exc=exc, countdown=60)


@app.task(bind=True, name="kbase.reindex_source", max_retries=2)
def reindex_source(self, source_id: str, file_path: str, tenant_id: str, department: str = "general"):
    """Re-embed ไฟล์ที่มีอยู่แล้ว (เช่น หลัง upgrade embedding model)"""
    return ingest_file(source_id, file_path, tenant_id, department)
