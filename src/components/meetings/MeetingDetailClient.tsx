"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink, MapPin, Video } from "lucide-react";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";

interface MeetingDetailClientProps {
  meeting: {
    id: string;
    subject: string;
    meetingDate: string;
    venue?: string | null;
    isVirtual?: boolean | null;
    minutesDocUrl?: string | null;
    entityName: string;
    entityBrandColor: string;
    attendees: Array<{ id: string; name: string; email: string }>;
  };
  actionItems: Array<{
    id: string;
    title: string;
    projectName: string;
    assigneeName: string;
    deadline: string;
    status: string;
    priority: string;
  }>;
}

export function MeetingDetailClient({ meeting, actionItems }: MeetingDetailClientProps) {
  const { openActionItem } = useAppShell();

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-duston-muted">
        <Link href="/meetings" className="hover:text-duston-dark">
          Meetings
        </Link>
        <ChevronRight size={12} strokeWidth={1.5} />
        <span>{meeting.entityName}</span>
        <ChevronRight size={12} strokeWidth={1.5} />
        <span className="text-duston-dark font-medium truncate">{meeting.subject}</span>
      </nav>

      {/* Header Block */}
      <div className="bg-white border border-duston-border rounded-2xl p-6 shadow-subtle space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: meeting.entityBrandColor }}
              />
              <span className="text-xs font-medium text-duston-muted">
                {meeting.entityName}
              </span>
              <span className="text-duston-border">•</span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                meeting.isVirtual
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              )}>
                {meeting.isVirtual ? <Video size={10} /> : <MapPin size={10} />}
                <span>{meeting.isVirtual ? "Virtual" : "In-person"}</span>
              </span>
            </div>

            <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
              {meeting.subject}
            </h1>

            <div className="text-xs text-duston-muted flex flex-wrap items-center gap-3">
              <span>Date: {formatDate(meeting.meetingDate)}</span>
              {meeting.venue && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-duston-dark">
                    <MapPin size={12} className="text-duston-muted" />
                    <span>Venue: {meeting.venue}</span>
                  </span>
                </>
              )}
              <span>•</span>
              <span>{meeting.attendees.length} Attendees</span>
            </div>
          </div>

          {meeting.minutesDocUrl && (
            <a
              href={meeting.minutesDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-duston-border bg-duston-bg hover:bg-white text-duston-dark rounded-xl text-xs font-medium transition-colors shrink-0"
            >
              <span>Minutes document</span>
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          )}
        </div>

        {/* Attendees Stack */}
        <div className="border-t border-duston-border pt-4">
          <h3 className="text-xs font-medium text-duston-muted mb-2">Recorded attendees</h3>
          <div className="flex flex-wrap gap-2">
            {meeting.attendees.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-duston-bg border border-duston-border text-xs text-duston-dark"
              >
                <div className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[9px] font-medium">
                  {att.name.slice(0, 2).toUpperCase()}
                </div>
                <span>{att.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items Produced */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-duston-dark">
            Action items from this meeting ({actionItems.length})
          </h2>
          <span className="text-xs text-duston-muted">Click any item to edit in drawer</span>
        </div>

        {actionItems.length === 0 ? (
          <div className="bg-white border border-duston-border rounded-xl p-8 text-center shadow-subtle">
            <p className="text-xs text-duston-muted italic">
              No action items were registered from this meeting.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
            <table className="w-full min-w-[650px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Responsible Party</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {actionItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openActionItem(item.id)}
                    className="hover:bg-duston-bg cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-duston-dark">
                      {item.title}
                    </td>
                    <td className="py-3 px-4 text-duston-muted">
                      {item.projectName}
                    </td>
                    <td className="py-3 px-4 text-duston-dark">
                      {item.assigneeName}
                    </td>
                    <td className="py-3 px-4 text-duston-muted">
                      <span
                        className={cn(
                          isDeadlineOverdue(item.deadline, item.status) &&
                            "text-duston-orange font-medium"
                        )}
                      >
                        {formatDate(item.deadline)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-duston-bg border border-duston-border text-duston-text">
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
