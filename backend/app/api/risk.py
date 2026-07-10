from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase
from app.services.risk_service import calculate_risk_score

router = APIRouter()


@router.get("/patients/{patient_id}/risk")
async def get_patient_risk(
    patient_id: str,
    user: dict = Depends(get_current_user),
):
    """환자의 최신 활력징후 기반 위험도를 조회합니다."""
    supabase = get_supabase()

    # 최신 활력징후 조회
    result = (
        supabase.table("vital_signs")
        .select("*")
        .eq("patient_id", patient_id)
        .order("recorded_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return {
            "patient_id": patient_id,
            "risk": {"score": 0, "level": "low", "details": ["활력징후 데이터 없음"]},
        }

    vitals = result.data[0]
    risk_data = calculate_risk_score(vitals)

    return {
        "patient_id": patient_id,
        "vitals": vitals,
        "risk": risk_data,
    }


@router.get("/patients")
def get_patients(user: dict = Depends(get_current_user)):
    """담당 환자 목록을 위험도 포함해서 조회합니다."""
    supabase = get_supabase()
    result = supabase.table("patients").select("*").execute()
    patients = result.data or []

    if not patients:
        return {"patients": []}

    # 모든 활력징후를 한 번에 조회 (DB 왕복 1회)
    all_vitals_result = (
        supabase.table("vital_signs")
        .select("*")
        .order("recorded_at", desc=True)
        .execute()
    )
    all_vitals = all_vitals_result.data or []

    # patient_id 기준으로 최신 활력징후만 추출 (메모리에서 처리)
    latest_vitals_map = {}
    for v in all_vitals:
        pid = v["patient_id"]
        if pid not in latest_vitals_map:
            latest_vitals_map[pid] = v

    # 위험도 계산 (DB 조회 없이 메모리에서)
    for patient in patients:
        vitals = latest_vitals_map.get(patient["id"])
        if vitals:
            risk_data = calculate_risk_score(vitals)
            patient["risk_level"] = risk_data["level"]
            patient["risk_score"] = risk_data["score"]
            patient["risk_details"] = risk_data["details"]
        else:
            patient["risk_level"] = "low"
            patient["risk_score"] = 0
            patient["risk_details"] = []

    # 위험도 높은 순 → 병실 번호 순 정렬
    RISK_ORDER = {"critical": 0, "high": 1, "medium": 2, "low_watch": 3, "low": 4}
    patients.sort(key=lambda p: (
        RISK_ORDER.get(p.get("risk_level", "low"), 3),
        p.get("room_number", "")
    ))

    return {"patients": patients}


@router.post("/patients")
async def create_patient(
    patient: dict,
    user: dict = Depends(get_current_user),
):
    """새 환자를 등록합니다."""
    supabase = get_supabase()
    result = supabase.table("patients").insert(patient).execute()
    return {"patient": result.data[0] if result.data else None}


@router.get("/patients/{patient_id}")
async def get_patient_detail(
    patient_id: str,
    user: dict = Depends(get_current_user),
):
    """환자 상세 정보를 조회합니다."""
    supabase = get_supabase()

    patient = (
        supabase.table("patients")
        .select("*")
        .eq("id", patient_id)
        .single()
        .execute()
    )

    # 최근 인수인계 기록
    handoffs = (
        supabase.table("handoff_records")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    return {
        "patient": patient.data,
        "recent_handoffs": handoffs.data,
    }
