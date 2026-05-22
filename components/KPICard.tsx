type Color = "blue" | "green" | "purple" | "gold" | "red" | "white";

interface KPICardProps {
  label: string;
  value: string;
  color?: Color;
}

const colorMap: Record<Color, string> = {
  blue: "text-[#e53e1e]",
  green: "text-green-400",
  purple: "text-[#e53e1e]",
  gold: "text-yellow-400",
  red: "text-[#e53e1e]",
  white: "text-white",
};

export function KPICard({ label, value, color = "white" }: KPICardProps) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 flex flex-col gap-2">
      <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">{label}</span>
      <span className={`text-3xl font-bold ${colorMap[color]}`}>{value}</span>
    </div>
  );
}
