"""
JWT Auth — E4-1
tenant_id, role, departments[] จาก Bearer token
"""
import os
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

_bearer = HTTPBearer()


class TokenPayload:
    def __init__(self, tenant_id: str, user_id: str, role: str, departments: list[str]):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.role = role                         # 'admin' | 'user'
        self.departments = departments           # [] = ไม่กรอง department


def decode_token(token: str) -> TokenPayload:
    try:
        import jwt
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenPayload(
            tenant_id=payload["tenant_id"],
            user_id=payload["sub"],
            role=payload.get("role", "user"),
            departments=payload.get("departments", []),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token ไม่ถูกต้องหรือหมดอายุ",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> TokenPayload:
    return decode_token(creds.credentials)


def require_admin(user: Annotated[TokenPayload, Depends(get_current_user)]) -> TokenPayload:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ต้องการ role: admin")
    return user
