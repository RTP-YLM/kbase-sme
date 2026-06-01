# API Engineer Agent — Backend FastAPI (E4 + E6)

> ⚠️ **POC ปัจจุบัน vs Target:** ยังไม่มี FastAPI app — มีแค่ CLI scripts (`query.py`, `ingest.py`)
> ไฟล์นี้เขียนถึง **target API contract** ที่ต้อง build ใหม่ทั้งหมด
> อ่าน Current State ใน `AGENTS.md` ก่อนเสมอ

> **บทบาท:** FastAPI REST API ครบ, auth JWT, LINE webhook, Redis async queue
> **Issues:** E4 (#15–#19), E6 (#24–#27)
> **Depends on:** E1-1 (schema), E3-4 (RAG complete) ก่อนทำ /query

---

## API Contract (ห้ามเปลี่ยนโดยไม่ผ่าน coordinator)

Base URL: `/api/v1`
Auth: Bearer JWT ทุก endpoint ยกเว้น `/auth/login`, `/line/webhook`, `/health`

| Method | Endpoint | Auth | E-task |
|---|---|---|---|
| POST | `/auth/login` | public | E4-1 |
| POST | `/query` | user | E4-2 |
| POST | `/feedback` | user | E4-2 |
| POST | `/documents` | admin | E4-3 |
| GET | `/documents` | admin | E4-3 |
| POST | `/documents/{id}/reindex` | admin | E4-3 |
| DELETE | `/documents/{id}` | admin | E4-3 |
| GET | `/jobs/{id}` | admin | E4-3 |
| GET | `/logs` | admin | E4-4 |
| GET | `/health` | public | E4-4 |
| POST | `/line/webhook` | LINE sig | E6-1 |

---

## E4-1 — Auth + JWT

```python
# JWT payload ที่ต้องมี:
{
  "sub": "user_id",
  "tenant_id": "uuid",
  "role": "user|admin",
  "departments": ["HR", "Finance"],  # list — ใช้ filter documents
  "exp": timestamp
}

# Middleware ตรวจสิทธิ์:
# - user: เข้าได้เฉพาะ /query, /feedback
# - admin: เข้าได้ทุก endpoint
# - ห้ามลบ tenant_id จาก JWT — ใช้ทุก query
```

---

## E4-2 — POST /query

```python
# Input:
{
  "question": "ลากิจได้กี่วัน",
  "department": "HR"  # optional override
}

# ขั้นตอน:
# 1. check semantic cache (Redis) → return ถ้า hit
# 2. embed question (BGE-M3)
# 3. hybrid search (pgvector + FTS) กรอง tenant_id + department + access_level
# 4. rerank → ถ้า max score < threshold → no-answer
# 5. generate (grounded prompt)
# 6. log ลง rag_query_logs
# 7. cache ผลลัพธ์ (Redis)
# 8. return response

# Response: ดู rag-core.md section E3-4
```

---

## E4-3 — Document Management API

```python
# POST /documents — upload
# - multipart/form-data: file + metadata (department, access_level, title)
# - ตรวจ checksum → skip/queue
# - enqueue ลง Redis → return {"job_id": "..."}

# GET /documents — list
# - กรอง tenant_id เสมอ
# - return: id, title, status, chunk_count, last_indexed_at, access_level

# POST /documents/{id}/reindex — force re-index
# DELETE /documents/{id} — archive + ลบ chunks ทั้งหมดของ source นี้

# GET /jobs/{id} — ingestion job status
# return: {status: queued|running|done|error, step, progress_pct, error_msg}
```

---

## E4-5 — Access Control Filter

```python
# ทุก query ต้องกรอง:
# WHERE tenant_id = :tenant_id
#   AND (department = :user_dept OR department IS NULL)
#   AND access_level <= :user_access_level

# access_level: 1=public, 2=staff, 3=manager, 4=admin
# department: ตาม JWT departments[] — user เห็น null + dept ของตัวเอง
# ห้ามคืน restricted document ข้าม department
```

---

## E6 — LINE OA Integration

### E6-1 — Webhook + Signature Verify

```python
# endpoint: POST /line/webhook
# ตรวจ X-Line-Signature header:
import hmac, hashlib, base64
def verify_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = base64.b64encode(
        hmac.new(secret.encode(), body, hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(expected, signature)

# ถ้า signature ไม่ตรง → HTTP 400 ทันที
# รับ event types: message.text เท่านั้น (ตอนนี้)
```

### E6-2 — Map LINE User → App User

```python
# flow:
# 1. รับ line_user_id จาก event
# 2. lookup app_users WHERE line_user_id = :lid AND tenant_id = :tid
# 3. ถ้าไม่เจอ → reply "กรุณาลงทะเบียนก่อน พิมพ์ /register"
# 4. ถ้าเจอ → ใช้ departments[] จาก app_user เป็น filter
# เก็บ LINE profile (display_name, picture_url) ใน app_users
```

### E6-3 — Reply Format

```python
# LINE message ยาวได้ไม่เกิน 2000 chars
# format:
"""
{answer}

📄 อ้างอิง: {source_title} · {section}
ความมั่นใจ: {score:.0%}
"""

# ถ้า answered=false:
"""
ขออภัย ไม่พบข้อมูลเพียงพอในเอกสาร
กรุณาติดต่อ {suggested_dept} โดยตรง
"""

# Quick reply buttons: 👍 ถูกต้อง / 👎 ไม่ถูกต้อง / 🔄 ถามใหม่
# ห้าม reply ช้ากว่า 30s (LINE timeout) → ใช้ async + loading indicator
```

### E6-4 — Rich Menu (P1)

```python
# rich menu ต่อแผนก — กดแล้ว set department filter
# เช่น: [HR] [Finance] [Operations] [ถามทั่วไป]
# บันทึก department preference ใน Redis (key: line_user_id)
```

---

## FastAPI App Structure

```
app/
├── main.py              # FastAPI app + routers
├── routers/
│   ├── auth.py          # /auth/login
│   ├── query.py         # /query, /feedback
│   ├── documents.py     # /documents, /jobs
│   ├── logs.py          # /logs, /health
│   └── line_webhook.py  # /line/webhook
├── middleware/
│   ├── auth.py          # JWT verify + inject user context
│   └── tenant.py        # inject tenant_id
├── schemas/             # Pydantic request/response models
└── dependencies.py      # DB session, Redis client
```

---

## Error Handling Rules

- ห้าม expose stack trace ใน response (production)
- 401 ทุกกรณี JWT expired/invalid
- 403 ถ้า role ไม่พอ (user เข้า admin endpoint)
- 429 ถ้า rate limit (10 req/min/user ตอนนี้)
- LINE webhook ต้อง return HTTP 200 เสมอ ไม่งั้น LINE retry

---

## Environment Variables ที่ต้องการ

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_EXPIRE_HOURS=24
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
TENANT_ID=1  # single-tenant default
```
