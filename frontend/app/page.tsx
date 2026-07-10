"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import RiskBadge from "@/components/RiskBadge";
import ActionList from "@/components/ActionList";
import MedicalTooltipText from "@/components/MedicalTooltip";

export default function DashboardPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"junior" | "senior">("junior");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    // 모드 불러오기
    const savedMode = localStorage.getItem("ux_mode");
    if (savedMode === "senior") setMode("senior");
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patientsRes, actionsRes] = await Promise.all([
        apiRequest("/api/v1/patients"),
        apiRequest("/api/v1/actions"),
      ]);
      setPatients(patientsRes.patients || []);
      setActions(actionsRes.actions || []);
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 왼쪽 하단 고정 토글 */}
      <div className="fixed bottom-6 left-6 bg-white rounded-xl shadow-lg border p-3 z-50">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${mode === "junior" ? "text-indigo-600" : "text-gray-400"}`}>신규</span>
          <button
            onClick={() => {
              const next = mode === "junior" ? "senior" : "junior";
              setMode(next);
              localStorage.setItem("ux_mode", next);
            }}
            className={`relative w-12 h-6 rounded-full transition-colors ${mode === "senior" ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${mode === "senior" ? "translate-x-6" : ""}`} />
          </button>
          <span className={`text-xs font-medium ${mode === "senior" ? "text-indigo-600" : "text-gray-400"}`}>경력</span>
        </div>
      </div>

      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Care-Bridge AI</h1>
          <p className="text-gray-500">인수인계 대시보드 {mode === "junior" ? "(신규 모드)" : "(경력 모드)"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/handoff")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            + 새 인수인계
          </button>
          <button
            onClick={() => router.push("/patients/new")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            + 환자 등록
          </button>
        </div>
      </div>

      {mode === "junior" ? (
        /* ===== 신규 간호사 뷰 ===== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 환자 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">담당 환자</h2>
              {patients.length === 0 ? (
                <p className="text-gray-400 text-center py-8">등록된 환자가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => router.push(`/patients/${patient.id}`)}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                    >
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-500">
                          {patient.room_number}호 · {patient.diagnosis}
                        </p>
                      </div>
                      <RiskBadge level={patient.risk_level || "low"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 신규: 체크박스 To-Do + 의학 약어 툴팁 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-2">Next Action</h2>
              <p className="text-xs text-gray-400 mb-4">의학 약어 위에 마우스를 올리면 설명이 표시됩니다</p>
              {actions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">업무가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {actions.slice(0, 10).map((action, i) => (
                    <label
                      key={i}
                      className={`flex items-start gap-3 p-3 border-l-4 rounded-r-lg cursor-pointer hover:bg-gray-50 ${
                        action.category === "URGENT" ? "border-l-red-500 bg-red-50" :
                        action.category === "HIGH" ? "border-l-orange-500 bg-orange-50" :
                        action.category === "NORMAL" ? "border-l-blue-500 bg-blue-50" :
                        "border-l-gray-300 bg-gray-50"
                      }`}
                    >
                      <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <div>
                        <p className="text-sm text-gray-800">
                          <MedicalTooltipText text={action.task} />
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {action.patient_name} · {action.room_number}호
                          <span className="ml-2 font-mono text-gray-400">{action.category}</span>
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ===== 경력 간호사 뷰 ===== */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 환자 목록 (컴팩트) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="text-sm font-semibold mb-3 text-gray-700">환자</h2>
              <div className="space-y-1">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <span className="font-medium">{patient.name} <span className="text-gray-400">{patient.room_number}</span></span>
                    <RiskBadge level={patient.risk_level || "low"} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 컴팩트 SBAR 뷰어 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="text-sm font-semibold mb-3 text-gray-700">Action (압축)</h2>
              <div className="space-y-2 text-xs">
                {actions.slice(0, 8).map((action, i) => (
                  <div key={i} className={`p-2 rounded border-l-2 ${
                    action.category === "URGENT" ? "border-l-red-500 bg-red-50" :
                    action.category === "HIGH" ? "border-l-orange-400 bg-orange-50" :
                    "border-l-gray-300 bg-gray-50"
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{action.patient_name} {action.room_number}</span>
                      <span className={`font-mono ${
                        action.risk_level === "critical" ? "text-red-600" :
                        action.risk_level === "high" ? "text-orange-600" :
                        "text-gray-500"
                      }`}>{action.category}</span>
                    </div>
                    <p className="text-gray-600 mt-0.5 truncate">{action.task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 우선순위 요약 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h2 className="text-sm font-semibold mb-3 text-gray-700">우선순위</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-red-50 rounded">
                  <span>URGENT</span>
                  <span className="font-bold text-red-600">{actions.filter(a => a.category === "URGENT").length}</span>
                </div>
                <div className="flex justify-between p-2 bg-orange-50 rounded">
                  <span>HIGH</span>
                  <span className="font-bold text-orange-600">{actions.filter(a => a.category === "HIGH").length}</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-50 rounded">
                  <span>NORMAL</span>
                  <span className="font-bold text-blue-600">{actions.filter(a => a.category === "NORMAL").length}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>LOW</span>
                  <span className="font-bold text-gray-500">{actions.filter(a => a.category === "LOW").length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
