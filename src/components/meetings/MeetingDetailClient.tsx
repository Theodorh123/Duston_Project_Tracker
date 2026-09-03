"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, MapPin, Video, Flag } from "lucide-react";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";
import { PriorityFlag } from "@/components/ui/PriorityFlag";

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
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "priority">("table");

  const priorityCounts = {
    critical: actionItems.filter((i) => i.priority === "critical" && i.status !== "done").length,
    high: actionItems.filter((i) => i.priority === "high" && i.status !== "done").length,
    medium: actionItems.filter((i) => i.priority === "medium" && i.status !== "done").length,
    low: actionItems.filter((i) => i.priority === "low" && i.status !== "done").length,
  };

  const filteredItems = actionItems.filter((i) => {
    if (selectedPriority !== "all" && i.priority !== selectedPriority) return false;
    return true;
  });

  const groupedByPriority = {
    critical: filteredItems.filter((i) => i.priority === "critical"),
    high: filteredItems.filter((i) => i.priority === "high"),
    medium: filteredItems.filter((i) => i.priority === "medium"),
    low: filteredItems.filter((i) => i.priority === "low"),
  };

  const renderActionItemRow = (item: (typeof actionItems)[0]) => (
    <tr
      key={item.id}
      onClick={() => openActionItem(item.id)}
      className="hover:bg-duston-bg cursor-pointer transition-colors"
    >
      <td className="py-3 px-4 font-medium text-duston-dark">{item.title}</td>
      <td className="py-3 px-4">
        <PriorityFlag priority={item.priority} />
      </td>
      <td className="py-3 px-4 text-duston-muted">{item.projectName}</td>
      <td className="py-3 px-4 text-duston-dark">{item.assigneeName}</td>
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
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-duston-dark">
              Action items from this meeting
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-duston-bg border border-duston-border text-[11px] font-medium text-duston-muted">
              {actionItems.length}
            </span>
          </div>

          {actionItems.length > 0 && (
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-duston-bg p-0.5 rounded-lg border border-duston-border">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                    viewMode === "table"
                      ? "bg-white text-duston-dark shadow-2xs font-semibold"
                      : "text-duston-muted hover:text-duston-dark"
                  )}
                >
                  Table View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("priority")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1",
                    viewMode === "priority"
                      ? "bg-white text-[#023542] shadow-2xs font-semibold"
                      : "text-duston-muted hover:text-duston-dark"
                  )}
                >
                  <Flag size={11} className="text-[#023542]" />
                  <span>By Priority</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Priority Quick Filter Bar */}
        {actionItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-duston-border rounded-xl px-3 py-2 text-xs shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-duston-muted flex items-center gap-1 shrink-0 mr-1">
                <Flag size={12} className="text-[#023542]" /> Priority filter:
              </span>
              {[
                { id: "all", label: "All" },
                { id: "critical", label: "Critical", count: priorityCounts.critical, dot: "bg-rose-500" },
                { id: "high", label: "High", count: priorityCounts.high, dot: "bg-amber-500" },
                { id: "medium", label: "Medium", count: priorityCounts.medium, dot: "bg-blue-500" },
                { id: "low", label: "Low", count: priorityCounts.low, dot: "bg-slate-400" },
              ].map((p) => {
                const isSelected = selectedPriority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPriority(p.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer",
                      isSelected
                        ? "bg-[#023542] text-white border-[#023542] shadow-xs"
                        : "bg-white border-duston-border text-duston-text hover:border-[#1BCECE]"
                    )}
                  >
                    {p.dot && <span className={cn("w-2 h-2 rounded-full shrink-0", p.dot)} />}
                    <span>{p.label}</span>
                    {p.count !== undefined && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-semibold",
                          isSelected ? "bg-white/20 text-white" : "bg-duston-bg text-duston-muted"
                        )}
                      >
                        {p.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedPriority !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedPriority("all")}
                className="text-[11px] text-duston-muted hover:text-duston-dark underline cursor-pointer"
              >
                Reset filter
              </button>
            )}
          </div>
        )}

        {actionItems.length === 0 ? (
          <div className="bg-white border border-duston-border rounded-xl p-8 text-center shadow-subtle">
            <p className="text-xs text-duston-muted italic">
              No action items were registered from this meeting.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-3 w-28">Priority</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Responsible Party</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {filteredItems.map(renderActionItemRow)}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grouped by Priority View */
          <div className="space-y-4">
            {[
              {
                level: "critical",
                title: "Critical Priority",
                subtitle: "Immediate attention required",
                items: groupedByPriority.critical,
                headerBg: "bg-rose-50/80 border-rose-200 text-rose-900",
                dotColor: "bg-rose-500",
                countBadge: "bg-rose-100 text-rose-800 border-rose-300",
              },
              {
                level: "high",
                title: "High Priority",
                subtitle: "Urgent deliverables",
                items: groupedByPriority.high,
                headerBg: "bg-amber-50/80 border-amber-200 text-amber-900",
                dotColor: "bg-amber-500",
                countBadge: "bg-amber-100 text-amber-800 border-amber-300",
              },
              {
                level: "medium",
                title: "Medium Priority",
                subtitle: "Standard deliverables",
                items: groupedByPriority.medium,
                headerBg: "bg-blue-50/70 border-blue-200 text-blue-900",
                dotColor: "bg-blue-500",
                countBadge: "bg-blue-100 text-blue-800 border-blue-300",
              },
              {
                level: "low",
                title: "Low Priority",
                subtitle: "Routine deliverables",
                items: groupedByPriority.low,
                headerBg: "bg-slate-50/80 border-slate-200 text-slate-900",
                dotColor: "bg-slate-400",
                countBadge: "bg-slate-100 text-slate-700 border-slate-300",
              },
            ].map((group) => (
              <div
                key={group.level}
                className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-hidden"
              >
                <div className={cn("p-3.5 border-b flex items-center justify-between", group.headerBg)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", group.dotColor)} />
                    <h3 className="text-xs font-semibold">{group.title}</h3>
                    <span className="text-[11px] opacity-75 hidden sm:inline">• {group.subtitle}</span>
                  </div>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", group.countBadge)}>
                    {group.items.length} {group.items.length === 1 ? "deliverable" : "deliverables"}
                  </span>
                </div>

                {group.items.length === 0 ? (
                  <div className="p-4 text-center text-xs text-duston-muted italic">
                    No {group.title.toLowerCase()} action items from this meeting.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-3 w-28">Priority</th>
                          <th className="py-3 px-4">Project</th>
                          <th className="py-3 px-4">Responsible Party</th>
                          <th className="py-3 px-4">Deadline</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-duston-border">
                        {group.items.map(renderActionItemRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
