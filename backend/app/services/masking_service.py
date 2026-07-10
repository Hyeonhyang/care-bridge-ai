import re


def mask_personal_info(text: str) -> str:
    """개인정보를 마스킹합니다. LLM에 전송하기 전에 호출합니다."""

    # 주민등록번호 마스킹 (123456-1234567)
    text = re.sub(
        r"\d{6}\s*-\s*[1-4]\d{6}",
        "[주민번호 마스킹]",
        text,
    )

    # 전화번호 마스킹
    text = re.sub(
        r"(010|011|016|017|018|019)\s*-?\s*\d{3,4}\s*-?\s*\d{4}",
        "[전화번호 마스킹]",
        text,
    )

    # 이메일 마스킹
    text = re.sub(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "[이메일 마스킹]",
        text,
    )

    return text
