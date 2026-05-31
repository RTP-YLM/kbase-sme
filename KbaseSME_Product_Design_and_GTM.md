# KbaseSME — AI Knowledge Assistant for Thai SMEs
## Product Design & Go-to-Market Blueprint

**Anchor model:** Done-For-You (DFY) Single-Tenant + LINE OA
**Version:** 1.0 · **Date:** 31 May 2026 · **Owner:** RTP-YLM
**Status:** Production design — bridges existing CLI POC → first paying customer

> เอกสารนี้คือ design ระดับ product จริงที่ "เลือกแล้ว ตัดสินใจแล้ว" ไม่ใช่ vision เปิดกว้าง — รวม technical architecture, delivery playbook, pricing ที่ validate กับตลาดปัจจุบัน (พ.ค. 2026), unit economics และแผน build 6 สัปดาห์สู่ลูกค้าจ่ายเงินรายแรก

---

## สารบัญ

1. Executive Summary — ขายอะไร ให้ใคร ทำไมชนะ
2. Product Definition & Positioning
3. Sellable MVP — Scope Lock (v1)
4. Technical Architecture (Single-Tenant DFY)
5. Data Model (Production Schema)
6. RAG Pipeline — Quality Design (แก้จุดอ่อน POC)
7. API Contract
8. LINE OA Integration
9. Security, Access Control & PDPA
10. DFY Delivery Playbook (หัวใจของ product)
11. Commercial Design — Pricing & Unit Economics
12. Go-to-Market & Sales Motion
13. Risks & Mitigations
14. Roadmap (POC → ลูกค้ารายแรก → SaaS)
15. 6-Week Build Plan
16. Success Metrics / KPIs
17. Appendix — Stack, Decisions Log

---

## 1. Executive Summary

**ขายอะไร:** ผู้ช่วย AI ที่ตอบคำถามพนักงานจาก "เอกสารจริงของบริษัท" (HR, การเงิน, SOP, SLA, compliance) เป็นภาษาไทย พร้อมอ้างอิงแหล่งที่มา ใช้งานผ่านเว็บแชทและ **LINE OA**

**ขายให้ใคร:** SME ไทย 10–200 คน ที่ความรู้กระจัดกระจาย (PDF/Excel/LINE/หัวคนอาวุโส) และ **ไม่มีทีม IT ของตัวเอง**

**โมเดลขายหลัก (เลือกแล้ว):** **Done-For-You แบบ single-tenant** — เราติดตั้งให้ทีละราย เก็บ **Setup Fee (ครั้งเดียว) + ค่าบริการรายเดือน** ไม่ใช่ self-serve SaaS ที่ลูกค้าต้องตั้งเอง

**ทำไมชนะ (3 ข้อ):**

1. **ภาษาไทย + LINE OA + งานจัดข้อมูลให้** — สิ่งที่ DIY SaaS ระดับโลก (Chatbase ฯลฯ) ทำไม่ได้
2. **Done-For-You** — ลูกค้า SME ไม่อยากตั้งระบบเอง เราขาย "ผลลัพธ์" ไม่ใช่ "เครื่องมือ"
3. **Single-tenant / On-Premise option** — ข้อมูลอยู่ในเครือข่ายลูกค้า 100% เป็นจุดขายตรงกับ **PDPA** ที่บังคับใช้จริงและเริ่มปรับแล้ว (ค่าปรับครั้งแรก 21.5 ล้านบาท ส.ค. 2025)

**ตัวเลขหลัก:** Setup Fee 50,000–200,000 บาท + รายเดือน 4,900 / 14,900 / 39,900 บาท · **Gross margin รายเดือน > 85%** (ต้นทุน LLM ปัจจุบันต่ำมาก — ดูข้อ 11)

**Next step:** ตามแผน build 6 สัปดาห์ (ข้อ 15) → ปิด pilot แบบเก็บเงิน 1–3 ราย → ใช้เป็น case study ขายต่อ

---

## 2. Product Definition & Positioning

### 2.1 One-liner

> "AI ที่ให้พนักงาน SME ถามเรื่องงานแล้วได้คำตอบจากเอกสารบริษัทจริง ภาษาไทย ผ่าน LINE — เราติดตั้งและจัดข้อมูลให้ครบ"

### 2.2 Ideal Customer Profile (ICP) — โฟกัส 3 vertical แรก

อย่ายิงทุก vertical พร้อมกัน เลือก 3 ที่ "เจ็บปวดชัด + เอกสารเยอะ + ยอมจ่าย":

| Vertical | ความเจ็บปวด | เอกสารที่ ingest |
|---|---|---|
| **คลินิก / ความงาม / Healthcare service** | พนักงานหน้าร้านถามขั้นตอน/ราคา/โปรซ้ำ, turnover สูง | SOP บริการ, ราคา, การเคลม, การนัด |
| **สำนักงานบัญชี / กฎหมาย** | คำถาม compliance ซ้ำ, ความรู้อยู่กับ senior | ระเบียบภาษี, checklist, template, deadline |
| **ค้าปลีก / กระจายสินค้า / แฟรนไชส์** | สาขาเยอะ มาตรฐานไม่ตรงกัน | SOP สาขา, นโยบายคืนสินค้า, สต็อก, โปรโมชัน |

เกณฑ์คัด ICP: 10–200 คน · มีเอกสารภายใน ≥ 30 ไฟล์ · ใช้ LINE เป็นช่องทางหลักภายใน · ไม่มี/มีทีม IT น้อย · มีคน "เจ็บ" กับคำถามซ้ำ (HR/หัวหน้าสาขา/admin)

### 2.3 Positioning vs ตลาด (ราคาปัจจุบัน พ.ค. 2026)

| คู่แข่ง | ราคา | จุดอ่อนที่เราชนะ |
|---|---|---|
| **Global DIY SaaS** (Chatbase) | Hobby $40 / Standard $150 / Pro $500 ต่อเดือน + ค่า add-on | Self-serve, อังกฤษเป็นหลัก, ไม่จัดข้อมูลให้, ไม่มี LINE OA จริง, ไม่มี on-prem, credit system งง |
| **Thai e-commerce bot** (Zwiz ฯลฯ) | หลักพัน/เดือน | เก่งปิดการขาย/บรอดแคสต์ แต่ไม่เจาะ knowledge ลึกจาก SOP/Policy |
| **SI / Software House** | 500,000–1,500,000+ บาท/โปรเจกต์ | แพงเกินเอื้อม SME, นาน, ไม่มี product สำเร็จรูป |

> **ช่องว่างที่เรายึด:** "DFY mid-market" — แพงกว่า DIY แต่ถูกและเร็วกว่า SI หลายเท่า โดยขายงาน "จัดข้อมูล + ติดตั้ง + เชื่อม LINE" ที่ทั้งสองฝั่งไม่ทำ

### 2.4 ทำไม DFY Single-Tenant ก่อน (ไม่ใช่ SaaS multi-tenant)

| มิติ | DFY Single-Tenant (เลือก) | SaaS Multi-Tenant (ทีหลัง) |
|---|---|---|
| เวลาสู่เงินก้อนแรก | **เร็ว** — ไม่ต้องทำ billing/RLS/self-serve onboarding | ช้า — ต้อง build ครบก่อนขาย |
| สิ่งที่ต้อง build | RAG core + admin + LINE + 1 deploy | + multi-tenant RLS + billing + signup + tenant isolation test |
| จุดขาย PDPA | **แข็งมาก** (ข้อมูลแยกต่อราย/on-prem) | ต้องอธิบาย isolation เยอะ |
| รายได้ต่อดีล | สูง (setup + เดือน) | ต่ำต่อราย แต่ scale |
| ความเสี่ยง | ต่ำ — เรียนรู้จากลูกค้าจริงก่อนลงทุนหนัก | สูง — ลงทุนก่อนรู้ว่าตลาดซื้อจริงไหม |

**กลยุทธ์:** เขียน **single codebase** ที่ออกแบบ multi-tenant-ready ตั้งแต่วันแรก (มี `tenant_id` ในทุกตาราง) แต่ **deploy แบบ single-tenant** ก่อน → พอมีลูกค้า 5–10 รายและเห็น pattern ซ้ำ ค่อยเปิดโหมด SaaS โดยไม่ต้องเขียนใหม่

---

## 3. Sellable MVP — Scope Lock (v1)

นิยาม "ขายได้" = ลูกค้ายอมจ่าย setup + เดือนแรก เพราะมันแก้คำถามซ้ำได้จริงและพนักงานใช้ผ่าน LINE

### 3.1 In-Scope (ต้องมีถึงเก็บเงินได้)

- Ingestion pipeline: รองรับ `.md .txt .pdf .docx` + **OCR สำหรับ PDF สแกน** (Typhoon OCR) + **ตัดคำไทย** (PyThaiNLP)
- **Source catalog + checksum dedup** (knowledge_sources / knowledge_chunks) — แก้/ลบ/re-index ไฟล์ได้ ไม่มี vector ขยะปนกัน
- **Hybrid retrieval** (vector + keyword) + **reranker** → คำตอบแม่นขึ้นชัด
- คำตอบภาษาไทย + **อ้างอิงแหล่งที่มา** + นโยบาย "ไม่พบข้อมูลเพียงพอ" (กัน hallucination)
- **Web Chat UI** (ลูกค้าใช้จริง + ใช้ demo)
- **Admin UI ขั้นต่ำ**: อัปโหลด/ลบ/re-index เอกสาร, ดูสถานะ ingest, ดู query logs + คำถามที่ตอบไม่ได้
- **LINE OA adapter**: ถามผ่าน LINE ได้ ตอบพร้อม source สั้น
- Auth พื้นฐาน (admin + user) + role
- Query logs + feedback (ถูก/ผิด/ไม่ชัด)
- Deploy ด้วย **Docker Compose** ลงได้ทั้ง VPS ของเรา หรือ server ลูกค้า (on-prem)

### 3.2 Explicitly Out (เก็บไว้ v2+)

ตัดทิ้งเพื่อให้ทันขาย — ห้าม scope creep:

- Self-serve signup / billing / payment gateway → (เพราะ DFY เก็บเงินผ่าน invoice)
- Multi-tenant control plane / org switcher
- SSO, SCIM, fine-grained per-document ACL UI (ใช้ department-level ก่อน)
- Google Drive / SharePoint / Notion auto-sync (v1 อัปโหลดเองหรือเรา ingest ให้)
- Slack / Teams bot
- Streaming response, voice, มือถือ native app
- Auto document-quality scoring, AI document rewriter

### 3.3 Definition of Done (สำหรับ 1 ลูกค้า)

ingest ≥ 30 เอกสารจริงของลูกค้า · ตอบชุดคำถามทอง (golden set) ≥ 30 ข้อถูก ≥ 90% · ทุกคำตอบมี source · no-answer ทำงานเมื่อไม่มีข้อมูล · ใช้ผ่าน LINE ได้ · admin แก้เอกสารแล้ว re-index ได้เอง · มี runbook ส่งมอบ

---

## 4. Technical Architecture (Single-Tenant DFY)

### 4.1 หลักการ: "Single codebase, single-tenant deploy"

ซอฟต์แวร์ชุดเดียว deploy ได้ 2 แบบจาก `docker-compose.yml` + `.env`:

- **Hosted single-tenant** — เราเช่า VPS เล็ก 1 เครื่องต่อลูกค้า 1 ราย (หรือแยก DB/schema ต่อราย) ใช้ Cloud LLM API
- **On-Premise** — ลง stack เดียวกันบน server ลูกค้า ใช้ **Local LLM (Typhoon 2 ผ่าน Ollama/vLLM)** ข้อมูลไม่ออกจากออฟฟิศเลย

ทุกตารางมี `tenant_id` ตั้งแต่วันแรก (ค่า default = 1 ในโหมด single-tenant) → วันที่จะเปิด SaaS ไม่ต้องเขียน schema ใหม่

### 4.2 Component Diagram (single-tenant stack)

```
                    ┌──────────────────────────────┐
   พนักงาน  ───────▶│  LINE OA  │  Web Chat  │ Admin │   (Client Access)
                    └─────┬───────────┬──────────┬───┘
                          │ webhook   │ https    │ https
                          ▼           ▼          ▼
                    ┌──────────────────────────────────┐
                    │   Nginx Reverse Proxy (TLS/Auth)  │
                    └─────────────────┬─────────────────┘
                                      ▼
                    ┌──────────────────────────────────┐
                    │   rag-api  (FastAPI)              │
                    │   /query /documents /ingest /auth │
                    │   /line/webhook /feedback         │
                    └───┬───────────┬───────────┬───────┘
            enqueue job │           │ search    │ generate
                        ▼           ▼           ▼
        ┌────────────────┐  ┌──────────────┐  ┌─────────────────────┐
        │ Redis          │  │ PostgreSQL   │  │ LLM Engine          │
        │ queue + cache  │  │ + pgvector   │  │ Cloud API  หรือ      │
        └───────┬────────┘  │ (HNSW + FTS) │  │ Local Ollama/vLLM   │
                │ pick job  └──────┬───────┘  │ (Typhoon 2)         │
                ▼                  ▲          └─────────────────────┘
        ┌────────────────┐        │ store chunks
        │ ingest-worker  │────────┘
        │ OCR · ตัดคำไทย   │   ┌──────────────────────┐
        │ chunk · embed   │──▶│ File Store (vol / S3) │
        │ + rerank model  │   └──────────────────────┘
        └────────────────┘
```

### 4.3 Services (containers)

| Container | หน้าที่ | Tech |
|---|---|---|
| `nginx` | reverse proxy, TLS, basic protection | Nginx |
| `rag-api` | REST API, auth, query orchestration, LINE webhook | FastAPI (Python 3.12) |
| `ingest-worker` | parse → OCR → ตัดคำ → chunk → embed → upsert | Python + Celery/Arq |
| `redis` | job queue + **semantic cache** | Redis |
| `postgres` | catalog + chunks + vectors + logs | PostgreSQL 16 + pgvector |
| `embed/rerank` | BGE-M3 embed + bge-reranker-v2-m3 | sentence-transformers (รันใน worker หรือแยก container) |
| `llm` *(on-prem เท่านั้น)* | Local LLM | Ollama / vLLM + Typhoon 2 |
| `web` | Chat UI + Admin UI | Next.js (static export ได้) |

> เหตุผลที่ใช้ **FastAPI + Docker Compose + Postgres+pgvector**: ตรงกับสกิลที่มีอยู่, setup/deploy/maintain ง่าย (เป้าหมายหลักของลูกค้า on-prem), ใช้ stack เดียวทั้ง hosted และ on-prem ลดต้นทุนดูแล

### 4.4 ทำไมไม่แยก microservices ตั้งแต่แรก

v1 = **modular monolith**: `rag-api` เป็น service เดียว แยกแค่ `ingest-worker` ออกเป็น async (เพราะไฟล์ใหญ่/OCR ช้า ห้าม block) — พอ scale ค่อยผ่า service ทีหลัง การแยก 6 microservices ตั้งแต่แรก = ต้นทุน DevOps ที่ลูกค้า SME ไม่ได้จ่ายให้

---

## 5. Data Model (Production Schema)

ยืนยันทิศ source/chunk catalog ที่วางไว้แล้ว + เพิ่ม users/roles สำหรับ single-tenant และคง `tenant_id` ไว้ทุกตารางเพื่อ SaaS-ready

```sql
-- ทุกตารางมี tenant_id (single-tenant: ใช้ค่าคงที่; multi-tenant: มาจาก JWT)

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'growth',
  created_at timestamptz default now()
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  email text,
  line_user_id text,                       -- map คน LINE → user
  role text default 'employee',            -- employee | admin
  departments text[] default '{}',         -- สิทธิ์ระดับแผนก
  created_at timestamptz default now()
);

create table knowledge_sources (           -- 1 แถว = 1 ไฟล์ต้นทาง
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  filename text not null,
  department text,
  source_type text default 'file',         -- file | gdrive | manual
  storage_path text,
  checksum text,                           -- SHA256 → กัน ingest ซ้ำ
  version int default 1,
  status text default 'active',            -- active | archived | ingesting | error
  access_level text default 'internal',    -- public | internal | restricted
  effective_date date,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table knowledge_chunks (            -- N แถว = chunks ของไฟล์
  id bigserial primary key,
  source_id uuid not null references knowledge_sources(id) on delete cascade,
  tenant_id uuid not null,
  department text,
  access_level text default 'internal',
  chunk_index int not null,
  content text not null,
  content_tsv tsvector,                    -- สำหรับ keyword / hybrid search
  embedding vector(1024) not null,         -- BGE-M3 = 1024 มิติ (เดิม POC 384)
  token_count int,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table document_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_id uuid,
  status text,                             -- queued | running | done | error
  step text,                               -- parse | ocr | chunk | embed | upsert
  error_message text,
  chunks_created int default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table rag_query_logs (
  id bigserial primary key,
  tenant_id uuid not null,
  user_id uuid,
  channel text default 'web',              -- web | line | admin
  question text not null,
  answer text,
  retrieved_chunk_ids bigint[],
  top_similarity float,
  rerank_score float,
  answered boolean,                        -- false = no-answer (สำคัญต่อ analytics)
  latency_ms int,
  llm_model text,
  token_in int, token_out int,             -- ติดตาม cost ต่อ query
  feedback text,                           -- correct | wrong | unclear
  created_at timestamptz default now()
);
```

**Indices สำคัญ**

```sql
create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);  -- ANN เร็ว
create index on knowledge_chunks using gin (content_tsv);                   -- keyword
create index on knowledge_chunks (tenant_id, department, access_level);     -- filter
create index on knowledge_sources (tenant_id, checksum);                    -- dedup
create index on rag_query_logs (tenant_id, answered, created_at);           -- analytics
```

> **Migration จาก POC:** ตาราง `documents` (vector 384) เดิม → ย้ายเข้า `knowledge_sources` + `knowledge_chunks` (vector 1024) พร้อม re-embed ด้วย BGE-M3 ครั้งเดียว เขียน `migrate_poc_to_catalog.py` รันทีเดียวจบ

---

## 6. RAG Pipeline — Quality Design (แก้จุดอ่อน POC)

นี่คือส่วนที่เปลี่ยน "demo ที่พอใช้" → "product ที่ตอบแม่นพอจะเก็บเงิน" แก้ตรงจุดอ่อนที่ feasibility analysis ระบุไว้

### 6.1 Ingestion (เขียนใหม่จากของเดิม)

```
ไฟล์ → checksum (SHA256)
   ├─ ซ้ำ + ไม่เปลี่ยน → skip
   ├─ เปลี่ยน → archive version เก่า + ลบ chunks เก่า → ingest ใหม่
   └─ ใหม่ → ingest
ingest: detect type
   ├─ PDF สแกน/รูป → OCR (Typhoon OCR) ──┐
   ├─ PDF/DOCX/MD/TXT → text parser ──────┤
   └─ ตาราง → แปลงเป็น markdown table ─────┘
            ▼
   ตัดคำ/ตัดประโยคไทย (PyThaiNLP newmm) → section-aware chunking
            ▼
   BGE-M3 embedding (1024) + เก็บ content_tsv
            ▼
   upsert เข้า knowledge_chunks ผูก source_id + อัปเดต job status
```

**3 จุดที่แก้จาก POC (ตรงกับ concern ที่วิเคราะห์ไว้):**

1. **ตัดคำไทย** — เลิกใช้ `text.split()` (พังกับภาษาไทยที่ไม่มีเว้นวรรค) → ใช้ **PyThaiNLP** + chunk ตาม section/ประโยค ไม่ใช่นับคำอังกฤษ
2. **PDF สแกน / รูป** — เพิ่ม **Typhoon OCR** (open VLM ไทย, BLEU ~0.91 / ROUGE-L ~0.94 บนเอกสารการเงินไทย, รัน int8 ได้) แก้เคสนโยบายเก่าที่เป็นภาพสแกนใน LINE
3. **ตาราง** — แปลงเป็น Markdown table ก่อน chunk เพื่อรักษาความสัมพันธ์ แถว/คอลัมน์ (ตารางเบิกจ่าย/ค่าตอบแทนไม่เพี้ยน)

### 6.2 Embedding — อัปเกรดจาก MiniLM

| | POC เดิม | v1 (แนะนำ) |
|---|---|---|
| Model | paraphrase-multilingual-MiniLM-L12-v2 | **BGE-M3 (BAAI)** |
| มิติ | 384 | 1024 |
| จุดเด่น | เบา | ไทยแม่นกว่า, 100+ ภาษา, context 8192, ให้ทั้ง dense+sparse ในตัว, self-host ได้ |

BGE-M3 รัน self-host ได้ (ฟรี, ไม่มีค่า API) → เหมาะทั้ง hosted และ on-prem

### 6.3 Retrieval — Hybrid + Rerank (ของใหม่)

```
question → embed
  ├─ Vector search (pgvector cosine, top 20)
  └─ Keyword search (Postgres FTS, top 20)
        ▼ รวม + dedup
  Reranker (bge-reranker-v2-m3, cross-encoder ไทยได้) → top 3–5
        ▼ filter ตาม department/access_level ของ user
  context สุดท้าย → prompt
```

แก้ปัญหา vector-only เดิม: คำเฉพาะ/ตัวย่อ/วลีไทยสั้น ที่ vector มองข้าม จะถูก keyword จับ แล้ว reranker คัดคุณภาพอีกชั้น

### 6.4 Generation — grounded + no-answer

Prompt บังคับ: ตอบจาก context เท่านั้น · ไทยเมื่อถามไทย · อ้างอิง source · **ถ้าไม่พบให้ตอบ "ไม่พบข้อมูลเพียงพอ ติดต่อ [แผนก]"** ห้ามเดา

รูปแบบคำตอบ:
```
คำตอบ: ...
อ้างอิง: HR Policy 2026 · หัวข้อ "การลา" · ความมั่นใจ 0.86
หมายเหตุ: หากต้องการยืนยันล่าสุด ติดต่อฝ่าย HR
```

Threshold: ถ้า rerank score สูงสุด < เกณฑ์ → no-answer (กัน hallucination = ความเสี่ยงเชิงพาณิชย์อันดับ 1)

### 6.5 Semantic Cache (ลด cost + เร็วขึ้น)

ก่อน query จริง เช็คคำถามคล้ายใน Redis (embedding similarity) — ถ้า hit คืนคำตอบเดิมทันที (<100ms, ไม่เสีย token) คำถามซ้ำ ("ลากี่วัน") คือ use case หลัก → cache hit สูง → cost ต่ำ

### 6.6 LLM เลือกตาม deployment / tier

| Deployment | LLM | เหตุผล (ราคา พ.ค. 2026) |
|---|---|---|
| Hosted Starter/Growth | **Gemini 3.1 Flash-Lite** ($0.10/$0.40) หรือ GPT-4.1-nano ($0.10/$0.40) | ถูกสุด คุณภาพพอสำหรับ RAG, margin > 85% |
| Hosted (ไทยเน้นบริบท/กฎหมาย) | **Typhoon 2 API** หรือ Claude Haiku ($0.25/$1.25) | ไทยแม่นขึ้นในงาน knowledge/legal |
| On-Premise Business | **Typhoon 2 (local, Ollama/vLLM)** | ไม่มีค่า API รายเดือน, ข้อมูลไม่ออกนอกองค์กร |

Provider abstraction (มีใน POC แล้ว) → สลับ model ได้จาก config ต่อราย

### 6.7 Evaluation (ห้ามขายโดยไม่วัด)

- **Golden set** ต่อลูกค้า: 30–50 คำถามจริง + คำตอบที่คาดหวัง + source ที่ถูก
- Metrics: retrieval hit rate, answer faithfulness, citation ถูก, no-answer ถูก, latency, cost/query
- รันทุกครั้งก่อน go-live และหลังอัปเดตเอกสารใหญ่ → เป็นทั้ง QA และ "หลักฐานคุณภาพ" ให้ลูกค้าดู

---

## 7. API Contract

REST, JSON, JWT auth. เวอร์ชัน `/api/v1`. ออกแบบให้ web, admin และ LINE ใช้ร่วมกัน

| Method · Endpoint | หน้าที่ | Auth |
|---|---|---|
| `POST /api/v1/auth/login` | login → JWT (มี tenant_id, role, departments) | public |
| `POST /api/v1/query` | ถามคำถาม → คำตอบ + sources | user |
| `POST /api/v1/documents` | อัปโหลดไฟล์ (multipart) → คืน job_id | admin |
| `GET /api/v1/documents` | รายการ source + สถานะ + chunk count | admin |
| `POST /api/v1/documents/{id}/reindex` | re-index ไฟล์เดียว | admin |
| `DELETE /api/v1/documents/{id}` | archive + ลบ chunks | admin |
| `GET /api/v1/jobs/{id}` | สถานะ ingestion job | admin |
| `GET /api/v1/logs` | query logs + คำถามที่ตอบไม่ได้ + feedback | admin |
| `POST /api/v1/feedback` | บันทึก correct/wrong/unclear | user |
| `POST /api/v1/line/webhook` | รับ event จาก LINE | LINE signature |
| `GET /api/v1/health` | health check | public |

**ตัวอย่าง `POST /api/v1/query`**

```jsonc
// request
{ "question": "พนักงานลากิจได้กี่วัน", "channel": "web" }

// response
{
  "answered": true,
  "answer": "พนักงานมีสิทธิ์ลากิจได้ 3 วันทำงานต่อปี",
  "sources": [
    { "title": "HR Policy 2026", "section": "การลา",
      "source_id": "…", "rerank_score": 0.86 }
  ],
  "latency_ms": 740,
  "from_cache": false
}
```

ถ้าไม่พบ → `{ "answered": false, "answer": "ไม่พบข้อมูลเพียงพอ กรุณาติดต่อฝ่าย HR", "sources": [] }`

---

## 8. LINE OA Integration

LINE คือช่องทาง adoption หลัก (พนักงานไม่อยากเปิดเว็บแยก) — ทำให้ "อัตราการใช้จริง" สูงขึ้นมาก

**Flow**

```
พนักงานพิมพ์ใน LINE OA
   → LINE platform ส่ง webhook → POST /api/v1/line/webhook
   → verify X-Line-Signature (channel secret)
   → map line_user_id → app_users (ถ้าไม่มี = guest/ลงทะเบียน)
   → เรียก query pipeline เดียวกับเว็บ (ใช้สิทธิ์ department ของ user)
   → reply ผ่าน LINE Messaging API: คำตอบ + source สั้น + ปุ่ม 👍/👎 (quick reply)
```

**ดีไซน์ที่ต้องคิด**

- ตอบภายใน timeout ของ LINE → ถ้า LLM ช้า ใช้ "กำลังค้นหา…" loading หรือ push message ตามหลัง
- **Rich menu**: ปุ่มลัด "ถาม HR / บัญชี / SOP สาขา" → ตั้ง department filter อัตโนมัติ
- จับคู่ผู้ใช้: ครั้งแรกให้ผูกอีเมล/รหัสพนักงาน เพื่อให้สิทธิ์แผนกถูกต้อง (เอกสาร restricted ไม่หลุด)
- feedback ผ่าน quick reply → เก็บลง `rag_query_logs.feedback`

---

## 9. Security, Access Control & PDPA

จุดนี้ไม่ใช่แค่ technical — เป็น **จุดขาย** โดยเฉพาะกับคลินิก/บัญชี/กฎหมายที่ข้อมูลอ่อนไหว

### 9.1 Access Control

- **Backend ใช้ service role เท่านั้น** ไม่ expose key ออก frontend (POC ใช้ permissive policy = ห้ามขึ้น prod)
- Department-level: query filter `where department in (user.departments) and access_level in ('public','internal')`
- เอกสาร `restricted` (เงินเดือน, สัญญา, ข้อมูลลูกค้า, งบการเงิน) ไม่เข้าบอททั่วองค์กร — ต้องสิทธิ์ชัดเจน
- โหมด SaaS ในอนาคต: RLS `tenant_id = current_setting('app.current_tenant_id')` (schema พร้อมแล้ว)

### 9.2 PDPA (บังคับใช้จริง — เป็นทั้งความเสี่ยงและจุดขาย)

PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล) บังคับเต็มตั้งแต่ มิ.ย. 2022 และ **เริ่มปรับจริงแล้ว** — ค่าปรับทางปกครองครั้งใหญ่ครั้งแรกกว่า 21.5 ล้านบาท (ส.ค. 2025), โทษสูงสุดถึง 5 ล้านบาท + โทษอาญา

ผลต่อ product:

- **เราเป็น "ผู้ประมวลผลข้อมูล" (Data Processor)** ของลูกค้า → ต้องมี **DPA (Data Processing Agreement)** กับลูกค้าทุกราย (เป็น template มาตรฐานในแพ็กเกจ setup)
- **Single-tenant / On-Premise = จุดขายตรง PDPA**: ข้อมูลอยู่ในเครือข่ายลูกค้า ไม่ปนรายอื่น ลด exposure → ขายคลินิก/บัญชี/กฎหมายได้ง่ายขึ้น
- ต้องมี: audit log (ใครถามอะไร เห็นเอกสารไหน), การลบข้อมูลเมื่อเลิกสัญญา, เก็บ secret ใน `.env`/secret manager เท่านั้น, เข้ารหัส at-rest/in-transit
- ระวัง: เอกสารลูกค้าอาจมีข้อมูลส่วนบุคคล (ชื่อ/เบอร์/อีเมลพนักงาน) → กำหนด access_level + ไม่ log ข้อมูลอ่อนไหวเกินจำเป็น
- จับตา **PDPC Trust Mark** (คาดประกาศ Q2–Q3 2026) — ได้มาจะเป็น credential ขายของ

---

## 10. DFY Delivery Playbook (หัวใจของ product)

> นี่คือ "ตัวสินค้า" จริง ไม่ใช่ซอฟต์แวร์อย่างเดียว — ลูกค้าจ่าย setup fee เพราะ **เราจัดข้อมูลให้** ซึ่ง DIY SaaS และ SI ทั่วไปไม่ทำ ทำให้กระบวนการนี้ซ้ำได้ = ขยายธุรกิจได้

กระบวนการมาตรฐานต่อ 1 ลูกค้า (2–4 สัปดาห์):

| ขั้น | ทำอะไร | ผลลัพธ์ / ส่งมอบ |
|---|---|---|
| **1. Discovery** (1–2 วัน) | สัมภาษณ์: คำถามซ้ำอะไรมากสุด ใครเจ็บ แผนกไหนก่อน ช่องทาง (LINE?) | รายการ use case + golden questions เบื้องต้น |
| **2. Document Audit** (2–3 วัน) | รวบรวมเอกสาร, หาเวอร์ชันล่าสุด, ชี้จุดขัดแย้ง/ล้าสมัย | ทะเบียนเอกสาร + รายการที่ต้องแก้ (ร่วมกับลูกค้า) |
| **3. Data Prep** (3–5 วัน) | OCR ไฟล์สแกน, จัดตาราง, ทำ metadata (แผนก/วันที่/สิทธิ์), จัดโฟลเดอร์ตามแผนก | ชุดเอกสารพร้อม ingest |
| **4. Ingestion + Tuning** (2–3 วัน) | ingest, รัน eval กับ golden set, ปรับ chunking/threshold | รายงานคุณภาพ (pass rate, ตัวอย่างคำตอบ) |
| **5. LINE OA + Web setup** (1–2 วัน) | ตั้ง LINE OA, rich menu, ผูกผู้ใช้, deploy stack | ระบบใช้งานได้จริง URL + LINE |
| **6. UAT** (2–3 วัน) | ลูกค้าทดสอบกับพนักงานกลุ่มเล็ก, เก็บ feedback, แก้ | sign-off |
| **7. Go-Live + Train** (1 วัน) | อบรมผู้ใช้/แอดมิน, ส่งมอบ runbook | ระบบ live + คู่มือ |
| **8. Retain** (รายเดือน) | ดูแล, อัปเดตเอกสาร, รายงานการใช้ + คำถามที่ตอบไม่ได้, ปรับปรุง | รายงานรายเดือน = เหตุผลต่อสัญญา |

**ทำไม step 8 สำคัญ:** "คำถามที่ตอบไม่ได้" = ช่องว่างความรู้ของลูกค้า → เราเสนอเพิ่มเอกสาร/อัปเดต = สร้างคุณค่าต่อเนื่อง = ลด churn + upsell

**Productize delivery:** ทำ checklist + script + template ของแต่ละ step → ภายหลังจ้างคนทำ data prep แทนได้ (Dear ไม่ต้องลงมือเองทุกดีล) = scale ธุรกิจ

---

## 11. Commercial Design — Pricing & Unit Economics

### 11.1 Packaging (anchor: Setup Fee ครั้งเดียว + รายเดือน)

| | **Starter** | **Growth** ⭐ | **Business** |
|---|---|---|---|
| รายเดือน | 4,900 ฿ | 14,900 ฿ | 39,900 ฿ |
| Setup Fee | 50,000 ฿ | 80,000–120,000 ฿ | 150,000–200,000 ฿ |
| Users / Docs | 10 / 200 | 50 / 2,000 | 200 / ไม่จำกัด* |
| Deployment | Hosted single-tenant | Hosted single-tenant | **On-Prem / Private Cloud** |
| LINE OA | — (เว็บก่อน) | ✓ | ✓ |
| LLM | Cloud (Flash-Lite) | Cloud (Flash-Lite / Haiku) | **Local Typhoon 2** |
| Analytics / Audit | พื้นฐาน | Dashboard + คำถามที่ตอบไม่ได้ | + Audit log + SLA |
| เหมาะกับ | ทีมเล็ก/แผนกเดียว | SME ทั่วไป (sweet spot) | คลินิก/บัญชี/กฎหมาย ที่ห่วงข้อมูล |

> **Setup Fee ห้ามตัดออก** — เป็นต้นทุนแรงงาน data prep/OCR/clean ที่เป็น "ตัวสินค้า" จริง และเป็นตัวคัดลูกค้าจริงจังออกจากคนลองของ

### 11.2 Unit Economics (margin รายเดือน)

ต้นทุน LLM ปัจจุบันต่ำมาก (Gemini 3.1 Flash-Lite $0.10/$0.40 ต่อ 1M tokens) ทำให้ margin สูง:

**ตัวอย่าง Growth (50 users, hosted):**

| รายการ | ประมาณการ/เดือน |
|---|---|
| ค่า query: ~10,000 query (หลังหัก cache ~40%) × ~$0.0005 | ~180–360 ฿ |
| VPS single-tenant (เล็ก) | ~500–700 ฿ |
| Embedding + Reranker (self-host บน VPS เดียวกัน) | ~0 (รวมใน VPS) |
| Monitoring / backup | ~100–200 ฿ |
| **รวม COGS** | **~800–1,300 ฿** |
| **รายรับ** | **14,900 ฿** |
| **Gross margin** | **~91%** |

- **Starter:** COGS ~400–600 ฿ บน 4,900 ฿ → margin ~88%
- **Business (on-prem):** ไม่มีค่า LLM API รายเดือน (รันบน GPU ลูกค้า ผ่าน setup) → รายเดือน = ค่า SLA/ดูแล → margin สูงสุด, COGS ≈ เวลาซัพพอร์ตของเรา

> เทียบคู่แข่ง DIY (Chatbase Pro $500/mo ≈ 17,500 ฿) ที่ลูกค้าต้องตั้งเอง ไม่มีไทย/LINE/จัดข้อมูล — ราคา Growth 14,900 ฿ **พร้อมบริการครบ** จึงสมเหตุสมผลมาก

### 11.3 มูลค่าต่อดีล (ปีแรก, Growth)

setup ~100,000 + (14,900 × 12) = **~279,000 ฿/ปี** · COGS infra ~12,000 ฿/ปี · setup คุ้มค่าแรง delivery ในตัว → **payback เร็ว, cash positive ตั้งแต่ดีลแรก**

---

## 12. Go-to-Market & Sales Motion

### 12.1 Sales funnel (DFY)

```
Lead → Discovery call (ฟรี 30 นาที) → Paid Pilot → Full install → Retain/Upsell
```

- **ห้ามขาย "AI chatbot"** — ขาย "ลดคำถามซ้ำ + onboarding พนักงานใหม่เร็วขึ้น + มาตรฐานตอบลูกค้าตรงกัน"
- **Paid Pilot (จุดเปลี่ยน):** เก็บค่า pilot 15,000–30,000 ฿ ทำกับ 1 แผนก/เอกสารชุดเล็ก ภายใน 1–2 สัปดาห์ → ลูกค้าเห็นผลจริงก่อนตัดสินใจ setup เต็ม (ลดความเสี่ยงทั้งสองฝ่าย + คัดคนจริงจัง)

### 12.2 แหล่ง lead แรก (ใช้เครือข่ายที่มี)

ลูกค้า IT solution เดิม · เครือข่ายธุรกิจ/คนรู้จัก · คลินิก/บัญชีในพื้นที่ · LINE OA / กลุ่มผู้ประกอบการ · case study จาก pilot แรกคือ asset การขายที่ทรงพลังสุด

### 12.3 Demo script (เตรียม environment สาธิต)

ถามสด ๆ ให้เห็นทั้ง "ตอบได้" และ "ไม่เดา":

```
HR:     "พนักงานลากิจได้กี่วัน"            → ตอบ + อ้าง HR Policy
บัญชี:   "เบิกค่าใช้จ่ายส่งภายในกี่วัน"        → ตอบ + อ้างระเบียบ
ขาย:    "ลดราคาได้สูงสุดกี่ %"              → ตอบ + อ้าง Sales SOP
ลวง:    "นโยบายลาคลอดของบริษัทคู่แข่ง"     → "ไม่พบข้อมูลเพียงพอ" (โชว์ว่าไม่มั่ว)
LINE:   ถามผ่าน LINE OA จริงในมือถือ        → โชว์ adoption
```

### 12.4 Objection handling (สั้น)

- *"ข้อมูลเราหลุดไหม?"* → single-tenant/on-prem, DPA, สอดคล้อง PDPA
- *"AI มั่วไหม?"* → ตอบจากเอกสารเท่านั้น + อ้างอิง + no-answer + โชว์ eval
- *"เอกสารเราเละ"* → นั่นคือบริการเรา (data prep/OCR อยู่ใน setup)
- *"แพงกว่าฝรั่ง"* → ฝรั่งคุณตั้งเอง อังกฤษ ไม่มี LINE ไม่จัดข้อมูล

---

## 13. Risks & Mitigations

| ความเสี่ยง | ผลกระทบ | การรับมือ |
|---|---|---|
| **Garbage In, Garbage Out** — เอกสารลูกค้าขัดแย้ง/ล้าสมัย | ตอบผิด → เสียความเชื่อมั่น | Document Audit ใน setup, versioning, รายงานคำถามที่ตอบไม่ได้ |
| **Hallucination** | ตอบมั่ว = ความเสี่ยงพาณิชย์อันดับ 1 | grounded prompt, rerank threshold, no-answer, citation, eval ก่อน go-live |
| **Thai data prep ยาก** (สแกน/ตาราง/ตัดคำ) | ingest พลาด, chunk เพี้ยน | Typhoon OCR, PyThaiNLP, table→markdown (แก้แล้วในข้อ 6) |
| **Vector ขยะปนกัน** (อัปเดตทับ) | ตอบด้วยข้อมูลเก่า | source catalog + checksum + ลบ chunk เก่าอัตโนมัติ |
| **PDPA / ข้อมูลรั่ว** | โทษปรับ + เสียชื่อ | single-tenant/on-prem, DPA, audit log, service-role only, เข้ารหัส |
| **Adoption ต่ำ** | ลูกค้าไม่ต่อสัญญา | LINE OA, rich menu, อบรม, โชว์สถิติการใช้รายเดือน |
| **Cost LLM พุ่ง** | margin หด | semantic cache, model ถูก, ติดตาม token/query, on-prem สำหรับ heavy user |
| **พึ่ง Dear คนเดียว** | scale ไม่ได้ | productize delivery playbook → จ้างทำ data prep, runbook ส่งมอบ |

---

## 14. Roadmap (POC → ลูกค้ารายแรก → SaaS)

| Phase | เป้าหมาย | Exit criteria |
|---|---|---|
| **0. POC** ✅ | CLI + Supabase pgvector + ไทย + citation | (เสร็จแล้ว) |
| **1. Sellable MVP** (6 สัปดาห์) | catalog schema, ingestion ใหม่, hybrid+rerank, API, web+admin, LINE, Docker | ติดตั้งให้ลูกค้าจริง 1 รายได้ |
| **2. Productize Delivery** | delivery playbook + template + eval อัตโนมัติ + monthly report | ทำดีลที่ 2–3 โดยใช้เวลาน้อยลง |
| **3. Harden & Scale ops** | monitoring, backup/restore, cost tracking, update pipeline หลายราย | ดูแล 5–10 ลูกค้าพร้อมกันไหว |
| **4. SaaS Multi-Tenant** *(เมื่อมี demand ซ้ำ)* | เปิด RLS, signup, billing, self-serve onboarding | ขาย self-serve tier ได้ |

> **เกณฑ์ flip เป็น SaaS:** เมื่อมีลูกค้า DFY ≥ 5–8 ราย + เห็น use case/เอกสารซ้ำ ๆ + มี inbound ที่อยากตั้งเอง — ตอนนั้น schema/codebase พร้อมอยู่แล้ว เปิดโหมดเดียว

---

## 15. 6-Week Build Plan (สู่ลูกค้าจ่ายเงินรายแรก)

ต่อยอดจาก POC ที่มี (provider abstraction, supabase store, loader พร้อม) — สมมติทำแบบโฟกัส

| สัปดาห์ | ส่งมอบ |
|---|---|
| **W1** | Production schema + `migrate_poc_to_catalog.py` + ingestion ใหม่ (checksum dedup, PyThaiNLP, source/chunk model, `--reset`) |
| **W2** | เปลี่ยนเป็น BGE-M3 (1024) + hybrid retrieval (vector+FTS) + reranker + no-answer threshold + eval harness (golden set) |
| **W3** | FastAPI `/query /documents /ingest /auth /logs /feedback /health` + Docker Compose + Redis queue (async ingest) |
| **W4** | Web Chat UI + Admin UI (upload/list/reindex/delete/logs) + auth + role |
| **W5** | LINE OA adapter (webhook, map user, reply, rich menu) + semantic cache + Typhoon OCR + security hardening (service role, .env, TLS) |
| **W6** | E2E test + golden eval ≥90% + ingest เอกสารลูกค้าจริง + go-live runbook + demo environment |

> ทำคนเดียว part-time อาจยืดเป็น 7–8 สัปดาห์ — ตัด LINE/OCR ไป W7 ได้ถ้าจำเป็น แต่ core RAG (W1–W2) ห้ามลดคุณภาพ เพราะคือสิ่งที่ทำให้ "ขายได้"

---

## 16. Success Metrics / KPIs

**Product / คุณภาพ**

- Answer pass rate บน golden set **≥ 90%**
- Citation correctness **≥ 95%** · No-answer correctness (ไม่มั่วเมื่อไม่มีข้อมูล) **≥ 95%**
- Latency p50 < 1.5s (cache hit < 200ms) · Cache hit rate **≥ 30%**
- Cost / query (ติดตามจาก token logs)
- Adoption: WAU/พนักงานทั้งหมด, query/user/สัปดาห์
- **% คำถามที่ตอบไม่ได้** (= knowledge gap → โอกาส upsell)

**Business**

- จำนวน paid pilot → **pilot-to-paid conversion ≥ 50%**
- Setup revenue + MRR · Gross margin **≥ 85%**
- Time-to-go-live ต่อลูกค้า (เป้า ≤ 4 สัปดาห์)
- Logo churn < 10%/ปี · Net revenue retention > 100% (จาก upsell users/docs)

---

## 17. Appendix

### 17.1 Tech Stack (v1)

| ชั้น | เลือกใช้ |
|---|---|
| Backend | Python 3.12, FastAPI, Celery/Arq |
| DB / Vector | PostgreSQL 16 + pgvector (HNSW) + FTS |
| Embedding | BGE-M3 (1024-dim, self-host) |
| Reranker | bge-reranker-v2-m3 |
| Thai NLP | PyThaiNLP (tokenize), Typhoon OCR (สแกน) |
| LLM | Cloud: Gemini 3.1 Flash-Lite / GPT-4.1-nano / Claude Haiku · On-prem: Typhoon 2 (Ollama/vLLM) |
| Cache / Queue | Redis (semantic cache + job queue) |
| Frontend | Next.js (Chat + Admin) |
| Deploy | Docker Compose, Nginx, TLS · Hosted VPS หรือ On-prem |
| Channel | LINE OA Messaging API + Web |

### 17.2 Key Decisions Log

| # | ตัดสินใจ | เหตุผล |
|---|---|---|
| D1 | DFY single-tenant ก่อน SaaS | เก็บเงินเร็ว, ความเสี่ยงต่ำ, จุดขาย PDPA |
| D2 | Single codebase, tenant_id ทุกตาราง | SaaS-ready โดยไม่เขียนใหม่ |
| D3 | BGE-M3 แทน MiniLM-384 | ไทยแม่นกว่า, hybrid, self-host ฟรี |
| D4 | Hybrid + reranker (ไม่ใช่ vector-only) | จับคำเฉพาะ/ตัวย่อ/วลีไทยสั้น, คุณภาพพอขาย |
| D5 | Modular monolith + async worker เดียว | ลดต้นทุน DevOps, ลูกค้า SME ไม่จ่ายให้ microservices |
| D6 | LINE OA เป็น channel หลัก | adoption คือตัวชี้เป็นชี้ตายการต่อสัญญา |
| D7 | Setup Fee แยกจากรายเดือน | สะท้อนต้นทุน data prep จริง + คัดลูกค้าจริงจัง |
| D8 | Cloud LLM ราคาถูก / on-prem Typhoon | margin > 85% และตอบโจทย์ data residency |

---

*เอกสารนี้ออกแบบให้นำไปสร้างได้จริงและขายได้จริง — ขั้นถัดไปคือลงมือ W1 ของแผน 6 สัปดาห์ และหา lead ทำ paid pilot ขนานกันไป*
