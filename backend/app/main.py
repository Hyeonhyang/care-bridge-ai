from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import upload, summarize, risk, actions, auth, emr, parse

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="멀티모달 LLM 기반 병동 간호사 인수인계 자동 요약 및 환자 위험도 스크리닝 시스템",
    version="1.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/v1/auth", tags=["인증"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["업로드"])
app.include_router(summarize.router, prefix="/api/v1", tags=["요약"])
app.include_router(risk.router, prefix="/api/v1", tags=["위험도"])
app.include_router(actions.router, prefix="/api/v1", tags=["업무리스트"])
app.include_router(emr.router, prefix="/api/v1", tags=["EMR"])
app.include_router(parse.router, prefix="/api/v1", tags=["AI분류"])


@app.get("/api/v1/health", tags=["헬스체크"])
async def health_check():
    """슬립 방지 및 상태 확인용 엔드포인트"""
    return {"status": "ok", "service": settings.APP_NAME}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=500, content={"detail": str(exc)})
