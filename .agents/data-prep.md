# Data Prep Agent — DATA (E2-3, E8-2, PIL-2)

> **บทบาท:** เตรียมข้อมูล, OCR, chunking quality, สร้าง golden set, data prep ต่อลูกค้า
> **Issues:** E2-3 (#6), E8-2 (#33), PIL-2 (#51)
> **หมายเหตุ:** นี่คือ role ที่ Dear จะ "จ้างก่อน" เมื่อมีดีลแรก — agent context นี้ออกแบบให้คนใหม่รับไปทำได้เลย

---

## บทบาทหลัก 3 ด้าน

### 1. OCR Pipeline (E2-3)

**เมื่อไหร่ใช้ OCR:**
- PDF ที่ `pdfminer.six` extract text ได้ < 10 chars/หน้า → เป็น scanned PDF
- ไฟล์รูปภาพ (.jpg, .png) ที่มีข้อความ
- PDF ที่มีหน้าผสม (บางหน้าเป็นรูป)

**Tool: Typhoon OCR**
```python
# Typhoon OCR = open Thai VLM โดย SCB 10X
# ดีกว่า Tesseract สำหรับภาษาไทย
# API หรือ self-hosted ผ่าน Ollama

async def ocr_page(image_bytes: bytes) -> str:
    # ส่งภาพไปให้ Typhoon OCR
    # return: plain text ของหน้านั้น
    ...

# หลัง OCR → ผ่าน chunking pipeline เหมือนกัน
```

**QA check หลัง OCR:**
- อ่านผลลัพธ์ตรวจว่า ภาษาไทยอ่านออก ไม่มีอักขระแปลก
- ตัวเลขและชื่อเฉพาะถูกต้อง (ราคา, รหัสสินค้า)
- BLEU score เทียบ ground truth ≥ 0.85

---

### 2. Golden Set Builder (E8-2)

**เป้าหมาย:** 30–50 ข้อ จาก 10 เอกสารตัวอย่าง ครอบคลุม 4 ประเภท:

```python
# ประเภทคำถาม:
# 1. answerable — คำตอบอยู่ในเอกสาร (ส่วนใหญ่)
# 2. no-answer — ไม่มีในเอกสาร (ต้องตอบ "ไม่พบ")
# 3. multi-source — คำตอบรวมจากหลายเอกสาร
# 4. table — คำตอบอยู่ในตาราง (เบิกเงิน, ราคา)
```

**รูปแบบ golden set (JSONL):**
```jsonl
{"id": "q001", "question": "ลากิจได้กี่วัน", "answer": "3 วันทำงานต่อปี", "source_ids": ["doc-uuid-1"], "type": "answerable"}
{"id": "q002", "question": "บริษัทมีกี่สาขา", "answer": null, "source_ids": [], "type": "no-answer"}
{"id": "q003", "question": "ค่าล่วงเวลาคิดอย่างไร", "answer": "1.5 เท่าของค่าจ้างรายชั่วโมง...", "source_ids": ["doc-uuid-2"], "type": "table"}
```

**วิธีสร้าง golden set:**
1. เปิดเอกสารต้นฉบับ
2. หาหัวข้อสำคัญ (HR, Finance, SOP, ราคา)
3. เขียนคำถามที่พนักงานจะถามจริง (ไม่ใช่คำถามทดสอบ academic)
4. เขียนคำตอบที่ถูกต้องจากเอกสาร + ระบุ source
5. เพิ่ม no-answer cases 20%: คำถามที่เอกสารไม่มีคำตอบ

---

### 3. Customer Data Prep (PIL-2 — ลูกค้าจริง)

**เป้า:** ingest เอกสารจริง ≥ 30 ไฟล์ ไม่มี vector ขยะ

**ขั้นตอน Document Audit ก่อน ingest:**

```
1. รวบรวมเอกสารทั้งหมดจากลูกค้า (Google Drive, email, LINE)
2. จัดหมวดหมู่:
   - ✅ ใช้ได้: เอกสารเป็นปัจจุบัน ข้อมูลถูกต้อง
   - ⚠️ ต้องแก้ไข: เอกสารเก่า ข้อมูลขัดแย้ง
   - ❌ ไม่ ingest: ข้อมูลล้าสมัย ขัดแย้งกับนโยบายปัจจุบัน
3. ตรวจ format: PDF text / PDF scan / DOCX / Excel / ภาพถ่าย
4. สร้าง Document Audit Report ส่งลูกค้า confirm ก่อน ingest
```

**กฎ data prep:**
- เอกสารที่ขัดแย้งกัน → ถามลูกค้าว่าใช้ version ไหน (ห้ามเดา)
- เอกสารที่ไม่มีวันที่ → ถามลูกค้า
- Excel ที่มีหลาย sheet → แยก ingest ทีละ sheet พร้อมระบุ sheet name
- ไฟล์ที่มีข้อมูล sensitive เกินไป (เงินเดือนรายคน, ประวัติส่วนตัว) → ถามลูกค้าก่อน access_level กำหนด

**สร้าง golden set ต่อลูกค้า:**
- หลัง ingest → สร้าง 20–30 คำถามจากเอกสารจริง
- รวม use cases ที่ลูกค้าระบุใน Discovery (PIL-1)
- รัน eval → ถ้า < 90% → แก้ chunking/metadata แล้วรันใหม่

---

## เอกสาร Format ที่รองรับ

| Format | Tool | หมายเหตุ |
|---|---|---|
| PDF (text) | pdfminer.six | ตรงไปตรงมา |
| PDF (scan/image) | Typhoon OCR | ช้ากว่า — async |
| DOCX | python-docx | preserve headings สำหรับ section chunking |
| MD / TXT | ตรงๆ | ง่ายสุด |
| Excel (.xlsx) | openpyxl | แปลงแต่ละ sheet เป็น markdown table |
| ภาพ (.jpg/.png) | Typhoon OCR | ถ้ามีข้อความ |

---

## คำเตือนที่ต้องระวัง

- **Garbage In, Garbage Out** — เอกสารไม่ดี = คำตอบไม่ดี ไม่ว่า RAG จะดีแค่ไหน
- ห้าม ingest เอกสารที่ขัดแย้งโดยไม่ resolve ก่อน
- ห้าม ingest ทุกอย่างโดยไม่ audit — เสียเวลา + ทำให้คุณภาพแย่
- ตรวจ chunk ที่ออกมาด้วยตาก่อน run eval ครั้งแรก

---

## Dependencies

```txt
pdfminer.six
python-docx
openpyxl
pythainlp>=5.0.0
Pillow                # image processing ก่อน OCR
```
