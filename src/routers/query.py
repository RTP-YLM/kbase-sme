"""
E4-2: POST /query, POST /feedback
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth import TokenPayload, get_current_user

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    department: Optional[str] = None


class SourceRef(BaseModel):
    source_id: str
    section: Optional[str]
    page: Optional[int]
    score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceRef]
    from_cache: bool
    answered: bool
    latency_ms: int


class FeedbackRequest(BaseModel):
    question: str
    feedback: str = Field(..., pattern="^(correct|wrong|unclear)$")


@router.post("", response_model=QueryResponse)
async def query(
    req: QueryRequest,
    user: Annotated[TokenPayload, Depends(get_current_user)],
):
    from rag_pipeline import get_pipeline

    pipeline = get_pipeline()  # singleton — model โหลดครั้งเดียว ไม่ reload ทุก request
    result = pipeline.query(
        question=req.question,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        department=req.department or (user.departments[0] if user.departments else None),
        access_level=2 if user.role == "user" else 9,
    )

    return QueryResponse(
        answer=result.answer,
        sources=[SourceRef(**s) for s in result.sources],
        from_cache=result.from_cache,
        answered=result.answered,
        latency_ms=result.latency_ms,
    )


@router.post("/feedback")
async def feedback(
    req: FeedbackRequest,
    user: Annotated[TokenPayload, Depends(get_current_user)],
):
    from supabase_vector_store import SupabaseVectorStore

    store = SupabaseVectorStore()
    store._ensure_client()
    store._client.table("rag_query_logs").update(
        {"feedback": req.feedback}
    ).eq("tenant_id", user.tenant_id).eq("question", req.question).order(
        "created_at", desc=True
    ).limit(1).execute()

    return {"status": "ok"}
