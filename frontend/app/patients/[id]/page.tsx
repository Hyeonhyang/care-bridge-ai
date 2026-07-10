"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import SbarCard from "@/components/SbarCard";

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      const [detailRes, riskRes] = await Promise.all([
        apiRequest(`/api/v1/patients/${id}`),
        apiRequest(`/api/v1/patients/${id}/risk`),
      ]);
      setPatient(detailRes.patient);
      setHandoffs(detailRes.recent_handoffs || []);
      setRisk(riskRes.risk);
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← 대시보드로
      </button>

      {/* 환자 정보 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">
              {patient?.name || "환자"}
            </h1>
            <p className="text-gray-500 mt-1">
              {patient?.room_number}호 · {patient?.diagnosis}
            </p>
          </div>
          <RiskBadge level={risk?.level || "low"} />
        </div>

        {risk?.details?.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-red-700 mb-1">
              위험 요인
            </p>
            <ul className="text-sm text-red-600 space-y-1">
              {risk.details.map((d: string, i: number) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 최근 인수인계 */}
      <h2 className="text-lg font-semibold mb-4">최근 인수인계 기록</h2>
      {handoffs.length === 0 ? (
        <p className="text-gray-400">인수인계 기록이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {handoffs.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:border-indigo-300 transition"
              onClick={() => router.push(`/handoff/${h.id}`)}
            >
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-gray-400">
                  {new Date(h.created_at).toLocaleString("ko-KR")}
                </p>
                <span className="text-xs text-indigo-500 hover:underline">수정 →</span>
              </div>
              {h.sbar_summary && <SbarCard sbar={h.sbar_summary?.detailed || h.sbar_summary} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
