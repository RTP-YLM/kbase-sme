"""
E4-4: GET /logs (admin) + GET /health → health.py
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import TokenPayload, require_admin

router = APIRouter(prefix="/logs", tags=["logs"])


class QueryLogRow(BaseModel):
    id: int
    question: str
    answered: bool
    from_cache: bool
    latency_ms: Optional[int]
    rerank_top_score: Optional[float]
    llm_model: Optional[str]
    feedback: Optional[str]
    created_at: str


@router.get("", response_model=list[QueryLogRow])
async def get_logs(
    user: Annotated[TokenPayload, Depends(require_admin)],
    answered_only: bool = False,
    unanswered_only: bool = False,
    limit: int = 50,
):
    from supabase_vector_store import SupabaseVectorStore

    store = SupabaseVectorStore()
    store._ensure_client()

    q = (
        store._client.table("rag_query_logs")
        .select("id, question, answered, from_cache, latency_ms, rerank_top_score, llm_model, feedback, created_at")
        .eq("tenant_id", user.tenant_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if answered_only:
        q = q.eq("answered", True)
    if unanswered_only:
        q = q.eq("answered", False)

    result = q.execute()
    return [QueryLogRow(**row) for row in (result.data or [])]
