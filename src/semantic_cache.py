"""
Semantic Cache — E3-5
Redis cache สำหรับ query ที่คล้ายกัน (cosine similarity บน cached embeddings)
"""
import hashlib
import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

CACHE_TTL = int(os.getenv("CACHE_TTL_HOURS", "24")) * 3600
SIMILARITY_THRESHOLD = float(os.getenv("CACHE_SIMILARITY_THRESHOLD", "0.92"))
_KEY_PREFIX = "kbase:cache:"


@dataclass
class CacheEntry:
    question: str
    answer: str
    sources: list
    embedding: list[float]


class SemanticCache:
    """
    Semantic cache ใช้ Redis + cosine similarity
    exact-match ก่อน, ถ้าไม่เจอ → scan embedding ใน slot ของ tenant
    """

    def __init__(self, redis_url: Optional[str] = None):
        self._url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._client = None

    def _ensure(self):
        if self._client is not None:
            return
        import redis
        self._client = redis.from_url(self._url, decode_responses=True)
        logger.debug("Redis cache connected")

    def _exact_key(self, tenant_id: str, question: str) -> str:
        h = hashlib.sha256(question.strip().lower().encode()).hexdigest()[:16]
        return f"{_KEY_PREFIX}{tenant_id}:exact:{h}"

    def _emb_key(self, tenant_id: str) -> str:
        return f"{_KEY_PREFIX}{tenant_id}:embeddings"

    def get(self, tenant_id: str, question: str, query_embedding: list[float]) -> Optional[CacheEntry]:
        """
        คืน CacheEntry ถ้า hit (exact หรือ semantic)
        คืน None ถ้า miss
        """
        try:
            self._ensure()

            # 1. exact match (hash ของ question)
            exact_key = self._exact_key(tenant_id, question)
            raw = self._client.get(exact_key)
            if raw:
                data = json.loads(raw)
                logger.debug(f"cache HIT (exact): {question[:40]}")
                return CacheEntry(**data)

            # 2. semantic match — scan embeddings list ใน Redis
            emb_key = self._emb_key(tenant_id)
            entries_raw = self._client.lrange(emb_key, 0, 199)  # max 200 entries
            if not entries_raw:
                return None

            best_sim = 0.0
            best_entry = None
            for entry_raw in entries_raw:
                entry = json.loads(entry_raw)
                sim = _cosine(query_embedding, entry["embedding"])
                if sim > best_sim:
                    best_sim = sim
                    best_entry = entry

            if best_sim >= SIMILARITY_THRESHOLD and best_entry:
                logger.info(f"cache HIT (semantic, sim={best_sim:.3f}): {question[:40]}")
                return CacheEntry(**best_entry)

        except Exception as e:
            logger.warning(f"cache get failed (non-critical): {e}")
        return None

    def set(self, tenant_id: str, question: str, answer: str, sources: list, embedding: list[float]):
        """บันทึก entry ลง cache (exact key + embedding list)"""
        try:
            self._ensure()
            entry = {
                "question": question,
                "answer": answer,
                "sources": sources,
                "embedding": embedding,
            }
            serialized = json.dumps(entry, ensure_ascii=False)

            # exact key
            exact_key = self._exact_key(tenant_id, question)
            self._client.setex(exact_key, CACHE_TTL, serialized)

            # embedding list (สำหรับ semantic scan)
            emb_key = self._emb_key(tenant_id)
            self._client.lpush(emb_key, serialized)
            self._client.ltrim(emb_key, 0, 999)   # max 1000 entries ต่อ tenant
            self._client.expire(emb_key, CACHE_TTL)

        except Exception as e:
            logger.warning(f"cache set failed (non-critical): {e}")

    def invalidate_tenant(self, tenant_id: str):
        """ลบ cache ทั้งหมดของ tenant (เช่น หลัง re-ingest)"""
        try:
            self._ensure()
            pattern = f"{_KEY_PREFIX}{tenant_id}:*"
            keys = self._client.keys(pattern)
            if keys:
                self._client.delete(*keys)
                logger.info(f"invalidated {len(keys)} cache keys for tenant {tenant_id[:8]}")
        except Exception as e:
            logger.warning(f"cache invalidate failed: {e}")


def _cosine(a: list[float], b: list[float]) -> float:
    """cosine similarity — ไม่ใช้ numpy เพื่อลด dependency"""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
