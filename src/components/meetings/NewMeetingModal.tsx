"use client";

import { useState } from "react";
import { X, MapPin, Video } from "lucide-react";
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
  const [isVirtual, setIsVirtual] = useState(false);
  const [venue, setVenue] = useState("");
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
      venue: venue.trim() || undefined,
      isVirtual,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-duston-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
          <h2 className="text-sm font-semibold text-duston-dark">New meeting</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain">
          {error && (
            <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Subsidiary *</label>
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

          {/* Meeting Format & Venue */}
          <div className="space-y-2 pt-1">
            <label className="block text-duston-muted font-medium">Meeting format & venue</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsVirtual(false)}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  !isVirtual
                    ? "bg-[#023542] text-white border-[#023542]"
                    : "bg-white border-duston-border text-duston-text hover:bg-duston-bg"
                }`}
              >
                <MapPin size={14} strokeWidth={1.5} />
                <span className="font-medium">In-person</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVirtual(true)}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  isVirtual
                    ? "bg-[#023542] text-white border-[#023542]"
                    : "bg-white border-duston-border text-duston-text hover:bg-duston-bg"
                }`}
              >
                <Video size={14} strokeWidth={1.5} />
                <span className="font-medium">Virtual</span>
              </button>
            </div>

            <input
              type="text"
              placeholder={isVirtual ? "e.g. Microsoft Teams / Zoom link" : "e.g. MOSL Boardroom, Airport City HQ"}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE] mt-1"
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

          {/* Action Register */}
          <div className="pt-2 border-t border-duston-border">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-duston-dark font-medium">
                Action items register
              </label>
              <span className="text-[10px] text-duston-muted">Format: Item | Responsible | Deadline</span>
            </div>
            <textarea
              rows={3}
              value={rawActionRegister}
              onChange={(e) => setRawActionRegister(e.target.value)}
              placeholder="Submit draft term sheet to Stanbic | Theophilus | 2026-09-08&#10;Audit bunker barge safety certificates | William | 2026-09-12"
              className="w-full bg-white border border-duston-border rounded-xl p-3 text-duston-text outline-none focus:border-[#1BCECE] font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-t border-duston-border bg-duston-bg/40 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-duston-border text-duston-muted hover:text-duston-dark hover:bg-duston-bg text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shadow-subtle cursor-pointer"
          >
            {loading ? "Saving meeting..." : "Save meeting"}
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}
