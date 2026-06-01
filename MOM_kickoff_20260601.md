# MOM — KbaseSME Kick-off Meeting #1
**วันที่:** 1 มิถุนายน 2026  
**ประเภท:** Virtual Office Kick-off (All Agents)  
**เจ้าของ:** Dear (RTP-YLM)  
**บันทึกโดย:** Coordinator Agent

---

## ผู้เข้าร่วม

| Agent | Role | สถานะ |
|---|---|---|
| **Coordinator** | ARC — Solution Architect / Tech Lead | ✅ เข้าร่วม |
| **RAG-Core** | BE+DATA — Ingestion + Retrieval Pipeline | ✅ เข้าร่วม |
| **API-Eng** | BE — FastAPI + LINE Webhook | ✅ เข้าร่วม |
| **UI-Eng** | FE — Web Chat + Admin UI | ✅ เข้าร่วม |
| **Data-Prep** | DATA — OCR + Chunking + Golden Set | ✅ เข้าร่วม |
| **Infra** | DEVOPS — Docker + TLS + Monitoring | ✅ เข้าร่วม |
| **QA-Eval** | QA — Eval Harness + Regression | ✅ เข้าร่วม |
| **Delivery** | DEL — DFY Playbook + Onboarding | ✅ เข้าร่วม |
| **BizDev** | BIZ — Pricing + DPA + Sales + GTM | ✅ เข้าร่วม |

---

## วัตถุประสงค์การประชุม

1. ทำความเข้าใจสถานะ POC จริงในปัจจุบัน
2. ระบุ blockers และ dependencies ข้าม agent
3. กำหนด commitment และ deliverable สัปดาห์ที่ 1
4. ตัดสินใจประเด็นที่ต้องการ coordinator approval
5. กำหนด non-negotiables ที่ทีมต้องยึดตลอดโปรเจกต์

---

## 1. สถานะปัจจุบัน (Coordinator Summary)

> **"เราอยู่ใน POC ที่ยังไม่พร้อมขาย"**

### สิ่งที่มีอยู่แล้ว (ใช้ต่อได้)
- `src/rag_engine.py` — RAG orchestration พื้นฐาน (Chroma + Supabase)
- `src/document_loader.py` — parser + word-based chunking (**ยังพัง** สำหรับไทย)
- `src/llm_provider.py` — multi-provider abstraction (OpenAI, Anthropic, Ollama, Alibaba)
- `src/config.py` + `config.yaml` — ระบบ config ใช้ได้
- `supabase_production_schema.sql` — target schema design พร้อม (**ยังไม่ apply**)

### Gap วิกฤตที่ต้องแก้ก่อนทุกอย่าง

| ปัญหา | ผลกระทบ |
|---|---|
| `text.split()` chunking | ตัดคำไทยผิดทุกครั้ง — context พัง |
| Embedding 384-dim (MiniLM) | ต้อง re-embed ทั้งหมดเมื่อเปลี่ยนเป็น BGE-M3 1024-dim |
| ไม่มี no-answer threshold | ระบบ hallucinate ได้อย่างเสรี |
| ไม่มี FastAPI app | มีแค่ CLI scripts ไม่มี HTTP endpoint |
| Prompt ภาษาอังกฤษ | product ไทยต้องตอบไทย |
| Schema ยังไม่ apply | ทุก agent ที่ต้องการ DB blocked |

---

## 2. ประเด็นสำคัญจากการประชุม

### 2.1 ลำดับที่ถูกต้อง — Data-Prep + QA ยืนยันร่วมกัน

> **"อย่าวิ่งไปหา eval 90% ถ้า corpus ยังไม่สะอาด"** — Data-Prep Agent

ลำดับที่ต้องทำเท่านั้น ห้ามข้าม:
```
E2-2 (PyThaiNLP chunking) 
  → E3-1 (BGE-M3 1024-dim embedding)
  → E8-2 (Golden set บน chunk จริง)
  → E3-2/E3-3 (Hybrid search + Reranker)
  → Eval ≥ 90% → M1
```
ถ้าทำผิดลำดับ → re-embed ทั้ง corpus ใหม่ = เสียเวลาและ compute cost โดยไม่จำเป็น

---

### 2.2 E1-1 คือ Unlocker หลัก — Blocked ทุก Agent

RAG-Core, API-Eng, และ QA-Eval ทุกตัวพูดถึง E1-1 (production schema) ว่าเป็น hard blocker:

| Agent | รอ E1-1 เพื่อ |
|---|---|
| RAG-Core | `vector(1024)`, `content_tsv`, `tenants` table |
| API-Eng | `knowledge_sources`, `knowledge_chunks` สำหรับ `/documents` และ `/query` |
| QA-Eval | Chunk inventory หลัง schema ใหม่ apply แล้ว ก่อน annotate golden set |

**RAG-Core ถาม Coordinator:** E1-1 จะ apply วันไหนของสัปดาห์? ถ้าไม่เสร็จภายใน **วันพุธ** RAG-Core ต้องเปลี่ยนเป็น parallel mock-schema approach ซึ่งเพิ่ม integration risk

---

### 2.3 LINE Webhook Architecture — ต้องการ Decision ก่อน E6

**API-Eng raise risk:** LINE `replyToken` มีอายุ **30 วินาที** แต่ RAG pipeline (embed → hybrid → rerank → LLM) อาจใช้ 5–15 วินาที หาก cold start หรือ LLM latency spike อาจ timeout

**2 ทางเลือก:**
- **Option A:** Enforce SLA ว่า pipeline ต้องจบภายใน 25 วินาที (ต้องการ infra guarantee)
- **Option B:** ใช้ LINE Push Message API เป็น fallback (quota จำกัดใน free tier)

**→ Coordinator ต้องตัดสินใจก่อน E6-1 เริ่ม**

---

### 2.4 OpenAPI YAML ก่อน FastAPI Code — UI-Eng Proposal (รับ)

**UI-Eng เสนอ:** ให้ API-Eng เขียน OpenAPI YAML spec ก่อนโค้ด FastAPI จริงแม้แต่บรรทัดเดียว

ประโยชน์:
- UI-Eng เขียน typed mock API ได้ทันที → ไม่ต้องรอ BE
- QA เขียน test case ได้ก่อน
- Coordinator review contract ก่อน merge โค้ดจริง
- ลด integration bug เมื่อ wire จริง

**→ Coordinator อนุมัติ approach นี้: API-Eng เขียน OpenAPI spec ก่อน W2**

---

### 2.5 Auth Flow Decision — UI-Eng ต้องการคำตอบ

JWT token storage: **httpOnly cookie** หรือ **localStorage**?
กระทบ: `middleware.ts`, `lib/auth.ts`, ทุก fetch header ใน frontend

**→ Coordinator ตัดสิน: httpOnly cookie** (ปลอดภัยกว่า, XSS protection, ตรงกับ security posture ของ E7)

---

### 2.6 Infra Security — .gitignore ต้อง Commit ก่อนทุกอย่าง

**Infra raise:** ถ้า `.env` file รั่วเข้า git history แม้แต่ครั้งเดียว secret อยู่ที่นั่นตลอดไป

**→ กฎบังคับ (มีผลทันที):** Infra commit `.gitignore` เป็น commit แรกก่อนไฟล์อื่นทุกอย่าง

กฎเพิ่มเติม:
- ห้าม log ENV values ทุก log level
- `JWT_SECRET` rotate ทุก 90 วัน
- Port 5432 และ 6379 ห้าม expose ออก host ใน docker-compose.yml

---

### 2.7 BizDev — Demo Deadline 3 สัปดาห์

**BizDev:** Market window เปิดอยู่แล้วตอนนี้ ถ้าช้าอีก 6 เดือนคู่แข่งจะตีตลาด

**Smoke Test Demo ขั้นต่ำ (ก่อน M1, ภายใน 3 สัปดาห์):**
1. Web Chat หน้าเดียว — พิมพ์คำถามไทย → ได้คำตอบ + อ้างอิง
2. เอกสาร fixture pre-loaded (ไม่ต้องให้ลูกค้าอัปโหลดเอง)
3. ตอบถูก ≥ 3 คำถาม live หน้าต่อหน้า

**→ LINE OA ไม่จำเป็นสำหรับ Pilot Demo ครั้งแรก** — Web Chat เพียงพอ

---

### 2.8 Chunk Size Alignment — Data-Prep ต้องการจาก RAG-Core วันนี้

Data-Prep ไม่สามารถ finalize E2-2 ได้จนกว่า RAG-Core จะตอบ:
- **Target chunk_size** = ? tokens
- **Overlap** = ? tokens
- **Section metadata** ที่จะใช้ใน hybrid search มีอะไรบ้าง

**→ Coordinator กำหนด (อ้างอิงจาก rag-core.md):** chunk_size = 512 tokens, overlap = 128 tokens, metadata: `section_title`, `page_number`, `doc_type`, `source_filename`

---

### 2.9 Delivery — ลูกค้าแรกต้องการข้อมูลจาก BizDev

**Delivery ถาม BizDev:** ลูกค้าคนแรกมีเอกสารในรูปแบบไหน และ admin เป็นคนมีพื้นหลังเทคนิคไหม?

**→ BizDev รับไปตอบ** ในสัปดาห์นี้ระหว่างสร้าง lead list

---

## 3. Non-Negotiables (มีผลตั้งแต่วันนี้)

| # | กฎ | เจ้าของที่ enforce |
|---|---|---|
| 1 | **BGE-M3 1024-dim เท่านั้น** — ห้าม commit code ที่ใช้ MiniLM | Coordinator |
| 2 | **ทุก chunk ต้องมี tenant_id** — PR ที่ไม่มี = reject | Coordinator |
| 3 | **No-answer threshold บังคับก่อน go-live** — ห้าม hallucinate | Coordinator + QA |
| 4 | **ห้าม hardcode secret** — ทุกอย่างผ่าน `.env` | Infra |
| 5 | **ทุก E3 change ผ่าน Coordinator review ก่อน merge** | Coordinator |
| 6 | **ห้าม release E3 ถ้า eval < 90%** — ไม่มีข้อยกเว้น | QA-Eval |
| 7 | **ห้าม ingest เอกสาร production ก่อน E1-1 + E3-1 เสร็จ** | Coordinator |
| 8 | **.gitignore commit เป็นอันดับแรกก่อนทุกอย่าง** | Infra |
| 9 | **Document Audit ก่อน ingest เสมอ** — ห้าม ingest เอกสารขัดแย้ง | Data-Prep |
| 10 | **ห้าม expose port 5432, 6379 ออก host** | Infra |

---

## 4. Decisions Made

| # | ประเด็น | Decision | เจ้าของ |
|---|---|---|---|
| D1 | JWT storage | **httpOnly cookie** | Coordinator |
| D2 | API spec approach | **OpenAPI YAML ก่อน code** (W1 end) | API-Eng |
| D3 | Chunk parameters | **size=512, overlap=128** | Coordinator |
| D4 | Demo scope (pilot) | **Web Chat only, LINE OA ไม่จำเป็นใน demo แรก** | Coordinator + BizDev |
| D5 | Chunking order | **E2-2 → E3-1 → E8-2** (ห้ามข้ามหรือทำ parallel) | Coordinator |
| D6 | Demo deadline | **3 สัปดาห์ (22 มิ.ย. 2026)** | Product team |
| D7 | LINE webhook architecture | **⏸ PENDING** — Coordinator ต้องตัดสินระหว่าง replyToken SLA vs Push API | Coordinator |

---

## 5. Risks Flagged

| Risk | ความรุนแรง | Agent ที่ raise | Mitigation |
|---|---|---|---|
| **LINE replyToken 30s timeout** กับ async RAG | 🔴 HIGH | API-Eng | รอ D7 decision |
| **E1-1 delay** cascades ไปทุก agent | 🔴 HIGH | RAG-Core | Target: apply by วันพุธ W1 |
| **Golden set invalid** ถ้า chunking เปลี่ยนหลัง annotate | 🟡 MED | QA-Eval | Annotate หลัง chunk inventory freeze |
| **Thai word boundary** กับ domain-specific vocabulary | 🟡 MED | Data-Prep | Custom dictionary + manual QA 50 chunks แรก |
| **OCR error** บน scanned PDF ที่ resolution ต่ำ | 🟡 MED | Data-Prep | Manual QA gate ก่อน ingest ทุกไฟล์ scan |
| **BGE-M3 memory** บน on-prem customer hardware | 🟡 MED | Infra | Minimum hardware spec + profiling ก่อน E9-2 |
| **TLS self-signed cert** incompatible กับ LINE webhook | 🟡 MED | Infra | on-prem ต้องมี domain + public cert |
| **Setup fee shock** — SME ตกใจ 50–120k | 🟡 MED | BizDev | Pilot Offer 15–30k เป็น entry point |
| **Solo founder context switch** — P1 ก่อน P0 ครบ | 🟡 MED | Coordinator | Coordinator flag ทุกครั้งที่ off critical path |
| **ไม่มี Admin UI** — ลูกค้า self-serve ไม่ได้ | 🟡 MED | Delivery | Manual delivery ในรอบ pilot แรก (acknowledged) |

---

## 6. Action Items — Week 1 (1–6 มิถุนายน 2026)

### 🔴 Critical Path (ต้องเสร็จก่อน agent อื่นถึงจะ unblock)

| # | Action | Owner | Due | Blocks |
|---|---|---|---|---|
| A1 | Apply `supabase_production_schema.sql` (E1-1) + review indices | Coordinator + RAG-Core | **พุธ 4 มิ.ย.** | RAG-Core E3-1, API-Eng E4-3, QA-Eval E8-2 |
| A2 | Commit `.gitignore` เป็น commit แรก | Infra | **วันนี้** | ทุกอย่าง |

---

### 🟠 W1 Deliverables ต่อ Agent

**Coordinator (ARC):**
- [ ] API Contract document — endpoints, request/response shape, error codes ครบ
- [ ] RAG Quality Bar document — eval metrics, latency threshold, citation format, no-answer behavior
- [ ] ตัดสิน D7 (LINE webhook architecture) ภายในวันพรุ่งนี้
- [ ] W1 end-of-week checkpoint report

**RAG-Core:**
- [ ] E2-2: `src/document_loader.py` rewrite ด้วย PyThaiNLP + section-aware chunking + unit tests (5 เอกสาร)
- [ ] E3-4: grounded prompt template ภาษาไทย + no-answer skeleton ใน `src/rag_engine.py`
- [ ] E3-6: `src/llm_provider.py` update — เพิ่ม `system_prompt` + `context` args

**Data-Prep:**
- [ ] Align chunk_size=512, overlap=128 กับ RAG-Core **วันนี้**
- [ ] `src/thai_chunker.py` — PyThaiNLP section-aware chunker
- [ ] Unit test 3 ประเภทเอกสาร: DOCX HR policy, PDF ราคา, Excel ตาราง
- [ ] ส่ง chunk inventory (chunk_id + text preview) ให้ QA-Eval **ภายในวันอังคาร**

**Infra:**
- [ ] `.gitignore` (**วันนี้ก่อนทุกอย่าง**)
- [ ] `docker-compose.yml` — 6 services, health checks, ห้าม expose port 5432/6379
- [ ] `docker-compose.onprem.yml` — Ollama + GPU overlay
- [ ] `nginx/nginx.conf` — TLS redirect, security headers, LINE timeout 60s
- [ ] `.env.example` — ทุก key พร้อม comment
- [ ] `scripts/`: backup.sh, restore.sh, health-check.sh, update.sh, gen-cert.sh
- [ ] `DEPLOY_CHECKLIST.md`

**API-Eng:**
- [ ] FastAPI scaffold — `app/` structure ครบ (routers, middleware, schemas)
- [ ] E4-1: JWT auth + middleware + role enforcement
- [ ] `GET /health` endpoint
- [ ] E6-1: LINE signature verify (mock secret ได้)
- [ ] Rate limiting skeleton (in-memory fallback ถ้า Redis ยังไม่พร้อม)
- [ ] OpenAPI YAML draft (ส่งให้ Coordinator review ก่อนสิ้นสัปดาห์)

**UI-Eng:**
- [ ] Next.js project init + Tailwind + folder structure
- [ ] TypeScript interfaces: `QueryResponse`, `DocumentRecord`, `JobStatus`, `Source`
- [ ] Mock API layer `lib/api.ts` (typed mock ตาม OpenAPI draft)
- [ ] Component shells: `MessageBubble`, `SourcePanel`, `FeedbackButtons`, `DocumentTable`, `UploadZone`, `JobStatusBadge`
- [ ] Layout + routing structure (auth, chat, admin/*)
- [ ] `middleware.ts` skeleton

**QA-Eval:**
- [ ] รับ chunk inventory จาก Data-Prep **วันอังคาร**
- [ ] `data/golden_set.jsonl` — 50 ข้อ (35 answerable, 10 no-answer, 5 table)
- [ ] `eval.py` skeleton — exit code 1 ถ้า pass_rate < 0.90

**Delivery:**
- [ ] Discovery Questionnaire Template (30 คำถาม, 4 categories)
- [ ] Document Audit Checklist + scoring sheet
- [ ] Runbook Template v0.1 (6 หัวข้อ, placeholder content)
- [ ] Go-Live Sign-off Sheet (7 checkpoints)

**BizDev:**
- [ ] Lead List v1 — 10 contacts (Google Sheet: ชื่อ/บริษัท/vertical/relationship)
- [ ] Pricing One-Pager — 3 tiers + Pilot Offer 20,000 ฿
- [ ] DPA Draft v1 (ส่งทนายตรวจ)
- [ ] Sales One-Pager — positioning + 3 จุดขาย + vs คู่แข่ง
- [ ] ตอบ Delivery: ลูกค้าเป้าหมายคนแรก — document format + admin profile
- [ ] **สัปดาห์หน้า:** warm intro ≥ 3 บริษัท, นัด discovery call ≥ 1 ราย

---

## 7. Parallel Work Map — W1

```
วันจันทร์ (วันนี้)
├── Infra: .gitignore COMMIT FIRST
├── Coordinator: D7 LINE webhook decision
├── Data-Prep + RAG-Core: align chunk_size วันนี้
└── BizDev: เริ่ม lead list

วันอังคาร
├── Data-Prep: ส่ง chunk inventory → QA
└── Infra: docker-compose.yml draft

วันพุธ
├── 🔴 E1-1 schema apply TARGET
├── API-Eng: FastAPI scaffold พร้อม
└── QA-Eval: เริ่ม annotate golden set

วันพฤหัส
├── RAG-Core: E2-2 + E3-4 done
├── BizDev: Pricing one-pager done
└── UI-Eng: component shells done

วันศุกร์ (EOW checkpoint)
├── Coordinator: review ทุก deliverable
├── API-Eng: OpenAPI YAML ส่ง review
├── Delivery: templates ครบ
└── BizDev: DPA + Sales one-pager done
```

---

## 8. W1 End-of-Week Checkpoint

**ศุกร์ 6 มิถุนายน 2026** — Coordinator รายงาน:
- E1-1 apply สำเร็จไหม?
- E2-2 chunking ผ่าน unit test ไหม?
- Chunk inventory ส่ง QA ทันไหม?
- Docker Compose ขึ้นใน local ได้ไหม?
- OpenAPI draft พร้อม review ไหม?
- Lead list มีกี่ contact?

---

## 9. Milestones ที่มุ่งไป

| Milestone | เป้า | เงื่อนไข |
|---|---|---|
| **Smoke Test Demo** | 22 มิ.ย. 2026 | Web Chat + pre-loaded docs + ตอบถูก 3 คำถาม live |
| **M1 RAG Core** | ~W2 end | eval ≥ 90% บน golden set |
| **M2 MVP ครบช่องทาง** | ~W4 | Web + Admin + LINE end-to-end |
| **M3 ขายได้** | ~W6 | demo + pricing + DPA + sales material พร้อม |
| **M4 ลูกค้าแรก go-live** | ~10 สัปดาห์ | UAT sign-off |

---

## 10. คำปิดจาก Coordinator

> "เรามี blueprint ที่ดี มี agent ครบ มี issue board ชัด — สิ่งที่เหลือคือลงมือทำตามลำดับที่ถูกต้อง
> E1-1 ก่อน ทุกอย่างจะ unblock ตามมา
> ห้ามลดทอน E3 เพื่อความเร็ว — นั่นคือ core ที่ทำให้ขายได้"

---

*MOM นี้ synthesize จาก input ของ 9 agents ที่ทำงานพร้อมกัน — 1 มิถุนายน 2026*  
*Next checkpoint: ศุกร์ 6 มิถุนายน 2026*
