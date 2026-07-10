"""
Modified Early Warning Score (MEWS) 기반 환자 위험도 스코어링 엔진.
규칙 기반으로 GPU 없이 동작합니다.
"""


def calculate_risk_score(vitals: dict) -> dict:
    """
    활력징후 데이터를 기반으로 위험도 점수를 계산합니다.

    Args:
        vitals: {
            "heart_rate": int,
            "systolic_bp": int,
            "diastolic_bp": int,
            "temperature": float,
            "spo2": float,
            "respiratory_rate": int,
            "consciousness": str  # "alert" | "voice" | "pain" | "unresponsive"
        }

    Returns:
        {"score": int, "level": str, "details": list[str]}
    """
    score = 0
    details = []

    # 심박수
    hr = vitals.get("heart_rate")
    if hr is not None:
        hr = int(hr)
        if hr > 130:
            score += 3
            details.append(f"심박수 위험: {hr} bpm (>130)")
        elif hr > 110:
            score += 2
            details.append(f"심박수 주의: {hr} bpm (>110)")
        elif hr < 40:
            score += 3
            details.append(f"서맥 위험: {hr} bpm (<40)")

    # 수축기 혈압
    sbp = vitals.get("systolic_bp")
    if sbp is not None:
        sbp = int(sbp)
        if sbp < 90:
            score += 3
            details.append(f"저혈압 위험: {sbp} mmHg (<90)")
        elif sbp < 100:
            score += 2
            details.append(f"저혈압 주의: {sbp} mmHg (<100)")
        elif sbp > 200:
            score += 3
            details.append(f"고혈압 위험: {sbp} mmHg (>200)")

    # 체온
    temp = vitals.get("temperature")
    if temp is not None:
        temp = float(temp)
        if temp > 39.0:
            score += 3
            details.append(f"고열 위험: {temp}°C (>39.0)")
        elif temp > 38.5:
            score += 2
            details.append(f"고열: {temp}°C (>38.5)")
        elif temp < 35.0:
            score += 3
            details.append(f"저체온 위험: {temp}°C (<35.0)")

    # SpO2
    spo2 = vitals.get("spo2")
    if spo2 is not None:
        spo2 = float(spo2)
        if spo2 < 92:
            score += 3
            details.append(f"산소포화도 위험: {spo2}% (<92)")
        elif spo2 < 95:
            score += 2
            details.append(f"산소포화도 주의: {spo2}% (<95)")

    # 호흡수
    rr = vitals.get("respiratory_rate")
    if rr is not None:
        rr = int(rr)
        if rr > 30:
            score += 3
            details.append(f"빈호흡 위험: {rr}회/분 (>30)")
        elif rr > 25:
            score += 2
            details.append(f"빈호흡: {rr}회/분 (>25)")
        elif rr < 9:
            score += 3
            details.append(f"서호흡 위험: {rr}회/분 (<9)")

    # 의식수준 (AVPU)
    consciousness = vitals.get("consciousness")
    if consciousness:
        if consciousness == "unresponsive":
            score += 3
            details.append("의식수준: 무반응 (U)")
        elif consciousness == "pain":
            score += 2
            details.append("의식수준: 통증반응 (P)")
        elif consciousness == "voice":
            score += 1
            details.append("의식수준: 음성반응 (V)")

    # 등급 판정
    if score >= 7:
        level = "critical"
    elif score >= 5:
        level = "high"
    elif score >= 3:
        level = "medium"
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "details": details,
    }
