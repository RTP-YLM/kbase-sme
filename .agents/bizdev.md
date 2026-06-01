# BizDev Agent — BIZ (Phase 3 GTM)

> **บทบาท:** pricing, DPA, sales materials, lead generation, pilot offer, ปิดดีล
> **Issues:** GTM (#44–#49), PIL-6 (#55)
> **ทำขนานกับ build ได้** — ไม่ต้องรอ M2 สำหรับงาน GTM-1/2/3

---

## Pricing Tiers (GTM-1)

| | **Starter** | **Growth** ⭐ | **Business** |
|---|---|---|---|
| ค่าบริการ/เดือน | 4,900 ฿ | 14,900 ฿ | 39,900 ฿ |
| Setup Fee | 50,000 ฿ | 80,000–120,000 ฿ | 150,000–200,000 ฿ |
| ผู้ใช้งาน | 10 คน | 50 คน | 200 คน |
| เอกสาร | 200 ไฟล์ | 2,000 ไฟล์ | ไม่จำกัด |
| Deploy | Hosted | Hosted | **On-Prem** |
| LINE OA | — | ✓ | ✓ |
| LLM | Cloud | Cloud | **Local Typhoon 2** |

**Paid Pilot Offer (GTM-5):**
- ราคา 15,000–30,000 ฿ (one-time)
- รวม: 1 เดือนใช้งาน + data prep + setup + training
- เป้า: ลูกค้า sign ต่อ Growth plan หลัง pilot
- เงื่อนไข: ถ้าไม่พอใจ refund 50% (ลดความเสี่ยงให้ลูกค้า)

**Unit Economics (Growth):**
- COGS: ~800–1,300 ฿/เดือน (LLM + hosting)
- Gross Margin: ~91%
- มูลค่าปีแรก: setup 100k + 12×14.9k = ~279,000 ฿/ดีล

---

## 3 Vertical เป้าหมาย

| Vertical | Pain Point | เอกสารที่ ingest | Contact |
|---|---|---|---|
| คลินิก/ความงาม | พนักงาน turnover สูง, ถามขั้นตอน/ราคาซ้ำ | SOP, ราคา, การเคลม | owner/manager |
| สำนักงานบัญชี/กฎหมาย | คำถาม compliance ซ้ำ, ความรู้อยู่กับ senior | ระเบียบภาษี, checklist | หุ้นส่วน/MD |
| ค้าปลีก/แฟรนไชส์ | สาขาเยอะ มาตรฐานไม่ตรงกัน | SOP สาขา, โปรโมชัน, นโยบายคืนสินค้า | เจ้าของแฟรนไชส์ |

---

## Sales One-Pager (GTM-3)

**Positioning Statement:**
> "KBase SME ช่วยให้พนักงานถามเอกสารบริษัทได้ตลอด 24 ชั่วโมงผ่าน LINE — ไม่ต้องรอ HR, ไม่มั่ว, อ้างอิงเอกสารจริง"

**3 จุดขายหลัก:**
1. **ภาษาไทย + LINE** — ไม่ใช่ chatbot ทั่วไป, เชื่อม LINE OA ที่ SME ใช้อยู่แล้ว
2. **PDPA-safe** — ข้อมูลบริษัทไม่ออกนอกองค์กร (on-prem option)
3. **Done-For-You** — เราจัดการทุกอย่าง ลูกค้าไม่ต้องมีทีม IT

**vs คู่แข่ง:**
| คู่แข่ง | เราชนะเพราะ |
|---|---|
| Chatbase | มี LINE OA + ภาษาไทย + DFY (ไม่ต้อง setup เอง) |
| Zwiz | เจาะ knowledge deep กว่า (SOP/Policy) ไม่ใช่แค่ FAQ |
| SI/Software House | เร็วกว่า 10x ถูกกว่า 5x มี product สำเร็จรูป |

---

## DPA Template (GTM-2)

**ต้องเซ็นก่อนทุกดีล — เราเป็น Data Processor:**

ข้อที่ต้องมีใน DPA:
- [ ] นิยาม Data Controller (ลูกค้า) และ Data Processor (เรา)
- [ ] วัตถุประสงค์การประมวลผลข้อมูล: AI knowledge assistant
- [ ] ประเภทข้อมูล: เนื้อหาเอกสารบริษัท (ไม่ใช่ข้อมูลส่วนบุคคลของลูกค้าปลายทาง)
- [ ] มาตรการรักษาความปลอดภัย: encryption at-rest/in-transit, access control, audit log
- [ ] ข้อกำหนดการลบข้อมูล: ลบทั้งหมดภายใน 30 วันหลังเลิกสัญญา
- [ ] ห้าม sub-processor ประมวลผลข้อมูลโดยไม่ได้รับอนุญาต
- [ ] สิทธิ์ตรวจสอบ (audit right) ของ Data Controller

---

## Lead Generation (GTM-6)

**แหล่ง Lead แรก (ไม่ต้องเสียเงิน):**
1. เครือข่ายส่วนตัวของ Dear — คนรู้จักที่เป็น owner SME
2. กลุ่ม Facebook/LINE ของเจ้าของธุรกิจไทย
3. ลูกค้าเดิมของ Dear (ถ้ามี)
4. ติดต่อสมาคมอุตสาหกรรม 3 vertical (คลินิก, บัญชี, แฟรนไชส์)

**Pipeline target:**
- ≥ 5 qualified leads ก่อนปิด M3
- qualified = owner/decision-maker, 10–200 คน, มีเอกสารที่ต้องการ ingest จริง

---

## Demo Script (GTM-4)

**Demo ใช้เวลา 20–30 นาที:**

1. (2 นาที) เล่าปัญหา: "พนักงานถามคำถามเดิมซ้ำๆ HR ต้องตอบทุกคน"
2. (5 นาที) Demo LINE OA: พิมพ์ "ลากิจได้กี่วัน" → ระบบตอบพร้อมอ้างอิง
3. (5 นาที) Demo Web Chat: admin อัปโหลดเอกสาร → ดูสถานะ ingest
4. (5 นาที) Demo Admin Analytics: คำถามที่ถามบ่อย, คำถามที่ตอบไม่ได้
5. (5 นาที) อธิบาย PDPA: ข้อมูลอยู่ที่ไหน, ใครเห็นได้บ้าง
6. (5 นาที) Q&A + เสนอ Pilot

**คำถามที่ลูกค้ามักถาม + คำตอบ:**
- "ถ้าตอบผิดล่ะ?" → ระบบอ้างอิงเอกสารจริง ถ้าเอกสารถูก คำตอบถูก + มี feedback 👍👎
- "ข้อมูลบริษัทออกไปที่ไหนไหม?" → ไม่ (hosted: เฉพาะ server ของเรา; on-prem: ไม่ออกเลย)
- "setup นานไหม?" → 2–4 สัปดาห์ พร้อมใช้งาน
- "ถ้าเอกสารเปลี่ยน?" → อัปโหลด version ใหม่ ระบบ re-index อัตโนมัติ

---

## Case Study Format (PIL-6)

หลังส่งมอบลูกค้าแรก สร้าง case study:

```markdown
## [ชื่อบริษัท/อุตสาหกรรม] — KBase SME Case Study

**ปัญหา:** [1–2 ประโยค]
**Solution:** ingest [N] เอกสาร, ติดตั้งใน [X] สัปดาห์
**ผลลัพธ์:**
- ตอบคำถาม [Y]% ได้อัตโนมัติ
- ลดคำถามซ้ำไป [Z]% ต่อเดือน
- ROI: [คำนวณจาก เวลา HR ที่ประหยัดได้]
**Quote จากลูกค้า:** "[quote]"
```

---

## สิ่งที่ BizDev ไม่ทำ

- ไม่ให้ราคาต่ำกว่าตารางราคาโดยไม่ผ่าน coordinator (margin < 85% = ไม่คุ้ม)
- ไม่ promise feature ที่ยังไม่มีใน product
- ไม่ให้ลูกค้าทดลองใช้ฟรีนานกว่า 2 สัปดาห์
- ไม่ sign สัญญาโดยไม่มี DPA
