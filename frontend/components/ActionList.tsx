interface Action {
  patient_name: string;
  room_number: string;
  task: string;
  category: string;
  priority_score: number;
  risk_level: string;
}

interface ActionListProps {
  actions: Action[];
}

const CATEGORY_STYLES: Record<string, string> = {
  URGENT: "border-l-red-500 bg-red-50",
  HIGH: "border-l-orange-500 bg-orange-50",
  NORMAL: "border-l-blue-500 bg-blue-50",
  LOW: "border-l-gray-300 bg-gray-50",
};

export default function ActionList({ actions }: ActionListProps) {
  if (actions.length === 0) {
    return <p className="text-gray-400 text-center py-4">업무가 없습니다.</p>;
  }

  return (
    <div className="space-y-2">
      {actions.slice(0, 10).map((action, i) => (
        <div
          key={i}
          className={`p-3 border-l-4 rounded-r-lg ${CATEGORY_STYLES[action.category] || CATEGORY_STYLES.LOW}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-800">{action.task}</p>
              <p className="text-xs text-gray-500 mt-1">
                {action.patient_name} · {action.room_number}호
              </p>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {action.category}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
