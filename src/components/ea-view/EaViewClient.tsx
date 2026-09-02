"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Calendar,
  Clock,
  Send,
  UserCheck,
  CalendarClock,
  Sparkles,
  ChevronRight,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn, formatDate, formatShortDate, getDaysOverdue, getPriorityWeight } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";
import { updateActionItemField } from "@/lib/actions/action-items";

export interface QueueItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  assigneeId: string;
  assigneeName: string;
  assigneePhone?: string | null;
  deadline: string;
  priority: string;
  status: string;
  daysOverdue?: number;
  score?: number;
  updatedAt: string;
}

export interface EntitySummaryCard {
  id: string;
  name: string;
  brandPrimaryColor: string;
  openCount: number;
  inProgressCount: number;
  blockedCount: number;
  overdueCount: number;
}

export interface UpcomingMeetingWithPrep {
  id: string;
  subject: string;
  meetingDate: string;
  entityName: string;
  attendees: Array<{
    id: string;
    name: string;
    openActionItems: Array<{ id: string; title: string; deadline: string }>;
  }>;
}

interface EaViewClientProps {
  overdueQueue: QueueItem[];
  chaseUpQueue: QueueItem[];
  entitySummaries: EntitySummaryCard[];
  upcomingMeetings: UpcomingMeetingWithPrep[];
  entities: Array<{ id: string; name: string }>;
}

export function EaViewClient({
  overdueQueue,
  chaseUpQueue,
  entitySummaries,
  upcomingMeetings,
  entities,
}: EaViewClientProps) {
  const router = useRouter();
  const { openActionItem, setSelectedEntityId } = useAppShell();
  const [selectedMeetingForPrep, setSelectedMeetingForPrep] = useState<UpcomingMeetingWithPrep | null>(null);
  const [selectedEntityForBrief, setSelectedEntityForBrief] = useState(entities[0]?.id || "");
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null);
  const [nudgeStatus, setNudgeStatus] = useState<Record<string, string>>({});

  const handleNudgeWhatsApp = async (e: React.MouseEvent, item: QueueItem) => {
    e.stopPropagation();
    setNudgeStatus((prev) => ({ ...prev, [item.id]: "Nudging..." }));

    try {
      await fetch("/api/whatsapp/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: item.assigneeId,
          actionItemId: item.id,
          message: `Duston EA Reminder: Action item "${item.title}" for ${item.projectName} is overdue. Please provide an update.`,
        }),
      });
      setNudgeStatus((prev) => ({ ...prev, [item.id]: "WhatsApp Sent" }));
    } catch {
      setNudgeStatus((prev) => ({ ...prev, [item.id]: "Error" }));
    }
  };

  const handlePostpone = async (e: React.MouseEvent, item: QueueItem) => {
    e.stopPropagation();
    const newDeadline = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    await updateActionItemField(item.id, "deadline", newDeadline);
    router.refresh();
  };

  const handleGenerateBrief = () => {
    const ent = entitySummaries.find((e) => e.id === selectedEntityForBrief) || entitySummaries[0];
    if (!ent) return;

    const brief = `### Executive Summary Brief: ${ent.name}
**Generated:** ${new Date().toLocaleDateString("en-US", { dateStyle: "full" })}

**Current Operational Health:**
- **Open Deliverables:** ${ent.openCount} items active across operations.
- **In Progress:** ${ent.inProgressCount} workstreams currently advancing.
- **Blocked Workstreams:** ${ent.blockedCount} critical bottleneck(s) requiring executive intervention.
- **Overdue Items:** ${ent.overdueCount} item(s) past target SLA.

**Key Focus Areas & Directives:**
1. Prioritize resolution of the ${ent.blockedCount > 0 ? ent.blockedCount : "zero"} blocked items affecting critical paths.
2. Ensure syndication, regulatory compliance, and partner clearances meet quarterly targets.
3. Review attendee prep packs before scheduled committee reviews this fortnight.`;

    setGeneratedBrief(brief);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#023542] text-white">
            EA Command Center
          </span>
        </div>
        <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
          Executive Assistant View
        </h1>
        <p className="text-xs text-duston-muted mt-1">
          Cross-entity oversight, overdue enforcement queues, meeting preparation, and executive briefings
        </p>
      </div>

      {/* 1. Overdue Queue */}
      <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-duston-border pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} strokeWidth={1.5} className="text-duston-orange" />
            <h2 className="text-sm font-medium text-duston-dark">
              Overdue queue (Ranked by Risk Score)
            </h2>
          </div>
          <span className="text-xs text-duston-orange font-medium">
            {overdueQueue.length} items overdue
          </span>
        </div>

        {overdueQueue.length === 0 ? (
          <p className="text-xs text-[#39B54A] font-medium py-3 text-center">
            No overdue items across active subsidiaries.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Days overdue</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3 text-right">Quick actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {overdueQueue.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openActionItem(item.id)}
                    className="hover:bg-duston-bg group cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-duston-dark max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3 px-3 text-duston-muted max-w-[160px] truncate">
                      {item.projectName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${item.entityBrandColor}15`,
                          color: item.entityBrandColor,
                        }}
                      >
                        {item.entityName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-duston-dark">
                      {item.assigneeName}
                    </td>
                    <td className="py-3 px-3 font-medium text-duston-orange">
                      +{item.daysOverdue} days
                    </td>
                    <td className="py-3 px-3 capitalize font-medium text-duston-orange">
                      {item.priority}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleNudgeWhatsApp(e, item)}
                          className="px-2 py-1 rounded bg-[#1BCECE]/10 hover:bg-[#1BCECE]/20 text-[#023542] text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Send WhatsApp Nudge"
                        >
                          <Send size={12} strokeWidth={1.5} />
                          <span>{nudgeStatus[item.id] || "Nudge"}</span>
                        </button>
                        <button
                          onClick={(e) => handlePostpone(e, item)}
                          className="px-2 py-1 rounded bg-duston-bg hover:bg-duston-border text-duston-muted text-[11px] font-medium transition-colors"
                          title="Postpone +7 days"
                        >
                          +7d
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Chase-up Queue (due within 7 days, updated >48h ago) */}
      <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-duston-border pb-3">
          <div className="flex items-center gap-2">
            <CalendarClock size={18} strokeWidth={1.5} className="text-duston-amber" />
            <h2 className="text-sm font-medium text-duston-dark">
              Chase-up queue (Due within 7 days, stagnant &gt;48 hrs)
            </h2>
          </div>
          <span className="text-xs text-duston-muted">
            {chaseUpQueue.length} items to chase
          </span>
        </div>

        {chaseUpQueue.length === 0 ? (
          <p className="text-xs text-duston-muted italic py-3 text-center">
            All items due this week have been actively updated in the last 48 hours.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Deadline</th>
                  <th className="py-2.5 px-3 text-right">Quick action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {chaseUpQueue.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openActionItem(item.id)}
                    className="hover:bg-duston-bg group cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-duston-dark max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3 px-3 text-duston-muted max-w-[160px] truncate">
                      {item.projectName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: `${item.entityBrandColor}15`,
                          color: item.entityBrandColor,
                        }}
                      >
                        {item.entityName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-duston-dark">
                      {item.assigneeName}
                    </td>
                    <td className="py-3 px-3 text-duston-amber font-medium">
                      {formatShortDate(item.deadline)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => handleNudgeWhatsApp(e, item)}
                        className="px-2 py-1 rounded bg-[#1BCECE]/10 hover:bg-[#1BCECE]/20 text-[#023542] text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <Send size={12} strokeWidth={1.5} />
                        <span>{nudgeStatus[item.id] || "Nudge"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. By Entity Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-duston-dark">
          Health by subsidiary entity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {entitySummaries.map((ent) => (
            <div
              key={ent.id}
              onClick={() => {
                setSelectedEntityId(ent.id);
                router.push("/projects");
              }}
              className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle hover:border-[#1BCECE] cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: ent.brandPrimaryColor }}
                  />
                  <h3 className="font-medium text-duston-dark text-xs truncate">
                    {ent.name}
                  </h3>
                </div>
                <ChevronRight size={14} strokeWidth={1.5} className="text-duston-muted" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-duston-border/60">
                <div>
                  <span className="text-duston-muted block">Open:</span>
                  <strong className="font-medium text-duston-dark">{ent.openCount}</strong>
                </div>
                <div>
                  <span className="text-duston-muted block">In progress:</span>
                  <strong className="font-medium text-duston-dark">{ent.inProgressCount}</strong>
                </div>
                <div>
                  <span className="text-duston-muted block">Blocked:</span>
                  <strong className="font-medium text-duston-orange">{ent.blockedCount}</strong>
                </div>
                <div>
                  <span className="text-duston-muted block">Overdue:</span>
                  <strong className="font-medium text-duston-orange">{ent.overdueCount}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Upcoming Meetings & Prep Panel */}
      <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-duston-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} strokeWidth={1.5} className="text-[#023542]" />
            <h2 className="text-sm font-medium text-duston-dark">
              Upcoming meetings (14 days) & Prep Pack
            </h2>
          </div>
          <span className="text-xs text-duston-muted">
            {upcomingMeetings.length} meetings scheduled
          </span>
        </div>

        {upcomingMeetings.length === 0 ? (
          <p className="text-xs text-duston-muted italic py-3 text-center">
            No upcoming meetings in the next 14 days.
          </p>
        ) : (
          <div className="divide-y divide-duston-border">
            {upcomingMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="py-3 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg transition-colors text-xs"
              >
                <div>
                  <div className="font-medium text-duston-dark">{meeting.subject}</div>
                  <div className="text-[11px] text-duston-muted mt-0.5">
                    {meeting.entityName} • {formatDate(meeting.meetingDate)} • {meeting.attendees.length} attendees
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMeetingForPrep(meeting)}
                  className="px-3 py-1.5 rounded-lg border border-duston-border bg-white hover:bg-duston-bg text-duston-dark font-medium transition-colors"
                >
                  Prep panel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Generate Executive Brief */}
      <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-duston-border pb-3">
          <Sparkles size={18} strokeWidth={1.5} className="text-[#1BCECE]" />
          <h2 className="text-sm font-medium text-duston-dark">
            Generate executive brief
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
          <div className="flex-1">
            <select
              value={selectedEntityForBrief}
              onChange={(e) => setSelectedEntityForBrief(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            >
              {entities.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateBrief}
            className="px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg font-medium transition-colors shrink-0"
          >
            Generate brief
          </button>
        </div>

        {generatedBrief && (
          <div className="p-4 bg-duston-bg border border-duston-border rounded-xl text-xs text-duston-text space-y-2 whitespace-pre-wrap leading-relaxed font-sans">
            {generatedBrief}
          </div>
        )}
      </div>

      {/* Prep Panel Slide-in Sheet */}
      {selectedMeetingForPrep && (
        <>
          <div
            onClick={() => setSelectedMeetingForPrep(null)}
            className="fixed inset-0 bg-black/30 z-50"
          />
          <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white border-l border-duston-border z-50 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-duston-border flex items-center justify-between bg-duston-bg/60">
              <div>
                <h3 className="text-xs font-medium text-duston-muted">Meeting Prep Pack</h3>
                <div className="text-sm font-medium text-duston-dark truncate max-w-xs">
                  {selectedMeetingForPrep.subject}
                </div>
              </div>
              <button
                onClick={() => setSelectedMeetingForPrep(null)}
                className="p-1.5 rounded text-duston-muted hover:text-duston-dark"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <p className="text-duston-muted">
                Review outstanding action items for each attendee to prepare the chair for accountability checks:
              </p>

              {selectedMeetingForPrep.attendees.map((att) => (
                <div key={att.id} className="border border-duston-border rounded-xl p-4 bg-duston-bg/30 space-y-2">
                  <div className="flex items-center justify-between font-medium text-duston-dark">
                    <span>{att.name}</span>
                    <span className="text-[11px] text-duston-muted font-normal">
                      {att.openActionItems.length} open items
                    </span>
                  </div>

                  {att.openActionItems.length === 0 ? (
                    <div className="text-[11px] text-[#39B54A]">No open items pending.</div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {att.openActionItems.map((ai) => (
                        <div
                          key={ai.id}
                          onClick={() => {
                            setSelectedMeetingForPrep(null);
                            openActionItem(ai.id);
                          }}
                          className="p-2 rounded bg-white border border-duston-border flex items-center justify-between hover:border-[#1BCECE] cursor-pointer"
                        >
                          <span className="truncate pr-2">{ai.title}</span>
                          <span className="text-[10px] text-duston-orange shrink-0">
                            Due {formatShortDate(ai.deadline)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
