"use client";

import { useState, useRef } from "react";
import {
  Sliders,
  User,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  Upload,
  Link2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateUserPreferences, updateUserProfile, changeUserPassword } from "@/lib/actions/preferences";
import { syncCalendarFeed, SyncCalendarResult } from "@/lib/actions/calendar";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    jobTitle?: string | null;
    phoneE164?: string | null;
    avatarUrl?: string | null;
  };
  preferences: {
    defaultView: "todo" | "kanban" | "planner";
    kanbanColumns: string[];
    whatsappEnabled: boolean;
    digestFrequency: "daily" | "weekly" | "off";
    timezone: string;
    calendarFeedUrl?: string | null;
    calendarLastSyncedAt?: string | null;
  };
  entities?: Array<{ id: string; name: string }>;
}

export function SettingsClient({ user, preferences, entities = [] }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"preferences" | "profile" | "calendar" | "security">("preferences");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calendar sync state
  const [calendarUrl, setCalendarUrl] = useState(preferences.calendarFeedUrl || "");
  const [calendarLastSynced, setCalendarLastSynced] = useState<string | null>(preferences.calendarLastSyncedAt || null);
  const [calendarEntityId, setCalendarEntityId] = useState(entities[0]?.id || "");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarResult, setCalendarResult] = useState<SyncCalendarResult | null>(null);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preferences state
  const [defaultView, setDefaultView] = useState<"todo" | "kanban" | "planner">(preferences.defaultView);
  const [kanbanCols, setKanbanCols] = useState<string[]>(preferences.kanbanColumns || ["Backlog", "This Week", "In Progress", "Blocked", "Done"]);
  const [newColName, setNewColName] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(preferences.whatsappEnabled);
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekly" | "off">(preferences.digestFrequency);
  const [timezone, setTimezone] = useState(preferences.timezone || "Africa/Accra");

  // Profile state
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phoneE164 || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  // Security state
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const res = await updateUserPreferences(user.id, {
      defaultView,
      kanbanColumns: kanbanCols,
      whatsappEnabled,
      digestFrequency,
      timezone,
    });

    if (res.success) {
      setMessage("Preferences updated successfully");
    } else {
      setError("Failed to save preferences");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const res = await updateUserProfile(user.id, {
      name,
      phoneE164: phone.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    });

    if (res.success) {
      setMessage("Profile saved successfully");
    } else {
      setError("Failed to update profile");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPass !== confirmPass) {
      setError("New passwords do not match");
      return;
    }
    if (newPass.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const res = await changeUserPassword(user.id, currentPass, newPass);
    if (res.success) {
      setMessage("Password changed successfully");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } else {
      setError(res.error || "Failed to change password");
    }
  };

  const addKanbanCol = () => {
    if (!newColName.trim()) return;
    setKanbanCols([...kanbanCols, newColName.trim()]);
    setNewColName("");
  };

  const removeKanbanCol = (index: number) => {
    setKanbanCols(kanbanCols.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-duston-muted mt-1">
          Manage system preferences, personal details, and security credentials
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-duston-border flex items-center gap-6">
        <button
          onClick={() => {
            setActiveTab("preferences");
            setMessage(null);
            setError(null);
          }}
          className={cn(
            "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
            activeTab === "preferences"
              ? "border-[#023542] text-[#023542]"
              : "border-transparent text-duston-muted hover:text-duston-dark"
          )}
        >
          <Sliders size={14} strokeWidth={1.5} />
          <span>Preferences</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("profile");
            setMessage(null);
            setError(null);
          }}
          className={cn(
            "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
            activeTab === "profile"
              ? "border-[#023542] text-[#023542]"
              : "border-transparent text-duston-muted hover:text-duston-dark"
          )}
        >
          <User size={14} strokeWidth={1.5} />
          <span>Profile</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("calendar");
            setMessage(null);
            setError(null);
          }}
          className={cn(
            "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
            activeTab === "calendar"
              ? "border-[#023542] text-[#023542]"
              : "border-transparent text-duston-muted hover:text-duston-dark"
          )}
        >
          <Calendar size={14} strokeWidth={1.5} />
          <span>Calendar Sync</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("security");
            setMessage(null);
            setError(null);
          }}
          className={cn(
            "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
            activeTab === "security"
              ? "border-[#023542] text-[#023542]"
              : "border-transparent text-duston-muted hover:text-duston-dark"
          )}
        >
          <Shield size={14} strokeWidth={1.5} />
          <span>Security</span>
        </button>
      </div>

      {/* Alert Banners */}
      {message && (
        <div className="p-3 bg-[#39B54A]/10 border border-[#39B54A]/20 text-[#39B54A] rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={15} strokeWidth={1.5} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* 1. Preferences Tab */}
      {activeTab === "preferences" && (
        <form onSubmit={handleSavePreferences} className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-6 text-xs">
          {/* Default view radio */}
          <div>
            <label className="block text-duston-dark font-medium mb-2">
              Default dashboard view
            </label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(["todo", "kanban", "planner"] as const).map((view) => (
                <label
                  key={view}
                  className={cn(
                    "p-3 rounded-xl border text-center cursor-pointer transition-all capitalize font-medium",
                    defaultView === view
                      ? "border-[#1BCECE] bg-[#1BCECE]/5 text-[#023542]"
                      : "border-duston-border bg-duston-bg/40 text-duston-muted hover:border-duston-muted"
                  )}
                >
                  <input
                    type="radio"
                    name="defaultView"
                    value={view}
                    checked={defaultView === view}
                    onChange={() => setDefaultView(view)}
                    className="sr-only"
                  />
                  <span>{view === "kanban" ? "Board" : view === "todo" ? "To-do" : "Planner"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Board columns manager */}
          <div>
            <label className="block text-duston-dark font-medium mb-1.5">
              Custom Board columns
            </label>
            <p className="text-duston-muted mb-3">
              Configure the pipeline columns for your boards.
            </p>
            <div className="space-y-2 max-w-md">
              {kanbanCols.map((col, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => {
                      const updated = [...kanbanCols];
                      updated[idx] = e.target.value;
                      setKanbanCols(updated);
                    }}
                    className="flex-1 bg-white border border-duston-border rounded-lg px-3 py-1.5 outline-none focus:border-[#1BCECE]"
                  />
                  <button
                    type="button"
                    onClick={() => removeKanbanCol(idx)}
                    className="p-1.5 rounded hover:bg-duston-bg text-duston-muted hover:text-duston-orange"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="New column name..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="flex-1 bg-white border border-duston-border rounded-lg px-3 py-1.5 outline-none focus:border-[#1BCECE]"
                />
                <button
                  type="button"
                  onClick={addKanbanCol}
                  className="px-3 py-1.5 rounded-lg border border-duston-border bg-duston-bg hover:bg-white text-duston-dark font-medium"
                >
                  Add column
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp push notifications toggle - Restricted strictly to EA role */}
          {user.role === "ea" && (
            <div className="pt-2 border-t border-duston-border flex items-center justify-between max-w-md">
              <div>
                <span className="text-duston-dark font-medium block">
                  WhatsApp push notifications
                </span>
                <span className="text-[11px] text-duston-muted">
                  Receive automated deadline and blocker alerts on registered phone
                </span>
              </div>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-duston-border text-[#023542] focus:ring-0"
              />
            </div>
          )}

          {/* Digest frequency */}
          <div className="max-w-md">
            <label className="block text-duston-dark font-medium mb-1">
              Executive digest frequency
            </label>
            <select
              value={digestFrequency}
              onChange={(e) => setDigestFrequency(e.target.value as any)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            >
              <option value="daily">Daily executive summary</option>
              <option value="weekly">Weekly consolidated summary</option>
              <option value="off">Off (manual access only)</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="max-w-md">
            <label className="block text-duston-dark font-medium mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            >
              <option value="Africa/Accra">Africa/Accra (GMT +00:00)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT +01:00)</option>
              <option value="Africa/Bamako">Africa/Bamako (GMT +00:00)</option>
              <option value="Africa/Dakar">Africa/Dakar (GMT +00:00)</option>
              <option value="Africa/Dar_es_Salaam">Africa/Dar es Salaam (EAT +03:00)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl font-medium transition-colors"
          >
            Save preferences
          </button>
        </form>
      )}

      {/* 2. Profile Tab */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-duston-muted mb-1 font-medium">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full bg-duston-bg border border-duston-border rounded-lg px-3 py-2 text-duston-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Executive title</label>
            <input
              type="text"
              disabled
              value={user.jobTitle || (user.role === "ceo" ? "CEO" : user.role === "ea" ? "EA, Office of the CEO" : "Executive")}
              className="w-full bg-duston-bg border border-duston-border rounded-lg px-3 py-2 text-duston-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Phone number (E.164 format)</label>
            <input
              type="text"
              placeholder="+233241234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Avatar image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl font-medium transition-colors"
          >
            Update profile
          </button>
        </form>
      )}

      {/* Calendar Sync Tab */}
      {activeTab === "calendar" && (
        <div className="space-y-6 max-w-xl">
          {calendarResult && (
            <div
              className={cn(
                "p-3 rounded-xl border flex items-start gap-2.5",
                calendarResult.success
                  ? "bg-[#39B54A]/10 border-[#39B54A]/30 text-[#023542]"
                  : "bg-duston-orange/10 border-duston-orange/30 text-duston-orange"
              )}
            >
              {calendarResult.success ? (
                <CheckCircle2 size={16} className="text-[#39B54A] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-duston-orange shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-xs">
                  {calendarResult.success ? "Sync Successful" : "Synchronization Error"}
                </div>
                <div className="text-[11px] mt-0.5 text-duston-dark/80">
                  {calendarResult.message || calendarResult.error}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-duston-border pb-3">
              <div>
                <h3 className="font-semibold text-duston-dark text-sm">
                  Outlook / iCal Feed Synchronization
                </h3>
                <p className="text-[11px] text-duston-muted mt-0.5">
                  Synchronize your meetings, location/venue, and attendees directly into the tracker
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!calendarUrl.trim()) return;
                setCalendarLoading(true);
                setCalendarResult(null);
                try {
                  const res = await syncCalendarFeed({
                    feedUrl: calendarUrl.trim(),
                    entityId: calendarEntityId,
                  });
                  setCalendarResult(res);
                  if (res.success && res.lastSyncedAt) {
                    setCalendarLastSynced(res.lastSyncedAt);
                    router.refresh();
                  }
                } catch (err: any) {
                  setCalendarResult({
                    success: false,
                    error: err.message || "Failed to sync calendar.",
                  });
                } finally {
                  setCalendarLoading(false);
                }
              }}
              className="space-y-4 pt-1"
            >
              <div>
                <label className="block text-duston-dark font-medium mb-1">
                  Private Outlook or iCal Subscription URL
                </label>
                <input
                  type="url"
                  placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics"
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2.5 text-xs text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE]"
                />
                <p className="text-[10px] text-duston-muted mt-1">
                  Obtained from Outlook Web &rarr; Settings &rarr; Calendar &rarr; Shared Calendars &rarr; Publish a calendar.
                </p>
              </div>

              {entities.length > 0 && (
                <div>
                  <label className="block text-duston-dark font-medium mb-1">
                    Default Subsidiary Entity for Imported Meetings
                  </label>
                  <select
                    value={calendarEntityId}
                    onChange={(e) => setCalendarEntityId(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {calendarLastSynced && (
                <div className="text-[11px] text-duston-muted flex items-center gap-1.5 pt-1">
                  <CheckCircle2 size={13} className="text-[#39B54A]" />
                  <span>Last synchronized: {new Date(calendarLastSynced).toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={calendarLoading || !calendarUrl.trim()}
                  className="px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-subtle disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={13} className={cn(calendarLoading && "animate-spin")} />
                  <span>{calendarLoading ? "Syncing Calendar..." : "Sync Calendar Now"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white border border-duston-border hover:border-[#023542] text-duston-dark rounded-xl text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Upload .ICS File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCalendarLoading(true);
                    setCalendarResult(null);
                    try {
                      const text = await file.text();
                      const res = await syncCalendarFeed({
                        icsContent: text,
                        entityId: calendarEntityId,
                      });
                      setCalendarResult(res);
                      if (res.success) router.refresh();
                    } catch (err: any) {
                      setCalendarResult({ success: false, error: "Failed to parse file." });
                    } finally {
                      setCalendarLoading(false);
                    }
                  }}
                />
              </div>
            </form>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-white border border-duston-border rounded-xl p-5 shadow-subtle space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-duston-dark">
                Connection Instructions
              </span>
              <button
                type="button"
                onClick={() => {
                  const guideText = `📅 *How to Connect Your Outlook Calendar to Duston Project Tracker*

1. Open Outlook on the web (https://outlook.office.com) or Outlook desktop.
2. Click the ⚙️ Settings icon > Calendar > Shared calendars.
3. Under Publish a calendar:
   - Select your primary Calendar
   - Set permissions to: "Can view all details"
   - Click Publish
4. Click on the ICS link and choose Copy link.
5. In Duston Project Tracker (Settings > Calendar Sync), paste the link and click Sync Calendar Now.`;
                  navigator.clipboard.writeText(guideText);
                  setCopiedGuide(true);
                  setTimeout(() => setCopiedGuide(false), 3000);
                }}
                className="px-2.5 py-1 bg-duston-bg border border-duston-border hover:border-[#023542] text-[#023542] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedGuide ? (
                  <>
                    <Check size={11} className="text-[#39B54A]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy Setup Guide</span>
                  </>
                )}
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-duston-muted leading-relaxed pl-1">
              <li>In Outlook on the web (<strong>outlook.office.com</strong>), click the <strong>⚙️ Settings</strong> icon.</li>
              <li>Select <strong>Calendar &rarr; Shared calendars</strong>.</li>
              <li>Under <strong>Publish a calendar</strong>, select your primary Calendar and choose <strong>Can view all details</strong>, then click <strong>Publish</strong>.</li>
              <li>Click the <strong>ICS link</strong> &rarr; <strong>Copy link</strong>, then paste it above.</li>
            </ol>
          </div>
        </div>
      )}

      {/* 3. Security Tab */}
      {activeTab === "security" && (
        <form onSubmit={handleChangePassword} className="bg-white border border-duston-border rounded-xl p-6 shadow-subtle space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-duston-muted mb-1 font-medium">Current password</label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">New password</label>
            <input
              type="password"
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Confirm new password</label>
            <input
              type="password"
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl font-medium transition-colors"
          >
            Change password
          </button>
        </form>
      )}
    </div>
  );
}
