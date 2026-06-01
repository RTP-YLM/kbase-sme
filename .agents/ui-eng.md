# UI Engineer Agent — Frontend Next.js (E5)

> **บทบาท:** Web Chat UI + Admin UI ด้วย Next.js
> **Issues:** E5 (#20–#23)
> **Depends on:** E4-1 (auth), E4-2 (/query), E4-3 (/documents) เสร็จก่อน

---

## Application Structure

```
web/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx        # E5-4
│   ├── chat/page.tsx             # E5-1 — Web Chat UI
│   ├── admin/
│   │   ├── documents/page.tsx    # E5-2 — Document management
│   │   ├── jobs/page.tsx         # E5-2 — Ingestion job status
│   │   └── logs/page.tsx         # E5-3 — Query logs analytics
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx
│   │   ├── SourcePanel.tsx       # แสดง citation
│   │   └── FeedbackButtons.tsx   # 👍👎
│   └── admin/
│       ├── DocumentTable.tsx
│       ├── UploadZone.tsx
│       └── JobStatusBadge.tsx
├── lib/
│   ├── api.ts                    # typed API client
│   └── auth.ts                   # JWT handling
└── middleware.ts                 # route protection
```

---

## E5-1 — Web Chat UI

### UX Requirements

```
┌─────────────────────────────────┐
│  KBase SME  [Company Logo]  [⚙] │
├─────────────────────────────────┤
│                                  │
│  ← เอกสาร: HR Policy 2026       │
│     หัวข้อ: การลา · 0.86        │ ← Source Panel (collapse ได้)
│                                  │
│  [AI bubble] พนักงานมีสิทธิ์    │
│  ลากิจได้ 3 วันทำงานต่อปี...   │
│                                  │
│  [User bubble] ลาป่วยล่ะ?       │
│                                  │
├─────────────────────────────────┤
│  [พิมพ์คำถาม...        ] [ส่ง] │
└─────────────────────────────────┘
```

**พฤติกรรม:**
- Streaming response (ถ้า API รองรับ) หรือ loading indicator
- Source panel เปิดปิดได้ — แสดง title, section, rerank_score
- 👍 / 👎 ต่อทุก response → POST /feedback
- ประวัติ conversation ใน session storage (ไม่ persist ข้าม tab)
- ถ้า `answered: false` → แสดง message ว่าไม่พบข้อมูลชัดเจน (ไม่ใช่ error)
- รองรับ mobile viewport

**Tech:**
- ไม่ต้องใช้ WebSocket ตอนนี้ — fetch + loading state พอ
- ถ้า stream: `ReadableStream` API

---

## E5-2 — Admin UI (Document Management)

### Document Table
```
| ชื่อเอกสาร | แผนก | สิทธิ์ | Chunks | สถานะ | อัปโหลดล่าสุด | Actions |
|------------|------|--------|--------|--------|----------------|---------|
| HR Policy  | HR   | staff  | 127    | ✅ done| 31 พ.ค. 2026  | [↻][🗑] |
| Price List | -    | public | 45     | ⏳ running | ...       | [-][-]  |
```

### Upload Zone
- drag & drop หรือ click to browse
- รองรับ PDF, DOCX, MD, TXT
- แสดง progress bar ของ ingestion job (poll GET /jobs/{id} ทุก 3s)
- แสดง error message ชัดเจนถ้า ingest ล้มเหลว

### Job Status Badge
```tsx
// queued → ⏸ รอคิว
// running (step: OCR) → ⏳ กำลัง OCR...
// running (step: embed) → ⏳ กำลัง embed...
// done → ✅ เสร็จแล้ว (N chunks)
// error → ❌ {error_msg}
```

---

## E5-3 — Query Logs + Analytics (Admin)

**หน้า Logs แสดง:**
- ตาราง query logs: เวลา, คำถาม, answered (✅/❌), latency, from_cache (💨)
- กรองได้: answered=false (คำถามตอบไม่ได้ — สำคัญมาก), วันที่, แผนก
- Feedback summary: 👍 N / 👎 N ต่อช่วงเวลา
- Export CSV (P1)

**เหตุผล:** หน้านี้เป็น "เหตุผลต่อสัญญา" — แอดมินเห็นว่าระบบตอบอะไรไม่ได้แล้วปรับปรุงเอกสาร

---

## E5-4 — Login / Role UI

- Form: email + password → POST /auth/login → เก็บ JWT ใน httpOnly cookie หรือ localStorage
- ถ้า role=admin → redirect ไป /admin
- ถ้า role=user → redirect ไป /chat
- Middleware ป้องกัน route ที่ต้องการ auth

---

## API Client (lib/api.ts)

```typescript
// typed wrapper — ไม่ fetch ตรงใน component
export async function query(question: string, department?: string) {
  const res = await fetch('/api/v1/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, department })
  })
  if (!res.ok) throw new APIError(res.status, await res.json())
  return res.json() as Promise<QueryResponse>
}
```

---

## Styling Rules

- Tailwind CSS — ไม่ใช้ CSS-in-JS
- ไม่ต้องสวยงามระดับ production design ในรอบ MVP — functional + clean พอ
- รองรับ mobile (375px) + desktop (1280px)
- ภาษาไทยทุก label ที่ user เห็น (admin UI ภาษาไทยได้เพราะ user คือแอดมินคนไทย)

---

## Performance Rules

- ห้าม fetch ตรงใน render loop
- poll job status ทุก 3s เมื่อ status=running, stop เมื่อ done/error
- ไม่ต้องทำ real-time ผ่าน WebSocket ในรอบ MVP

---

## สิ่งที่ไม่ต้องทำใน MVP (P2)

- Dark mode
- i18n / multiple language
- Push notification
- Mobile app (LINE แทนได้)
