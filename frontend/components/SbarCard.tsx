interface SbarData {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

interface SbarCardProps {
  sbar: SbarData;
}

const SECTIONS = [
  { key: "situation", label: "S - Situation", color: "border-blue-500 bg-blue-50" },
  { key: "background", label: "B - Background", color: "border-purple-500 bg-purple-50" },
  { key: "assessment", label: "A - Assessment", color: "border-amber-500 bg-amber-50" },
  { key: "recommendation", label: "R - Recommendation", color: "border-green-500 bg-green-50" },
];

export default function SbarCard({ sbar }: SbarCardProps) {
  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, label, color }) => (
        <div key={key} className={`p-4 border-l-4 rounded-r-lg ${color}`}>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">{label}</h4>
          <p className="text-sm text-gray-600">
            {sbar[key as keyof SbarData] || "-"}
          </p>
        </div>
      ))}
      <p className="text-xs text-gray-400 italic mt-4">
        ⚠️ AI 보조 요약이며 임상 판단을 대체하지 않습니다.
      </p>
    </div>
  );
}
