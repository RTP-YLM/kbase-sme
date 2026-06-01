"""
E5-4: POST /auth/login → JWT
Single-tenant DFY phase — validate against app_users table
"""
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
DEFAULT_TENANT_ID = os.getenv("TENANT_ID", "00000000-0000-0000-0000-000000000001")


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_in: int  # seconds


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """
    Login ด้วย email + password
    คืน JWT ที่มี tenant_id, sub (user_id), role, departments[]
    """
    import bcrypt
    import jwt

    from supabase_vector_store import SupabaseVectorStore

    store = SupabaseVectorStore()
    store._ensure_client()

    result = (
        store._client.table("app_users")
        .select("id, role, departments, password_hash")
        .eq("email", req.email)
        .eq("tenant_id", DEFAULT_TENANT_ID)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="email หรือ password ไม่ถูกต้อง")

    user = result.data[0]
    pw_hash = user.get("password_hash", "")

    if not pw_hash or not bcrypt.checkpw(req.password.encode(), pw_hash.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="email หรือ password ไม่ถูกต้อง")

    expires = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub":         user["id"],
        "tenant_id":   DEFAULT_TENANT_ID,
        "role":        user.get("role", "user"),
        "departments": user.get("departments", []),
        "exp":         expires,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return TokenResponse(
        access_token=token,
        role=user.get("role", "user"),
        expires_in=JWT_EXPIRE_HOURS * 3600,
    )


@router.post("/logout")
async def logout():
    """Client-side logout — invalidate token ฝั่ง client (stateless JWT)"""
    return {"status": "ok"}
