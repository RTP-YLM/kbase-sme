from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness():
    """ตรวจ Supabase + Redis connectivity"""
    errors = []

    try:
        from supabase_vector_store import SupabaseVectorStore
        store = SupabaseVectorStore()
        store._ensure_client()
    except Exception as e:
        errors.append(f"supabase: {e}")

    try:
        import redis, os
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        r.ping()
    except Exception as e:
        errors.append(f"redis: {e}")

    if errors:
        return JSONResponse(status_code=503, content={"status": "not ready", "errors": errors})
    return {"status": "ready"}
