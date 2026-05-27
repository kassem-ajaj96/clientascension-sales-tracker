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
    <header className="border-b border-[#1a1a1a] bg-black sticky top-0 z-10">
      {/* Logo row (always visible) + desktop date controls */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2 font-bold text-base tracking-wide">
          <span className="text-white">CLIENT </span>
          <span className="text-[#e53e1e]">ASCENSION</span>
          <svg width="22" height="22" viewBox="0 0 44 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="lf">
                <polygon points="22,2 2,40 22,40"/>
              </clipPath>
            </defs>
            <polygon points="22,2 2,40 22,40" fill="#b02a12"/>
            <g clipPath="url(#lf)">
              {[0,5,10,15,20,25,30].map((o) => (
                <line key={o} x1={22 + o} y1={2} x2={2 + o} y2={42} stroke="#1a0805" strokeWidth="1.4"/>
              ))}
            </g>
            <polygon points="22,2 42,40 22,40" fill="#e53e1e"/>
            <polygon points="22,2 2,40 42,40" fill="none" stroke="#1a0805" strokeWidth="2" strokeLinejoin="round"/>
            <line x1="22" y1="2" x2="22" y2="40" stroke="#1a0805" strokeWidth="1.5"/>
          </svg>
          <span className="text-gray-500 font-normal text-sm hidden sm:inline">Sales Dashboard</span>
        </div>

        {/* Desktop: date controls + auth */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-gray-500 text-xs uppercase tracking-wider">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            lang="en-US"
            className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded px-3 py-1.5 [color-scheme:dark]"
          />
          <span className="text-gray-500 text-xs uppercase tracking-wider">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            lang="en-US"
            className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded px-3 py-1.5 [color-scheme:dark]"
          />
          <button
            onClick={onApply}
            className="bg-[#e53e1e] hover:bg-[#c7341a] text-white text-sm px-5 py-1.5 rounded font-semibold transition-colors"
          >
            Apply
          </button>
          {session && (
            <>
              {session.user?.email && (
                <span className="text-gray-600 text-sm ml-2">{session.user.email}</span>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-500 hover:text-white text-sm transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile: logout only */}
        {session && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sm:hidden text-gray-500 hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        )}
      </div>

      {/* Mobile: date controls row */}
      <div className="flex items-center gap-2 px-4 pb-3 sm:hidden">
        <span className="text-gray-500 text-xs uppercase">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          lang="en-US"
          className="flex-1 min-w-0 bg-[#111] border border-[#2a2a2a] text-white text-xs rounded px-2 py-1.5 [color-scheme:dark]"
        />
        <span className="text-gray-500 text-xs uppercase">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          lang="en-US"
          className="flex-1 min-w-0 bg-[#111] border border-[#2a2a2a] text-white text-xs rounded px-2 py-1.5 [color-scheme:dark]"
        />
        <button
          onClick={onApply}
          className="bg-[#e53e1e] hover:bg-[#c7341a] text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors whitespace-nowrap"
        >
          Apply
        </button>
      </div>
    </header>
  );
}
