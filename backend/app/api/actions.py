from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase
from app.services.risk_service import calculate_risk_score
from app.services.action_service import generate_action_list

router = APIRouter()


@router.get("/actions")
async def get_action_list(user: dict = Depends(get_current_user)):
    """우선순위 기반 Next Action 업무 리스트를 생성합니다."""
    supabase = get_supabase()

    # 담당 환자 목록 조회
    patients_result = supabase.table("patients").select("*").execute()
    patients = patients_result.data or []

    patients_data = []

    for patient in patients:
        # 최신 활력징후
        vitals_result = (
            supabase.table("vital_signs")
            .select("*")
            .eq("patient_id", patient["id"])
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )

        # 위험도 계산
        risk_level = "low"
        if vitals_result.data:
            risk_data = calculate_risk_score(vitals_result.data[0])
            risk_level = risk_data["level"]

        # 최근 인수인계에서 권장 조치 추출
        handoff_result = (
            supabase.table("handoff_records")
            .select("sbar_summary, actions")
            .eq("patient_id", patient["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        pending_tasks = []

        if handoff_result.data:
            record = handoff_result.data[0]

            # SBAR recommendation에서 업무 추출
            sbar = record.get("sbar_summary") or {}
            recommendation = sbar.get("recommendation", "")
            if recommendation:
                pending_tasks.append({
                    "task": recommendation,
                    "time_urgency": 8 if risk_level in ("critical", "high") else 5,
                    "dependency": 5,
                    "complexity": 5,
                })

            # 명시적 액션 목록
            actions = record.get("actions") or []
            for action in actions:
                if isinstance(action, str):
                    pending_tasks.append({
                        "task": action,
                        "time_urgency": 5,
                        "dependency": 3,
                        "complexity": 3,
                    })

        patients_data.append({
            "patient_id": patient["id"],
            "patient_name": patient.get("name", ""),
            "room_number": patient.get("room_number", ""),
            "risk_level": risk_level,
            "pending_tasks": pending_tasks,
        })

    action_list = generate_action_list(patients_data)

    return {"actions": action_list}
