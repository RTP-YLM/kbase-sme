"""
BGE-M3 Embedding Pipeline — E3-1
1024-dim dense embeddings สำหรับ knowledge_chunks.embedding
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 1024
_DEFAULT_MODEL_NAME = "BAAI/bge-m3"

# batch size สำหรับ ingestion (ลดถ้า OOM)
DEFAULT_BATCH_SIZE = 32


def _detect_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


class BGEEmbedder:
    """
    BGE-M3 wrapper — lazy-loads model on first call.

    ใช้ FlagEmbedding ซึ่ง support dense + sparse + colbert
    E3-1 ใช้เฉพาะ dense (1024-dim) ก่อน
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        batch_size: int = DEFAULT_BATCH_SIZE,
    ):
        self._model_path = model_path or os.getenv("BGE_MODEL_PATH", _DEFAULT_MODEL_NAME)
        self._device = device or os.getenv("BGE_DEVICE", _detect_device())
        self._batch_size = batch_size
        self._model = None

    def _load(self):
        if self._model is not None:
            return
        from FlagEmbedding import BGEM3FlagModel

        logger.info(f"โหลด BGE-M3 จาก {self._model_path} (device={self._device})")
        self._model = BGEM3FlagModel(
            self._model_path,
            use_fp16=(self._device != "cpu"),
            device=self._device,
        )
        logger.info("BGE-M3 พร้อมใช้งาน")

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed หลาย text พร้อมกัน — ใช้สำหรับ ingestion
        คืน list[list[float]] ขนาด (N, 1024)
        """
        if not texts:
            return []
        self._load()

        results: list[list[float]] = []
        for i in range(0, len(texts), self._batch_size):
            batch = texts[i: i + self._batch_size]
            output = self._model.encode(
                batch,
                batch_size=len(batch),
                max_length=512,
                return_dense=True,
                return_sparse=False,
                return_colbert_vecs=False,
            )
            dense = output["dense_vecs"]
            results.extend(vec.tolist() for vec in dense)
            logger.debug(f"  embedded {i + len(batch)}/{len(texts)}")

        return results

    def embed_query(self, text: str) -> list[float]:
        """
        Embed query เดียว — ใช้สำหรับ retrieval
        BGE-M3 recommend prefix 'Represent this sentence for searching relevant passages: '
        แต่สำหรับ Thai RAG ใช้ plain text ก็ OK ตาม benchmark
        """
        return self.embed_batch([text])[0]

    @property
    def dim(self) -> int:
        return EMBEDDING_DIM
