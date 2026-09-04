"use client";

import { useState, useRef } from "react";
import {
  X,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Upload,
  Link2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { syncCalendarFeed, SyncCalendarResult } from "@/lib/actions/calendar";
import { useRouter } from "next/navigation";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Array<{ id: string; name: string }>;
  initialFeedUrl?: string | null;
  lastSyncedAt?: string | null;
}

export function CalendarSyncModal({
  isOpen,
  onClose,
  entities,
  initialFeedUrl,
  lastSyncedAt: initialLastSyncedAt,
}: CalendarSyncModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"feed" | "upload" | "guide">("feed");
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl || "");
  const [selectedEntityId, setSelectedEntityId] = useState(entities[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncCalendarResult | null>(null);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleSyncFeed = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!feedUrl.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await syncCalendarFeed({
        feedUrl: feedUrl.trim(),
        entityId: selectedEntityId,
      });

      setResult(res);
      if (res.success && res.lastSyncedAt) {
        setLastSyncedAt(res.lastSyncedAt);
        router.refresh();
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "Failed to sync calendar feed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".ics")) {
      setResult({
        success: false,
        error: "Please upload a valid .ics calendar file.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const res = await syncCalendarFeed({
        icsContent: text,
        entityId: selectedEntityId,
      });

      setResult(res);
      if (res.success) {
        router.refresh();
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "Failed to parse .ics file.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGuide = () => {
    const guideText = `📅 *How to Connect Your Outlook Calendar to Duston Project Tracker*

1. Open Outlook on the web (https://outlook.office.com) or Outlook desktop.
2. Click the ⚙️ Settings icon > Calendar > Shared calendars.
3. Under Publish a calendar:
   - Select your primary Calendar
   - Set permissions to: "Can view all details"
   - Click Publish
4. Click on the ICS link and choose Copy link.
5. In Duston Project Tracker (Meetings > Sync Outlook / iCal), paste the link and click Sync Now.`;

    navigator.clipboard.writeText(guideText);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-duston-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col my-auto animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#023542] text-white flex items-center justify-center shadow-2xs">
              <Calendar size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-duston-dark">
                Calendar Synchronization
              </h2>
              <p className="text-[11px] text-duston-muted">
                Import upcoming meetings, venues, and attendees from Outlook or iCal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-duston-border px-5 bg-white text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab("feed");
              setResult(null);
            }}
            className={cn(
              "py-3 border-b-2 transition-colors flex items-center gap-1.5 mr-4",
              activeTab === "feed"
                ? "border-[#023542] text-[#023542] font-semibold"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <Link2 size={13} />
            <span>Outlook / iCal URL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setResult(null);
            }}
            className={cn(
              "py-3 border-b-2 transition-colors flex items-center gap-1.5 mr-4",
              activeTab === "upload"
                ? "border-[#023542] text-[#023542] font-semibold"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <Upload size={13} />
            <span>Upload .ICS File</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("guide");
              setResult(null);
            }}
            className={cn(
              "py-3 border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "guide"
                ? "border-[#023542] text-[#023542] font-semibold"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <HelpCircle size={13} />
            <span>Step-by-Step Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status / Alert Message */}
          {result && (
            <div
              className={cn(
                "p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-150",
                result.success
                  ? "bg-[#39B54A]/10 border-[#39B54A]/30 text-[#023542]"
                  : "bg-duston-orange/10 border-duston-orange/30 text-duston-orange"
              )}
            >
              {result.success ? (
                <CheckCircle2 size={16} className="text-[#39B54A] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-duston-orange shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-xs">
                  {result.success ? "Sync Successful" : "Synchronization Failed"}
                </div>
                <div className="text-[11px] mt-0.5 text-duston-dark/80">
                  {result.message || result.error}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Feed URL */}
          {activeTab === "feed" && (
            <form onSubmit={handleSyncFeed} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-duston-dark mb-1.5">
                  Private Outlook or iCal Subscription URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2.5 text-xs text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE] transition-all"
                  />
                </div>
                <p className="text-[10px] text-duston-muted mt-1">
                  Supports Microsoft 365, Outlook on the web, Outlook Desktop, and Google Calendar.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-duston-dark mb-1.5">
                  Default Subsidiary Entity for Synced Meetings
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE]"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-duston-muted mt-1">
                  Meetings will be tagged under this subsidiary in company filters.
                </p>
              </div>

              {lastSyncedAt && (
                <div className="text-[11px] text-duston-muted flex items-center gap-1.5 pt-1">
                  <CheckCircle2 size={13} className="text-[#39B54A]" />
                  <span>
                    Last synced: {new Date(lastSyncedAt).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("guide")}
                  className="text-xs text-[#023542] hover:text-[#1BCECE] font-medium flex items-center gap-1 transition-colors"
                >
                  <HelpCircle size={13} />
                  <span>Setup instructions</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || !feedUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-subtle disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    size={13}
                    className={cn(loading && "animate-spin")}
                  />
                  <span>{loading ? "Syncing Calendar..." : "Sync Now"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Upload File */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <p className="text-duston-muted text-xs">
                Have an <code className="bg-duston-bg px-1 py-0.5 rounded border border-duston-border text-duston-dark">.ics</code> meeting invite or exported calendar file? Drag and drop it here to parse and import all meetings instantly.
              </p>

              <div>
                <label className="block text-xs font-semibold text-duston-dark mb-1.5">
                  Default Subsidiary Entity
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] mb-3"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                  dragOver
                    ? "border-[#1BCECE] bg-[#1BCECE]/5"
                    : "border-duston-border hover:border-[#023542] bg-duston-bg/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-white border border-duston-border flex items-center justify-center mx-auto text-[#023542] shadow-2xs mb-3">
                  <Upload size={20} />
                </div>
                <div className="text-xs font-semibold text-duston-dark">
                  Click to select or drag & drop .ics file
                </div>
                <p className="text-[11px] text-duston-muted mt-1">
                  Supports standard iCal (.ics) exports from Outlook, Teams, and Apple Calendar
                </p>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-xs text-[#023542] font-medium py-2">
                  <RefreshCw size={14} className="animate-spin text-[#1BCECE]" />
                  <span>Processing calendar meetings...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Guide */}
          {activeTab === "guide" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-duston-bg p-3 rounded-xl border border-duston-border">
                <span className="text-xs font-semibold text-duston-dark">
                  Connection Instructions
                </span>
                <button
                  type="button"
                  onClick={handleCopyGuide}
                  className="px-3 py-1.5 bg-white border border-duston-border hover:border-[#023542] text-[#023542] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  {copiedGuide ? (
                    <>
                      <Check size={12} className="text-[#39B54A]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Setup Guide</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-3">
                <div className="border border-duston-border rounded-xl p-3.5 space-y-2 bg-white">
                  <div className="font-semibold text-xs text-[#023542] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Open Outlook Settings</span>
                  </div>
                  <p className="text-[11px] text-duston-muted pl-6.5">
                    Log in to Outlook on the web (<strong>outlook.office.com</strong>) or your desktop Outlook app. Click the <strong>⚙️ Settings (Gear icon)</strong> in the top-right corner.
                  </p>
                </div>

                <div className="border border-duston-border rounded-xl p-3.5 space-y-2 bg-white">
                  <div className="font-semibold text-xs text-[#023542] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Navigate to Shared Calendars</span>
                  </div>
                  <p className="text-[11px] text-duston-muted pl-6.5">
                    In the left navigation inside Settings, click <strong>Calendar</strong>, then select <strong>Shared calendars</strong>.
                  </p>
                </div>

                <div className="border border-duston-border rounded-xl p-3.5 space-y-2 bg-white">
                  <div className="font-semibold text-xs text-[#023542] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Publish Your Calendar</span>
                  </div>
                  <div className="text-[11px] text-duston-muted pl-6.5 space-y-1">
                    <p>Under <strong>Publish a calendar</strong>:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Select your primary <strong>Calendar</strong>.</li>
                      <li>Select permissions: <strong>Can view all details</strong> (so meeting titles and venues are synced).</li>
                      <li>Click <strong>Publish</strong>.</li>
                    </ul>
                  </div>
                </div>

                <div className="border border-duston-border rounded-xl p-3.5 space-y-2 bg-white">
                  <div className="font-semibold text-xs text-[#023542] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[10px]">
                      4
                    </span>
                    <span>Copy the ICS Link and Connect</span>
                  </div>
                  <p className="text-[11px] text-duston-muted pl-6.5">
                    Click the generated <strong>ICS link</strong>, click <strong>Copy link</strong>, come back to this modal, and click <strong>Sync Now</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab("feed")}
                  className="px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-2xs inline-flex items-center gap-1.5"
                >
                  <span>Ready? Paste Link Now</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
