"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react";

// Inactivity configuration (30 min timeout, 2 min warning modal)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION_MS = 2 * 60 * 1000; // 2 minutes warning countdown
const CHECK_INTERVAL_MS = 1000; // Check every 1 second
const THROTTLE_ACTIVITY_MS = 2000; // Record activity at most once every 2 seconds

const STORAGE_KEY = "duston_last_activity_timestamp";
const BROADCAST_CHANNEL_NAME = "duston_session_sync";

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  user?: {
    id: string;
    email?: string | null;
  } | null;
}

export function SessionTimeoutProvider({ children, user }: SessionTimeoutProviderProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);
  const lastThrottleRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Set the latest activity timestamp in localStorage and broadcast to other tabs
  const recordActivity = useCallback((broadcast = true) => {
    const now = Date.now();
    if (now - lastThrottleRef.current < THROTTLE_ACTIVITY_MS) {
      return;
    }
    lastThrottleRef.current = now;

    try {
      localStorage.setItem(STORAGE_KEY, String(now));
      if (broadcast && channelRef.current) {
        channelRef.current.postMessage({ type: "ACTIVITY_PING", timestamp: now });
      }
    } catch {
      // Ignore storage write errors (e.g. private mode quota)
    }

    setShowWarning((prev) => {
      if (prev) return false;
      return prev;
    });
  }, []);

  const handleManualStaySignedIn = () => {
    const now = Date.now();
    lastThrottleRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "ACTIVITY_PING", timestamp: now });
      }
    } catch {}
    setShowWarning(false);
  };

  const handleManualSignOut = async () => {
    try {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "LOGOUT" });
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    await signOut({ callbackUrl: "/login" });
  };

  const handleAutoTimeout = useCallback(async () => {
    setShowWarning(false);
    try {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "LOGOUT_TIMEOUT" });
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    await signOut({ callbackUrl: "/login?reason=timeout" });
  }, []);

  // Broadcast channel setup for cross-tab synchronization
  useEffect(() => {
    if (!user) return;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "ACTIVITY_PING") {
          setShowWarning(false);
        } else if (event.data?.type === "LOGOUT" || event.data?.type === "LOGOUT_TIMEOUT") {
          window.location.href = "/login?reason=timeout";
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [user]);

  // Sync with cross-tab localStorage changes
  useEffect(() => {
    if (!user) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setShowWarning(false);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  // Register user interaction listeners
  useEffect(() => {
    if (!user) return;

    // Initialize activity on mount
    recordActivity(false);

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel", "click"];

    const handleUserInteraction = () => {
      recordActivity(true);
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserInteraction);
      });
    };
  }, [user, recordActivity]);

  // Periodic heartbeat / timer check
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let lastActivity = now;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          lastActivity = parseInt(stored, 10);
        } else {
          localStorage.setItem(STORAGE_KEY, String(now));
        }
      } catch {
        lastActivity = lastThrottleRef.current || now;
      }

      const idleDuration = now - lastActivity;
      const warningThreshold = INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;

      if (idleDuration >= INACTIVITY_TIMEOUT_MS) {
        // Timed out completely!
        handleAutoTimeout();
      } else if (idleDuration >= warningThreshold) {
        // In warning period
        const msLeft = INACTIVITY_TIMEOUT_MS - idleDuration;
        const secsLeft = Math.max(0, Math.ceil(msLeft / 1000));
        setSecondsRemaining(secsLeft);
        setShowWarning(true);
      } else {
        // Healthy active session
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, handleAutoTimeout]);

  // Helper to format remaining seconds as MM:SS
  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <>
      {children}

      {/* Inactivity Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="inactivity-title"
            aria-describedby="inactivity-desc"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-duston-border p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-duston-amber shrink-0">
                <ShieldAlert size={22} strokeWidth={1.75} />
              </div>
              <div>
                <h3 id="inactivity-title" className="text-base font-semibold text-duston-dark">
                  Are you still there?
                </h3>
                <p id="inactivity-desc" className="text-xs text-duston-muted mt-0.5">
                  Your session has been idle for nearly 30 minutes.
                </p>
              </div>
            </div>

            {/* Countdown Banner */}
            <div className="bg-duston-bg border border-duston-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-duston-text">
                <Clock size={16} className="text-duston-amber animate-pulse" />
                <span>Auto sign-out in:</span>
              </div>
              <div className="font-mono text-lg font-bold text-duston-orange bg-white px-3 py-1 rounded-lg border border-duston-border shadow-xs">
                {formatCountdown(secondsRemaining)}
              </div>
            </div>

            <p className="text-xs text-duston-muted leading-relaxed">
              To protect sensitive project deliverables and executive data, inactive sessions are automatically locked. Click <strong>Stay Signed In</strong> below to continue your work.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleManualSignOut}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-duston-border bg-white hover:bg-duston-bg text-duston-muted hover:text-duston-dark text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign out now</span>
              </button>
              <button
                type="button"
                onClick={handleManualStaySignedIn}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#023542] hover:bg-[#1BCECE] text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-subtle"
                autoFocus
              >
                <CheckCircle2 size={14} />
                <span>Stay Signed In</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
