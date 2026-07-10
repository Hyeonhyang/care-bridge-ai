"""
우선순위 큐 기반 Next Action 업무 리스트 생성기.

Priority = (위험도 × 0.4) + (시간긴급도 × 0.3) + (의존성 × 0.2) + (복잡도 × 0.1)
"""

from datetime import datetime

# 위험도 레벨 → 점수 매핑
RISK_LEVEL_SCORES = {
    "critical": 10,
    "high": 7,
    "medium": 4,
    "low": 1,
}

# 카테고리 기준
CATEGORY_THRESHOLDS = {
    "URGENT": 7.0,
    "HIGH": 5.0,
    "NORMAL": 3.0,
    "LOW": 0.0,
}


def generate_action_list(patients_data: list[dict]) -> list[dict]:
    """
    환자 데이터 목록을 받아 우선순위순 업무 리스트를 생성합니다.

    Args:
        patients_data: [
            {
                "patient_id": str,
                "patient_name": str,
                "room_number": str,
                "risk_level": str,
                "sbar_summary": dict,
                "pending_tasks": [
                    {
                        "task": str,
                        "time_urgency": int (1~10),
                        "dependency": int (1~10),
                        "complexity": int (1~10),
                    }
                ]
            }
        ]

    Returns:
        우선순위순 정렬된 업무 리스트
    """
    action_list = []

    for patient in patients_data:
        risk_score = RISK_LEVEL_SCORES.get(patient.get("risk_level", "low"), 1)

        for task in patient.get("pending_tasks", []):
            priority = (
                risk_score * 0.4
                + task.get("time_urgency", 5) * 0.3
                + task.get("dependency", 5) * 0.2
                + task.get("complexity", 5) * 0.1
            )

            # 카테고리 결정
            category = "LOW"
            for cat, threshold in CATEGORY_THRESHOLDS.items():
                if priority >= threshold:
                    category = cat
                    break

            action_list.append({
                "patient_id": patient["patient_id"],
                "patient_name": patient.get("patient_name", ""),
                "room_number": patient.get("room_number", ""),
                "task": task["task"],
                "priority_score": round(priority, 2),
                "category": category,
                "risk_level": patient.get("risk_level", "low"),
            })

    # 우선순위 내림차순 정렬
    action_list.sort(key=lambda x: x["priority_score"], reverse=True)

    return action_list
