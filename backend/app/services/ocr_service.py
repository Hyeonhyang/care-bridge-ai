"""
GPT-4o mini Vision 기반 이미지 텍스트 추출 서비스.
차트, 검사결과 이미지에서 텍스트/수치를 추출합니다.
"""

import httpx
import base64
from app.core.config import get_settings


async def extract_text_from_image(image_bytes: bytes) -> str:
    """
    GPT-4o mini의 비전 기능으로 이미지에서 텍스트를 추출합니다.

    Args:
        image_bytes: 이미지 파일의 바이트 데이터

    Returns:
        추출된 텍스트 문자열
    """
    settings = get_settings()

    # 이미지를 base64로 인코딩
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

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
                    {
                        "role": "system",
                        "content": "당신은 10년 경력의 병동 간호사이자 임상병리 전문가입니다. 의료 차트, 검사결과, 영상 판독문 이미지를 분석하여 의학적 소견을 작성합니다. 정상/비정상 수치를 구분하고, 임상적 의의를 해석하며, 간호 인수인계에 필요한 핵심 정보를 전문 용어와 함께 정리해주세요.",
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """이 의료 이미지를 분석하고 다음 형식으로 정리해주세요:

1. [수치 데이터] 이미지에 포함된 모든 검사 수치를 정확히 기록 (참조범위 포함)
2. [비정상 소견] 정상 범위를 벗어난 항목을 명시하고 임상적 의의 설명
3. [임상 해석] 해당 결과가 환자 상태에 미치는 영향을 의학적 소견으로 기술
4. [간호 고려사항] 이 결과를 바탕으로 간호사가 주의해야 할 사항

전문 의학 용어를 사용하되 괄호 안에 한국어 설명을 병기해주세요.""",
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_b64}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                "max_tokens": 1500,
            },
        )
        response.raise_for_status()
        result = response.json()

    return result["choices"][0]["message"]["content"]
