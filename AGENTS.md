# KbaseSME — Root Agent Context

> อ่านไฟล์นี้ก่อนทุก task ไม่ว่าจะเป็น agent ไหน

## Product in One Sentence

AI Knowledge Assistant สำหรับ SME ไทย 10–200 คน — พนักงานถามเอกสารบริษัท (HR Policy, SOP, ราคา) ผ่าน LINE OA หรือ Web Chat แล้วได้คำตอบภาษาไทยพร้อมอ้างอิงเอกสารจริง ไม่มั่ว ไม่ hallucinate

## Stack ที่ใช้

| ชั้น | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, Celery/Arq |
| Vector DB | PostgreSQL 16 + pgvector (HNSW + GIN FTS) |
| Embedding | BGE-M3 (1024-dim, self-hosted) |
| Reranker | bge-reranker-v2-m3 |
| Thai NLP | PyThaiNLP (tokenize), Typhoon OCR (scanned PDF) |
| LLM (POC ตอนนี้) | Alibaba Qwen / qwen3.5-flash (ดู config.yaml) |
| LLM Cloud (target) | Gemini 3.1 Flash-Lite / GPT-4.1-nano |
| LLM On-Prem (target) | Typhoon 2 (Ollama/vLLM) |
| Cache/Queue | Redis |
| Frontend | Next.js |
| Deploy | Docker Compose, nginx, TLS |

## Current State (POC — 31 พ.ค. 2026)

**สิ่งที่มีอยู่แล้ว (ใช้ต่อได้):**
- `src/rag_engine.py` — RAG orchestration (Chroma + Supabase, vector search, basic prompt)
- `src/document_loader.py` — PDF/DOCX/TXT/MD parser + word-based chunking
- `src/supabase_vector_store.py` — pgvector cosine search via Supabase RPC
- `src/llm_provider.py` — multi-provider abstraction (OpenAI, Anthropic, Ollama, Alibaba — ใช้ OpenAI-compatible API)
- `config.yaml` + `src/config.py` — config system ใช้ได้
- `supabase_production_schema.sql` — target schema design พร้อม (ยังไม่ได้ apply)
- `data/sample_docs/` — เอกสารตัวอย่าง

**สิ่งที่ยังไม่มี (ต้อง build):**
- FastAPI API (มีแค่ CLI scripts ไม่มี HTTP endpoints)
- Auth + JWT + tenant_id filtering
- Redis queue + semantic cache
- LINE webhook adapter
- Web Chat UI + Admin UI (มีแค่ landing HTML prototype)
- Docker Compose + nginx + TLS
- Eval harness + golden set
- PyThaiNLP chunking (ยังใช้ `text.split()`)
- BGE-M3 1024-dim embedding (ยังใช้ MiniLM 384)
- Reranker
- Hybrid search (vector + FTS)
- No-answer threshold

**ข้อจำกัดที่ต้องรู้:**
- Embedding dimension = 384 (POC) → จะเปลี่ยนเป็น 1024 (E3-1) — ต้อง re-embed ทั้งหมด
- Document table ชื่อ `documents` → จะเปลี่ยนเป็น `knowledge_sources` + `knowledge_chunks` (E1-1)
- Prompt เป็นภาษาอังกฤษ → ต้องเปลี่ยนเป็นไทย (E3-4)
- ไม่มี section-aware chunking → ต้องเขียนใหม่ (E2-2)

## 6 Containers

```
nginx → rag-api → postgres (pgvector)
              ↕
           redis (queue + semantic cache)
              ↓
        ingest-worker
              ↓
           LLM API
```

## Phases และ Milestones

| Phase | Milestone | เงื่อนไข |
|---|---|---|
| Build (W1–W6) | M1 RAG core | eval ≥ 90% |
| Build | M2 MVP ครบช่องทาง | web+admin+LINE end-to-end |
| GTM | M3 ขายได้ | demo+pricing+DPA พร้อม |
| Pilot | M4 ลูกค้าแรก go-live | UAT sign-off |
| Productize | M5 delivery ซ้ำได้ | template ครบ |
| Scale | M6 ดูแลหลายรายได้ | monitoring 5–10 รายพร้อม |

## How to Use These Files

ไฟล์ `.agents/` คือ context documents — ไม่มี runtime, ไม่มี daemon, ไม่มี automation

**วิธีใช้จริง:**
1. เปิด Claude Code (หรือ Hermes Agent) session ใหม่
2. สั่ง: "อ่าน .agents/rag-core.md แล้วทำ E2-2"
3. Agent อ่านไฟล์ → ได้ context ทั้งหมด (code patterns, dependencies, checklist)
4. ทำงาน → ตาม critical path ใน issue board
5. เสร็จแล้ว → คุณ (coordinator hat) รัน checklist แล้ว merge

**ไม่ใช่:** spawn framework, CI automation, webhook orchestration
**คือ:** discipline — อ่าน context ก่อน code, ตาม critical path, รัน checklist ก่อน merge

## Agent Roster

| Agent File | Role | ดูแล Issues |
|---|---|---|
| `.agents/coordinator.md` | ARC — orchestrate, route, guard quality | ทุก Epic (reviewer) |
| `.agents/rag-core.md` | BE+DATA — ingestion + retrieval | E2, E3 (#4–#14) |
| `.agents/api-eng.md` | BE — FastAPI, auth, LINE webhook | E4, E6 (#15–#27) |
| `.agents/ui-eng.md` | FE — Chat + Admin UI | E5 (#20–#23) |
| `.agents/data-prep.md` | DATA — parse, OCR, chunking, golden set | E2-3, E8-2, PIL-2 |
| `.agents/infra.md` | DEVOPS — Docker, TLS, monitoring | E7, E9 (#28–#38) |
| `.agents/qa-eval.md` | QA — eval harness, regression | E8 (#32–#34) |
| `.agents/delivery.md` | DEL — DFY playbook, onboarding | PD, PIL (#39–#55) |
| `.agents/bizdev.md` | BIZ — pricing, DPA, sales | GTM (#44–#49) |

## กฎที่ทุก Agent ต้องรู้

1. **P0 ก่อนเสมอ** — ไม่แตะ P1/P2 จนกว่า P0 ของ phase นั้นจะครบ
2. **Single-tenant first** — ทุก query มี `tenant_id`; ไม่ออกแบบ multi-tenant จนกว่าจะถึง Phase 6
3. **ห้าม expose key ฝั่ง frontend** — service-role backend เท่านั้น
4. **E3 คือ core ที่ขายได้** — อย่าลดทอน retrieval quality เพื่อความเร็วในการ ship
5. **ไทยตอบไทย** — ทุก prompt ที่ generate ต้องบังคับภาษาตามคำถาม
6. **ถ้าไม่มีข้อมูลพอ ตอบว่าไม่รู้** — no-answer ดีกว่า hallucinate

## สิ่งที่ห้ามทำโดยไม่ปรึกษา coordinator

- เปลี่ยน data model (schema, tenant_id strategy)
- เปลี่ยน embedding dimension หรือ model
- เพิ่ม external service ใหม่ที่ไม่อยู่ใน stack
- เปิด RLS ก่อน Phase 6

## Working Directory Structure

```
kbase-sme/
├── src/
│   ├── config.py
│   ├── rag_engine.py
│   ├── document_loader.py
│   ├── supabase_vector_store.py
│   └── llm_provider.py
├── landing/           ← HTML prototype (ยังไม่ใช่ Next.js)
├── supabase_production_schema.sql
├── config.yaml
└── requirements.txt
```

## ลำดับ Critical Path

```
E1-1 (schema) → E2-1/E2-2 → E3-1 → E3-2 → E3-3 → E3-4 → M1
                                                          ↓
                                              E4-2/4-3 → E5-1/5-2 → E6 → M2
                                                                        ↓
                                                          E9-1 + GTM → M3
```
