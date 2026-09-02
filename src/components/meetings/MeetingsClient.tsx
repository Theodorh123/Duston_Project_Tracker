"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Users, ExternalLink, CalendarDays } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { NewMeetingModal } from "./NewMeetingModal";
import { useAppShell } from "../layout/AppShell";

export interface MeetingListItem {
  id: string;
  subject: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  meetingDate: string;
  minutesDocUrl?: string | null;
  attendees: Array<{ id: string; name: string }>;
  actionItemsProducedCount: number;
}

interface MeetingsClientProps {
  meetings: MeetingListItem[];
  entities: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

export function MeetingsClient({
  meetings,
  entities,
  users,
  currentUserId,
}: MeetingsClientProps) {
  const router = useRouter();
  const { selectedEntityId } = useAppShell();
  const [selectedAttendee, setSelectedAttendee] = useState<string>("all");
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedEntityId && m.entityId !== selectedEntityId) return false;
      if (selectedAttendee !== "all" && !m.attendees.some((a) => a.id === selectedAttendee)) return false;
      return true;
    });
  }, [meetings, selectedEntityId, selectedAttendee]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
            Meetings
          </h1>
          <p className="text-xs text-duston-muted mt-1">
            Track executive proceedings, attendee registers, and action items produced
          </p>
        </div>
        <button
          onClick={() => setIsNewMeetingOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-subtle self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={1.5} />
          <span>New meeting</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-duston-muted font-medium">Filter attendee:</span>
          <select
            value={selectedAttendee}
            onChange={(e) => setSelectedAttendee(e.target.value)}
            className="bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
          >
            <option value="all">All attendees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Meetings List */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-white border border-duston-border rounded-xl p-12 text-center shadow-subtle">
          <CalendarDays size={32} strokeWidth={1.5} className="mx-auto text-duston-muted mb-3" />
          <h3 className="text-sm font-medium text-duston-dark">No meetings found</h3>
          <p className="text-xs text-duston-muted mt-1 max-w-sm mx-auto">
            Schedule a meeting or import action items using the New Meeting button above.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Attendees</th>
                <th className="py-3 px-4 text-right">Action items produced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-duston-border">
              {filteredMeetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className="hover:bg-duston-bg cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-duston-dark">
                    {meeting.subject}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${meeting.entityBrandColor}15`,
                        color: meeting.entityBrandColor,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: meeting.entityBrandColor }}
                      />
                      <span>{meeting.entityName}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-duston-muted">
                    {formatDate(meeting.meetingDate)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {meeting.attendees.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#023542] text-white flex items-center justify-center text-[9px] font-medium"
                            title={a.name}
                          >
                            {a.name.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      {meeting.attendees.length > 3 && (
                        <span className="text-[11px] text-duston-muted pl-1">
                          +{meeting.attendees.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-duston-dark">
                    {meeting.actionItemsProducedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Meeting Modal */}
      <NewMeetingModal
        isOpen={isNewMeetingOpen}
        onClose={() => setIsNewMeetingOpen(false)}
        entities={entities}
        users={users}
        currentUserId={currentUserId}
      />
    </div>
  );
}
