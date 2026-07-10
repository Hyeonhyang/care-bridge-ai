from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from app.core.config import get_settings

security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """Supabase JWT 토큰을 검증하고 사용자 정보를 반환합니다."""
    token = credentials.credentials
    settings = get_settings()

    response = httpx.get(
        f"{settings.SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}",
        },
        timeout=10,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다.",
        )

    user = response.json()
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "role": user.get("user_metadata", {}).get("role", "nurse"),
    }
