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


class UpdateHandoffRequest(BaseModel):
    stt_text: str | None = None
    emr_text: str | None = None
    sbar_summary: dict | None = None


@router.post("/summarize")
async def create_summary(
    request: SummarizeRequest,
    user: dict = Depends(get_current_user),
):
    """SBAR 인수인계 요약을 생성합니다."""
    supabase = get_supabase()

    try:
        sbar = await generate_sbar_summary(
            stt_text=request.stt_text,
            emr_text=request.emr_text,
            vitals=request.vitals,
            lab_results=request.lab_results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"요약 생성 실패: {str(e)}")

    risk_data = {"score": 0, "level": "low", "details": []}
    if request.vitals:
        risk_data = calculate_risk_score(request.vitals)

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


@router.get("/handoff/{record_id}")
def get_handoff(
    record_id: str,
    user: dict = Depends(get_current_user),
):
    """인수인계 기록 단건 조회"""
    supabase = get_supabase()
    result = (
        supabase.table("handoff_records")
        .select("*")
        .eq("id", record_id)
        .single()
        .execute()
    )
    return result.data


@router.patch("/handoff/{record_id}")
async def update_handoff(
    record_id: str,
    request: UpdateHandoffRequest,
    user: dict = Depends(get_current_user),
):
    """인수인계 기록을 수정합니다. SBAR도 AI로 재생성 가능."""
    supabase = get_supabase()

    # 기존 기록 조회
    existing = (
        supabase.table("handoff_records")
        .select("*")
        .eq("id", record_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="인수인계 기록을 찾을 수 없습니다.")

    update_data = {}

    if request.stt_text is not None:
        update_data["stt_text"] = request.stt_text

    if request.emr_text is not None:
        update_data["emr_text"] = request.emr_text

    # SBAR 직접 수정
    if request.sbar_summary is not None:
        update_data["sbar_summary"] = request.sbar_summary

    # stt_text나 emr_text가 바뀌면 SBAR 재생성
    elif request.stt_text is not None or request.emr_text is not None:
        new_stt = request.stt_text if request.stt_text is not None else existing.data.get("stt_text", "")
        new_emr = request.emr_text if request.emr_text is not None else existing.data.get("emr_text", "")
        try:
            new_sbar = await generate_sbar_summary(stt_text=new_stt, emr_text=new_emr)
            update_data["sbar_summary"] = new_sbar
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"SBAR 재생성 실패: {str(e)}")

    if not update_data:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다.")

    result = (
        supabase.table("handoff_records")
        .eq("id", record_id)
        .update(update_data)
        .execute()
    )

    return {
        "record_id": record_id,
        "updated": update_data,
        "message": "인수인계가 수정되었습니다.",
    }
