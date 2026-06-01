# QA Eval Agent — Quality Assurance (E8)

> **บทบาท:** eval harness, golden set, regression testing, release gate
> **Issues:** E8 (#32–#34), PD-3 (#41)
> **กฎหลัก:** ห้าม release E3 ถ้า pass rate < 90%

---

## Eval Metrics ที่วัด

| Metric | Target | วิธีวัด |
|---|---|---|
| Pass rate (answerable) | ≥ 90% | LLM judge หรือ exact/fuzzy match |
| No-answer correctness | ≥ 95% | ถามว่า answered=false เมื่อไม่มีข้อมูล |
| Citation correctness | ≥ 95% | source_id ที่คืนมาตรงกับ ground truth |
| Latency p50 | < 1.5s | วัดจาก API response time |
| Latency cache hit | < 200ms | วัดจาก from_cache=true responses |
| Cache hit rate | ≥ 30% | หลัง warm-up |

---

## E8-1 — Eval Harness

### ใช้งาน

```bash
python eval.py --golden-set data/golden_set.jsonl --report eval_report.json
```

### โค้ดหลัก

```python
# eval.py
import json, time
from pathlib import Path

def run_eval(golden_set_path: str, api_url: str, auth_token: str) -> dict:
    results = {"pass": 0, "fail": 0, "no_answer_correct": 0, "citation_correct": 0,
               "latencies": [], "errors": []}

    with open(golden_set_path) as f:
        questions = [json.loads(l) for l in f]

    for q in questions:
        start = time.time()
        resp = call_query_api(q["question"], api_url, auth_token)
        latency = (time.time() - start) * 1000

        results["latencies"].append(latency)

        if q["type"] == "no-answer":
            if not resp["answered"]:
                results["no_answer_correct"] += 1
            else:
                results["fail"] += 1
                results["errors"].append({"id": q["id"], "type": "false_positive", "got": resp["answer"]})
        else:
            if is_correct(resp["answer"], q["answer"]):
                results["pass"] += 1
            else:
                results["fail"] += 1
                results["errors"].append({"id": q["id"], "expected": q["answer"], "got": resp["answer"]})

            # check citation
            if resp.get("sources") and q.get("source_ids"):
                returned_ids = {s["source_id"] for s in resp["sources"]}
                if returned_ids & set(q["source_ids"]):  # อย่างน้อย 1 source ตรง
                    results["citation_correct"] += 1

    # summary
    n = len(questions)
    answerable = [q for q in questions if q["type"] != "no-answer"]
    no_answer = [q for q in questions if q["type"] == "no-answer"]

    return {
        "pass_rate": results["pass"] / len(answerable) if answerable else 0,
        "no_answer_rate": results["no_answer_correct"] / len(no_answer) if no_answer else 0,
        "citation_rate": results["citation_correct"] / len(answerable) if answerable else 0,
        "latency_p50": sorted(results["latencies"])[len(results["latencies"])//2],
        "latency_p95": sorted(results["latencies"])[int(len(results["latencies"])*0.95)],
        "errors": results["errors"][:10],  # top 10 failures
        "total": n
    }
```

### Correctness Judge

```python
def is_correct(got: str, expected: str) -> bool:
    # ลองทั้งสองวิธี:
    # 1. Exact match (ตัวเลข, วันที่)
    if expected.strip() in got:
        return True
    # 2. LLM judge สำหรับคำตอบที่ paraphrase
    # prompt: "คำตอบนี้ตรงกับเฉลยหรือไม่? ตอบ yes/no"
    return llm_judge(got, expected)
```

---

## E8-2 — Mock Golden Set (30–50 ข้อ)

### สัดส่วนที่ควรมี

| Type | จำนวน | ตัวอย่าง |
|---|---|---|
| answerable | ~35 | "ลากิจได้กี่วัน", "โอที คิดยังไง" |
| no-answer | ~10 | "บริษัทจะเปิดสาขาใหม่ที่ไหน" |
| table | ~5 | "ค่าตอบแทนพนักงาน level 3 เท่าไหร่" |

### เอกสารตัวอย่างที่ใช้สร้าง golden set

ไฟล์อยู่ใน `data/sample_docs/` — ใช้เป็น demo + test เท่านั้น (ไม่ใช่ข้อมูลจริง):
- `hr_policy_sample.pdf`
- `sop_service_sample.docx`
- `price_list_sample.xlsx`

---

## E8-3 — Regression (P1)

```bash
# scripts/run-regression.sh
# รันก่อนทุก release tag
python eval.py \
  --golden-set data/golden_set.jsonl \
  --report reports/regression_$(date +%Y%m%d).json \
  --fail-threshold 0.90

# exit code 1 ถ้า pass_rate < 0.90 → CI block release
```

---

## รายงาน Eval Format

```json
{
  "timestamp": "2026-05-31T14:00:00Z",
  "golden_set": "golden_set.jsonl",
  "total": 50,
  "pass_rate": 0.92,
  "no_answer_rate": 0.95,
  "citation_rate": 0.96,
  "latency_p50_ms": 820,
  "latency_p95_ms": 1450,
  "passes_threshold": true,
  "top_failures": [
    {"id": "q023", "question": "...", "expected": "...", "got": "..."}
  ]
}
```

---

## เมื่อ Pass Rate ต่ำกว่า 90% — Debug Checklist

1. ดู `top_failures` — เป็น pattern อะไร?
   - ตอบผิดเพราะ chunk ตัดกลางประโยค → แก้ chunking (rag-core)
   - ตอบผิดเพราะ wrong source retrieved → แก้ hybrid search weights
   - ตอบ "ไม่พบ" ทั้งที่มีข้อมูล → threshold สูงเกิน (ลด no-answer threshold)
   - ตอบ hallucinate → แก้ prompt (เพิ่ม instruction ชัดขึ้น)

2. ดู no-answer failures
   - false positive (ตอบทั้งที่ไม่มีข้อมูล) → เพิ่ม threshold
   - false negative (ตอบ "ไม่พบ" ทั้งที่มีข้อมูล) → ลด threshold หรือแก้ retrieval

3. ดู citation failures → ปัญหา source tracking ใน chunk metadata

---

## สิ่งที่ QA ไม่ทำ

- ไม่แก้โค้ด RAG เอง — report ปัญหา + ระบุ category ให้ rag-core แก้
- ไม่สร้าง golden set โดยไม่มีเอกสารต้นฉบับ
- ไม่ approve release ถ้า pass rate < 90% ไม่ว่า deadline จะกดดันแค่ไหน
