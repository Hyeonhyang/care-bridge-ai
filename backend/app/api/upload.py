from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import get_supabase
from app.services.stt_service import transcribe_audio
from app.services.ocr_service import extract_text_from_image
from app.api.risk import invalidate_patients_cache

router = APIRouter()


@router.post("/audio")
async def upload_audio(
    file: UploadFile = File(...),
    patient_id: str = "",
    user: dict = Depends(get_current_user),
):
    """음성 파일 업로드 → STT 변환."""
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기는 25MB 이하여야 합니다.")

    # STT 변환
    transcript = await transcribe_audio(contents, file.filename)

    return {
        "transcript": transcript,
        "patient_id": patient_id,
    }


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    patient_id: str = "",
    user: dict = Depends(get_current_user),
):
    """차트/검사결과 이미지 업로드 → OCR 텍스트 추출."""
    contents = await file.read()

    # 파일 타입 확인
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    # GPT-4o mini Vision으로 이미지 텍스트 추출
    extracted_text = await extract_text_from_image(contents)

    return {
        "extracted_text": extracted_text,
        "filename": file.filename,
        "patient_id": patient_id,
    }


class EmrInput(BaseModel):
    patient_id: str
    emr_text: str


@router.post("/emr")
async def upload_emr(
    data: EmrInput,
    user: dict = Depends(get_current_user),
):
    """EMR 텍스트 데이터 입력."""
    supabase = get_supabase()

    # DB에 저장
    supabase.table("handoff_records").upsert({
        "patient_id": data.patient_id,
        "nurse_id": user["id"],
        "emr_text": data.emr_text,
    }).execute()

    return {"message": "EMR 데이터가 저장되었습니다.", "patient_id": data.patient_id}


class VitalsInput(BaseModel):
    patient_id: str
    heart_rate: int | None = None
    systolic_bp: int | None = None
    diastolic_bp: int | None = None
    temperature: float | None = None
    spo2: float | None = None
    respiratory_rate: int | None = None
    consciousness: str = "alert"


@router.post("/vitals")
async def upload_vitals(
    data: VitalsInput,
    user: dict = Depends(get_current_user),
):
    """Vital Sign 데이터 입력."""
    supabase = get_supabase()

    vitals_data = data.model_dump(exclude_none=True)
    patient_id = vitals_data.pop("patient_id")

    supabase.table("vital_signs").insert({
        "patient_id": patient_id,
        **vitals_data,
    }).execute()

    invalidate_patients_cache()

    return {"message": "활력징후가 저장되었습니다.", "patient_id": patient_id}
