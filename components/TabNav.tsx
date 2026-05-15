type Tab = "ae" | "sdr" | "sdr-ae";

interface TabNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "ae", label: "AE" },
  { id: "sdr", label: "SDR" },
  { id: "sdr-ae", label: "SDR → AE" },
];

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="flex border-b border-[#222] px-6">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`py-4 px-4 text-sm font-medium mr-1 border-b-2 transition-colors ${
            active === id
              ? "border-blue-500 text-white"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
