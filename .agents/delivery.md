# Delivery Agent — DEL (Phase 2 Productize + Phase 4 Pilot)

> **บทบาท:** รัน DFY playbook กับลูกค้า, เตรียมข้อมูล, อบรม, รายงานรายเดือน
> **Issues:** PD (#39–#43), PIL (#50–#55)
> **หมายเหตุ:** นี่คือ role ที่ Dear จะ "จ้างพร้อม DATA" — agent context นี้ออกแบบให้คนใหม่รับไปทำได้ทันที

---

## DFY Playbook — 8 ขั้นตอน (PD-1)

ทุกดีล DFY ผ่าน 8 ขั้นนี้ตามลำดับ:

### ขั้นที่ 1 — Discovery Meeting (1–2 ชั่วโมง)

**เป้า:** เข้าใจ use cases จริง + รับเอกสารต้นฉบับ

คำถามที่ต้องถาม:
- พนักงานถามคำถามอะไรซ้ำๆ บ่อยที่สุด? (ขอ 10–20 ข้อ)
- เอกสารสำคัญที่สุดที่พนักงานต้องใช้มีอะไรบ้าง?
- แผนกไหนจะใช้ก่อน? มีกี่คน?
- ต้องการ LINE OA ด้วยไหม?
- มีข้อมูลที่ sensitive ที่ไม่ให้คนทั่วไปเห็นไหม?

Output: Discovery Report + "golden questions" 20–30 ข้อ (ใช้ทำ golden set)

### ขั้นที่ 2 — Document Audit (0.5–1 วัน)

ดู `data-prep.md` — Document Audit section

Output: Document Audit Report → ส่งลูกค้า confirm ก่อน ingest

### ขั้นที่ 3 — Data Prep + Ingest (1–3 วัน ขึ้นกับจำนวนไฟล์)

- ทำ data prep ตาม `data-prep.md`
- ingest ≥ 30 ไฟล์
- ตรวจ chunk quality (อ่านตัวอย่างด้วยตา)

### ขั้นที่ 4 — Golden Set + Eval (0.5 วัน)

- สร้าง golden set จาก discovery questions
- รัน eval → ต้อง ≥ 90%
- ถ้าต่ำกว่า → แก้ chunking/metadata → รันใหม่ (loop)

### ขั้นที่ 5 — Deploy + Setup LINE OA (0.5 วัน)

- deploy ลง VPS ของลูกค้า (หรือ hosted)
- setup LINE OA: channel, webhook URL, rich menu
- ผูก line_user_id กับ app_user (ส่ง registration link ให้พนักงาน)

### ขั้นที่ 6 — UAT (1–2 วัน)

- ให้ลูกค้า (admin + 2–3 พนักงาน) ทดสอบจริง
- collect feedback: คำถามที่ตอบไม่ดี
- แก้ไข (re-ingest เอกสารที่มีปัญหา, ปรับ metadata)
- sign-off sheet

### ขั้นที่ 7 — Training (2–3 ชั่วโมง)

**Admin training:**
- วิธีอัปโหลดเอกสารใหม่
- วิธีดู query logs + คำถามที่ตอบไม่ได้
- วิธี re-index เอกสารที่เปลี่ยน
- วิธี add ผู้ใช้ใหม่ + ผูก LINE

**End-user training:**
- วิธีถาม (LINE + Web)
- วิธี feedback 👍👎
- ข้อจำกัด: ตอบได้เฉพาะจากเอกสารที่มี

### ขั้นที่ 8 — Go-Live + Handoff

- ส่งมอบ runbook (คู่มือดูแลระบบ)
- ตั้ง monitoring alert ให้ลูกค้า
- กำหนดวัน monthly check-in ครั้งแรก

---

## Monthly Report Template (PD-4)

**ส่งทุกต้นเดือน — เป็นเหตุผลให้ต่อสัญญา + upsell**

```markdown
# รายงานประจำเดือน [เดือน] — KBase SME
## [ชื่อบริษัทลูกค้า]

### สรุปการใช้งาน
- คำถามทั้งหมด: X ครั้ง
- ตอบสำเร็จ: Y% (เป้า ≥ 90%)
- ผู้ใช้งาน: Z คน
- แผนกที่ใช้บ่อยที่สุด: [แผนก]

### TOP 5 คำถามยอดนิยม
1. [คำถาม] — ถาม N ครั้ง
...

### คำถามที่ตอบไม่ได้ (ต้องเพิ่มเอกสาร)
1. [คำถาม] — ถาม N ครั้ง → แนะนำ: เพิ่มเอกสาร [ประเภท]
...

### Feedback ผู้ใช้
- 👍 ถูกต้อง: P%
- 👎 ไม่ถูกต้อง: Q% (ลดลงจากเดือนที่แล้ว R%)

### แผนเดือนหน้า
- เอกสารที่แนะนำให้เพิ่ม: [รายการ]
- [upsell ถ้ามี: เช่น เพิ่มแผนก, on-prem upgrade]
```

---

## Runbook Template (PD-5)

**ส่งลูกค้าทุกราย — admin อ่านแล้วดูแลระบบเองได้**

ดูไฟล์ `docs/runbook_template.md` (สร้างแยก)

หัวข้อที่ต้องมี:
- วิธีเข้าระบบ (URL, credentials, LINE OA)
- วิธีอัปโหลดเอกสาร + ตรวจสถานะ
- วิธีเพิ่ม/ลบผู้ใช้
- วิธีดู query logs
- การแก้ปัญหาเบื้องต้น (system ไม่ตอบ, LINE ไม่ reply)
- ช่องทางติดต่อสนับสนุน + SLA

---

## Pilot-to-Paid Conversion (PIL-5 → M4)

**Sign-off checklist ก่อน go-live:**
- [ ] eval ≥ 90% บน golden set ลูกค้า (ดู qa-eval)
- [ ] UAT เสร็จ ลูกค้า sign-off
- [ ] LINE OA ทดสอบครบ
- [ ] Admin ใช้งาน UI ได้คล่อง
- [ ] Runbook ส่งมอบแล้ว
- [ ] Monthly report schedule กำหนดแล้ว
- [ ] ลูกค้าจ่ายเงิน (setup fee + เดือนแรก) ก่อน go-live

---

## Timeline ต่อลูกค้า (target ≤ 4 สัปดาห์)

| สัปดาห์ | กิจกรรม |
|---|---|
| W1 | Discovery + Document Audit + รอลูกค้า confirm |
| W2 | Data Prep + Ingest + Golden Set + Eval |
| W3 | Deploy + UAT |
| W4 | แก้ไข + Training + Go-Live |

---

## สิ่งที่ Delivery ไม่ทำ

- ไม่แก้ code RAG — ถ้าคุณภาพไม่ผ่าน escalate ไปหา coordinator + rag-core
- ไม่ ingest เอกสารที่ขัดแย้งโดยไม่ resolve กับลูกค้าก่อน
- ไม่ go-live ถ้า eval < 90%
- ไม่ให้ลูกค้าใช้งานก่อนจ่ายเงิน
