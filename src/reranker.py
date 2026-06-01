"""
BGE Reranker — E3-3
bge-reranker-v2-m3: cross-encoder rerank หลัง hybrid search
"""
import logging
import os
from typing import Optional

from supabase_vector_store import ChunkResult

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "BAAI/bge-reranker-v2-m3"
NO_ANSWER_THRESHOLD = float(os.getenv("NO_ANSWER_THRESHOLD", "0.3"))
RERANK_TOP_N = int(os.getenv("RERANK_TOP_N", "5"))


class BGEReranker:
    """
    Cross-encoder reranker — lazy load, เหมือน BGEEmbedder
    """

    def __init__(self, model_path: Optional[str] = None):
        self._model_path = model_path or os.getenv("RERANKER_MODEL_PATH", _DEFAULT_MODEL)
        self._model = None

    def _load(self):
        if self._model is not None:
            return
        from FlagEmbedding import FlagReranker

        logger.info(f"โหลด reranker จาก {self._model_path}")
        self._model = FlagReranker(self._model_path, use_fp16=True)
        logger.info("reranker พร้อมใช้งาน")

    def rerank(
        self,
        query: str,
        chunks: list[ChunkResult],
        top_n: int = RERANK_TOP_N,
    ) -> list[ChunkResult]:
        """
        Rerank chunks ด้วย cross-encoder
        คืน top_n chunks เรียงตาม rerank score มากไปน้อย
        """
        if not chunks:
            return []

        self._load()

        pairs = [[query, chunk.content] for chunk in chunks]
        scores: list[float] = self._model.compute_score(pairs, normalize=True)

        ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)

        results = []
        for score, chunk in ranked[:top_n]:
            chunk.score = float(score)
            results.append(chunk)
        return results

    def top_score(self, chunks: list[ChunkResult]) -> float:
        """คืน score ของ chunk อันดับ 1 (ใช้เทียบ NO_ANSWER_THRESHOLD)"""
        if not chunks:
            return 0.0
        return chunks[0].score
