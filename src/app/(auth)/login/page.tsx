"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setTestUser = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("Duston123!");
  };

  return (
    <div className="min-h-screen bg-duston-bg flanelines-bg flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-subtle p-8 z-10">
        
        {/* Duston Group Logo Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity" title="Duston Project Tracker">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-duston-group.png"
              alt="Duston Group"
              className="h-10 sm:h-12 w-auto max-w-[280px] sm:max-w-[320px] object-contain mx-auto mb-2 transition-all"
            />
          </Link>
          <h1 className="text-sm font-medium text-duston-dark mt-2">
            Duston Project Tracker
          </h1>
          <p className="text-xs text-duston-muted mt-0.5">
            Internal Executive Command Center
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-duston-orange/10 border border-duston-orange/20 text-duston-orange text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-duston-text mb-1.5">
              Work email
            </label>
            <input
              type="email"
              required
              placeholder="name@duston.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2.5 text-xs text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE] transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-duston-text">
                Password
              </label>
              <span className="text-[11px] text-duston-muted hover:underline cursor-pointer">
                Forgot password
              </span>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2.5 text-xs text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </form>

        {/* Quick Test Logins Strip */}
        <div className="mt-8 pt-6 border-t border-duston-border">
          <div className="text-[11px] font-medium text-duston-muted mb-2.5 text-center">
            Quick demo credentials (password: <span className="font-mono text-duston-dark">Duston123!</span>)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setTestUser("theophilus@duston.com")}
              className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
            >
              <span className="font-medium block text-duston-dark">Theophilus Dorh</span>
              <span className="text-duston-muted text-[10px]">EA (Global)</span>
            </button>
            <button
              type="button"
              onClick={() => setTestUser("elton@duston.com")}
              className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
            >
              <span className="font-medium block text-duston-dark">Elton K. Dusi</span>
              <span className="text-duston-muted text-[10px]">CEO (Global)</span>
            </button>
            <button
              type="button"
              onClick={() => setTestUser("md@duston.com")}
              className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
            >
              <span className="font-medium block text-duston-dark">Test MD</span>
              <span className="text-duston-muted text-[10px]">MOSL only</span>
            </button>
            <button
              type="button"
              onClick={() => setTestUser("hod@duston.com")}
              className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
            >
              <span className="font-medium block text-duston-dark">Test HOD</span>
              <span className="text-duston-muted text-[10px]">Dept Head</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
