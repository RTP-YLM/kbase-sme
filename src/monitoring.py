"""
Monitoring & Structured Logging — E9-3
- request latency middleware (FastAPI)
- LLM cost/token tracking
- query log upsert → rag_query_logs
"""
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"

try:
    from supabase_vector_store import SupabaseVectorStore as _SupabaseVectorStore
except ImportError:
    _SupabaseVectorStore = None  # type: ignore

# LLM cost ต่อ 1M tokens (USD) — อัปเดตตาม provider pricing
_COST_PER_1M = {
    "qwen3.5-flash":         0.15,   # input
    "gpt-4.1-nano":          0.10,
    "claude-haiku-4-5":      0.25,
    "gemini-3.1-flash-lite": 0.075,
}


# ---------------------------------------------------------------------------
# Query Log dataclass
# ---------------------------------------------------------------------------

@dataclass
class QueryLog:
    question: str
    tenant_id: str = DEFAULT_TENANT_ID
    user_id: Optional[str] = None
    line_user_id: Optional[str] = None
    answered: bool = False
    answer: Optional[str] = None
    sources: list = field(default_factory=list)   # [{source_id, title, section, score}]
    from_cache: bool = False
    rerank_top_score: Optional[float] = None
    latency_ms: Optional[int] = None
    llm_model: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    feedback: Optional[str] = None


def log_query(log: QueryLog):
    """
    บันทึก QueryLog → rag_query_logs ใน Supabase
    fire-and-forget — ไม่ throw ถ้า Supabase ล่ม
    """
    try:
        store = _SupabaseVectorStore()
        store._ensure_client()

        row = {
            "tenant_id":       log.tenant_id,
            "question":        log.question,
            "answered":        log.answered,
            "answer":          log.answer,
            "sources":         log.sources,
            "from_cache":      log.from_cache,
            "latency_ms":      log.latency_ms,
            "llm_model":       log.llm_model,
            "input_tokens":    log.input_tokens,
            "output_tokens":   log.output_tokens,
            "rerank_top_score": log.rerank_top_score,
        }
        if log.user_id:
            row["user_id"] = log.user_id
        if log.line_user_id:
            row["line_user_id"] = log.line_user_id

        store._client.table("rag_query_logs").insert(row).execute()

    except Exception as e:
        # ไม่ interrupt request ถ้า log ล้มเหลว
        logger.warning(f"log_query failed (non-critical): {e}")


def estimate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """ประมาณค่าใช้จ่าย LLM (USD) — ใช้สำหรับ cost tracking ต่อลูกค้า"""
    rate = _COST_PER_1M.get(model, 0.5)
    return round((input_tokens + output_tokens) / 1_000_000 * rate, 6)


# ---------------------------------------------------------------------------
# FastAPI Middleware
# ---------------------------------------------------------------------------

def add_monitoring_middleware(app):
    """
    เพิ่ม request latency + structured log middleware ให้ FastAPI app
    เรียกใน main.py: add_monitoring_middleware(app)
    """
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request

    class LatencyMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            start = time.perf_counter()
            response = await call_next(request)
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            # structured log — parse ด้วย log aggregator (Loki/CloudWatch)
            logger.info(
                "request",
                extra={
                    "method":     request.method,
                    "path":       request.url.path,
                    "status":     response.status_code,
                    "latency_ms": elapsed_ms,
                    "tenant_id":  request.headers.get("X-Tenant-ID", ""),
                },
            )

            response.headers["X-Latency-Ms"] = str(elapsed_ms)
            return response

    app.add_middleware(LatencyMiddleware)
    return app


# ---------------------------------------------------------------------------
# Structured JSON logging setup
# ---------------------------------------------------------------------------

def setup_logging(level: str = "INFO"):
    """
    ตั้งค่า logging ให้ output JSON (production) หรือ human-readable (dev)
    เรียกครั้งเดียวตอน app start
    """
    app_env = os.getenv("APP_ENV", "development")

    if app_env == "production":
        import json

        class JsonFormatter(logging.Formatter):
            def format(self, record: logging.LogRecord) -> str:
                data = {
                    "ts":      self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
                    "level":   record.levelname,
                    "logger":  record.name,
                    "msg":     record.getMessage(),
                }
                # เพิ่ม extra fields (จาก logger.info("x", extra={...}))
                for key in ("method", "path", "status", "latency_ms", "tenant_id"):
                    if hasattr(record, key):
                        data[key] = getattr(record, key)
                return json.dumps(data, ensure_ascii=False)

        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
    else:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
            datefmt="%H:%M:%S",
        ))

    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO), handlers=[handler])
    # ลด noise จาก library
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.WARNING)
