from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import get_supabase

router = APIRouter()


@router.get("/usage")
def get_usage_summary(user: dict = Depends(get_current_user)):
    """AI API 사용량 요약을 조회합니다."""
    supabase = get_supabase()

    logs = (
        supabase.table("api_usage_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )

    data = logs.data or []

    # 전체 합산
    total_tokens = sum(r.get("total_tokens", 0) for r in data)
    total_cost = sum(float(r.get("cost_usd", 0)) for r in data)
    total_calls = len(data)

    # 모델별 분류 (어떤 AI가 얼마나 사용됐는지)
    by_model = {}
    for r in data:
        model = r.get("model", "unknown")
        if model not in by_model:
            by_model[model] = {
                "model": model,
                "calls": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "cost_usd": 0.0,
            }
        by_model[model]["calls"] += 1
        by_model[model]["input_tokens"] += r.get("input_tokens", 0)
        by_model[model]["output_tokens"] += r.get("output_tokens", 0)
        by_model[model]["total_tokens"] += r.get("total_tokens", 0)
        by_model[model]["cost_usd"] += float(r.get("cost_usd", 0))

    # 기능별 분류 (어디에 사용됐는지)
    by_endpoint = {}
    for r in data:
        ep = r.get("endpoint", "unknown")
        if ep not in by_endpoint:
            by_endpoint[ep] = {
                "endpoint": ep,
                "calls": 0,
                "total_tokens": 0,
                "cost_usd": 0.0,
            }
        by_endpoint[ep]["calls"] += 1
        by_endpoint[ep]["total_tokens"] += r.get("total_tokens", 0)
        by_endpoint[ep]["cost_usd"] += float(r.get("cost_usd", 0))

    # cost 소수점 정리
    for m in by_model.values():
        m["cost_usd"] = round(m["cost_usd"], 4)
    for e in by_endpoint.values():
        e["cost_usd"] = round(e["cost_usd"], 4)

    return {
        "summary": {
            "total_calls": total_calls,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 4),
        },
        "by_model": list(by_model.values()),
        "by_endpoint": list(by_endpoint.values()),
        "recent_logs": data[:20],
    }
