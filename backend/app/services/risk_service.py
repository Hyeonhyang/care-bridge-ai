"""
NEWS2(National Early Warning Score 2) 기반 환자 위험도 스코어링.
영국 NHS 표준, MEWS보다 세분화된 5단계 점수 체계.
각 항목 0~3점, 총점으로 위험도 판정.
"""


def calculate_risk_score(vitals: dict) -> dict:
    """
    활력징후 데이터를 기반으로 NEWS2 위험도 점수를 계산합니다.

    Args:
        vitals: {
            "heart_rate": int,
            "systolic_bp": int,
            "temperature": float,
            "spo2": float,
            "respiratory_rate": int,
            "consciousness": str  # "alert"|"confused"|"voice"|"pain"|"unresponsive"
        }

    Returns:
        {"score": int, "level": str, "details": list[str]}
    """
    score = 0
    details = []

    # ── 1. 호흡수 (Respiratory Rate) ─────────────────────────
    rr = vitals.get("respiratory_rate")
    if rr is not None:
        rr = int(rr)
        if rr <= 8:
            score += 3
            details.append(f"호흡수 위험: {rr}회/분 (≤8) +3")
        elif rr <= 11:
            score += 1
            details.append(f"호흡수 경계: {rr}회/분 (9-11) +1")
        elif rr <= 20:
            pass  # 정상 (0점)
        elif rr <= 24:
            score += 2
            details.append(f"호흡수 주의: {rr}회/분 (21-24) +2")
        else:
            score += 3
            details.append(f"호흡수 위험: {rr}회/분 (≥25) +3")

    # ── 2. 산소포화도 SpO2 ────────────────────────────────────
    spo2 = vitals.get("spo2")
    if spo2 is not None:
        spo2 = float(spo2)
        if spo2 <= 91:
            score += 3
            details.append(f"SpO2 위험: {spo2}% (≤91) +3")
        elif spo2 <= 93:
            score += 2
            details.append(f"SpO2 주의: {spo2}% (92-93) +2")
        elif spo2 <= 95:
            score += 1
            details.append(f"SpO2 경계: {spo2}% (94-95) +1")
        else:
            pass  # 정상 (96%+, 0점)

    # ── 3. 수축기 혈압 (Systolic BP) ─────────────────────────
    sbp = vitals.get("systolic_bp")
    if sbp is not None:
        sbp = int(sbp)
        if sbp <= 90:
            score += 3
            details.append(f"저혈압 위험: {sbp}mmHg (≤90) +3")
        elif sbp <= 100:
            score += 2
            details.append(f"저혈압 주의: {sbp}mmHg (91-100) +2")
        elif sbp <= 110:
            score += 1
            details.append(f"저혈압 경계: {sbp}mmHg (101-110) +1")
        elif sbp <= 219:
            pass  # 정상 (111-219, 0점)
        else:
            score += 3
            details.append(f"고혈압 위험: {sbp}mmHg (≥220) +3")

    # ── 4. 맥박/심박수 (Heart Rate) ───────────────────────────
    hr = vitals.get("heart_rate")
    if hr is not None:
        hr = int(hr)
        if hr <= 40:
            score += 3
            details.append(f"서맥 위험: {hr}bpm (≤40) +3")
        elif hr <= 50:
            score += 1
            details.append(f"서맥 경계: {hr}bpm (41-50) +1")
        elif hr <= 90:
            pass  # 정상 (51-90, 0점)
        elif hr <= 110:
            score += 1
            details.append(f"빈맥 경계: {hr}bpm (91-110) +1")
        elif hr <= 130:
            score += 2
            details.append(f"빈맥 주의: {hr}bpm (111-130) +2")
        else:
            score += 3
            details.append(f"빈맥 위험: {hr}bpm (>130) +3")

    # ── 5. 체온 (Temperature) ─────────────────────────────────
    temp = vitals.get("temperature")
    if temp is not None:
        temp = float(temp)
        if temp <= 35.0:
            score += 3
            details.append(f"저체온 위험: {temp}°C (≤35.0) +3")
        elif temp <= 36.0:
            score += 1
            details.append(f"저체온 경계: {temp}°C (35.1-36.0) +1")
        elif temp <= 38.0:
            pass  # 정상 (36.1-38.0, 0점)
        elif temp <= 39.0:
            score += 1
            details.append(f"발열 경계: {temp}°C (38.1-39.0) +1")
        else:
            score += 2
            details.append(f"고열 주의: {temp}°C (>39.0) +2")

    # ── 6. 의식수준 (ACVPU) ──────────────────────────────────
    # Alert / Confused / Voice / Pain / Unresponsive
    consciousness = vitals.get("consciousness")
    if consciousness:
        if consciousness == "alert":
            pass  # 정상 (0점)
        elif consciousness == "confused":
            score += 3
            details.append("의식 혼돈 (Confused) +3")
        elif consciousness == "voice":
            score += 3
            details.append("의식: 음성반응 (V) +3")
        elif consciousness == "pain":
            score += 3
            details.append("의식: 통증반응 (P) +3")
        elif consciousness == "unresponsive":
            score += 3
            details.append("의식 없음 (Unresponsive) +3")

    # ── 등급 판정 (NEWS2 기준) ────────────────────────────────
    # 단일 항목 3점 → 무조건 High 이상
    has_single_3 = any("+3" in d for d in details)

    if score >= 7:
        level = "critical"
    elif score >= 5 or has_single_3:
        level = "high"
    elif score >= 3:
        level = "medium"
    elif score >= 1:
        level = "low_watch"  # 관찰 필요 (낮은 주의)
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "details": details,
    }
