"use client";

import { useState } from "react";
import { X, Calendar, Users, FileText } from "lucide-react";
import { createMeeting } from "@/lib/actions/meetings";

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

export function NewMeetingModal({
  isOpen,
  onClose,
  entities,
  users,
  currentUserId,
}: NewMeetingModalProps) {
  const [entityId, setEntityId] = useState(entities[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [minutesDocUrl, setMinutesDocUrl] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([currentUserId]);
  const [rawActionRegister, setRawActionRegister] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createMeeting({
      entityId,
      subject: subject.trim(),
      meetingDate,
      minutesDocUrl: minutesDocUrl.trim() || undefined,
      attendeeUserIds: selectedAttendees,
      createdBy: currentUserId,
      rawActionRegister: rawActionRegister.trim() || undefined,
    });

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to record meeting");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-duston-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-duston-border flex items-center justify-between bg-duston-bg/60">
          <h2 className="text-sm font-medium text-duston-dark">New meeting</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-duston-muted hover:text-duston-dark"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Entity *</label>
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                required
              >
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-duston-muted mb-1 font-medium">Meeting date *</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Subject / Meeting title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 MOSL Board Review"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Minutes doc URL (Google Drive / SharePoint)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/open?id=..."
              value={minutesDocUrl}
              onChange={(e) => setMinutesDocUrl(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          {/* Attendees multi-select */}
          <div>
            <label className="block text-duston-muted mb-1 font-medium">Attendees</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 border border-duston-border rounded-xl bg-duston-bg/40">
              {users.map((u) => {
                const isSelected = selectedAttendees.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAttendee(u.id)}
                      className="rounded border-duston-border text-[#023542] focus:ring-0"
                    />
                    <span className="text-duston-dark truncate">{u.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Critical Feature: Paste Action Register */}
          <div className="pt-2 border-t border-duston-border">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-duston-dark font-medium">
                Paste action register (Bulk import)
              </label>
              <span className="text-[10px] text-[#1BCECE] font-medium">Pipe or tab delimited</span>
            </div>
            <p className="text-[11px] text-duston-muted mb-2">
              Paste action items from meeting notes to generate action items automatically.
            </p>
            <textarea
              rows={4}
              value={rawActionRegister}
              onChange={(e) => setRawActionRegister(e.target.value)}
              placeholder="Item | Responsible party | Deadline (YYYY-MM-DD)&#10;Submit draft term sheet to Stanbic | Theophilus | 2026-09-08&#10;Audit bunker barge safety certificates | md@duston.com | 2026-09-12"
              className="w-full bg-white border border-duston-border rounded-xl p-3 text-duston-text outline-none focus:border-[#1BCECE] font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>

          <div className="pt-3 border-t border-duston-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-duston-border text-duston-text hover:bg-duston-bg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Saving meeting..." : "Save meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
