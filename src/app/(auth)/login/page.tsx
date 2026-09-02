"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-duston-bg flanelines-bg flex items-center justify-center p-4 sm:p-6 lg:p-10 relative">
      <div className="w-full max-w-5xl bg-white border border-duston-border rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10">
        
        {/* Left Column: Hero & Conglomerate Context */}
        <div className="lg:col-span-7 bg-[#023542] text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle FlaneLines background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none flanelines-bg" />

          <div className="relative z-10">
            {/* Prominent Large Duston Group Logo */}
            <div className="mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-duston-group.png"
                alt="Duston Group"
                className="h-14 sm:h-16 w-auto object-contain bg-white/95 rounded-xl px-4 py-2"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#1BCECE] text-xs font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-[#1BCECE]" />
              <span>Executive Delivery & Cross-Subsidiary Intelligence</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mb-4 leading-snug">
              Unified oversight across all concurrent workstreams.
            </h1>

            <p className="text-xs sm:text-sm text-gray-200/90 leading-relaxed mb-8">
              <strong>Duston Group</strong> is a diversified Ghanaian conglomerate operating high-stakes initiatives across energy trading, infrastructure, mining, commercial real estate, and healthcare.
            </p>

            <p className="text-xs sm:text-sm text-gray-200/90 leading-relaxed mb-8">
              This Project Tracker was built specifically to empower the CEO, Executive Assistants, Managing Directors, and Heads of Departments to monitor complex, multi-entity deliverables in real time—ensuring strict accountability so nothing slips through.
            </p>

            {/* Strategic Value Pillars */}
            <div className="space-y-3 text-xs text-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-[#1BCECE]/20 text-[#1BCECE] mt-0.5 shrink-0">
                  <CheckCircle2 size={14} strokeWidth={2} />
                </div>
                <div>
                  <span className="font-semibold text-white">Cross-Subsidiary Visibility:</span> Track deliverables across MOSL, ICON Energy, Norva Oil Trading, Nova Mines, Livon Hospital, and Duston Properties in one unified interface.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-[#1BCECE]/20 text-[#1BCECE] mt-0.5 shrink-0">
                  <ShieldCheck size={14} strokeWidth={2} />
                </div>
                <div>
                  <span className="font-semibold text-white">Risk-Weighted Accountability:</span> Prioritize critical bottlenecks using real-time overdue scoring and proactive automated WhatsApp alerts.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-[#1BCECE]/20 text-[#1BCECE] mt-0.5 shrink-0">
                  <Zap size={14} strokeWidth={2} />
                </div>
                <div>
                  <span className="font-semibold text-white">Executive Meeting Action Capture:</span> Bulk parse decision registers directly from meeting minutes into assigned, tracked actions.
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 mt-8 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
            <span>Duston Group © 2026</span>
            <span>Enterprise Internal Systems</span>
          </div>
        </div>

        {/* Right Column: Sign In & 1-Click Test Access */}
        <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-medium text-[#023542] tracking-tight">
                Executive Sign In
              </h2>
              <p className="text-xs text-duston-muted mt-1">
                Enter your work credentials to access your dashboard
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-[#F15A24]/10 border border-[#F15A24]/20 text-[#F15A24] text-xs text-center font-medium">
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
                className="w-full py-2.5 px-4 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in to Dashboard"}
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </form>
          </div>

          {/* Quick Test Logins Strip */}
          <div className="mt-8 pt-6 border-t border-duston-border">
            <div className="text-[11px] font-medium text-duston-muted mb-2 text-center">
              1-Click Demo Logins (Password: <span className="font-mono text-duston-dark">Duston123!</span>)
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setTestUser("theophilus@duston.com")}
                className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
              >
                <span className="font-medium block text-duston-dark">Theophilus Dorh</span>
                <span className="text-duston-muted text-[10px]">EA (Global Access)</span>
              </button>
              <button
                type="button"
                onClick={() => setTestUser("elton@duston.com")}
                className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
              >
                <span className="font-medium block text-duston-dark">Elton K. Dusi</span>
                <span className="text-duston-muted text-[10px]">CEO (Global Access)</span>
              </button>
              <button
                type="button"
                onClick={() => setTestUser("md@duston.com")}
                className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
              >
                <span className="font-medium block text-duston-dark">Test MD</span>
                <span className="text-duston-muted text-[10px]">Scoped (MOSL only)</span>
              </button>
              <button
                type="button"
                onClick={() => setTestUser("hod@duston.com")}
                className="p-2 text-left rounded-lg bg-duston-bg hover:bg-duston-border/60 text-duston-text border border-duston-border transition-colors"
              >
                <span className="font-medium block text-duston-dark">Test HOD</span>
                <span className="text-duston-muted text-[10px]">Department Head</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
