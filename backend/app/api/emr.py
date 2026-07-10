from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase

router = APIRouter()


@router.get("/patients/{patient_id}/emr")
def get_patient_emr(
    patient_id: str,
    user: dict = Depends(get_current_user),
):
    """환자의 전체 EMR 데이터를 조회합니다."""
    supabase = get_supabase()

    # 환자 기본정보
    patient = (
        supabase.table("patients")
        .select("*")
        .eq("id", patient_id)
        .single()
        .execute()
    )

    # 활력징후 (최근 5개)
    vitals = (
        supabase.table("vital_signs")
        .select("*")
        .eq("patient_id", patient_id)
        .order("recorded_at", desc=True)
        .limit(5)
        .execute()
    )

    # 검사결과
    labs = (
        supabase.table("lab_results")
        .select("*")
        .eq("patient_id", patient_id)
        .order("recorded_at", desc=True)
        .execute()
    )

    # 의사 처방
    orders = (
        supabase.table("doctor_orders")
        .select("*")
        .eq("patient_id", patient_id)
        .order("ordered_at", desc=True)
        .execute()
    )

    # 간호 기록
    notes = (
        supabase.table("nursing_notes")
        .select("*")
        .eq("patient_id", patient_id)
        .order("recorded_at", desc=True)
        .limit(10)
        .execute()
    )

    # 진단/영상
    diagnostics = (
        supabase.table("diagnostic_records")
        .select("*")
        .eq("patient_id", patient_id)
        .order("recorded_at", desc=True)
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
        "vital_signs": vitals.data,
        "lab_results": labs.data,
        "doctor_orders": orders.data,
        "nursing_notes": notes.data,
        "diagnostic_records": diagnostics.data,
        "handoff_records": handoffs.data,
    }
