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
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] bg-black sticky top-0 z-10">
      <div className="font-bold text-base tracking-wide">
        <span className="text-white">CLIENT </span>
        <span className="text-[#e53e1e]">ASCENSION</span>
        <span className="text-gray-500 font-normal text-sm ml-2">Sales Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-500 text-xs uppercase tracking-wider">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded px-3 py-1.5 [color-scheme:dark]"
        />
        <span className="text-gray-500 text-xs uppercase tracking-wider">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded px-3 py-1.5 [color-scheme:dark]"
        />
        <button
          onClick={onApply}
          className="bg-[#e53e1e] hover:bg-[#c7341a] text-white text-sm px-5 py-1.5 rounded font-semibold transition-colors"
        >
          Apply
        </button>
        {session?.user?.email && (
          <>
            <span className="text-gray-600 text-sm ml-2">{session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-500 hover:text-white text-sm transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
