"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      router.push("/");
    } else {
      setError("Invalid username or password");
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <div className="bg-[#141414] border border-[#222] rounded-xl p-8 w-80">
        <h1 className="text-white text-xl font-bold mb-1 text-center">Client Ascension</h1>
        <p className="text-gray-400 text-sm mb-8 text-center">Sales Dashboard</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-purple-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-purple-500"
            required
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
