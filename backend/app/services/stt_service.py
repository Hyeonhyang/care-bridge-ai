import httpx
from app.core.config import get_settings


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Groq Whisper API를 사용하여 음성을 텍스트로 변환합니다. (무료 + 빠름)"""
    settings = get_settings()

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": (filename, audio_bytes)},
            data={
                "model": "whisper-large-v3",
                "language": "ko",
                "prompt": "간호사 인수인계 브리핑입니다. 환자명, 진단명, 투약 정보, 주의사항을 포함합니다.",
            },
        )
        response.raise_for_status()
        result = response.json()

        # 사용량 로깅
        from app.services.usage_logger import log_usage
        log_usage(
            service="groq",
            model="whisper-large-v3",
            audio_seconds=len(audio_bytes) / 16000,
            endpoint="stt",
        )

        return result.get("text", "")
