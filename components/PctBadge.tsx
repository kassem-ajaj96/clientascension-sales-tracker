interface PctBadgeProps {
  value: number | null;
}

export function PctBadge({ value }: PctBadgeProps) {
  if (value === null) return <span className="text-gray-600">—</span>;

  const pct = value * 100;

  let cls: string;
  if (pct >= 75) cls = "bg-green-900/50 text-green-400 border border-green-700/40";
  else if (pct >= 50) cls = "bg-yellow-900/50 text-yellow-400 border border-yellow-700/40";
  else cls = "bg-red-900/50 text-red-400 border border-red-700/40";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {pct.toFixed(1)}%
    </span>
  );
}
