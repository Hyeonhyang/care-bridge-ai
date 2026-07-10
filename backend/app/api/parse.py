from fastapi import APIRouter, Depends
from pydantic import BaseModel
import httpx
import json
from app.core.security import get_current_user
from app.core.config import get_settings

router = APIRouter()

PARSE_PROMPT = """당신은 병동 간호사 인수인계 내용을 분류하는 AI입니다.
아래 음성 브리핑 텍스트를 읽고 EMR 파트별로 분류해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "현재 상태": "환자의 현재 주요 상태/증상",
  "활력징후 변화": "언급된 활력징후 관련 내용",
  "투약/처치": "투약이나 처치 관련 내용",
  "주의사항": "인수인계 시 특별히 주의할 사항",
  "예정된 업무": "다음 근무에서 해야 할 일"
}

해당 내용이 없는 파트는 빈 문자열("")로 남겨두세요.
한국어로 작성하세요.
"""


class ParseRequest(BaseModel):
    text: str
    patient_id: str = ""


@router.post("/parse-briefing")
async def parse_briefing(
    request: ParseRequest,
    user: dict = Depends(get_current_user),
):
    """음성 브리핑 텍스트를 EMR 파트별로 AI 분류합니다."""
    settings = get_settings()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": PARSE_PROMPT},
                    {"role": "user", "content": request.text},
                ],
                "temperature": 0.2,
                "max_tokens": 800,
            },
        )
        response.raise_for_status()
        result = response.json()

    # 사용량 로깅
    from app.services.usage_logger import log_usage
    usage = result.get("usage", {})
    log_usage(
        service="openai",
        model=settings.OPENAI_MODEL,
        input_tokens=usage.get("prompt_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        endpoint="parse_briefing",
    )

    content = result["choices"][0]["message"]["content"]

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        json_start = content.find("{")
        json_end = content.rfind("}") + 1
        if json_start != -1 and json_end > json_start:
            parsed = json.loads(content[json_start:json_end])
        else:
            parsed = {"현재 상태": content, "활력징후 변화": "", "투약/처치": "", "주의사항": "", "예정된 업무": ""}

    return {"parsed": parsed}
