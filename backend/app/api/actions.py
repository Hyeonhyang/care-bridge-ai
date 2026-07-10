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

    patient_ids = [p["id"] for p in patients]

    # 모든 환자의 최신 활력징후를 한 번에 조회
    all_vitals = []
    for pid in patient_ids:
        v = (
            supabase.table("vital_signs")
            .select("*")
            .eq("patient_id", pid)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        if v.data:
            all_vitals.append(v.data[0])

    vitals_map = {v["patient_id"]: v for v in all_vitals}

    # 최근 인수인계 한 번에 조회
    all_handoffs = []
    for pid in patient_ids:
        h = (
            supabase.table("handoff_records")
            .select("patient_id, sbar_summary, actions, risk_level")
            .eq("patient_id", pid)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if h.data:
            all_handoffs.append(h.data[0])

    handoff_map = {h["patient_id"]: h for h in all_handoffs}

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
