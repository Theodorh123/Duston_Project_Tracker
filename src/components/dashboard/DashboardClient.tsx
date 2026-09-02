"use client";

import { useState } from "react";
import { useAppShell } from "../layout/AppShell";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  ListTodo,
  Columns3,
  Calendar,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn, formatDate, formatShortDate, isDeadlineOverdue } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ActionItemSummary {
  id: string;
  projectId: string;
  projectName: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  title: string;
  deadline: string;
  status: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority: "low" | "medium" | "high" | "critical";
  assigneeId: string;
  assigneeName: string;
}

export interface MeetingSummary {
  id: string;
  subject: string;
  entityName: string;
  meetingDate: string;
  attendeeCount: number;
}

export interface ActivitySummary {
  id: string;
  actorName: string;
  actionItemTitle: string;
  note?: string | null;
  createdAt: string;
}

interface DashboardClientProps {
  userName: string;
  initialItems: ActionItemSummary[];
  upcomingMeetings: MeetingSummary[];
  recentActivities: ActivitySummary[];
  defaultView?: "todo" | "kanban" | "planner";
  kanbanColumns?: string[];
}

export function DashboardClient({
  userName,
  initialItems,
  upcomingMeetings,
  recentActivities,
  defaultView = "todo",
  kanbanColumns = ["Backlog", "This Week", "In Progress", "Blocked", "Done"],
}: DashboardClientProps) {
  const { selectedEntityId, openActionItem } = useAppShell();
  const [currentView, setCurrentView] = useState<"todo" | "kanban" | "planner">(defaultView);
  const [items, setItems] = useState<ActionItemSummary[]>(initialItems);
  const router = useRouter();

  // Filter items by entity chip if selected
  const filteredItems = selectedEntityId
    ? items.filter((i) => i.entityId === selectedEntityId)
    : items;

  // Derive metrics
  const openCount = filteredItems.filter((i) => i.status !== "done").length;
  const overdueCount = filteredItems.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length;
  const todayStr = new Date().toISOString().split("T")[0];

  const dueThisWeekCount = filteredItems.filter((i) => {
    if (i.status === "done") return false;
    const itemDate = new Date(i.deadline);
    const diff = (itemDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  const completedCount = filteredItems.filter((i) => i.status === "done").length;

  const handleToggleDone = async (e: React.SyntheticEvent, itemId: string, currentStatus: string) => {
    e.stopPropagation();
    const newStatus = currentStatus === "done" ? "in_progress" : "done";
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: newStatus as any } : it))
    );

    await fetch(`/api/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  // Group items for Todo view: Overdue, Today, This Week, Later
  const groupedTodo = {
    overdue: filteredItems.filter((i) => isDeadlineOverdue(i.deadline, i.status)),
    today: filteredItems.filter((i) => !isDeadlineOverdue(i.deadline, i.status) && i.deadline === todayStr && i.status !== "done"),
    thisWeek: filteredItems.filter((i) => {
      if (isDeadlineOverdue(i.deadline, i.status) || i.deadline === todayStr || i.status === "done") return false;
      const itemDate = new Date(i.deadline);
      const diff = (itemDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return diff > 0 && diff <= 7;
    }),
    later: filteredItems.filter((i) => {
      if (i.status === "done" || isDeadlineOverdue(i.deadline, i.status)) return false;
      const itemDate = new Date(i.deadline);
      const diff = (itemDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return diff > 7;
    }),
  };

  const firstName = userName.split(" ")[0] || "User";

  return (
    <div className="space-y-6">
      {/* Executive Overview Hero Banner */}
      <div className="rounded-2xl bg-[#023542] text-white p-6 sm:p-8 border border-[#03446D] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flanelines-bg" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mb-3">
              Duston Project Tracker
            </h1>

            <p className="text-sm sm:text-[15px] text-gray-200/90 leading-relaxed">
              The internal command center for Duston Group. Track every project, action item, and meeting across MOSL, ICON Energy, Norva, Nova Mines, Duston Properties, Livon, and every other entity in the group — all in one place, so executives and their teams stay on top of every concurrent workstream.
            </p>
          </div>

          <div className="shrink-0 md:text-right border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <div className="text-[11px] uppercase tracking-wider text-[#1BCECE] font-medium">
              Signed In As
            </div>
            <div className="text-base font-medium text-white mt-0.5">
              {userName}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {openCount} active deliverable{openCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Rounded Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Open items */}
        <div className="bg-white border border-duston-border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle">
          <div className="text-xs font-medium text-duston-muted">Open items</div>
          <div className="text-2xl sm:text-3xl font-medium text-[#023542] mt-1.5 sm:mt-2">
            {openCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-duston-muted mt-1 truncate">Assigned to you</div>
        </div>

        {/* Overdue */}
        <div className="bg-white border border-duston-border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle">
          <div className="text-xs font-medium text-duston-muted">Overdue</div>
          <div className="text-2xl sm:text-3xl font-medium text-[#F15A24] mt-1.5 sm:mt-2">
            {overdueCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-duston-orange font-medium mt-1 truncate">
            Immediate action required
          </div>
        </div>

        {/* Due this week */}
        <div className="bg-white border border-duston-border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle">
          <div className="text-xs font-medium text-duston-muted">Due this week</div>
          <div className="text-2xl sm:text-3xl font-medium text-[#FBB03B] mt-1.5 sm:mt-2">
            {dueThisWeekCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-duston-muted mt-1 truncate">Next 7 calendar days</div>
        </div>

        {/* Completed this month */}
        <div className="bg-white border border-duston-border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle">
          <div className="text-xs font-medium text-duston-muted">Completed this month</div>
          <div className="text-2xl sm:text-3xl font-medium text-[#39B54A] mt-1.5 sm:mt-2">
            {completedCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#39B54A] font-medium mt-1 truncate">On schedule</div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* View Toggle Bar */}
          <div className="flex items-center justify-between bg-white border border-duston-border rounded-xl p-2 shadow-subtle">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentView("todo")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  currentView === "todo"
                    ? "bg-[#023542] text-white"
                    : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg"
                )}
              >
                <ListTodo size={15} strokeWidth={1.5} />
                <span>Todo</span>
              </button>
              <button
                onClick={() => setCurrentView("kanban")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  currentView === "kanban"
                    ? "bg-[#023542] text-white"
                    : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg"
                )}
              >
                <Columns3 size={15} strokeWidth={1.5} />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setCurrentView("planner")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  currentView === "planner"
                    ? "bg-[#023542] text-white"
                    : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg"
                )}
              >
                <Calendar size={15} strokeWidth={1.5} />
                <span>Planner</span>
              </button>
            </div>
            <span className="text-[11px] text-duston-muted pr-2 hidden sm:inline">
              Click any item to view details
            </span>
          </div>

          {/* View Contents */}
          {currentView === "todo" && (
            <div className="space-y-4">
              {/* Overdue Section */}
              {groupedTodo.overdue.length > 0 && (
                <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-duston-orange" />
                    <span className="text-xs font-medium text-duston-orange">
                      Overdue ({groupedTodo.overdue.length})
                    </span>
                  </div>
                  <div className="divide-y divide-duston-border">
                    {groupedTodo.overdue.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openActionItem(item.id)}
                        className="py-2.5 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.status === "done"}
                            onChange={(e) => handleToggleDone(e, item.id, item.status)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-medium text-duston-dark">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-duston-muted flex items-center gap-2 mt-0.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: item.entityBrandColor }}
                              />
                              <span>{item.entityName}</span>
                              <span>•</span>
                              <span>{item.projectName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-medium text-duston-orange bg-duston-orange/10 px-2 py-0.5 rounded">
                            {formatShortDate(item.deadline)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today Section */}
              {groupedTodo.today.length > 0 && (
                <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#1BCECE]" />
                    <span className="text-xs font-medium text-duston-dark">
                      Due today ({groupedTodo.today.length})
                    </span>
                  </div>
                  <div className="divide-y divide-duston-border">
                    {groupedTodo.today.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openActionItem(item.id)}
                        className="py-2.5 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.status === "done"}
                            onChange={(e) => handleToggleDone(e, item.id, item.status)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-medium text-duston-dark">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-duston-muted flex items-center gap-2 mt-0.5">
                              <span>{item.entityName}</span>
                              <span>•</span>
                              <span>{item.projectName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-duston-dark font-medium px-2 py-0.5 rounded bg-duston-bg border border-duston-border">
                          Today
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This Week Section */}
              <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-duston-amber" />
                  <span className="text-xs font-medium text-duston-dark">
                    Due this week ({groupedTodo.thisWeek.length})
                  </span>
                </div>
                {groupedTodo.thisWeek.length === 0 ? (
                  <p className="text-xs text-duston-muted italic py-2">
                    No further tasks due this week.
                  </p>
                ) : (
                  <div className="divide-y divide-duston-border">
                    {groupedTodo.thisWeek.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openActionItem(item.id)}
                        className="py-2.5 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.status === "done"}
                            onChange={(e) => handleToggleDone(e, item.id, item.status)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-medium text-duston-dark">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-duston-muted flex items-center gap-2 mt-0.5">
                              <span>{item.entityName}</span>
                              <span>•</span>
                              <span>{item.projectName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-duston-muted">
                          {formatShortDate(item.deadline)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Later Section */}
              {groupedTodo.later.length > 0 && (
                <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-duston-muted" />
                    <span className="text-xs font-medium text-duston-muted">
                      Later ({groupedTodo.later.length})
                    </span>
                  </div>
                  <div className="divide-y divide-duston-border">
                    {groupedTodo.later.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openActionItem(item.id)}
                        className="py-2.5 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.status === "done"}
                            onChange={(e) => handleToggleDone(e, item.id, item.status)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-medium text-duston-dark">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-duston-muted flex items-center gap-2 mt-0.5">
                              <span>{item.entityName}</span>
                              <span>•</span>
                              <span>{item.projectName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-duston-muted">
                          {formatShortDate(item.deadline)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kanban View */}
          {currentView === "kanban" && (
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
              {["To do", "In progress", "Done"].map((column) => {
                const colStatus =
                  column === "To do"
                    ? "not_started"
                    : column === "In progress"
                    ? "in_progress"
                    : "done";
                const colItems = filteredItems.filter((i) =>
                  colStatus === "in_progress"
                    ? i.status === "in_progress" || i.status === "blocked"
                    : i.status === colStatus
                );

                return (
                  <div
                    key={column}
                    className="w-[82vw] sm:w-[320px] md:w-auto shrink-0 snap-center md:shrink bg-duston-bg/60 border border-duston-border rounded-xl p-3.5 flex flex-col space-y-3 min-h-[320px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-duston-dark">
                        {column}
                      </span>
                      <span className="text-[10px] text-duston-muted font-medium bg-white px-2 py-0.5 rounded-full border border-duston-border">
                        {colItems.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {colItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => openActionItem(item.id)}
                          className="p-3 bg-white border border-duston-border rounded-lg shadow-subtle hover:border-[#1BCECE] cursor-pointer transition-colors space-y-2"
                        >
                          <div className="text-xs font-medium text-duston-dark line-clamp-2">
                            {item.title}
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                backgroundColor: `${item.entityBrandColor}15`,
                                color: item.entityBrandColor,
                              }}
                            >
                              {item.entityName}
                            </span>
                            <span
                              className={cn(
                                "text-[10px]",
                                isDeadlineOverdue(item.deadline, item.status)
                                  ? "text-duston-orange font-medium"
                                  : "text-duston-muted"
                              )}
                            >
                              {formatShortDate(item.deadline)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Planner View (7-day calendar) */}
          {currentView === "planner" && (
            <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle space-y-4">
              <div className="text-xs font-medium text-duston-dark">
                Upcoming 7 Days Planner
              </div>
              <div className="overflow-x-auto pb-2 no-scrollbar">
                <div className="min-w-[580px] md:min-w-0 grid grid-cols-7 gap-2 text-center text-xs">
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() + idx);
                    const dStr = d.toISOString().split("T")[0];
                    const dayItems = filteredItems.filter((i) => i.deadline === dStr);
                    const isCurToday = idx === 0;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-2 rounded-xl border min-h-[140px] flex flex-col",
                          isCurToday
                            ? "border-[#1BCECE] bg-[#1BCECE]/5"
                            : "border-duston-border bg-duston-bg/40"
                        )}
                      >
                        <div className="text-[10px] text-duston-muted uppercase">
                          {d.toLocaleDateString("en-US", { weekday: "narrow" })}
                        </div>
                        <div className="text-xs font-medium text-duston-dark mb-2">
                          {d.getDate()}
                        </div>
                        <div className="flex-1 space-y-1">
                          {dayItems.map((it) => (
                            <div
                              key={it.id}
                              onClick={() => openActionItem(it.id)}
                              className="p-1 rounded bg-white border border-duston-border text-[10px] text-left truncate cursor-pointer hover:border-[#1BCECE]"
                              title={it.title}
                            >
                              {it.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width): Upcoming Meetings & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming Meetings Card */}
          <div className="bg-white border border-duston-border rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4 border-b border-duston-border pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} strokeWidth={1.5} className="text-[#023542]" />
                <h2 className="text-xs font-medium text-duston-dark">
                  Upcoming meetings (7 days)
                </h2>
              </div>
              <Link
                href="/meetings"
                className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-medium"
              >
                View all
              </Link>
            </div>

            {upcomingMeetings.length === 0 ? (
              <p className="text-xs text-duston-muted italic py-3 text-center">
                No meetings scheduled this week.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="block p-3 rounded-xl border border-duston-border hover:border-[#1BCECE] hover:bg-duston-bg transition-colors"
                  >
                    <div className="text-xs font-medium text-duston-dark line-clamp-1">
                      {m.subject}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-duston-muted mt-1.5">
                      <span>{m.entityName}</span>
                      <span>{formatShortDate(m.meetingDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white border border-duston-border rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4 border-b border-duston-border pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} strokeWidth={1.5} className="text-[#023542]" />
                <h2 className="text-xs font-medium text-duston-dark">
                  Recent activity
                </h2>
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-duston-muted italic py-3 text-center">
                No recent activity logged.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 8).map((act) => (
                  <div key={act.id} className="text-xs space-y-0.5 border-b border-duston-border/60 pb-2.5 last:border-0 last:pb-0">
                    <div className="text-duston-dark font-medium leading-tight">
                      {act.actorName}{" "}
                      <span className="text-duston-muted font-normal">
                        {act.note || "updated an action item"}
                      </span>
                    </div>
                    <div className="text-[10px] text-duston-muted">
                      {formatDate(act.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
