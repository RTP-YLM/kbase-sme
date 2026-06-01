"""
Unit tests — monitoring.py (E9-3)
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from monitoring import QueryLog, estimate_cost_usd, log_query, setup_logging


class TestEstimateCost:
    def test_known_model(self):
        cost = estimate_cost_usd("qwen3.5-flash", 1_000_000, 0)
        assert cost == pytest.approx(0.15, rel=1e-3)

    def test_zero_tokens(self):
        assert estimate_cost_usd("gpt-4.1-nano", 0, 0) == 0.0

    def test_unknown_model_fallback(self):
        cost = estimate_cost_usd("unknown-model", 1_000_000, 0)
        assert cost > 0  # ใช้ fallback rate 0.5

    def test_combined_input_output(self):
        cost = estimate_cost_usd("gpt-4.1-nano", 500_000, 500_000)
        assert cost == pytest.approx(0.10, rel=1e-3)


class TestQueryLog:
    def test_defaults(self):
        log = QueryLog(question="ลาป่วยได้กี่วัน")
        assert log.tenant_id == "00000000-0000-0000-0000-000000000001"
        assert log.answered is False
        assert log.sources == []

    def test_custom_fields(self):
        log = QueryLog(
            question="ทดสอบ",
            answered=True,
            latency_ms=450,
            llm_model="qwen3.5-flash",
            input_tokens=100,
            output_tokens=50,
        )
        assert log.latency_ms == 450
        assert log.input_tokens == 100


class TestLogQuery:
    def test_log_query_inserts_row(self):
        log = QueryLog(
            question="นโยบายลา",
            answered=True,
            answer="ลาได้ 30 วัน",
            latency_ms=320,
            llm_model="qwen3.5-flash",
        )

        mock_store = MagicMock()
        mock_store._client.table.return_value.insert.return_value.execute.return_value = MagicMock()

        with patch("monitoring._SupabaseVectorStore", return_value=mock_store):
            log_query(log)

        mock_store._client.table.assert_called_with("rag_query_logs")

    def test_log_query_does_not_raise_on_error(self):
        log = QueryLog(question="ทดสอบ")
        with patch("monitoring._SupabaseVectorStore", side_effect=Exception("DB down")):
            log_query(log)  # ต้องไม่ throw


class TestSetupLogging:
    def test_setup_dev(self):
        setup_logging("INFO")  # ไม่ raise

    def test_setup_prod(self, monkeypatch):
        monkeypatch.setenv("APP_ENV", "production")
        setup_logging("WARNING")  # ไม่ raise
