from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase
from app.services.risk_service import calculate_risk_score
from app.services.action_service import generate_action_list

router = APIRouter()


@router.get("/actions")
def get_action_list(user: dict = Depends(get_current_user)):
    """우선순위 기반 Next Action 업무 리스트를 생성합니다."""
    supabase = get_supabase()

    # 한 번에 전체 조회 (N+1 방지)
    patients_result = supabase.table("patients").select("*").execute()
    patients = patients_result.data or []

    if not patients:
        return {"actions": []}

    # 모든 활력징후 + 인수인계 한 번에 조회
    all_vitals = (
        supabase.table("vital_signs")
        .select("*")
        .order("recorded_at", desc=True)
        .execute()
    ).data or []

    all_handoffs = (
        supabase.table("handoff_records")
        .select("patient_id, sbar_summary, actions, risk_level")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    # 메모리에서 매핑
    vitals_map = {}
    for v in all_vitals:
        pid = v["patient_id"]
        if pid not in vitals_map:
            vitals_map[pid] = v

    handoff_map = {}
    for h in all_handoffs:
        pid = h["patient_id"]
        if pid not in handoff_map:
            handoff_map[pid] = h

    patients_data = []

    for patient in patients:
        pid = patient["id"]
        vitals = vitals_map.get(pid)
        risk_level = "low"
        if vitals:
            risk_data = calculate_risk_score(vitals)
            risk_level = risk_data["level"]

        pending_tasks = []
        handoff = handoff_map.get(pid)
        if handoff:
            sbar = handoff.get("sbar_summary") or {}
            # compact 버전이 있으면 사용, 없으면 일반 버전
            rec = sbar.get("compact", {}).get("recommendation") or sbar.get("recommendation", "")
            if rec:
                pending_tasks.append({
                    "task": rec,
                    "time_urgency": 8 if risk_level in ("critical", "high") else 5,
                    "dependency": 5,
                    "complexity": 5,
                })

            actions = handoff.get("actions") or []
            for action in actions:
                if isinstance(action, str):
                    pending_tasks.append({
                        "task": action,
                        "time_urgency": 5,
                        "dependency": 3,
                        "complexity": 3,
                    })

        patients_data.append({
            "patient_id": pid,
            "patient_name": patient.get("name", ""),
            "room_number": patient.get("room_number", ""),
            "risk_level": risk_level,
            "pending_tasks": pending_tasks,
        })

    action_list = generate_action_list(patients_data)
    return {"actions": action_list}
