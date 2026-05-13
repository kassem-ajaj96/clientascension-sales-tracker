type Color = "blue" | "green" | "purple" | "gold" | "white";

interface KPICardProps {
  label: string;
  value: string;
  color?: Color;
}

const colorMap: Record<Color, string> = {
  blue: "text-blue-400",
  green: "text-green-400",
  purple: "text-purple-400",
  gold: "text-yellow-400",
  white: "text-white",
};

export function KPICard({ label, value, color = "white" }: KPICardProps) {
  return (
    <div className="bg-[#141414] border border-[#222] rounded-lg p-5 flex flex-col gap-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-3xl font-bold ${colorMap[color]}`}>{value}</span>
    </div>
  );
}
