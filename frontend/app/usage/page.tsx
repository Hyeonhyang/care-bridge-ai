"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function UsagePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const res = await apiRequest("/api/v1/usage");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI 사용량 현황</h1>
        <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-700">
          ← 대시보드
        </button>
      </div>

      {/* 전체 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-3xl font-bold text-indigo-600">{data?.summary.total_calls ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">총 API 호출</p>
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">{(data?.summary.total_tokens ?? 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">총 토큰 사용</p>
        </div>
        <div className="bg-white rounded-xl border p-5 text-center">
          <p className="text-3xl font-bold text-green-600">${data?.summary.total_cost_usd ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">총 비용 (USD)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 모델별 사용량 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">🤖 AI 모델별 사용량</h2>
          {data?.by_model?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">아직 사용 내역이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {data?.by_model?.map((m: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{m.model}</span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{m.calls}회</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <span>입력: {m.input_tokens.toLocaleString()} 토큰</span>
                    <span>출력: {m.output_tokens.toLocaleString()} 토큰</span>
                    <span className="text-green-600 font-medium">${m.cost_usd}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 기능별 사용량 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">🔧 기능별 사용량</h2>
          {data?.by_endpoint?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">아직 사용 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {data?.by_endpoint?.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{ENDPOINT_LABELS[e.endpoint] || e.endpoint}</span>
                    <span className="text-xs text-gray-400 ml-2">{e.total_tokens.toLocaleString()} 토큰</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{e.calls}회</span>
                    <span className="text-green-600 font-medium">${e.cost_usd}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 최근 호출 로그 */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">📋 최근 API 호출 로그</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">시간</th>
                <th className="pb-2 pr-4">모델</th>
                <th className="pb-2 pr-4">기능</th>
                <th className="pb-2 pr-4">토큰</th>
                <th className="pb-2">비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.recent_logs?.map((log: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{log.model}</td>
                  <td className="py-2 pr-4 text-xs">{ENDPOINT_LABELS[log.endpoint] || log.endpoint}</td>
                  <td className="py-2 pr-4 text-xs">{log.total_tokens.toLocaleString()}</td>
                  <td className="py-2 text-xs text-green-600">${log.cost_usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.recent_logs?.length && (
            <p className="text-gray-400 text-sm text-center py-4">아직 호출 기록이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const ENDPOINT_LABELS: Record<string, string> = {
  summarize: "SBAR 요약 생성",
  parse_briefing: "브리핑 AI 분류",
  image_analysis: "이미지 분석",
  stt: "음성→텍스트 변환",
};
