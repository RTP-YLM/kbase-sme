# src/ — Backend Agent Context

> Context เฉพาะสำหรับ agent ที่ทำงานใน `src/` directory
> อ่านร่วมกับ root `AGENTS.md` และ `.agents/rag-core.md` หรือ `.agents/api-eng.md`

---

## Files ใน src/

| File | หน้าที่ | สถานะ |
|---|---|---|
| `config.py` | โหลด config จาก config.yaml + env var expansion | ✅ POC — ใช้ได้ รองรับ dot-notation get() |
| `rag_engine.py` | RAG orchestration: embed → search → rerank → generate | ⚠️ ยกเครื่องใหม่ (E3) |
| `document_loader.py` | parse + chunk documents | ⚠️ ยกเครื่องใหม่ (E2) |
| `supabase_vector_store.py` | pgvector operations: upsert, search | ⚠️ update สำหรับ schema ใหม่ (dim 384→1024, FTS) |
| `llm_provider.py` | LLM abstraction: OpenAI, Anthropic, Ollama, Alibaba | ✅ POC — generate(prompt) ใช้ได้; E3-6 ต้องเพิ่ม system_prompt + context args |

---

## Schema — Current (POC) vs Target (E1-1)

> ⚠️ **สองสถานะนี้ต่างกัน** — ใช้ให้ถูก มิฉะนั้น code ที่เขียนจะอ้าง column ที่ยังไม่มี

### Current Schema (ใช้งานอยู่ใน `supabase_production_schema.sql`)

```sql
knowledge_sources (
    id uuid PRIMARY KEY,
    tenant_id uuid,
    title text, filename text,
    department text,          -- 'hr', 'accounting', 'sales'
    checksum text,            -- SHA256 dedup
    version int,
    status text,              -- 'active', 'archived', 'processing'
    access_level text,        -- 'public', 'internal', 'confidential'
    metadata jsonb
)

knowledge_chunks (
    id bigserial PRIMARY KEY,       -- bigint, ไม่ใช่ UUID
    source_id uuid REFERENCES knowledge_sources(id),
    tenant_id uuid,
    department text,
    chunk_index int,
    content text,
    embedding vector(384),          -- MiniLM 384-dim (POC)
    token_count int,
    metadata jsonb
    -- ไม่มี content_tsv — FTS ยังไม่ได้เพิ่ม
)

rag_query_logs (
    id bigserial PRIMARY KEY,
    tenant_id uuid, user_id uuid,
    question text, answer text,
    retrieved_chunk_ids bigint[],   -- ไม่ใช่ sources[]
    top_similarity float,
    latency_ms int, llm_model text,
    feedback text                   -- 'thumbs_up', 'thumbs_down'
)

document_ingestion_jobs (
    id uuid PRIMARY KEY,
    tenant_id uuid,
    source_id uuid,
    status text,              -- 'pending', 'running', 'completed', 'failed'
    error_message text,
    chunks_created int,
    started_at timestamptz, completed_at timestamptz
    -- ไม่มี step column
)

-- ไม่มี tenants table
-- ไม่มี app_users table
```

**RPC function ที่มี:** `match_knowledge_chunks(query_embedding vector(384), match_count, filter_tenant_id, filter_department)`

### Target Schema (สร้างใน E1-1 — ยังไม่ได้ทำ)

เพิ่มจาก current:
- `tenants` table
- `app_users` (line_user_id, role, departments[])
- `knowledge_chunks.embedding` → `vector(1024)` (BGE-M3)
- `knowledge_chunks.content_tsv` → FTS column + GIN index
- `rag_query_logs.sources jsonb[]` + `answered bool` + `from_cache bool`
- `document_ingestion_jobs.step` column
- access_level เป็น int (1–4) แทน text

**→ อย่าเขียน code อ้าง target schema จนกว่า E1-1 จะเสร็จ**

---

## Naming Conventions

```python
# Variables — current schema (POC)
tenant_id: str          # UUID string
source_id: str          # UUID
chunk_id: int           # bigserial int (current); UUID ใน target schema (E1-1)
embedding: list[float]  # length 384 (current POC); 1024 หลัง E1-1+E3-1

# Functions
async def embed_text(text: str) -> list[float]: ...
async def hybrid_search(query: str, tenant_id: str, top_k: int = 20) -> list[Chunk]: ...
async def rerank(query: str, chunks: list[Chunk], top_n: int = 5) -> list[Chunk]: ...
async def generate(query: str, context: list[Chunk]) -> QueryResponse: ...

# Classes
class Chunk(BaseModel):
    chunk_id: str
    source_id: str
    content: str
    section: str | None
    rerank_score: float | None

class QueryResponse(BaseModel):
    answered: bool
    answer: str | None
    sources: list[Source]
    latency_ms: int
    from_cache: bool
```

---

## ราก POC ที่ยังคงใช้ได้

จาก POC เดิม สิ่งที่ยังใช้ได้:
- `config.py` — YAML load + `${ENV_VAR}` expansion + dot-notation `get()` ใช้ได้ทุก phase
- `llm_provider.py` — มี OpenAI/Anthropic/Ollama/AlibabaProvider ครบ; generate() interface ดีอยู่แล้ว; เพิ่ม system_prompt param สำหรับ E3-4

สิ่งที่ต้องเขียนใหม่ทั้งหมด:
- `document_loader.py` — เลิก `text.split()`, ใช้ PyThaiNLP, section-aware chunking
- `rag_engine.py` — เพิ่ม hybrid search + reranker + no-answer threshold + citation
- `supabase_vector_store.py` — update สำหรับ schema ใหม่ (1024-dim, FTS, app_users) หลัง E1-1

**LLM ที่ใช้อยู่ตอนนี้ (POC):** Alibaba / qwen3.5-flash (ดู `config.yaml`)
**LLM เป้าหมาย (production):** Gemini 3.1 Flash-Lite หรือ GPT-4.1-nano (cloud), Typhoon 2 (on-prem)

---

## Error Handling Pattern

```python
# ใช้ custom exceptions แทน generic Exception
class KBaseError(Exception): pass
class NoAnswerError(KBaseError): pass          # rerank score < threshold
class TenantNotFoundError(KBaseError): pass
class IngestError(KBaseError):
    def __init__(self, step: str, detail: str): ...

# ใน API layer แปลงเป็น HTTP response
# ไม่ expose stack trace ใน production response
```

---

## Testing

```
tests/
├── test_chunking.py       # unit test: PyThaiNLP chunking
├── test_embedding.py      # integration: BGE-M3 output shape
├── test_retrieval.py      # integration: hybrid search + rerank
├── test_generation.py     # integration: grounded prompt + no-answer
└── test_e2e.py            # E2E: upload → query → response
```

**หลักการ:**
- Unit test: chunking logic ไม่ต้องการ DB
- Integration test: ต้องการ PG + Redis จริง (ห้าม mock DB — ดู eval philosophy)
- E2E: รัน docker compose test profile
