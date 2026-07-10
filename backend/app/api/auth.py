from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from app.core.config import get_settings

router = APIRouter()

settings = get_settings()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "nurse"  # nurse | head_nurse | doctor


@router.post("/login")
async def login(request: LoginRequest):
    """로그인 후 JWT 토큰을 반환합니다."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            json={
                "email": request.email,
                "password": request.password,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    data = response.json()
    user = data.get("user", {})

    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", ""),
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("user_metadata", {}).get("role", "nurse"),
        },
    }


@router.post("/register")
async def register(request: RegisterRequest):
    """회원가입 (역할 포함)."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "apikey": settings.SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "email": request.email,
                "password": request.password,
                "email_confirm": True,
                "user_metadata": {"role": request.role},
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"회원가입 실패: {response.text}")

    data = response.json()
    return {
        "message": "회원가입이 완료되었습니다.",
        "user_id": data.get("id"),
    }
