# RAG-Core Agent — Backend + Data (E2 + E3)

> ⚠️ **POC ปัจจุบัน vs Target:** โค้ดใน `src/` ยังเป็น POC — embedding 384, `text.split()` chunking, vector-only search, English prompt, ไม่มี reranker
> ไฟล์นี้เขียนถึง **target architecture** ที่ต้อง build — ไม่ใช่สิ่งที่มีอยู่แล้ว
> อ่าน Current State ใน `AGENTS.md` ก่อนเสมอ

> **บทบาท:** หัวใจของระบบ — ingestion pipeline + retrieval pipeline + generation quality
> **Issues:** E2 (#4–#8), E3 (#9–#14)
> **Critical:** E3 คือ core ที่ทำให้ "ขายได้" — ห้ามลดทอนคุณภาพเพื่อความเร็วในการ ship

---

## Ingestion Pipeline (E2)

### E2-1 — Checksum Dedup + Versioning
```python
# logic ที่ต้องทำ:
# 1. SHA256(file bytes) → ตรวจใน knowledge_sources
# 2. ซ้ำ + ไม่เปลี่ยน → skip
# 3. เปลี่ยน (checksum ต่าง) → archive chunk เก่า + re-index
# 4. ลบ chunks ของ source_id เก่าอัตโนมัติก่อน upsert ใหม่
```

**DoD:** ไฟล์เดิม=skip, แก้=re-index, ลบ chunk เก่าอัตโนมัติ

### E2-2 — PyThaiNLP Tokenizer + Section-Aware Chunking
```python
# ห้ามใช้ text.split() หรือ whitespace split สำหรับภาษาไทย
# ใช้ pythainlp.tokenize.word_tokenize(text, engine="newmm")
# chunk strategy:
#   - ตัดตาม section headers (##, ชื่อหัวข้อ) ก่อน
#   - แต่ละ section → sliding window 512 tokens, overlap 128
#   - ถ้า section สั้น (<100 tokens) → merge กับ section ถัดไป
```

**DoD:** chunk ไทยไม่ตัดคำมั่ว, ทดสอบ 5 เอกสาร, section boundary ถูกต้อง

### E2-3 — Typhoon OCR (PDF สแกน)
- ใช้ Typhoon OCR (open Thai VLM) สำหรับ PDF ที่เป็นรูปภาพหรือสแกน
- detect: ถ้า `pdfminer` ไม่ extract text ได้ (< 10 chars/page) → route ไป OCR
- output: plain text ก่อนส่งต่อไป chunking pipeline

**DoD:** OCR ไฟล์สแกนไทยออกข้อความใช้ได้ BLEU ≥ 0.85

### E2-4 — Table → Markdown Table
```python
# ตารางที่ extract มาจาก PDF ต้องแปลงเป็น markdown table
# เพื่อให้ chunk + retrieval ยังเข้าใจ structure ตาราง
# ห้าม flatten เป็น plain text (ตัวเลขและ label หาย context)
# | คอลัมน์ 1 | คอลัมน์ 2 |
# |-----------|-----------|
# | ค่า 1     | ค่า 2     |
```

**DoD:** ตารางเบิกจ่าย/ค่าตอบแทน retrieve ถูก ไม่สลับค่า

### E2-5 — Async Ingestion ผ่าน Redis Queue
- Upload → enqueue job → Celery/Arq worker รับ
- `document_ingestion_jobs` table: status = queued|running|done|error, step
- ห้าม block rag-api ด้วย OCR หรือ embed งาน (อาจใช้เวลา > 30s)

---

## Retrieval Pipeline (E3)

### E3-1 — BGE-M3 Embedding (1024-dim)
```python
# model: BAAI/bge-m3
# dimension: 1024 — นี่คือ TARGET หลัง E1-1 สร้าง column ใหม่
# POC ปัจจุบันใช้ MiniLM 384-dim — ต้อง re-embed ทั้งหมดหลัง migrate
# self-hosted (ไม่ใช้ OpenAI embedding — ต้นทุนและ Thai quality)
# batch embed ตอน ingest, single embed ตอน query
```

**DoD:** embedding 1024 เข้า DB, query ทำงานได้, cosine similarity ถูกต้อง

### E3-2 — Hybrid Search: Vector + Keyword FTS
```python
# Vector search: pgvector cosine, top-20
# Keyword search: Postgres FTS (content_tsv GIN index), top-20
# รวมผล: RRF (Reciprocal Rank Fusion) หรือ union + dedup by chunk_id
# เหตุผล: คำเฉพาะ/ตัวย่อ/รหัสสินค้าที่ vector miss → keyword จับได้
```

**DoD:** คืน top-N รวมสองทาง dedup, RRF score ถูกต้อง

### E3-3 — Reranker bge-reranker-v2-m3
```python
# model: BAAI/bge-reranker-v2-m3 (cross-encoder)
# input: (query, chunk) pairs จาก hybrid search
# output: relevance score ต่อ pair
# เลือก top 3–5 chunks ที่ score สูงสุดส่งต่อ LLM
# ห้ามตัดขั้นตอนนี้ออก — เป็น quality gate หลัก
```

**DoD:** rerank score ใช้ตัดสิน no-answer ได้ถูกต้อง, top 3–5 quality ดี

### E3-4 — Grounded Prompt + No-Answer + Citation
```python
# Prompt template (บังคับ):
SYSTEM_PROMPT = """
คุณเป็น AI ผู้ช่วยตอบคำถามจากเอกสารของบริษัท
กฎ:
1. ตอบเฉพาะจากข้อมูลใน context ที่ให้มาเท่านั้น
2. ถ้าไม่มีข้อมูลเพียงพอ ตอบว่า "ไม่พบข้อมูลเพียงพอในเอกสาร กรุณาติดต่อ [แผนกที่เกี่ยวข้อง]"
3. ตอบเป็นภาษาเดียวกับคำถาม (ถามไทย=ตอบไทย)
4. ระบุแหล่งอ้างอิงทุกครั้ง: ชื่อเอกสาร · หัวข้อ · ความมั่นใจ
5. ห้ามเดาหรือเพิ่มข้อมูลที่ไม่มีใน context
"""

# No-answer threshold:
# ถ้า max(rerank_scores) < threshold (เริ่มที่ 0.3, tune จาก eval)
# → ส่งคืน {"answered": false, "answer": "ไม่พบข้อมูล..."}
# ห้าม generate คำตอบเมื่อ score ต่ำ
```

**Response format:**
```json
{
  "answered": true,
  "answer": "พนักงานมีสิทธิ์ลากิจได้ 3 วันทำงานต่อปี",
  "sources": [
    {
      "title": "HR Policy 2026",
      "section": "การลา",
      "source_id": "uuid",
      "rerank_score": 0.86
    }
  ],
  "latency_ms": 740,
  "from_cache": false
}
```

### E3-5 — Semantic Cache (Redis)
```python
# embed คำถาม → cosine similarity กับ cached queries
# ถ้า similarity > 0.92 → return cached answer (ไม่เสีย token)
# TTL: 24 ชั่วโมง (เอกสารอาจ re-index)
# key: tenant_id + query_embedding_hash
# target: cache hit rate ≥ 30%, latency < 200ms
```

### E3-6 — LLM Provider Abstraction
```python
# สลับ model จาก config.yaml ได้โดยไม่แก้ code
# cloud: gemini-3.1-flash-lite / gpt-4.1-nano
# on-prem: typhoon2 ผ่าน ollama (openai-compatible endpoint)
# interface เดียวกัน: generate(prompt, context) → str
```

---

## Files ที่เกี่ยวข้อง

- [`src/rag_engine.py`](../src/rag_engine.py) — RAG orchestration (ยกเครื่องใหม่)
- [`src/document_loader.py`](../src/document_loader.py) — parsing + chunking (ยกเครื่องใหม่)
- [`src/supabase_vector_store.py`](../src/supabase_vector_store.py) — pgvector operations
- [`src/llm_provider.py`](../src/llm_provider.py) — LLM abstraction
- [`supabase_production_schema.sql`](../supabase_production_schema.sql) — schema อ้างอิง

---

## Eval Checklist ก่อนส่ง coordinator review

- [ ] รัน `qa-eval` golden set ≥ 50 ข้อ → pass rate ≥ 90%
- [ ] no-answer cases ตอบ "ไม่พบ" ถูกต้อง ≥ 95%
- [ ] citation correctness ≥ 95%
- [ ] latency p50 < 1.5s บน test machine
- [ ] ไม่มี `text.split()` ในโค้ด chunking
- [ ] embedding dimension = 1024

---

## Dependencies ที่ต้องติดตั้ง

```txt
FlagEmbedding>=1.2.0      # BGE-M3 + reranker
pythainlp>=5.0.0          # Thai tokenizer
sentence-transformers      # cross-encoder reranker
pgvector                   # psycopg2 extension
redis[hiredis]            # semantic cache
celery[redis]             # async queue (หรือ arq)
```
