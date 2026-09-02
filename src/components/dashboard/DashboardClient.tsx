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
  MapPin,
  Video,
  Plus,
  X,
} from "lucide-react";
import { cn, formatDate, formatShortDate, isDeadlineOverdue } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createActionItem } from "@/lib/actions/action-items";

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
  venue?: string | null;
  isVirtual?: boolean | null;
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
  projects?: Array<{ id: string; name: string; entityName: string; entityBrandColor?: string }>;
  users?: Array<{ id: string; name: string }>;
  currentUserId?: string;
  initialFilter?: "all" | "open" | "overdue" | "due_this_week" | "completed";
}

export function DashboardClient({
  userName,
  initialItems,
  upcomingMeetings,
  recentActivities,
  defaultView = "todo",
  kanbanColumns = ["Backlog", "This Week", "In Progress", "Blocked", "Done"],
  projects = [],
  users = [],
  currentUserId,
  initialFilter = "all",
}: DashboardClientProps) {
  const { selectedEntityId, openActionItem } = useAppShell();
  const [currentView, setCurrentView] = useState<"todo" | "kanban" | "planner">(defaultView);
  const [items, setItems] = useState<ActionItemSummary[]>(initialItems);
  const router = useRouter();

  // Active metric filter state (open, overdue, due_this_week, completed, all)
  const [metricFilter, setMetricFilter] = useState<"all" | "open" | "overdue" | "due_this_week" | "completed">(
    ["open", "overdue", "due_this_week", "completed"].includes(initialFilter as any)
      ? (initialFilter as any)
      : "all"
  );

  const handleSelectMetric = (filterKey: "open" | "overdue" | "due_this_week" | "completed") => {
    const nextFilter = metricFilter === filterKey ? "all" : filterKey;
    setMetricFilter(nextFilter);
    router.replace(nextFilter === "all" ? "/" : `/?filter=${nextFilter}`, { scroll: false });
    // Smooth scroll down to tasks view container
    setTimeout(() => {
      const el = document.getElementById("tasks-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  // Filter items by entity chip if selected
  const filteredItems = selectedEntityId
    ? items.filter((i) => i.entityId === selectedEntityId)
    : items;

  // Derive metrics across all entity-filtered items
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

  // Drag & drop state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragOverPlannerDate, setDragOverPlannerDate] = useState<string | null>(null);

  // Quick Add Task modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddProjectId, setQuickAddProjectId] = useState(projects[0]?.id || "");
  const [quickAddAssigneeId, setQuickAddAssigneeId] = useState(currentUserId || users[0]?.id || "");
  const [quickAddColumn, setQuickAddColumn] = useState<"todo" | "in_progress" | "done">("todo");
  const [quickAddDeadline, setQuickAddDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [quickAddPriority, setQuickAddPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  const handleOpenQuickAdd = (targetCol: "todo" | "in_progress" | "done") => {
    setQuickAddColumn(targetCol);
    const today = new Date().toISOString().split("T")[0];
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    if (targetCol === "todo") {
      setQuickAddDeadline(in7Days);
    } else if (targetCol === "in_progress") {
      setQuickAddDeadline(in3Days);
    } else if (targetCol === "done") {
      setQuickAddDeadline(today);
    }
    setIsQuickAddOpen(true);
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAddProjectId) return;

    setIsSubmittingQuickAdd(true);

    const targetStatus =
      quickAddColumn === "done"
        ? "done"
        : quickAddColumn === "in_progress"
        ? "in_progress"
        : "not_started";

    const selectedProj = projects.find((p) => p.id === quickAddProjectId);
    const selectedUser = users.find((u) => u.id === quickAddAssigneeId);

    const res = await createActionItem({
      projectId: quickAddProjectId,
      title: quickAddTitle.trim(),
      assigneeId: quickAddAssigneeId || currentUserId || "00000000-0000-0000-0000-000000000000",
      deadline: quickAddDeadline,
      status: targetStatus,
      priority: quickAddPriority,
      createdBy: currentUserId || quickAddAssigneeId || "00000000-0000-0000-0000-000000000000",
    });

    if (res.success && res.item) {
      setItems((prev) => [
        {
          id: res.item.id,
          projectId: res.item.projectId,
          projectName: selectedProj?.name || "Project",
          entityId: "",
          entityName: selectedProj?.entityName || "Subsidiary",
          entityBrandColor: selectedProj?.entityBrandColor || "#023542",
          title: res.item.title,
          deadline: res.item.deadline,
          status: res.item.status as any,
          priority: res.item.priority as any,
          assigneeId: res.item.assigneeId,
          assigneeName: selectedUser?.name || userName,
        },
        ...prev,
      ]);

      setQuickAddTitle("");
      setIsQuickAddOpen(false);
      router.refresh();
    }
    setIsSubmittingQuickAdd(false);
  };

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

  const handleDropItem = async (
    itemId: string,
    targetCol: "todo" | "in_progress" | "done"
  ) => {
    setDragOverCol(null);
    setDraggingItemId(null);

    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;

    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    let newStatus = targetItem.status;
    let newDeadline = targetItem.deadline;

    if (targetCol === "done") {
      newStatus = "done";
    } else if (targetCol === "in_progress") {
      newStatus = "in_progress";
      if (isDeadlineOverdue(targetItem.deadline, targetItem.status)) {
        newDeadline = in3Days;
      }
    } else if (targetCol === "todo") {
      newStatus = "not_started";
      if (isDeadlineOverdue(targetItem.deadline, targetItem.status)) {
        newDeadline = in7Days;
      }
    }

    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, status: newStatus as any, deadline: newDeadline } : it
      )
    );

    try {
      await fetch(`/api/action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, deadline: newDeadline }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update status on drop:", err);
    }
  };

  const handleDropPlannerDate = async (itemId: string, newDateStr: string) => {
    setDragOverPlannerDate(null);
    setDraggingItemId(null);

    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;
    if (targetItem.deadline === newDateStr) return;

    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, deadline: newDateStr } : it))
    );

    try {
      await fetch(`/api/action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: newDateStr }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update deadline on drop:", err);
    }
  };

  // Filter items based on active metric filter
  const displayedItems = filteredItems.filter((i) => {
    if (metricFilter === "open") return i.status !== "done";
    if (metricFilter === "overdue") return isDeadlineOverdue(i.deadline, i.status) && i.status !== "done";
    if (metricFilter === "due_this_week") {
      if (i.status === "done") return false;
      const itemDate = new Date(i.deadline);
      const diff = (itemDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return diff >= 0 && diff <= 7;
    }
    if (metricFilter === "completed") return i.status === "done";
    return true;
  });

  // Group items for Todo view: Overdue, Today, This Week, Later, Completed
  const groupedTodo = {
    overdue: displayedItems.filter((i) => isDeadlineOverdue(i.deadline, i.status) && i.status !== "done"),
    today: displayedItems.filter((i) => !isDeadlineOverdue(i.deadline, i.status) && i.deadline === todayStr && i.status !== "done"),
    thisWeek: displayedItems.filter((i) => {
      if (isDeadlineOverdue(i.deadline, i.status) || i.deadline === todayStr || i.status === "done") return false;
      const itemDate = new Date(i.deadline);
      const diff = (itemDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return diff > 0 && diff <= 7;
    }),
    later: displayedItems.filter((i) => {
      if (i.status === "done" || isDeadlineOverdue(i.deadline, i.status)) return false;
      const itemDate = new Date(i.deadline);
      const diff = (itemDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
      return diff > 7;
    }),
    completed: displayedItems.filter((i) => i.status === "done"),
  };

  const firstName = userName.split(" ")[0] || "User";

  return (
    <div className="space-y-6">
      {/* Executive Overview Hero Banner */}
      <div className="rounded-2xl bg-[#023542] text-white p-6 sm:p-8 border border-[#03446D] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flanelines-bg" />

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mb-3">
            Duston Project Tracker
          </h1>

          <p className="text-sm sm:text-[15px] text-gray-200/90 leading-relaxed">
            The internal command center for Duston Group. Track every project, action item, and meeting across MOSL, ICON Energy, Norva, Nova Mines, Duston Properties, Livon, and every other entity in the group — all in one place, so executives and their teams stay on top of every concurrent workstream.
          </p>
        </div>
      </div>

      {/* 4 Rounded Interactive Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Open items */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMetric("open")}
          className={cn(
            "bg-white border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md group select-none",
            metricFilter === "open"
              ? "ring-2 ring-[#023542] border-[#023542] bg-[#023542]/5 shadow-sm"
              : "border-duston-border hover:border-[#023542]"
          )}
          title="Click to view all open items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-duston-muted group-hover:text-duston-dark transition-colors">
              Open items
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "transition-all",
                metricFilter === "open"
                  ? "text-[#023542] rotate-90"
                  : "text-duston-muted/50 group-hover:text-[#023542] group-hover:translate-x-0.5"
              )}
            />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-[#023542] mt-1.5 sm:mt-2">
            {openCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-duston-muted mt-1 truncate">
            Active pending workstreams
          </div>
        </div>

        {/* Overdue */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMetric("overdue")}
          className={cn(
            "bg-white border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md group select-none",
            metricFilter === "overdue"
              ? "ring-2 ring-[#F15A24] border-[#F15A24] bg-[#F15A24]/5 shadow-sm"
              : "border-duston-border hover:border-[#F15A24]"
          )}
          title="Click to view overdue items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-duston-muted group-hover:text-duston-orange transition-colors">
              Overdue
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "transition-all",
                metricFilter === "overdue"
                  ? "text-duston-orange rotate-90"
                  : "text-duston-muted/50 group-hover:text-duston-orange group-hover:translate-x-0.5"
              )}
            />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-[#F15A24] mt-1.5 sm:mt-2">
            {overdueCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-duston-orange font-medium mt-1 truncate">
            Immediate action required
          </div>
        </div>

        {/* Due this week */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMetric("due_this_week")}
          className={cn(
            "bg-white border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md group select-none",
            metricFilter === "due_this_week"
              ? "ring-2 ring-[#FBB03B] border-[#FBB03B] bg-[#FBB03B]/5 shadow-sm"
              : "border-duston-border hover:border-[#FBB03B]"
          )}
          title="Click to view items due this week"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-duston-muted group-hover:text-amber-600 transition-colors">
              Due this week
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "transition-all",
                metricFilter === "due_this_week"
                  ? "text-amber-600 rotate-90"
                  : "text-duston-muted/50 group-hover:text-amber-600 group-hover:translate-x-0.5"
              )}
            />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-[#FBB03B] mt-1.5 sm:mt-2">
            {dueThisWeekCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-duston-muted mt-1 truncate">
            Next 7 calendar days
          </div>
        </div>

        {/* Completed this month */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectMetric("completed")}
          className={cn(
            "bg-white border rounded-xl p-4 sm:p-5 lg:p-6 shadow-subtle cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md group select-none",
            metricFilter === "completed"
              ? "ring-2 ring-[#39B54A] border-[#39B54A] bg-[#39B54A]/5 shadow-sm"
              : "border-duston-border hover:border-[#39B54A]"
          )}
          title="Click to view completed items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-duston-muted group-hover:text-[#39B54A] transition-colors">
              Completed this month
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "transition-all",
                metricFilter === "completed"
                  ? "text-[#39B54A] rotate-90"
                  : "text-duston-muted/50 group-hover:text-[#39B54A] group-hover:translate-x-0.5"
              )}
            />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-[#39B54A] mt-1.5 sm:mt-2">
            {completedCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#39B54A] font-medium mt-1 truncate">
            Resolved & closed
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div id="tasks-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Metric Filter Banner */}
          {metricFilter !== "all" && (
            <div className="flex items-center justify-between bg-white border border-duston-border rounded-xl px-4 py-2.5 shadow-subtle animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-duston-dark">Active filter:</span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1",
                    metricFilter === "overdue"
                      ? "bg-duston-orange/10 text-duston-orange border border-duston-orange/20"
                      : metricFilter === "due_this_week"
                      ? "bg-[#FBB03B]/15 text-amber-800 border border-amber-300"
                      : metricFilter === "completed"
                      ? "bg-[#39B54A]/10 text-[#39B54A] border border-[#39B54A]/20"
                      : "bg-[#023542]/10 text-[#023542] border border-[#023542]/20"
                  )}
                >
                  {metricFilter === "open" && `Open Items (${openCount})`}
                  {metricFilter === "overdue" && `Overdue Items (${overdueCount})`}
                  {metricFilter === "due_this_week" && `Due This Week (${dueThisWeekCount})`}
                  {metricFilter === "completed" && `Completed Items (${completedCount})`}
                </span>
                <span className="text-[11px] text-duston-muted hidden sm:inline">
                  • Showing {displayedItems.length} matching {displayedItems.length === 1 ? "task" : "tasks"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectMetric(metricFilter)}
                className="text-xs text-duston-muted hover:text-duston-dark font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Clear filter (Show all)</span>
                <X size={13} />
              </button>
            </div>
          )}
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
                <span>Board</span>
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
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-duston-muted pr-1 hidden md:inline">
                {currentView === "kanban"
                  ? "Drag cards across columns to move, or click '+' to add"
                  : currentView === "planner"
                  ? "Drag cards between dates to reschedule"
                  : "Click any item to view details"}
              </span>
              <button
                onClick={() => handleOpenQuickAdd("todo")}
                className="px-3 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-subtle shrink-0 cursor-pointer"
                title="Add new action item"
              >
                <Plus size={14} strokeWidth={2} />
                <span>Add task</span>
              </button>
            </div>
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

              {/* Completed Section */}
              {groupedTodo.completed.length > 0 && (
                <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#39B54A]" />
                    <span className="text-xs font-semibold text-[#39B54A]">
                      Completed ({groupedTodo.completed.length})
                    </span>
                  </div>
                  <div className="divide-y divide-duston-border">
                    {groupedTodo.completed.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openActionItem(item.id)}
                        className="py-2.5 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={(e) => handleToggleDone(e, item.id, item.status)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-medium text-duston-dark line-through opacity-75">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-duston-muted flex items-center gap-2 mt-0.5">
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-medium truncate max-w-[120px]"
                                style={{
                                  backgroundColor: `${item.entityBrandColor}15`,
                                  color: item.entityBrandColor,
                                }}
                              >
                                {item.entityName}
                              </span>
                              <span>•</span>
                              <span>{item.projectName}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#39B54A] font-medium flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>Done</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state when no items match the filter */}
              {displayedItems.length === 0 && (
                <div className="bg-white border border-duston-border rounded-xl p-8 shadow-subtle text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-duston-bg border border-duston-border flex items-center justify-center mx-auto text-duston-muted">
                    <CheckSquare size={18} />
                  </div>
                  <div className="text-sm font-medium text-duston-dark">
                    No matching action items
                  </div>
                  <p className="text-xs text-duston-muted max-w-sm mx-auto">
                    {metricFilter !== "all"
                      ? `There are no action items matching the "${metricFilter.replace('_', ' ')}" filter.`
                      : "You have no action items recorded."}
                  </p>
                  {metricFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setMetricFilter("all")}
                      className="px-3 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <X size={12} />
                      <span>Clear filter and view all</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Board View with 3 Columns & Visible Curved Edge "+" Button at Bottom */}
          {currentView === "kanban" && (
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
              {[
                {
                  key: "todo" as const,
                  label: "Todo",
                  dotColor: "bg-slate-400",
                  filterFn: (i: ActionItemSummary) =>
                    i.status === "not_started" && !isDeadlineOverdue(i.deadline, i.status),
                },
                {
                  key: "in_progress" as const,
                  label: "In-Progress",
                  dotColor: "bg-[#1BCECE]",
                  filterFn: (i: ActionItemSummary) =>
                    i.status !== "done" &&
                    (i.status === "in_progress" || i.status === "blocked" || isDeadlineOverdue(i.deadline, i.status)),
                },
                {
                  key: "done" as const,
                  label: "Done",
                  dotColor: "bg-[#39B54A]",
                  filterFn: (i: ActionItemSummary) => i.status === "done",
                },
              ].map((col) => {
                const colItems = displayedItems.filter(col.filterFn);
                const isOver = dragOverCol === col.key;

                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverCol !== col.key) setDragOverCol(col.key);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setDragOverCol(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedId = e.dataTransfer.getData("text/plain");
                      if (droppedId) {
                        handleDropItem(droppedId, col.key);
                      }
                    }}
                    className={cn(
                      "w-[82vw] sm:w-[320px] md:w-auto shrink-0 snap-center md:shrink rounded-xl p-3.5 flex flex-col space-y-3 min-h-[380px] transition-all duration-150",
                      isOver
                        ? "bg-[#1BCECE]/10 border-2 border-dashed border-[#1BCECE] shadow-sm scale-[1.01]"
                        : "bg-duston-bg/60 border border-duston-border"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-duston-border/50">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                        <span className="text-xs font-semibold text-duston-dark">
                          {col.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-duston-muted font-medium bg-white px-2 py-0.5 rounded-full border border-duston-border">
                        {colItems.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-2 flex-1">
                      {colItems.length === 0 ? (
                        <div className="h-28 border border-dashed border-duston-border rounded-lg flex items-center justify-center text-duston-muted text-[11px] select-none">
                          Drop items here
                        </div>
                      ) : (
                        colItems.map((item) => {
                          const isBeingDragged = draggingItemId === item.id;
                          return (
                            <div
                              key={item.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", item.id);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggingItemId(item.id);
                              }}
                              onDragEnd={() => {
                                setDraggingItemId(null);
                                setDragOverCol(null);
                              }}
                              onClick={() => openActionItem(item.id)}
                              className={cn(
                                "p-3 bg-white border rounded-lg shadow-subtle hover:border-[#1BCECE] cursor-grab active:cursor-grabbing transition-all space-y-2 select-none",
                                isBeingDragged
                                  ? "opacity-40 border-dashed border-[#1BCECE] scale-[0.98]"
                                  : "border-duston-border hover:shadow"
                              )}
                            >
                              <div className="text-xs font-medium text-duston-dark line-clamp-2">
                                {item.title}
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[130px]"
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
                          );
                        })
                      )}
                    </div>

                    {/* Visible curved edge around + sign at the bottom */}
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd(col.key)}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-duston-border hover:border-[#1BCECE] bg-white/80 hover:bg-white text-duston-muted hover:text-[#023542] text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-subtle cursor-pointer group mt-auto"
                    >
                      <span className="w-5 h-5 rounded-full border border-duston-border/80 group-hover:border-[#1BCECE] group-hover:bg-[#1BCECE]/10 flex items-center justify-center text-duston-muted group-hover:text-[#023542] transition-colors">
                        <Plus size={12} strokeWidth={2.2} />
                      </span>
                      <span>Add to {col.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Planner View (7-day calendar) with Drag & Drop */}
          {currentView === "planner" && (
            <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="text-xs font-medium text-duston-dark">
                  Upcoming 7 Days Planner
                </div>
                <span className="text-[11px] text-duston-muted">
                  Drag tasks between dates to reschedule deadlines
                </span>
              </div>
              <div className="overflow-x-auto pb-2 no-scrollbar">
                <div className="min-w-[580px] md:min-w-0 grid grid-cols-7 gap-2 text-center text-xs">
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() + idx);
                    const dStr = d.toISOString().split("T")[0];
                    const dayItems = displayedItems.filter((i) => i.deadline === dStr);
                    const isCurToday = idx === 0;
                    const isOverDay = dragOverPlannerDate === dStr;

                    return (
                      <div
                        key={idx}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverPlannerDate !== dStr) setDragOverPlannerDate(dStr);
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          setDragOverPlannerDate(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const droppedId = e.dataTransfer.getData("text/plain");
                          if (droppedId) {
                            handleDropPlannerDate(droppedId, dStr);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-xl border min-h-[160px] flex flex-col transition-all duration-150",
                          isOverDay
                            ? "border-2 border-dashed border-[#1BCECE] bg-[#1BCECE]/10 shadow-sm scale-[1.02]"
                            : isCurToday
                            ? "border-[#1BCECE] bg-[#1BCECE]/5"
                            : "border-duston-border bg-duston-bg/40"
                        )}
                      >
                        <div className="text-[10px] text-duston-muted uppercase font-medium">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className={cn(
                          "text-xs font-semibold my-1",
                          isCurToday ? "text-[#023542]" : "text-duston-dark"
                        )}>
                          {d.getDate()}
                        </div>
                        <div className="flex-1 space-y-1.5 mt-1">
                          {dayItems.length === 0 ? (
                            <div className="h-full min-h-[60px] border border-dashed border-duston-border/60 rounded flex items-center justify-center text-[9px] text-duston-muted">
                              Drop here
                            </div>
                          ) : (
                            dayItems.map((it) => {
                              const isBeingDragged = draggingItemId === it.id;
                              return (
                                <div
                                  key={it.id}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", it.id);
                                    e.dataTransfer.effectAllowed = "move";
                                    setDraggingItemId(it.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingItemId(null);
                                    setDragOverPlannerDate(null);
                                  }}
                                  onClick={() => openActionItem(it.id)}
                                  className={cn(
                                    "p-1.5 rounded bg-white border text-[10px] text-left cursor-grab active:cursor-grabbing transition-all select-none shadow-xs space-y-0.5",
                                    isBeingDragged
                                      ? "opacity-40 border-dashed border-[#1BCECE] scale-[0.98]"
                                      : "border-duston-border hover:border-[#1BCECE] hover:shadow-subtle"
                                  )}
                                  title={`${it.title} (${it.entityName}) — Drag to another day to reschedule`}
                                >
                                  <div className="font-medium text-duston-dark line-clamp-2 leading-tight">
                                    {it.title}
                                  </div>
                                  <div className="text-[9px] text-duston-muted truncate">
                                    {it.entityName}
                                  </div>
                                </div>
                              );
                            })
                          )}
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-duston-dark line-clamp-1 flex-1">
                        {m.subject}
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                        m.isVirtual ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                      )}>
                        {m.isVirtual ? <Video size={10} /> : <MapPin size={10} />}
                        <span>{m.isVirtual ? "Virtual" : "In-person"}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-duston-muted mt-1.5">
                      <span>{m.entityName}</span>
                      <span>{formatShortDate(m.meetingDate)}</span>
                    </div>
                    {m.venue && (
                      <div className="text-[10px] text-duston-muted mt-1 flex items-center gap-1 truncate" title={m.venue}>
                        <MapPin size={10} className="shrink-0 text-duston-muted" />
                        <span className="truncate">{m.venue}</span>
                      </div>
                    )}
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

      {/* Quick Add Action Item Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-duston-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-duston-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#023542] text-white flex items-center justify-center text-xs font-semibold">
                  +
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-duston-dark">
                    Create Action Item
                  </h3>
                  <p className="text-[11px] text-duston-muted">
                    Add a task directly from your dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1 rounded-md text-duston-muted hover:text-duston-dark hover:bg-duston-bg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateQuickTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-duston-dark mb-1">
                  Task title <span className="text-duston-orange">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="e.g., Review mining lease agreement with Norva..."
                  className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Project <span className="text-duston-orange">*</span>
                  </label>
                  <select
                    value={quickAddProjectId}
                    onChange={(e) => setQuickAddProjectId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.entityName} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Responsible Party <span className="text-duston-orange">*</span>
                  </label>
                  <select
                    value={quickAddAssigneeId}
                    onChange={(e) => setQuickAddAssigneeId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Add to column / status
                  </label>
                  <select
                    value={quickAddColumn}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setQuickAddColumn(val);
                      const today = new Date().toISOString().split("T")[0];
                      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
                      const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
                      const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                      if (val === "todo") setQuickAddDeadline(in7Days);
                      else if (val === "in_progress") setQuickAddDeadline(in3Days);
                      else if (val === "done") setQuickAddDeadline(today);
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In-Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={quickAddDeadline}
                    onChange={(e) => setQuickAddDeadline(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Priority
                  </label>
                  <select
                    value={quickAddPriority}
                    onChange={(e) => setQuickAddPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-duston-border">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickAdd || !quickAddTitle.trim()}
                  className="px-4 py-2 text-xs font-medium bg-[#023542] hover:bg-[#1BCECE] disabled:opacity-50 text-white rounded-lg transition-colors shadow-subtle flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingQuickAdd ? "Creating..." : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
