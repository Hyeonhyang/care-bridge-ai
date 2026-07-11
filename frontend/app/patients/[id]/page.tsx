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
  const [emr, setEmr] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const [detailRes, riskRes, emrRes] = await Promise.all([
        apiRequest(`/api/v1/patients/${id}`),
        apiRequest(`/api/v1/patients/${id}/risk`),
        apiRequest(`/api/v1/patients/${id}/emr`),
      ]);
      setPatient(detailRes.patient);
      setHandoffs(detailRes.recent_handoffs || []);
      setRisk(riskRes.risk);
      setEmr(emrRes);
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
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
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
            <h1 className="text-2xl font-bold">{patient?.name || "환자"}</h1>
            <p className="text-gray-500 mt-1">
              {patient?.room_number}호 · {patient?.diagnosis} · {patient?.age}세 {patient?.gender}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level={risk?.level || "low"} />
            <button
              onClick={async () => {
                if (!confirm(`${patient?.name} 환자를 삭제하시겠습니까?`)) return;
                try {
                  await apiRequest(`/api/v1/patients/${id}`, { method: "DELETE" });
                  alert("삭제되었습니다.");
                  router.push("/");
                } catch (err: any) {
                  alert("삭제 실패: " + err.message);
                }
              }}
              className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        </div>

        {risk?.details?.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm font-medium text-red-700 mb-1">위험 요인 (NEWS2 점수: {risk.score})</p>
            <ul className="text-sm text-red-600 space-y-1">
              {risk.details.map((d: string, i: number) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* EMR 요약 */}
      {emr && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📋 EMR 기록</h2>
          <div className="space-y-3 text-sm">

            {emr.vital_signs?.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-700 mb-1">활력징후</h3>
                {emr.vital_signs.slice(0, 3).map((v: any, i: number) => (
                  <p key={i} className="text-gray-600">
                    HR {v.heart_rate} · BP {v.systolic_bp}/{v.diastolic_bp} · T {v.temperature}°C · SpO2 {v.spo2}% · RR {v.respiratory_rate}
                  </p>
                ))}
              </div>
            )}

            {emr.lab_results?.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-700 mb-1">검사결과</h3>
                {emr.lab_results.map((l: any, i: number) => (
                  <p key={i} className={l.is_abnormal ? "text-red-600" : "text-gray-600"}>
                    {l.test_name}: {l.result_value} (참조: {l.reference_range}) {l.is_abnormal && "⚠️"}
                  </p>
                ))}
              </div>
            )}

            {emr.doctor_orders?.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-700 mb-1">의사 처방</h3>
                {emr.doctor_orders.map((o: any, i: number) => (
                  <p key={i} className="text-gray-600">[{o.order_type}] {o.order_content}</p>
                ))}
              </div>
            )}

            {emr.nursing_notes?.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-700 mb-1">간호 기록</h3>
                {emr.nursing_notes.map((n: any, i: number) => (
                  <p key={i} className="text-gray-600">
                    <span className="text-xs text-gray-400">[{new Date(n.recorded_at).toLocaleString("ko-KR")}]</span> {n.note_content}
                  </p>
                ))}
              </div>
            )}

            {emr.diagnostic_records?.length > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-700 mb-1">진단/영상</h3>
                {emr.diagnostic_records.map((d: any, i: number) => (
                  <p key={i} className="text-gray-600">[{d.record_type}] {d.title}: {d.result_text}</p>
                ))}
              </div>
            )}

            {emr.handoff_records?.length > 0 && (
              <div className="p-3 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-700 mb-1">최근 인수인계 요약</h3>
                {emr.handoff_records.slice(0, 2).map((h: any, i: number) => {
                  const sbar = h.sbar_summary?.detailed || h.sbar_summary || {};
                  return (
                    <div key={i} className="mb-2 pb-2 border-b border-indigo-100 last:border-0">
                      <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString("ko-KR")}</p>
                      <p className="text-gray-600"><strong>S:</strong> {sbar.situation || "-"}</p>
                      <p className="text-gray-600"><strong>B:</strong> {sbar.background || "-"}</p>
                      <p className="text-gray-600"><strong>A:</strong> {sbar.assessment || "-"}</p>
                      <p className="text-gray-600"><strong>R:</strong> {sbar.recommendation || "-"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 최근 인수인계 (클릭 → 수정 페이지) */}
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
