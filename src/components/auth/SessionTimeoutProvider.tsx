"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";

// Inactivity configuration (30 min timeout)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 2000; // Check every 2 seconds
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
  }, []);

  const handleAutoTimeout = useCallback(async () => {
    try {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "LOGOUT_TIMEOUT" });
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    await signOut({ callbackUrl: "/login" });
  }, []);

  // Broadcast channel setup for cross-tab synchronization
  useEffect(() => {
    if (!user) return;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "LOGOUT" || event.data?.type === "LOGOUT_TIMEOUT") {
          window.location.href = "/login";
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
        lastThrottleRef.current = parseInt(e.newValue, 10) || Date.now();
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

      if (idleDuration >= INACTIVITY_TIMEOUT_MS) {
        // Timed out - sign out silently
        handleAutoTimeout();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, handleAutoTimeout]);

  return <>{children}</>;
}
