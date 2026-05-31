# KbaseSME — Project Task Breakdown (WBS) + Roles

**Scope:** ทั้งโครงการ — จาก POC ปัจจุบัน → product DFY ที่ขายได้จริง → พร้อมขยาย
**คู่กับเอกสาร:** `KbaseSME_Product_Design_and_GTM.md`
**Version:** 1.0 · **Date:** 31 May 2026 · **Owner:** RTP-YLM

> ใช้เอกสารนี้เป็น single source ของงานทั้งหมด แต่ละ task มี: รหัส · เจ้าของ (role) · พึ่งพา (depends) · เวลา (วัน) · เกณฑ์เสร็จ (DoD) · ความสำคัญ (P0/P1/P2)
> **P0** = ต้องมีถึงปิดการขายดีลแรก · **P1** = ทำให้ขายซ้ำ/scale ได้ · **P2** = ทีหลัง

---

## 1. Roles & Responsibilities

| Role | ชื่อย่อ | รับผิดชอบ |
|---|---|---|
| Solution Architect / Tech Lead | **ARC** | ตัดสินใจ design, review code, คุมคุณภาพ RAG, คุยลูกค้าเชิงเทคนิค |
| Backend Engineer | **BE** | FastAPI, RAG engine, API, LINE webhook, auth, cache |
| Frontend Engineer | **FE** | Web Chat UI + Admin UI (Next.js) |
| Data / Ingestion Engineer | **DATA** | parsing, OCR, ตัดคำไทย, chunking, ingestion, golden set, document audit |
| DevOps / Infra | **DEVOPS** | Docker Compose, deploy (hosted/on-prem), monitoring, backup, secret mgmt |
| QA / Eval | **QA** | eval harness, รัน golden set, UAT, regression |
| Delivery / Onboarding | **DEL** | รัน DFY playbook กับลูกค้า, จัดเตรียมข้อมูล, อบรม, รายงานรายเดือน |
| Sales / BizDev | **BIZ** | lead gen, pricing, pilot, สัญญา/DPA, ปิดดีล |

### Solo-founder mapping (ตอนนี้ Dear ทำหลายบทบาท)

- **Dear ตอนนี้ครอบ:** ARC + BE + DEVOPS + BIZ (ระยะแรก)
- **จ้าง/หาเพิ่มเมื่อมีดีล:** DATA และ DEL ก่อน (งานหนักสุดและซ้ำสุด) → FE/QA part-time → แยก BIZ เมื่อ pipeline โต
- เป้าหมาย: productize งาน DATA/DEL ให้ delegate ได้ (ดู Phase 2) เพื่อให้ Dear โฟกัส ARC + BIZ

---

## 2. Milestones (เป้าหมายหลัก)

| # | Milestone | เงื่อนไขผ่าน | Phase |
|---|---|---|---|
| M1 | **RAG core ใหม่พร้อม** | ingestion+retrieval ใหม่ ผ่าน eval ≥ 90% บน mock data | P1 build |
| M2 | **MVP ใช้งานได้ครบช่องทาง** | web + admin + LINE ทำงาน end-to-end | P1 build |
| M3 | **ขายได้ (Sellable)** | demo env + pricing + DPA + sales material พร้อม | P1+GTM |
| M4 | **ลูกค้าจ่ายเงินรายแรก go-live** | ผ่าน DFY playbook ครบ + UAT sign-off | Pilot |
| M5 | **Delivery ทำซ้ำได้** | ดีลที่ 2–3 ใช้เวลาน้อยลง, มี template ครบ | Productize |
| M6 | **ดูแลหลายลูกค้าได้** | monitoring/backup/update pipeline พร้อม 5–10 ราย | Scale |

---

## 3. Phase 0 — POC (เสร็จแล้ว, อ้างอิง)

| ID | Task | Role | สถานะ |
|---|---|---|---|
| P0-1 | CLI ingest/query + Supabase pgvector + Thai + citation | ARC/BE | ✅ done |
| P0-2 | เอกสาร design + feasibility + architecture | ARC | ✅ done |

> งานต่อจากนี้ = ยกระดับ POC เป็น product (Phase 1 เป็นต้นไป)

---

## 4. Phase 1 — Sellable MVP (แผน 6 สัปดาห์)

แตกเป็น 9 epic. คอลัมน์ Dep = task ที่ต้องเสร็จก่อน

### E1 — Data Layer & Schema

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E1-1 | สร้าง production schema (tenants, app_users, knowledge_sources, knowledge_chunks, jobs, query_logs) | BE/ARC | — | 1 | รัน SQL ขึ้น Supabase/PG ได้ ครบ index (HNSW, GIN, filter) | P0 |
| E1-2 | เขียน `migrate_poc_to_catalog.py` (ย้าย documents 384 → source/chunk 1024) | BE | E1-1 | 1 | รันแล้วข้อมูลเดิมเข้า schema ใหม่ ไม่ซ้ำ | P0 |
| E1-3 | กำหนด `tenant_id` strategy (single-tenant=คงที่, เผื่อ RLS) | ARC | E1-1 | 0.5 | doc + helper ใส่ tenant_id ทุก query | P0 |

### E2 — Ingestion Pipeline (จุดที่แก้ POC)

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E2-1 | checksum (SHA256) dedup + versioning (skip/re-index/archive) | DATA/BE | E1-1 | 1 | ไฟล์เดิม=skip, แก้=re-index, ลบ chunk เก่าอัตโนมัติ | P0 |
| E2-2 | เปลี่ยนตัดคำไทยเป็น PyThaiNLP + section-aware chunking (เลิก text.split) | DATA | — | 1 | chunk ไทยไม่ตัดคำมั่ว, ทดสอบ 5 เอกสาร | P0 |
| E2-3 | Typhoon OCR สำหรับ PDF สแกน/รูป | DATA | — | 1.5 | OCR ไฟล์สแกนไทยออกข้อความใช้ได้ | P0 |
| E2-4 | table → markdown table ก่อน chunk | DATA | E2-2 | 1 | ตารางเบิกจ่าย/ค่าตอบแทน retrieve ถูก | P1 |
| E2-5 | async ingestion ผ่าน Redis queue + job status | BE | E1-1 | 1 | อัปโหลดไฟล์ใหญ่ไม่ block, ติดตาม job ได้ | P1 |

### E3 — Retrieval & RAG Quality

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E3-1 | ฝัง BGE-M3 (1024) แทน MiniLM + re-embed | BE/DATA | E1-1 | 1 | embedding 1024 เข้า DB, query ทำงาน | P0 |
| E3-2 | hybrid search: vector (pgvector) + keyword (FTS) รวมผล | BE | E3-1 | 1.5 | คืน top-N รวมสองทาง dedup | P0 |
| E3-3 | reranker bge-reranker-v2-m3 (cross-encoder) | BE | E3-2 | 1 | จัดอันดับใหม่เหลือ top 3–5 | P0 |
| E3-4 | grounded prompt + no-answer threshold + รูปแบบ citation | ARC/BE | E3-3 | 1 | ไม่มีข้อมูล=ตอบ "ไม่พบ", มี source ทุกคำตอบ | P0 |
| E3-5 | semantic cache (Redis) | BE | E3-4 | 1 | คำถามซ้ำ cache hit < 200ms | P1 |
| E3-6 | provider abstraction หลาย LLM (cloud/local) ต่อ config | BE | E3-4 | 0.5 | สลับ model จาก config ได้ | P1 |

### E4 — Backend API

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E4-1 | auth + JWT (tenant_id, role, departments) | BE | E1-1 | 1 | login ออก JWT, middleware ตรวจสิทธิ์ | P0 |
| E4-2 | `/query` + `/feedback` | BE | E3-4 | 1 | คืน answer+sources ตาม contract | P0 |
| E4-3 | `/documents` (upload/list/reindex/delete) + `/jobs/{id}` | BE | E2-5 | 1 | admin จัดการเอกสารผ่าน API ได้ | P0 |
| E4-4 | `/logs` (query logs + คำถามที่ตอบไม่ได้) + `/health` | BE | E4-2 | 0.5 | ดึง logs/feedback ได้ | P1 |
| E4-5 | access control filter (department/access_level) | BE/ARC | E4-1 | 1 | เอกสาร restricted ไม่หลุดข้าม role | P0 |

### E5 — Frontend (Chat + Admin)

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E5-1 | Web Chat UI (ถาม/ตอบ + source panel + feedback) | FE | E4-2 | 2 | ใช้จริง + ใช้ demo ได้ | P0 |
| E5-2 | Admin UI (อัปโหลด/list/reindex/delete + สถานะ ingest) | FE | E4-3 | 2 | แอดมินจัดเอกสารเองได้ | P0 |
| E5-3 | Admin: หน้า query logs + คำถามที่ตอบไม่ได้ | FE | E4-4 | 1 | เห็น analytics เบื้องต้น | P1 |
| E5-4 | login/role UI | FE | E4-1 | 0.5 | เข้าระบบตาม role | P0 |

### E6 — LINE OA Integration

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E6-1 | `/line/webhook` + verify signature | BE | E4-2 | 1 | รับ event LINE ได้ปลอดภัย | P0 |
| E6-2 | map line_user_id → app_user (ผูกอีเมล/รหัสพนักงาน) | BE | E6-1, E4-1 | 1 | สิทธิ์ department ถูกต้องผ่าน LINE | P0 |
| E6-3 | reply พร้อม source สั้น + quick reply 👍/👎 + loading | BE | E6-1 | 1 | ตอบใน LINE ครบ ไม่ timeout | P0 |
| E6-4 | rich menu (ปุ่มลัดต่อแผนก → set department filter) | BE/DEL | E6-3 | 0.5 | กดปุ่มแล้วถามตรงแผนก | P1 |

### E7 — Security & PDPA

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E7-1 | service-role only backend, ไม่ leak key, secret ใน .env | DEVOPS/BE | E1-1 | 0.5 | ไม่มี key ฝั่ง frontend | P0 |
| E7-2 | TLS + reverse proxy + เข้ารหัส at-rest/in-transit | DEVOPS | E9-1 | 1 | https ใช้งาน, DB เข้ารหัส | P0 |
| E7-3 | audit log (ใครถาม/เห็นเอกสารไหน) + ลบข้อมูลตอนเลิกสัญญา | BE | E4-2 | 1 | audit query ได้, มี delete routine | P1 |
| E7-4 | RLS policy (เปิดใช้เมื่อไป multi-tenant) — เขียนเตรียมไว้ | ARC/BE | E1-3 | 0.5 | SQL policy พร้อมแต่ปิดไว้ | P2 |

### E8 — Evaluation & QA

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E8-1 | eval harness (รัน golden set, วัด hit/faithfulness/no-answer/latency/cost) | QA/BE | E3-4 | 1.5 | สั่งรันแล้วได้รายงานคะแนน | P0 |
| E8-2 | mock golden set 30–50 ข้อ (จาก 10 เอกสารตัวอย่าง) | QA/DATA | E2-2 | 1 | golden set ใช้รัน eval ได้ | P0 |
| E8-3 | regression: รัน eval ทุกครั้งก่อน release | QA | E8-1 | 0.5 | สคริปต์/CI รันอัตโนมัติ | P1 |

### E9 — Deploy / DevOps

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| E9-1 | docker-compose ครบ (nginx, api, worker, redis, pg, web) | DEVOPS | E4-*, E5-* | 1.5 | `docker compose up` ขึ้นทั้ง stack | P0 |
| E9-2 | โปรไฟล์ on-prem (Ollama/vLLM + Typhoon 2, GPU passthrough) | DEVOPS | E9-1, E3-6 | 1.5 | รัน local LLM บนเครื่อง GPU ได้ | P1 |
| E9-3 | backup/restore + monitoring + cost/latency logging | DEVOPS | E9-1 | 1 | สำรอง/กู้ DB ได้, มี metric พื้นฐาน | P1 |
| E9-4 | demo environment (data ตัวอย่าง + URL + LINE demo) | DEVOPS/DEL | E9-1, M2 | 1 | สาธิตให้ลูกค้าได้ทันที | P0 |

### แผนลง 6 สัปดาห์ (mapping epic → สัปดาห์)

| สัปดาห์ | Epic หลัก | งานเด่น |
|---|---|---|
| W1 | E1, E2 (1-2) | schema + migrate + dedup + ตัดคำไทย |
| W2 | E3, E8 (2) | BGE-M3 + hybrid + rerank + no-answer + golden set + eval |
| W3 | E4, E2-5 | API ครบ + auth + async ingest |
| W4 | E5 | Web Chat + Admin UI |
| W5 | E6, E3-5, E2-3, E7 | LINE OA + cache + OCR + security |
| W6 | E8, E9, E2-4 | E2E test + eval ≥90% + deploy + demo env + runbook |

> ทำคนเดียว part-time → ยืด 7–8 สัปดาห์ได้ · ห้ามลดคุณภาพ E3 (core ที่ทำให้ "ขายได้")

---

## 5. Phase 2 — Productize Delivery (ทำให้ขายซ้ำได้)

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| PD-1 | DFY playbook 8 ขั้น เป็น checklist + template (ต่อ step) | DEL/ARC | M2 | 2 | ส่งต่อให้คนอื่นรันตามได้ | P1 |
| PD-2 | Document Audit template + คู่มือ data prep/OCR | DEL/DATA | PD-1 | 1 | ลด guesswork ตอนเตรียมข้อมูลลูกค้า | P1 |
| PD-3 | golden-set builder + eval อัตโนมัติต่อลูกค้า | QA | E8-1 | 1 | สร้าง+รัน eval ต่อราย รวดเร็ว | P1 |
| PD-4 | monthly report template (usage + คำถามที่ตอบไม่ได้ + ข้อเสนอ) | DEL | E5-3 | 1 | เป็นเหตุผลต่อสัญญา + upsell | P1 |
| PD-5 | runbook ส่งมอบ + คู่มือผู้ใช้/แอดมิน (ไทย) | DEL | M2 | 1.5 | ลูกค้าดูแลเองเบื้องต้นได้ | P1 |

---

## 6. Phase 3 — Commercial / GTM (พร้อมขาย)

| ID | Task | Role | Dep | วัน | DoD | Pri |
|---|---|---|---|---|---|---|
| GTM-1 | สรุป pricing + แพ็กเกจ final + เงื่อนไข usage | BIZ/ARC | — | 0.5 | ตารางราคา + scope ชัด | P0 |
| GTM-2 | DPA (Data Processing Agreement) template + checklist PDPA | BIZ | — | 1 | ใช้เซ็นกับลูกค้าได้ | P0 |
| GTM-3 | sales one-pager + slide สั้น (positioning vs คู่แข่ง) | BIZ | GTM-1 | 1 | ส่งให้ลูกค้าได้ | P0 |
| GTM-4 | demo script + เตรียม demo env | BIZ/DEL | E9-4 | 0.5 | สาธิตได้ลื่น | P0 |
| GTM-5 | Paid Pilot offer (scope, ราคา 15-30k, timeline) | BIZ | GTM-1 | 0.5 | เสนอ pilot ได้ทันที | P0 |
| GTM-6 | lead list + outreach (ลูกค้าเดิม/เครือข่าย/3 vertical) | BIZ | GTM-3 | ต่อเนื่อง | มี pipeline ≥ 5 lead | P0 |

---

## 7. Phase 4 — First Paid Pilot (ลงสนามจริง)

| ID | Task | Role | Dep | DoD | Pri |
|---|---|---|---|---|---|
| PIL-1 | Discovery + Document Audit กับลูกค้า pilot | DEL/ARC | M3, GTM-5 | รายการ use case + golden questions จริง | P0 |
| PIL-2 | Data prep + ingest เอกสารจริง ≥ 30 ไฟล์ | DATA/DEL | PIL-1 | ingest ครบ, ไม่มี vector ขยะ | P0 |
| PIL-3 | tuning + รัน eval ≥ 90% บน golden set ลูกค้า | QA/ARC | PIL-2 | รายงานคุณภาพผ่าน | P0 |
| PIL-4 | ตั้ง LINE OA + web + ผูกผู้ใช้ + deploy | DEVOPS/DEL | PIL-3 | ระบบ live | P0 |
| PIL-5 | UAT + อบรม + go-live + sign-off | DEL | PIL-4 | ลูกค้ารับมอบ = **M4** | P0 |
| PIL-6 | สรุปเป็น case study | BIZ | PIL-5 | ใช้ขายต่อ | P1 |

---

## 8. Phase 5 — Harden & Scale Ops

| ID | Task | Role | Dep | DoD | Pri |
|---|---|---|---|---|---|
| SC-1 | central monitoring/alert หลายลูกค้า | DEVOPS | E9-3 | เห็นสุขภาพทุก deployment | P1 |
| SC-2 | update/upgrade pipeline (ส่งเวอร์ชันใหม่ทุกราย) | DEVOPS | E9-1 | อัปเกรดได้ไม่ manual ทีละจุด | P1 |
| SC-3 | cost tracking ต่อลูกค้า (LLM/infra) | DEVOPS/BIZ | E9-3 | รู้ margin จริงต่อราย | P1 |
| SC-4 | จ้าง/เทรน DATA + DEL เพิ่ม | BIZ/ARC | PD-1 | delegate delivery ได้ = **M5** | P1 |

---

## 9. Phase 6 — SaaS Multi-Tenant (อนาคต, เมื่อมี demand)

| ID | Task | Role | Trigger | Pri |
|---|---|---|---|---|
| SAAS-1 | เปิด RLS (tenant isolation) + ทดสอบรั่วข้าม tenant | BE/ARC | มีลูกค้า DFY ≥ 5–8 | P2 |
| SAAS-2 | self-serve signup + onboarding | BE/FE | ↑ | P2 |
| SAAS-3 | billing/payment + usage metering | BE/BIZ | ↑ | P2 |
| SAAS-4 | tenant control plane / admin | BE/FE | ↑ | P2 |

---

## 10. Critical Path & ลำดับเริ่ม

**เส้นทางวิกฤต (ต้องเสร็จตามลำดับ):**

```
E1-1 → E2-1/E2-2 → E3-1 → E3-2 → E3-3 → E3-4 → E8-1/E8-2  (= M1 RAG core)
        → E4-2/E4-3 → E5-1/E5-2 → E6-1→E6-2→E6-3  (= M2 MVP ครบช่องทาง)
        → E9-1 → E9-4 + GTM-1/2/3/5  (= M3 ขายได้)
        → PIL-1..PIL-5  (= M4 ลูกค้าจ่ายเงินรายแรก)
```

**เริ่มพรุ่งนี้ (3 task แรก):** E1-1 (schema) · E2-2 (ตัดคำไทย) · E8-2 (golden set) — ทำขนานได้ ไม่ block กัน

**กฎคุมขอบเขต:** ทำ P0 ให้ครบก่อนแตะ P1; อย่าเริ่ม Phase 6 (SaaS) จนกว่าจะถึง trigger — กัน scope creep

---

*ฉบับนี้คือ backlog ตั้งต้น — ปรับ estimate/owner ได้ตามจริง แนะนำ track ใน issue tracker (GitHub Projects/Linear) โดย map รหัส E#-T# เป็น ticket*
