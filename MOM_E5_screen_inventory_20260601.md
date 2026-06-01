# MOM — Pre-work Screen Inventory Spec (E5 UI)
**วันที่**: 2026-06-01  
**หัวข้อ**: Brainstorm ก่อนเริ่ม build E5 UI (Web Chat + Admin)  
**ผู้เข้าร่วม**: ui-eng, api-eng, qa-eval, coordinator, bizdev, data-prep  
**Facilitator**: coordinator (ARC)

---

## 1. Screen Inventory — สรุปจาก ui-eng

5 screens ที่ต้องสร้าง:

| # | Screen | Route | Role | Primary API |
|---|---|---|---|---|
| 1 | Login | `/login` | public | POST /auth/login |
| 2 | Web Chat | `/chat` | user, admin | POST /api/query |
| 3 | Admin Documents | `/admin/documents` | admin | GET/POST/DELETE /api/documents |
| 4 | Admin Query Logs | `/admin/logs` | admin | GET /api/logs |
| 5 | 403 / Not Found | `/403`, `not-found` | all | — |

---

## 2. API Gaps — พบโดย api-eng (ต้องแก้ก่อน build UI)

| # | Gap | Impact | Action |
|---|---|---|---|
| G1 | ไม่มี `GET /api/documents/{id}` | Admin ดู detail ไม่ได้ | เพิ่ม endpoint |
| G2 | `GET /api/documents` ไม่มี pagination/total | Table ใหญ่โหลดหมด | เพิ่ม `offset` + `{items, total}` |
| G3 | `GET /api/logs` ไม่มี pagination | Admin logs ไม่มี load-more | เพิ่ม `offset` + `{items, total}` |
| G4 | `JobStatus` ขาด `progress_pct` + `filename` | Progress bar ไม่ได้ label | เพิ่ม 2 fields |
| G5 | `FeedbackRequest` ใช้ question string (fragile) | ซ้ำกันแตก | เปลี่ยนเป็น `query_log_id: int` |
| G6 | ไม่มี `GET /api/auth/me` | UI decode JWT เอง = XSS risk | เพิ่ม endpoint คืน user profile |

**Recommendation (api-eng):** เพิ่ม SSE streaming บน `POST /api/query` — 5–15s sync LLM ทำให้ browser timeout + LINE webhook พัง รองรับ `Accept: text/event-stream` ควบคู่กับ sync JSON เดิม

---

## 3. Decisions ที่ต้องตัดสินใจก่อนเขียนโค้ดแม้แต่บรรทัดเดียว

**D1 — JWT Storage** ✅ **ตัดสินแล้ว: httpOnly cookie**  
- เหตุผล: security สำคัญกว่า simplicity, PDPA เป็นจุดขาย  
- Impl: Next.js API route proxy set/clear cookie, client ไม่แตะ token โดยตรง

**D2 — Query Streaming** ✅ **ตัดสินแล้ว: sync JSON ก่อน, SSE ทีหลัง**  
- เหตุผล: ตาม risk mitigation MOM ("Build sync first, SSE เป็น enhancement")  
- Impl: loading spinner + disabled input ระหว่างรอ, SSE เพิ่มใน v2

**D3 — UI Language** ✅ **ตัดสินแล้ว: Thai-only**  
- เหตุผล: product ขาย SME ไทย, ไม่ต้อง bilingual ใน MVP, ค่อยเพิ่ม v2  
- Impl: copy string ทั้งหมดเป็นภาษาไทย, ไม่มี i18n layer

---

## 4. Build Order — coordinator

```
Shared Foundation (บังคับก่อนทุกหน้า)
  ├── Generate API client (openapi-typescript + apiFetch wrapper + JWT header inject)
  ├── App shell: Next.js layout, Thai font (Sarabun via next/font), Tailwind
  ├── AuthGuard HOC + Zustand auth store (token, role, tenant_id)
  └── Global error boundary

Screen 1: Login          ← unblocks everything, validate auth flow end-to-end
Screen 2: Web Chat        ← M1 deliverable, ต้องการ iteration time มากสุด
Screen 3: Admin Documents ← ขึ้นกับ auth guard + admin role check
Screen 4: Admin Logs      ← pure read, risk ต่ำสุด, build สุดท้าย
```

---

## 5. DoD & Test Strategy — qa-eval

**Framework:** Playwright E2E (screens) + Vitest unit (Thai text utils, JWT helpers)

**DoD ต่อ screen:**

| Screen | DoD |
|---|---|
| Login | valid → redirect ถูก role, invalid → Thai error msg, JWT ใน httpOnly cookie, expire → redirect |
| Web Chat | query ส่ง → answer + source citation render, Thai input ส่งได้, `answered: false` → fallback state |
| Admin Docs | upload → row ขึ้น table, delete ต้อง confirm, duplicate → แจ้ง existing, processing badge อัปเดต |
| Admin Logs | table load + filter, Thai query text ไม่ตัด, export CSV UTF-8 BOM (Excel ไทยไม่พัง) |

**Thai text failure modes ที่ต้องระวัง:**
1. ไม่มี Thai font → ช่องว่างหรือ □ แทนตัวอักษร
2. CSV export ไม่มี UTF-8 BOM → Excel Windows อ่าน Thai เป็น mojibake
3. `maxLength` นับ byte แทน character → Thai 3 bytes/char ทำให้ตัดที่ ~33 chars
4. Thai ใน query param ไม่ `encodeURIComponent` → URL พัง
5. Line-height แน่น → Thai descender clip

---

## 6. Admin Upload UX Spec — data-prep

**Progress feedback (3 stage + elapsed timer):**
1. "กำลังอ่านไฟล์…" — ทันที (202 response)
2. "กำลังแบ่งและเข้ารหัสเนื้อหา…" — ~3s (chunk + embed)
3. "บันทึกเรียบร้อย" — job status = done

**Error messages (Thai):**

| Trigger | ข้อความ | Action |
|---|---|---|
| ไฟล์ > 50MB | "ไฟล์ใหญ่เกิน 50MB กรุณาแบ่งไฟล์" | block, ไม่ call API |
| format ไม่รองรับ | "รองรับเฉพาะ PDF, DOCX, MD, TXT, XLSX" | block |
| PDF scan (0 text) | "PDF นี้เป็นภาพสแกน ยังไม่รองรับ OCR" | warning หลัง ingest |
| duplicate file | "ไฟล์นี้มีอยู่แล้วในระบบ (source_id: …)" | surface existing ID |
| job timeout | "เกิดข้อผิดพลาด กรุณาลองใหม่" | retry button |

**Metadata ต่อไฟล์ (required ก่อน upload):**
- Department: dropdown (HR / บัญชี / ขาย / Operations / Legal / อื่นๆ)
- Access Level: radio (สาธารณะ / ภายในแผนก / ลับ)

**Quality signal หลัง ingest:** แสดง chunk_count — 🟡 < 3 chunks, 🔴 = 0 chunks (PDF scan)

---

## 7. Demo Strategy — bizdev

**"Wow" moment:** Web Chat — ลูกค้าพิมพ์คำถามภาษาไทยเอง แล้วเห็นคำตอบจากเอกสารบริษัทตัวเองใน < 3s

**3 สิ่งที่ลูกค้าต้องทำเองในการ demo:**
1. พิมพ์คำถามในหน้า Chat เอง (ใช้คำของตัวเอง)
2. Upload เอกสาร 1 หน้า — เห็นว่า content ของตัวเองเข้าระบบได้จริง
3. ดู query log — เห็น oversight + accountability ที่ manager ต้องการ

**ห้ามแสดงในการ demo:**
- Error states / slow response / "ไม่พบข้อมูล" — แม้ครั้งเดียว
- Config screen / API key / backend setting
- UI หรือ placeholder ภาษาอังกฤษ

**Differentiator:** Source citation ใต้ทุกคำตอบ — "อ้างอิง: คู่มือ HR บริษัท หน้า 3" — chatbot ทั่วไปไม่มีสิ่งนี้

---

## 8. Action Items (ก่อนเขียนโค้ด)

| # | งาน | Owner | Deadline |
|---|---|---|---|
| A1 | ตัดสิน D1 JWT storage | coordinator | ก่อน start |
| A2 | ตัดสิน D2 SSE vs sync | coordinator | ก่อน start |
| A3 | ตัดสิน D3 ภาษา UI | bizdev | ก่อน start |
| A4 | แก้ G1–G6 API gaps ใน FastAPI | api-eng | Sprint 1 วันแรก |
| A5 | Scaffold Next.js + generate API client | ui-eng | Sprint 1 วันแรก |
| A6 | Setup Playwright + Vitest | qa-eval | Sprint 1 วันแรก |
| A7 | สร้าง demo dataset ไทย (3 docs) ingest จริง | data-prep | ก่อน demo |

---

## 9. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| SSE streaming ยาก/ใช้เวลามาก | Medium | High | Build sync first, SSE เป็น enhancement |
| Thai font/encoding ใน prod พัง | High | High | Test บน Windows Chrome วันแรก |
| LLM latency > 10s → UX พัง | Medium | High | Show streaming หรือ progress indicator |
| PDF scan ลูกค้า upload ไม่ติด | High | Medium | แจ้ง warning ชัดเจน, รอ E2-3 OCR |

---

*ประชุมเสร็จ 2026-06-01 | ถัดไป: ตัดสินใจ D1–D3 แล้วเริ่ม scaffold Next.js*
