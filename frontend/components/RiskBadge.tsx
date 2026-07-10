interface RiskBadgeProps {
  level: string;
}

const RISK_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low_watch: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const RISK_LABELS: Record<string, string> = {
  critical: "위험",
  high: "주의",
  medium: "관찰",
  low_watch: "주시",
  low: "안정",
};

export default function RiskBadge({ level }: RiskBadgeProps) {
  const style = RISK_STYLES[level] || RISK_STYLES.low;
  const label = RISK_LABELS[level] || "안정";

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${style}`}>
      {label}
    </span>
  );
}
