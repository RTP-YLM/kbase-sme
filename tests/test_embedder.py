"""
Unit tests — E3-1 BGEEmbedder + SupabaseVectorStore
ใช้ mock แทน model จริงเพื่อไม่ต้อง download 1.5GB ใน CI
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from embedder import EMBEDDING_DIM, BGEEmbedder
from supabase_vector_store import ChunkResult, SupabaseVectorStore


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_model(dim: int = EMBEDDING_DIM):
    """สร้าง mock BGEM3FlagModel ที่คืน numpy-like array"""
    import numpy as np

    model = MagicMock()
    model.encode = MagicMock(
        return_value={"dense_vecs": np.random.rand(32, dim).astype("float32")}
    )
    return model


# ---------------------------------------------------------------------------
# BGEEmbedder
# ---------------------------------------------------------------------------

class TestBGEEmbedder:
    def test_dim_property(self):
        embedder = BGEEmbedder()
        assert embedder.dim == EMBEDDING_DIM == 1024

    def test_embed_batch_returns_correct_shape(self):
        embedder = BGEEmbedder()
        texts = ["ลาพักผ่อน", "นโยบาย HR", "สวัสดี"]

        mock_model = _make_mock_model()
        import numpy as np
        mock_model.encode.return_value = {"dense_vecs": np.random.rand(3, 1024).astype("float32")}
        embedder._model = mock_model

        vectors = embedder.embed_batch(texts)

        assert len(vectors) == 3
        assert all(len(v) == 1024 for v in vectors)

    def test_embed_batch_empty(self):
        embedder = BGEEmbedder()
        assert embedder.embed_batch([]) == []

    def test_embed_query_returns_single_vector(self):
        embedder = BGEEmbedder()
        import numpy as np
        mock_model = _make_mock_model()
        mock_model.encode.return_value = {"dense_vecs": np.random.rand(1, 1024).astype("float32")}
        embedder._model = mock_model

        vec = embedder.embed_query("ลาป่วยได้กี่วัน")
        assert isinstance(vec, list)
        assert len(vec) == 1024

    def test_embed_returns_float_list(self):
        embedder = BGEEmbedder()
        import numpy as np
        mock_model = _make_mock_model()
        mock_model.encode.return_value = {"dense_vecs": np.random.rand(1, 1024).astype("float32")}
        embedder._model = mock_model

        vec = embedder.embed_query("test")
        assert all(isinstance(v, float) for v in vec)

    def test_model_lazy_loaded(self):
        embedder = BGEEmbedder()
        assert embedder._model is None, "model ต้องยังไม่โหลดตั้งแต่ init"

    def test_embed_batch_batching(self):
        """ถ้า texts มากกว่า batch_size ต้อง call encode หลายรอบ"""
        embedder = BGEEmbedder(batch_size=2)
        texts = ["a", "b", "c", "d", "e"]

        import numpy as np
        mock_model = MagicMock()
        call_count = [0]

        def encode_side_effect(batch, **kwargs):
            call_count[0] += 1
            n = len(batch)
            return {"dense_vecs": np.random.rand(n, 1024).astype("float32")}

        mock_model.encode = encode_side_effect
        embedder._model = mock_model

        result = embedder.embed_batch(texts)
        assert len(result) == 5
        assert call_count[0] == 3  # 2+2+1


# ---------------------------------------------------------------------------
# SupabaseVectorStore
# ---------------------------------------------------------------------------

class TestSupabaseVectorStore:
    def test_missing_env_raises(self):
        store = SupabaseVectorStore(supabase_url="", supabase_key="")
        with pytest.raises(ValueError, match="SUPABASE_URL"):
            store._ensure_client()

    def test_upsert_chunks_length_mismatch_raises(self):
        from document_loader import Chunk

        store = SupabaseVectorStore()
        store._client = MagicMock()

        # mock delete
        store._client.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()

        chunks = [Chunk(content="a", chunk_index=0, token_count=5)]
        embeddings = [[0.1] * 1024, [0.2] * 1024]  # ไม่ตรงกัน

        with pytest.raises(ValueError, match="จำนวนไม่ตรงกัน"):
            store.upsert_chunks("fake-source-id", chunks, embeddings)

    def test_row_to_chunk_result(self):
        row = {
            "id": 42,
            "source_id": "src-uuid",
            "content": "เนื้อหา",
            "section_title": "หัวข้อ",
            "page_number": 1,
            "metadata": {"doc_type": "md"},
            "similarity": 0.87,
            "department": "hr",
            "access_level": 2,
        }
        result = SupabaseVectorStore._row_to_chunk_result(row, score_key="similarity")
        assert isinstance(result, ChunkResult)
        assert result.chunk_id == 42
        assert result.score == 0.87
        assert result.content == "เนื้อหา"

    def test_search_vector_calls_rpc(self):
        store = SupabaseVectorStore()
        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.return_value.data = [
            {
                "id": 1, "source_id": "s1", "content": "test",
                "section_title": None, "page_number": None,
                "metadata": {}, "similarity": 0.9,
                "department": "hr", "access_level": 2,
            }
        ]
        store._client = mock_client

        results = store.search_vector([0.1] * 1024)
        mock_client.rpc.assert_called_once_with(
            "match_chunks_vector",
            {
                "query_embedding": [0.1] * 1024,
                "p_tenant_id": "00000000-0000-0000-0000-000000000001",
                "p_department": None,
                "p_access_level": 2,
                "match_count": 20,
            },
        )
        assert len(results) == 1
        assert results[0].score == 0.9

    def test_search_fts_calls_rpc(self):
        store = SupabaseVectorStore()
        mock_client = MagicMock()
        mock_client.rpc.return_value.execute.return_value.data = []
        store._client = mock_client

        results = store.search_fts("ลาพักผ่อน")
        mock_client.rpc.assert_called_once_with(
            "match_chunks_fts",
            {
                "query_text": "ลาพักผ่อน",
                "p_tenant_id": "00000000-0000-0000-0000-000000000001",
                "p_department": None,
                "p_access_level": 2,
                "match_count": 20,
            },
        )
        assert results == []
