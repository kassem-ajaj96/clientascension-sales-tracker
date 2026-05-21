type Tab = "ae" | "sdr" | "sdr-ae";

interface TabNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "ae", label: "Closer" },
  { id: "sdr", label: "Setter" },
  { id: "sdr-ae", label: "Setter → Closer" },
];

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="flex border-b border-[#1a1a1a] px-6 bg-black">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`py-4 px-4 text-sm font-medium mr-1 border-b-2 transition-colors ${
            active === id
              ? "border-[#e53e1e] text-white"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
