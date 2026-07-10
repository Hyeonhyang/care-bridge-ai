import httpx
from app.core.config import get_settings


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """OpenAI Whisper API를 사용하여 음성을 텍스트로 변환합니다."""
    settings = get_settings()

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            files={"file": (filename, audio_bytes)},
            data={
                "model": settings.OPENAI_WHISPER_MODEL,
                "language": "ko",
                "prompt": "간호사 인수인계 브리핑입니다. 환자명, 진단명, 투약 정보, 주의사항을 포함합니다.",
            },
        )
        response.raise_for_status()
        result = response.json()
        
        # 사용량 로깅
        from app.services.usage_logger import log_usage
        log_usage(
            service="openai",
            model=settings.OPENAI_WHISPER_MODEL,
            audio_seconds=len(audio_bytes) / 16000,  # 대략적 추정
            endpoint="stt",
        )
        
        return result.get("text", "")
