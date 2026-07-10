from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import get_supabase
from app.services.llm_service import generate_sbar_summary
from app.services.risk_service import calculate_risk_score

router = APIRouter()


class SummarizeRequest(BaseModel):
    patient_id: str
    stt_text: str = ""
    emr_text: str = ""
    vitals: dict | None = None
    lab_results: list | None = None


@router.post("/summarize")
async def create_summary(
    request: SummarizeRequest,
    user: dict = Depends(get_current_user),
):
    """SBAR 인수인계 요약을 생성합니다."""
    supabase = get_supabase()

    # SBAR 요약 생성
    try:
        sbar = await generate_sbar_summary(
            stt_text=request.stt_text,
            emr_text=request.emr_text,
            vitals=request.vitals,
            lab_results=request.lab_results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"요약 생성 실패: {str(e)}")

    # 위험도 계산 (vitals가 있는 경우)
    risk_data = {"score": 0, "level": "low", "details": []}
    if request.vitals:
        risk_data = calculate_risk_score(request.vitals)

    # DB에 저장 (두 버전 모두)
    record = {
        "patient_id": request.patient_id,
        "nurse_id": user["id"],
        "stt_text": request.stt_text,
        "emr_text": request.emr_text,
        "sbar_summary": sbar,
        "risk_score": risk_data["score"],
        "risk_level": risk_data["level"],
    }

    result = supabase.table("handoff_records").insert(record).execute()

    return {
        "sbar": sbar,
        "risk": risk_data,
        "record_id": result.data[0]["id"] if result.data else None,
        "disclaimer": "AI 보조 요약이며 임상 판단을 대체하지 않습니다.",
    }
