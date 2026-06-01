"""
LINE OA Integration — E6-1, E6-2, E6-3, E6-4
POST /line/webhook (verify signature + reply)
"""
import hashlib
import hmac
import logging
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/line", tags=["line"])

LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
DEFAULT_TENANT_ID = os.getenv("TENANT_ID", "00000000-0000-0000-0000-000000000001")

# Rich menu department mapping — E6-4
DEPARTMENT_KEYWORDS = {
    "hr": ["hr", "ทรัพยากร", "ลา", "สวัสดิการ", "พนักงาน"],
    "accounting": ["บัญชี", "การเงิน", "ใบเสร็จ", "ภาษี"],
    "sales": ["ขาย", "ลูกค้า", "โควต้า", "commission"],
}


def _verify_signature(body: bytes, signature: str) -> bool:
    """E6-1: ตรวจ LINE webhook signature (HMAC-SHA256)"""
    if not LINE_CHANNEL_SECRET:
        logger.warning("LINE_CHANNEL_SECRET ไม่ได้ตั้งค่า — ข้าม signature verify")
        return True
    expected = hmac.new(
        LINE_CHANNEL_SECRET.encode(),
        body,
        hashlib.sha256,
    ).digest()
    import base64
    expected_b64 = base64.b64encode(expected).decode()
    return hmac.compare_digest(expected_b64, signature)


def _detect_department(text: str) -> Optional[str]:
    """Heuristic detect department จากคำถาม (ใช้ถ้าไม่มี rich menu mapping)"""
    text_lower = text.lower()
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return dept
    return None


async def _reply(reply_token: str, messages: list[dict]):
    """ส่ง reply กลับ LINE"""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.line.me/v2/bot/message/reply",
            headers={"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"},
            json={"replyToken": reply_token, "messages": messages},
            timeout=10.0,
        )
        if resp.status_code != 200:
            logger.error(f"LINE reply failed: {resp.status_code} {resp.text[:200]}")


def _format_answer(result) -> list[dict]:
    """E6-3: format ตอบกลับ LINE — ข้อความ + quick reply source"""
    text = result.answer

    # truncate ถ้ายาวเกิน LINE limit (5000 chars)
    if len(text) > 4800:
        text = text[:4800] + "…"

    messages = [{"type": "text", "text": text}]

    # quick reply buttons (ถ้ามี sources)
    if result.answered and result.sources:
        quick_replies = [
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "ถามเพิ่มเติม",
                    "text": "มีคำถามอื่นอีกไหม",
                },
            },
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "คำตอบถูกต้อง ✓",
                    "text": f"__feedback:correct:{result.sources[0].get('source_id', '')}",
                },
            },
        ]
        messages[0]["quickReply"] = {"items": quick_replies[:13]}  # LINE max 13

    return messages


@router.post("/webhook")
async def line_webhook(
    request: Request,
    x_line_signature: str = Header(..., alias="x-line-signature"),
):
    body = await request.body()

    # E6-1: verify signature
    if not _verify_signature(body, x_line_signature):
        raise HTTPException(status_code=401, detail="invalid signature")

    import json
    payload = json.loads(body)

    for event in payload.get("events", []):
        if event.get("type") != "message":
            continue
        if event.get("message", {}).get("type") != "text":
            continue

        reply_token = event.get("replyToken")
        line_user_id = event.get("source", {}).get("userId")
        question = event["message"]["text"].strip()

        # E6-2: map line_user_id → app_user (optional — ถ้าผูกแล้ว)
        user_id = await _lookup_app_user(line_user_id)

        # detect department จากคำถาม
        department = _detect_department(question)

        # feedback shortcut
        if question.startswith("__feedback:"):
            parts = question.split(":")
            if len(parts) >= 2:
                await _handle_feedback(line_user_id, parts[1])
            continue

        # RAG query
        try:
            from rag_pipeline import RAGPipeline
            pipeline = RAGPipeline()
            result = pipeline.query(
                question=question,
                tenant_id=DEFAULT_TENANT_ID,
                user_id=user_id,
                line_user_id=line_user_id,
                department=department,
            )
            messages = _format_answer(result)
        except Exception as e:
            logger.error(f"RAG pipeline error: {e}")
            messages = [{"type": "text", "text": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}]

        if reply_token:
            await _reply(reply_token, messages)

    return {"status": "ok"}


async def _lookup_app_user(line_user_id: str) -> Optional[str]:
    """E6-2: ดึง app_user.id จาก line_user_id (คืน None ถ้าไม่เจอ)"""
    try:
        from supabase_vector_store import SupabaseVectorStore
        store = SupabaseVectorStore()
        store._ensure_client()
        result = (
            store._client.table("app_users")
            .select("id")
            .eq("line_user_id", line_user_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]["id"]
    except Exception:
        pass
    return None


async def _handle_feedback(line_user_id: str, feedback_type: str):
    """บันทึก feedback จาก quick reply"""
    try:
        from supabase_vector_store import SupabaseVectorStore
        store = SupabaseVectorStore()
        store._ensure_client()
        store._client.table("rag_query_logs").update(
            {"feedback": feedback_type}
        ).eq("line_user_id", line_user_id).order("created_at", desc=True).limit(1).execute()
    except Exception as e:
        logger.warning(f"feedback update failed: {e}")
