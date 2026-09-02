"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

  return (
    <div className="min-h-screen bg-duston-bg flanelines-bg flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-subtle p-8 z-10">
        
        {/* Duston Group Logo Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity" title="Duston Project Tracker">
            <Image
              src="/logo-duston-group.png"
              alt="Duston Group"
              width={1024}
              height={168}
              priority
              quality={100}
              className="h-10 sm:h-12 w-auto max-w-[280px] sm:max-w-[320px] object-contain mx-auto mb-2"
              style={{ aspectRatio: "1024 / 168" }}
            />
          </Link>
          <h1 className="text-sm font-medium text-duston-dark mt-2">
            Duston Project Tracker
          </h1>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-duston-orange/10 border border-duston-orange/20 text-duston-orange text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-duston-text mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="name@dustongroup.com"
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
            className="w-full py-2.5 px-4 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-subtle"
          >
            {loading ? "Signing in..." : "Sign in"}
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
