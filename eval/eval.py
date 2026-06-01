"""
Eval Harness — E8-1
รัน golden set ผ่าน RAGPipeline แล้วรายงาน:
  hit@k, no-answer precision, avg latency, avg cost
DoD: ≥ 90% hit@3 บน golden set

ใช้: python eval/eval.py [--golden data/golden_set.json]
"""
import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@dataclass
class EvalResult:
    question_id: str
    question: str
    should_answer: bool
    answered: bool
    hit: bool                   # expected keywords ครบ
    latency_ms: int
    cost_usd: float
    answer: str = ""
    error: str = ""


@dataclass
class EvalReport:
    total: int = 0
    answered_correct: int = 0   # should_answer=True และตอบถูก
    answered_wrong: int = 0     # should_answer=True แต่ตอบผิด keyword miss
    no_answer_correct: int = 0  # should_answer=False และตอบว่าไม่รู้
    no_answer_wrong: int = 0    # should_answer=False แต่ตอบมั่ว
    avg_latency_ms: float = 0.0
    total_cost_usd: float = 0.0
    results: list[EvalResult] = field(default_factory=list)

    @property
    def hit_rate(self) -> float:
        answerable = sum(1 for r in self.results if r.should_answer)
        if answerable == 0:
            return 1.0
        return self.answered_correct / answerable

    @property
    def no_answer_precision(self) -> float:
        unanswerable = sum(1 for r in self.results if not r.should_answer)
        if unanswerable == 0:
            return 1.0
        return self.no_answer_correct / unanswerable

    @property
    def passed(self) -> bool:
        return self.hit_rate >= 0.90

    def summary(self) -> dict:
        return {
            "total": self.total,
            "hit_rate": round(self.hit_rate, 4),
            "no_answer_precision": round(self.no_answer_precision, 4),
            "avg_latency_ms": round(self.avg_latency_ms, 1),
            "total_cost_usd": round(self.total_cost_usd, 6),
            "passed": self.passed,
            "breakdown": {
                "answered_correct": self.answered_correct,
                "answered_wrong": self.answered_wrong,
                "no_answer_correct": self.no_answer_correct,
                "no_answer_wrong": self.no_answer_wrong,
            },
        }


def _check_hit(answer: str, expected_contains: list[str]) -> bool:
    """ตรวจว่า answer มี keywords ทั้งหมด (case-insensitive)"""
    if not expected_contains:
        return True
    answer_lower = answer.lower()
    return all(kw.lower() in answer_lower for kw in expected_contains)


def run_eval(golden_path: str, tenant_id: str) -> EvalReport:
    from monitoring import estimate_cost_usd
    from rag_pipeline import RAGPipeline

    with open(golden_path, encoding="utf-8") as f:
        golden = json.load(f)

    pipeline = RAGPipeline()
    report = EvalReport()
    latencies = []

    print(f"\n{'='*60}")
    print(f"Running eval — {len(golden)} questions")
    print(f"{'='*60}\n")

    for item in golden:
        qid = item["id"]
        question = item["question"]
        should_answer = item["should_answer"]
        expected = item.get("expected_answer_contains", [])

        try:
            result = pipeline.query(
                question=question,
                tenant_id=tenant_id,
                department=item.get("department"),
            )
            answered = result.answered
            answer = result.answer
            latency = result.latency_ms
            cost = estimate_cost_usd(
                result.llm_model or "",
                result.input_tokens or 0,
                result.output_tokens or 0,
            )
            error = ""
        except Exception as e:
            answered = False
            answer = ""
            latency = 0
            cost = 0.0
            error = str(e)

        hit = False
        if should_answer and answered:
            hit = _check_hit(answer, expected)
        elif not should_answer and not answered:
            hit = True  # no-answer ถูกต้อง

        eval_result = EvalResult(
            question_id=qid,
            question=question,
            should_answer=should_answer,
            answered=answered,
            hit=hit,
            latency_ms=latency,
            cost_usd=cost,
            answer=answer,
            error=error,
        )
        report.results.append(eval_result)
        latencies.append(latency)

        if should_answer:
            if hit:
                report.answered_correct += 1
                status = "✓"
            else:
                report.answered_wrong += 1
                status = "✗"
        else:
            if not answered:
                report.no_answer_correct += 1
                status = "✓ (no-ans)"
            else:
                report.no_answer_wrong += 1
                status = "✗ (false-ans)"

        print(f"[{status}] {qid}: {question[:50]}")
        if not hit and not error:
            print(f"      answer: {answer[:80]}")
        if error:
            print(f"      ERROR: {error}")

    report.total = len(golden)
    report.avg_latency_ms = sum(latencies) / len(latencies) if latencies else 0
    report.total_cost_usd = sum(r.cost_usd for r in report.results)

    return report


def main():
    parser = argparse.ArgumentParser(description="KbaseSME Eval Harness")
    parser.add_argument("--golden", default="data/golden_set.json")
    parser.add_argument("--tenant-id", default=os.getenv("TENANT_ID", "00000000-0000-0000-0000-000000000001"))
    parser.add_argument("--output", default=None, help="บันทึก JSON report ที่นี่")
    args = parser.parse_args()

    report = run_eval(args.golden, args.tenant_id)
    summary = report.summary()

    print(f"\n{'='*60}")
    print("EVAL SUMMARY")
    print(f"{'='*60}")
    print(f"  Hit rate:            {summary['hit_rate']*100:.1f}%  (target ≥ 90%)")
    print(f"  No-answer precision: {summary['no_answer_precision']*100:.1f}%")
    print(f"  Avg latency:         {summary['avg_latency_ms']:.0f} ms")
    print(f"  Total cost:          ${summary['total_cost_usd']:.4f}")
    print(f"  Result:              {'✅ PASSED' if summary['passed'] else '❌ FAILED'}")
    print()

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump({"summary": summary, "results": [
                {k: v for k, v in vars(r).items() if k != "answer"}
                for r in report.results
            ]}, f, ensure_ascii=False, indent=2)
        print(f"Report → {args.output}")

    sys.exit(0 if summary["passed"] else 1)


if __name__ == "__main__":
    main()
