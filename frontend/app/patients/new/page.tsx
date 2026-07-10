"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    room_number: "",
    diagnosis: "",
    ward_id: "ward-A",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.room_number || !form.diagnosis) {
      alert("이름, 병실, 진단은 필수입니다.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("/api/v1/patients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          room_number: form.room_number,
          diagnosis: form.diagnosis,
          ward_id: form.ward_id,
        }),
      });
      alert(`${form.name} 환자가 등록되었습니다.`);
      router.push("/");
    } catch (err: any) {
      alert("등록 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">새 환자 등록</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="홍길동"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">나이</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="65"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">선택</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">병실 *</label>
          <input
            type="text"
            value={form.room_number}
            onChange={(e) => setForm({ ...form, room_number: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="301"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">진단명 *</label>
          <input
            type="text"
            value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="폐렴, 심부전 등"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">병동</label>
          <input
            type="text"
            value={form.ward_id}
            onChange={(e) => setForm({ ...form, ward_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="ward-A"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "등록 중..." : "환자 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
