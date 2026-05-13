"use client";
import { useSession, signOut } from "next-auth/react";

interface HeaderProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onApply: () => void;
}

export function Header({ from, to, onFromChange, onToChange, onApply }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#0d0d0d] sticky top-0 z-10">
      <div className="text-white font-semibold text-base">
        Client Ascension{" "}
        <span className="text-blue-400">Sales Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">FROM</span>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-1.5 [color-scheme:dark]"
        />
        <span className="text-gray-400 text-sm">TO</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded px-3 py-1.5 [color-scheme:dark]"
        />
        <button
          onClick={onApply}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded font-medium transition-colors"
        >
          Apply
        </button>
        {session?.user?.email && (
          <>
            <span className="text-gray-400 text-sm ml-2">{session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
