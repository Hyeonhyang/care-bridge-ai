"""
AI API 사용량 로거.
모든 OpenAI API 호출의 토큰 사용량/비용을 DB에 기록합니다.
"""
import httpx
from datetime import datetime
from app.core.config import get_settings

# GPT-4o mini 가격 (2024 기준, per 1M tokens)
PRICING = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "whisper-1": {"per_minute": 0.006},
}


def log_usage(
    service: str,
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    audio_seconds: float = 0,
    user_id: str = "",
    endpoint: str = "",
):
    """API 사용량을 Supabase에 기록합니다."""
    settings = get_settings()

    # 비용 계산
    cost = 0.0
    if model in PRICING and "input" in PRICING[model]:
        cost = (input_tokens * PRICING[model]["input"] / 1_000_000) + \
               (output_tokens * PRICING[model]["output"] / 1_000_000)
    elif model == "whisper-1":
        cost = (audio_seconds / 60) * PRICING["whisper-1"]["per_minute"]

    record = {
        "service": service,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "audio_seconds": audio_seconds,
        "cost_usd": round(cost, 6),
        "user_id": user_id,
        "endpoint": endpoint,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    # Supabase에 비동기 아닌 동기로 삽입 (로깅이므로 실패해도 무시)
    try:
        httpx.post(
            f"{settings.SUPABASE_URL}/rest/v1/api_usage_logs",
            headers={
                "apikey": settings.SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=record,
            timeout=5,
        )
    except Exception:
        pass  # 로깅 실패해도 메인 기능에 영향 없음
