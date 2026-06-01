"""
E4-3: POST/GET/DELETE /documents, GET /jobs/{id}
"""
import os
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from auth import TokenPayload, get_current_user, require_admin

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/kbase_uploads")


class DocumentInfo(BaseModel):
    id: str
    filename: str
    title: str
    department: str
    status: str
    chunk_count: int
    created_at: str


class JobStatus(BaseModel):
    job_id: str
    status: str   # 'queued' | 'processing' | 'done' | 'failed'
    source_id: Optional[str] = None
    chunks: Optional[int] = None
    error: Optional[str] = None


@router.get("", response_model=list[DocumentInfo])
async def list_documents(
    user: Annotated[TokenPayload, Depends(get_current_user)],
    department: Optional[str] = None,
):
    from supabase_vector_store import SupabaseVectorStore

    store = SupabaseVectorStore()
    store._ensure_client()
    q = (
        store._client.table("knowledge_sources")
        .select("id, filename, title, department, status, created_at")
        .eq("tenant_id", user.tenant_id)
        .eq("status", "active")
    )
    if department:
        q = q.eq("department", department)

    result = q.order("created_at", desc=True).execute()

    docs = []
    for row in result.data or []:
        count_result = (
            store._client.table("knowledge_chunks")
            .select("id", count="exact")
            .eq("source_id", row["id"])
            .execute()
        )
        docs.append(DocumentInfo(
            id=row["id"],
            filename=row["filename"],
            title=row["title"],
            department=row["department"],
            status=row["status"],
            chunk_count=count_result.count or 0,
            created_at=row["created_at"],
        ))
    return docs


@router.post("", response_model=JobStatus, status_code=202)
async def upload_document(
    user: Annotated[TokenPayload, Depends(require_admin)],
    file: UploadFile = File(...),
    department: str = Form(default="general"),
    access_level: int = Form(default=2),
):
    """Upload ไฟล์ → queue async ingest job"""
    allowed = {".pdf", ".txt", ".md", ".docx", ".xlsx"}
    suffix = os.path.splitext(file.filename or "")[1].lower()
    if suffix not in allowed:
        raise HTTPException(status_code=422, detail=f"ไม่รองรับ format: {suffix}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}{suffix}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # checksum + upsert source (synchronous — เร็ว)
    from document_loader import DocumentLoader
    from supabase_vector_store import SupabaseVectorStore

    loader = DocumentLoader()
    source_info, _ = loader.load_file(file_path)
    store = SupabaseVectorStore()
    source_id = store.upsert_source(
        filename=source_info.filename,
        title=source_info.title,
        checksum=source_info.checksum,
        file_size_bytes=source_info.file_size_bytes,
        doc_type=source_info.doc_type,
        department=department,
        access_level=access_level,
        page_count=source_info.page_count,
        tenant_id=user.tenant_id,
    )

    # Enqueue async embed+ingest
    from worker import ingest_file
    ingest_file.apply_async(
        kwargs={
            "source_id": source_id,
            "file_path": file_path,
            "tenant_id": user.tenant_id,
            "department": department,
        },
        task_id=job_id,
    )

    return JobStatus(job_id=job_id, status="queued", source_id=source_id)


@router.delete("/{source_id}")
async def delete_document(
    source_id: str,
    user: Annotated[TokenPayload, Depends(require_admin)],
):
    from supabase_vector_store import SupabaseVectorStore

    store = SupabaseVectorStore()
    store._ensure_client()
    store._client.table("knowledge_sources").update({"status": "deleted"}).eq(
        "id", source_id
    ).eq("tenant_id", user.tenant_id).execute()
    store._client.table("knowledge_chunks").delete().eq("source_id", source_id).execute()
    return {"status": "deleted"}


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(
    job_id: str,
    user: Annotated[TokenPayload, Depends(require_admin)],
):
    from celery.result import AsyncResult
    from worker import app as celery_app

    result = AsyncResult(job_id, app=celery_app)
    status_map = {
        "PENDING": "queued",
        "STARTED": "processing",
        "SUCCESS": "done",
        "FAILURE": "failed",
        "RETRY": "processing",
    }
    job_status = status_map.get(result.state, "queued")
    info = result.info or {}

    return JobStatus(
        job_id=job_id,
        status=job_status,
        chunks=info.get("chunks") if isinstance(info, dict) else None,
        error=str(info) if result.state == "FAILURE" else None,
    )


@router.post("/{source_id}/reindex", response_model=JobStatus, status_code=202)
async def reindex_document(
    source_id: str,
    user: Annotated[TokenPayload, Depends(require_admin)],
):
    """Re-embed เอกสารที่มีอยู่แล้ว (หลัง upgrade embedding model)"""
    from supabase_vector_store import SupabaseVectorStore
    from worker import reindex_source

    store = SupabaseVectorStore()
    store._ensure_client()
    row = (
        store._client.table("knowledge_sources")
        .select("filename, department")
        .eq("id", source_id)
        .eq("tenant_id", user.tenant_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")

    job_id = str(uuid.uuid4())
    # ไฟล์อาจถูกลบจาก /tmp แล้ว — ต้องให้ client upload ใหม่ถ้าไม่มี
    file_path = os.path.join(UPLOAD_DIR, row.data["filename"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=409, detail="ไฟล์ต้นฉบับไม่อยู่ใน server — กรุณา upload ใหม่")

    reindex_source.apply_async(
        kwargs={
            "source_id": source_id,
            "file_path": file_path,
            "tenant_id": user.tenant_id,
            "department": row.data["department"],
        },
        task_id=job_id,
    )
    return JobStatus(job_id=job_id, status="queued", source_id=source_id)
