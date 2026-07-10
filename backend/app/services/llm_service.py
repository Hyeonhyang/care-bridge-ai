import httpx
import json
from app.core.config import get_settings
from app.services.masking_service import mask_personal_info

SBAR_SYSTEM_PROMPT = """당신은 병동 간호사 인수인계를 돕는 의료 AI 어시스턴트입니다.
주어진 환자 정보를 바탕으로 SBAR 형식의 인수인계 요약을 2가지 버전으로 생성합니다.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "detailed": {
    "situation": "현재 상황을 풀 문장으로 상세히 설명 (신규 간호사가 이해하기 쉽게)",
    "background": "환자 배경을 상세히 설명 (약어 사용 시 괄호 안에 풀이 포함)",
    "assessment": "간호 평가를 구체적으로 서술 (수치의 임상적 의미 포함)",
    "recommendation": "권장 조치를 단계별로 명확히 안내"
  },
  "compact": {
    "situation": "의학 약어 중심으로 핵심만 압축 (예: 301호 김OO F/68 폐렴 Tx중. fever 38.5 재발)",
    "background": "약어 중심 배경 (예: Adm D+3, Augmentin IV D3, Hx: HTN. Allergy: PCN)",
    "assessment": "수치 나열 중심 (예: WBC 15.2K↑, CRP 8.5↑, SpO2 94%. Abx 효과 미미)",
    "recommendation": "간결한 액션 (예: Abx 변경 보고, BC x2, O2 titration, V/S q4h)"
  }
}

주의사항:
- detailed: 신규 간호사도 이해할 수 있도록 풀 문장 + 설명
- compact: 경력 간호사가 한눈에 파악 가능한 약어 중심 압축
- 제공된 데이터에 기반해서만 작성
- 한국어로 작성 (의학 약어는 영어 그대로 사용)
"""


async def generate_sbar_summary(
    stt_text: str,
    emr_text: str,
    vitals: dict | None = None,
    lab_results: list | None = None,
) -> dict:
    """통합 컨텍스트를 기반으로 SBAR 요약을 생성합니다."""
    settings = get_settings()

    # 컨텍스트 통합
    context_parts = []

    if stt_text:
        masked_stt = mask_personal_info(stt_text)
        context_parts.append(f"[음성 브리핑 내용]\n{masked_stt}")

    if emr_text:
        masked_emr = mask_personal_info(emr_text)
        context_parts.append(f"[기존 간호 기록]\n{masked_emr}")

    if vitals:
        vitals_str = "\n".join(f"  {k}: {v}" for k, v in vitals.items())
        context_parts.append(f"[활력징후]\n{vitals_str}")

    if lab_results:
        lab_str = "\n".join(
            f"  {r['test_name']}: {r['result_value']} (참조: {r.get('reference_range', 'N/A')})"
            for r in lab_results
        )
        context_parts.append(f"[검사 결과]\n{lab_str}")

    unified_context = "\n\n".join(context_parts)

    # OpenAI API 호출
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
                    {"role": "system", "content": SBAR_SYSTEM_PROMPT},
                    {"role": "user", "content": unified_context},
                ],
                "temperature": 0.3,
                "max_tokens": 1500,
            },
        )
        response.raise_for_status()
        result = response.json()

    content = result["choices"][0]["message"]["content"]

    # JSON 파싱 시도
    try:
        sbar = json.loads(content)
    except json.JSONDecodeError:
        json_match = content.find("{")
        json_end = content.rfind("}") + 1
        if json_match != -1 and json_end > json_match:
            sbar = json.loads(content[json_match:json_end])
        else:
            sbar = {
                "detailed": {
                    "situation": content,
                    "background": "",
                    "assessment": "",
                    "recommendation": "",
                },
                "compact": {
                    "situation": content,
                    "background": "",
                    "assessment": "",
                    "recommendation": "",
                },
            }

    # 이전 형식 호환 (detailed/compact 없이 flat으로 온 경우)
    if "detailed" not in sbar:
        sbar = {
            "detailed": sbar,
            "compact": sbar,
        }

    return sbar
