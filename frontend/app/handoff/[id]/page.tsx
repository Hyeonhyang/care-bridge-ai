"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import SbarCard from "@/components/SbarCard";
import RiskBadge from "@/components/RiskBadge";

export default function EditHandoffPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");

  // 수정 필드
  const [sttText, setSttText] = useState("");
  const [emrText, setEmrText] = useState("");
  const [sbarDetailed, setSbarDetailed] = useState<any>({});
  const [sbarCompact, setSbarCompact] = useState<any>({});

  useEffect(() => {
    if (id) loadRecord();
  }, [id]);

  const loadRecord = async () => {
    try {
      const data = await apiRequest(`/api/v1/handoff/${id}`);
      setRecord(data);
      setSttText(data.stt_text || "");
      setEmrText(data.emr_text || "");
      setSbarDetailed(data.sbar_summary?.detailed || data.sbar_summary || {});
      setSbarCompact(data.sbar_summary?.compact || data.sbar_summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest(`/api/v1/handoff/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          stt_text: sttText,
          emr_text: emrText,
          sbar_summary: {
            detailed: sbarDetailed,
            compact: sbarCompact,
          },
        }),
      });
      alert("저장되었습니다.");
      setMode("view");
      loadRecord();
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setSaving(true);
    try {
      await apiRequest(`/api/v1/handoff/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          stt_text: sttText,
          emr_text: emrText,
        }),
      });
      alert("SBAR가 재생성되었습니다.");
      setMode("view");
      loadRecord();
    } catch (err: any) {
      alert("재생성 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">로딩 중...</p></div>;

  if (!record) return <div className="p-8"><p className="text-red-500">기록을 찾을 수 없습니다.</p></div>;

  const sbar = record.sbar_summary?.detailed || record.sbar_summary || {};

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">← 뒤로</button>
          <h1 className="text-2xl font-bold">인수인계 기록</h1>
          <p className="text-sm text-gray-400 mt-1">{new Date(record.created_at).toLocaleString("ko-KR")}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={record.risk_level || "low"} />
          {mode === "view" ? (
            <button
              onClick={() => setMode("edit")}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
            >
              ✏️ 수정
            </button>
          ) : (
            <button
              onClick={() => setMode("view")}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {mode === "view" ? (
        /* 보기 모드 */
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <SbarCard sbar={sbar} />
        </div>
      ) : (
        /* 수정 모드 */
        <div className="space-y-4">
          {/* 브리핑 텍스트 수정 */}
          <div className="bg-white rounded-xl border p-5">
            <label className="block font-medium mb-2 text-sm">브리핑 내용</label>
            <textarea
              value={sttText}
              onChange={(e) => setSttText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-28"
              placeholder="음성 브리핑 내용..."
            />
          </div>

          {/* EMR 텍스트 수정 */}
          <div className="bg-white rounded-xl border p-5">
            <label className="block font-medium mb-2 text-sm">간호 기록 / EMR</label>
            <textarea
              value={emrText}
              onChange={(e) => setEmrText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-28"
              placeholder="간호 기록..."
            />
          </div>

          {/* SBAR 직접 수정 (상세) */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-medium mb-3 text-sm">SBAR 상세 (신규 모드용)</h3>
            {["situation", "background", "assessment", "recommendation"].map((key) => (
              <div key={key} className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {key === "situation" ? "S - Situation" :
                   key === "background" ? "B - Background" :
                   key === "assessment" ? "A - Assessment" : "R - Recommendation"}
                </label>
                <textarea
                  value={sbarDetailed[key] || ""}
                  onChange={(e) => setSbarDetailed({ ...sbarDetailed, [key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20"
                />
              </div>
            ))}
          </div>

          {/* SBAR 직접 수정 (압축) */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-medium mb-3 text-sm">SBAR 압축 (경력 모드용)</h3>
            {["situation", "background", "assessment", "recommendation"].map((key) => (
              <div key={key} className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {key === "situation" ? "S" : key === "background" ? "B" : key === "assessment" ? "A" : "R"}
                </label>
                <textarea
                  value={sbarCompact[key] || ""}
                  onChange={(e) => setSbarCompact({ ...sbarCompact, [key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-16"
                />
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleRegenerate}
              disabled={saving}
              className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {saving ? "처리 중..." : "🤖 AI로 SBAR 재생성"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {saving ? "저장 중..." : "💾 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
