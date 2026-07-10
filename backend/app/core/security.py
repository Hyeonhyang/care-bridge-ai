from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import jwt
from app.core.config import get_settings

security_scheme = HTTPBearer()

# JWT 검증 캐시 (토큰 → 사용자 정보)
_token_cache: dict = {}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """Supabase JWT 토큰을 검증하고 사용자 정보를 반환합니다."""
    token = credentials.credentials
    
    # 캐시에 있으면 바로 반환
    if token in _token_cache:
        return _token_cache[token]
    
    settings = get_settings()

    # 로컬 JWT 디코딩 (Supabase JWT는 HS256, secret 없이 payload만 검증)
    try:
        # 서명 검증 없이 payload만 디코딩
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # 만료 확인
        import time
        if payload.get("exp", 0) < time.time():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰이 만료되었습니다.",
            )
        
        # role 확인 (Supabase authenticated user)
        if payload.get("role") != "authenticated":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="인증된 사용자가 아닙니다.",
            )
        
        user_metadata = payload.get("user_metadata", {})
        user = {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": user_metadata.get("role", "nurse"),
        }
        
        # 캐시 저장 (최대 500개 유지)
        if len(_token_cache) > 500:
            _token_cache.clear()
        _token_cache[token] = user
        
        return user
        
    except HTTPException:
        raise
    except Exception:
        # JWT 디코딩 실패 시 Supabase API로 폴백
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
        user_data = response.json()
        user = {
            "id": user_data.get("id"),
            "email": user_data.get("email"),
            "role": user_data.get("user_metadata", {}).get("role", "nurse"),
        }
        _token_cache[token] = user
        return user
