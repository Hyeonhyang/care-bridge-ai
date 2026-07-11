"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AudioRecorder from "@/components/AudioRecorder";
import SbarCard from "@/components/SbarCard";
import RiskBadge from "@/components/RiskBadge";

export default function HandoffPage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "result">("input");
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [mode, setMode] = useState<"junior" | "senior">("junior");

  // 환자 선택
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // EMR 자동 로딩
  const [emrData, setEmrData] = useState<any>(null);

  // 음성 브리핑
  const [sttText, setSttText] = useState("");

  // AI 분류 결과 (수정 가능)
  const [aiParsed, setAiParsed] = useState<any>(null);

  // 추가 입력
  const [imageText, setImageText] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");

  // 최종 SBAR 결과
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadPatients();
    const savedMode = localStorage.getItem("ux_mode");
    if (savedMode === "senior") setMode("senior");
  }, []);

  const loadPatients = async () => {
    try {
      const data = await apiRequest("/api/v1/patients");
      setPatients(data.patients || []);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const query = patientSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.room_number?.toLowerCase().includes(query) ||
      p.diagnosis?.toLowerCase().includes(query)
    );
  });

  const loadEmr = async (id: string) => {
    try {
      const data = await apiRequest(`/api/v1/patients/${id}/emr`);
      setEmrData(data);
    } catch (err) {
      console.error("EMR 로딩 실패:", err);
    }
  };

  // 음성 녹음 완료 → STT 변환
  const handleAudioComplete = async (blob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("patient_id", patientId);
      const data = await apiRequest("/api/v1/upload/audio", {
        method: "POST",
        body: formData,
      });
      setSttText(data.transcript);
    } catch (err: any) {
      alert("음성 변환 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 음성 파일 업로드 → STT 변환
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_id", patientId);
      const data = await apiRequest("/api/v1/upload/audio", {
        method: "POST",
        body: formData,
      });
      setSttText(data.transcript);
    } catch (err: any) {
      alert("음성 파일 변환 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // AI로 STT 텍스트를 EMR 파트별 분류
  const handleAiParse = async () => {
    if (!sttText) return;
    if (!patientId) {
      alert("환자를 먼저 선택해주세요.");
      return;
    }
    setLoadingAi(true);
    try {
      const data = await apiRequest("/api/v1/parse-briefing", {
        method: "POST",
        body: JSON.stringify({ text: sttText, patient_id: patientId }),
      });
      setAiParsed(data.parsed);
    } catch (err: any) {
      alert("AI 분류 실패: " + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_id", patientId);
      const data = await apiRequest("/api/v1/upload/image", {
        method: "POST",
        body: formData,
      });
      setImageText(data.extracted_text);
    } catch (err: any) {
      alert("이미지 처리 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 최종 SBAR 생성
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // EMR에서 vitals 자동 채움
      const emrVitals = emrData?.vital_signs?.[0] || {};
      const vitalsData = {
        heart_rate: emrVitals.heart_rate,
        systolic_bp: emrVitals.systolic_bp,
        diastolic_bp: emrVitals.diastolic_bp,
        temperature: Number(emrVitals.temperature),
        spo2: Number(emrVitals.spo2),
        respiratory_rate: emrVitals.respiratory_rate,
      };

      // 전체 EMR + AI 분류 + 추가 입력 합산
      const patientInfo = emrData?.patient 
        ? `[환자 정보] ${emrData.patient.name} / ${emrData.patient.age}세 / ${emrData.patient.gender} / ${emrData.patient.room_number}호 / 진단: ${emrData.patient.diagnosis}`
        : "";
      const combinedEmr = [
        patientInfo,
        aiParsed ? Object.entries(aiParsed).map(([k, v]) => `[${k}] ${v}`).join("\n") : "",
        emrData?.nursing_notes?.map((n: any) => n.note_content).join("\n"),
        emrData?.doctor_orders?.map((o: any) => `[${o.order_type}] ${o.order_content}`).join("\n"),
        emrData?.diagnostic_records?.map((d: any) => `[${d.record_type}] ${d.title}: ${d.result_text}`).join("\n"),
        imageText,
        additionalNote,
      ].filter(Boolean).join("\n\n");

      const data = await apiRequest("/api/v1/summarize", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          stt_text: sttText,
          emr_text: combinedEmr,
          vitals: vitalsData,
          lab_results: emrData?.lab_results || [],
        }),
      });
      setResult(data);
      setStep("result");
    } catch (err: any) {
      alert("요약 생성 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 결과 화면 ====================
  if (step === "result" && result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">인수인계 요약 결과</h1>
          <RiskBadge level={result.risk?.level || "low"} />
        </div>

        {mode === "junior" ? (
          /* 신규: 상세 SBAR + 면책 문구 */
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <SbarCard sbar={result.sbar?.detailed || result.sbar} />
            <p className="text-xs text-gray-400 italic mt-4">
              ⚠️ AI 보조 요약이며 임상 판단을 대체하지 않습니다. 반드시 선임 간호사 또는 담당의에게 확인하세요.
            </p>
          </div>
        ) : (
          /* 경력: 컴팩트 SBAR */
          <div className="bg-white rounded-xl shadow-sm border p-4 text-sm">
            <div className="space-y-2">
              <p><strong>S:</strong> {result.sbar?.compact?.situation || result.sbar?.situation}</p>
              <p><strong>B:</strong> {result.sbar?.compact?.background || result.sbar?.background}</p>
              <p><strong>A:</strong> {result.sbar?.compact?.assessment || result.sbar?.assessment}</p>
              <p><strong>R:</strong> {result.sbar?.compact?.recommendation || result.sbar?.recommendation}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={() => router.push("/")} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            대시보드로
          </button>
          {result.record_id && (
            <button onClick={() => router.push(`/handoff/${result.record_id}`)} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
              ✏️ 수정하기
            </button>
          )}
          <button onClick={() => { setStep("input"); setResult(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            새 인수인계
          </button>
        </div>
      </div>
    );
  }

  // ==================== 입력 화면 ====================
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 왼쪽 하단 고정 토글 */}
      <div className="fixed bottom-6 left-6 bg-white rounded-xl shadow-lg border p-3 z-50">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${mode === "junior" ? "text-indigo-600" : "text-gray-400"}`}>신규</span>
          <button
            onClick={() => { const next = mode === "junior" ? "senior" : "junior"; setMode(next); localStorage.setItem("ux_mode", next); }}
            className={`relative w-12 h-6 rounded-full transition-colors ${mode === "senior" ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${mode === "senior" ? "translate-x-6" : ""}`} />
          </button>
          <span className={`text-xs font-medium ${mode === "senior" ? "text-indigo-600" : "text-gray-400"}`}>경력</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">새 인수인계 작성</h1>
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← 대시보드로
      </button>

      <div className="space-y-6">

        {/* ① 환자 선택 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3">환자 선택</h2>
          <div className="relative">
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => { setPatientSearch(e.target.value); setShowDropdown(true); setPatientId(""); setEmrData(null); setAiParsed(null); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="환자 이름 또는 병실번호 입력..."
            />
            {patientId && <span className="absolute right-3 top-2.5 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">선택됨</span>}
            {showDropdown && filteredPatients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredPatients.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setPatientId(p.id); setPatientSearch(`${p.name} (${p.room_number}호)`); setShowDropdown(false); loadEmr(p.id); }}
                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-500 ml-2">{p.room_number}호 · {p.diagnosis}</span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && patientSearch && filteredPatients.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-sm text-gray-400">검색 결과 없음</div>
            )}
          </div>
        </div>

        {/* ② 기존 EMR (읽기 전용) */}
        {emrData && mode === "junior" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold mb-3">📋 기존 EMR 기록</h2>
            <p className="text-xs text-gray-400 mb-3">환자의 기존 의료 기록입니다. 인수인계 시 참고하세요.</p>
            <div className="space-y-3 text-sm max-h-96 overflow-y-auto">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-1">인적사항</h3>
                <p>{emrData.patient?.name} / {emrData.patient?.age}세 / {emrData.patient?.gender} / {emrData.patient?.room_number}호 / 진단: {emrData.patient?.diagnosis}</p>
              </div>
              {emrData.vital_signs?.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-700 mb-1">활력징후</h3>
                  {emrData.vital_signs.map((v: any, i: number) => (
                    <p key={i} className="text-gray-600">HR {v.heart_rate} · BP {v.systolic_bp}/{v.diastolic_bp} · T {v.temperature}°C · SpO2 {v.spo2}% · RR {v.respiratory_rate}</p>
                  ))}
                </div>
              )}
              {emrData.lab_results?.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-700 mb-1">검사결과</h3>
                  {emrData.lab_results.map((l: any, i: number) => (
                    <p key={i} className={l.is_abnormal ? "text-red-600" : "text-gray-600"}>{l.test_name}: {l.result_value} (참조: {l.reference_range}) {l.is_abnormal && "⚠️"}</p>
                  ))}
                </div>
              )}
              {emrData.doctor_orders?.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h3 className="font-medium text-purple-700 mb-1">의사 처방</h3>
                  {emrData.doctor_orders.map((o: any, i: number) => (
                    <p key={i} className="text-gray-600">[{o.order_type}] {o.order_content}</p>
                  ))}
                </div>
              )}
              {emrData.nursing_notes?.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-700 mb-1">간호 기록</h3>
                  {emrData.nursing_notes.map((n: any, i: number) => (
                    <p key={i} className="text-gray-600"><span className="text-xs text-gray-400">[{new Date(n.recorded_at).toLocaleString("ko-KR")}]</span> {n.note_content}</p>
                  ))}
                </div>
              )}
              {emrData.diagnostic_records?.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <h3 className="font-medium text-orange-700 mb-1">진단/영상</h3>
                  {emrData.diagnostic_records.map((d: any, i: number) => (
                    <p key={i} className="text-gray-600">[{d.record_type}] {d.title}: {d.result_text}</p>
                  ))}
                </div>
              )}
              {emrData.handoff_records?.length > 0 && (
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <h3 className="font-medium text-indigo-700 mb-1">최근 인수인계</h3>
                  {emrData.handoff_records.map((h: any, i: number) => (
                    <div key={i} className="mb-2 pb-2 border-b border-indigo-100 last:border-0">
                      <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString("ko-KR")}</p>
                      {h.sbar_summary && (
                        <div className="mt-1 text-gray-600">
                          <p><strong>S:</strong> {h.sbar_summary.situation}</p>
                          <p><strong>R:</strong> {h.sbar_summary.recommendation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ② 경력자용 압축 EMR */}
        {emrData && mode === "senior" && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-sm font-semibold mb-2">EMR</h2>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              <p><strong>{emrData.patient?.name}</strong> {emrData.patient?.age}{emrData.patient?.gender} {emrData.patient?.room_number}호 Dx:{emrData.patient?.diagnosis}</p>
              {emrData.vital_signs?.[0] && (
                <p className="text-gray-600">VS: HR{emrData.vital_signs[0].heart_rate} BP{emrData.vital_signs[0].systolic_bp}/{emrData.vital_signs[0].diastolic_bp} T{emrData.vital_signs[0].temperature} SpO2{emrData.vital_signs[0].spo2} RR{emrData.vital_signs[0].respiratory_rate}</p>
              )}
              {emrData.lab_results?.filter((l: any) => l.is_abnormal).map((l: any, i: number) => (
                <p key={i} className="text-red-600">{l.test_name}:{l.result_value}</p>
              ))}
              {emrData.doctor_orders?.slice(0, 3).map((o: any, i: number) => (
                <p key={i} className="text-gray-600">[{o.order_type}]{o.order_content}</p>
              ))}
            </div>
          </div>
        )}

        {/* ③ 음성 브리핑 + STT 변환 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3">🎤 음성 브리핑 / ✏️ 직접 입력</h2>
          {mode === "junior" && (
            <p className="text-xs text-gray-400 mb-3">음성 녹음 버튼을 누르거나, 파일을 업로드하거나, 아래에 직접 타이핑하세요. 입력 후 AI가 자동 분류해 줍니다.</p>
          )}
          
          <div className="flex items-center gap-4 mb-3">
            <AudioRecorder onRecordingComplete={handleAudioComplete} />
            <span className="text-gray-400 text-sm">또는</span>
            <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition text-sm">
              📁 음성 파일 업로드
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioFileUpload}
              />
            </label>
          </div>

          {loading && <p className="mt-3 text-sm text-gray-500 animate-pulse">음성 변환 중...</p>}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">브리핑 내용 (음성 변환 또는 직접 입력)</label>
            <textarea
              value={sttText}
              onChange={(e) => setSttText(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg h-32 resize-none text-sm"
              placeholder="음성 녹음하면 자동으로 채워지거나, 직접 타이핑하세요..."
            />
            {sttText && (
              <button
                onClick={handleAiParse}
                disabled={loadingAi}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingAi ? "AI 분류 중..." : "🤖 AI로 EMR 파트별 분류"}
              </button>
            )}
          </div>
        </div>

        {/* ④ AI 분류 결과 (수정 가능) */}
        {aiParsed && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold mb-3">🤖 AI 분류 결과 <span className="text-xs font-normal text-gray-400">(수정 가능)</span></h2>
            <div className="space-y-3">
              {Object.entries(aiParsed).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                  <textarea
                    value={value as string}
                    onChange={(e) => setAiParsed({ ...aiParsed, [key]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ⑤ 추가 입력 (이미지 + 메모) */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3">📎 추가 입력</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">차트/검사결과 이미지</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm" />
              {imageText && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">AI 분석 결과 (수정 가능)</label>
                  <textarea
                    value={imageText}
                    onChange={(e) => setImageText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-40"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">추가 메모 (선택)</label>
              <textarea
                value={additionalNote}
                onChange={(e) => setAdditionalNote(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg h-24 resize-none text-sm"
                placeholder="인수인계 시 추가로 전달할 내용..."
              />
            </div>
          </div>
        </div>

        {/* ⑥ 제출 */}
        <button
          onClick={handleSubmit}
          disabled={loading || !patientId}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? "SBAR 생성 중..." : "📝 SBAR 인수인계 요약 생성"}
        </button>
      </div>
    </div>
  );
}
