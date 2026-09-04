"use client";

import { useState } from "react";
import { useAppShell } from "../layout/AppShell";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  ListTodo,
  Columns3,
  Calendar,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  FileSpreadsheet,
  Flag,
  UserPlus,
  FolderPlus,
  Building2,
  MessageSquare,
} from "lucide-react";
import { cn, formatDate, formatShortDate, isDeadlineOverdue } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createActionItem } from "@/lib/actions/action-items";
import { quickCreateUser, quickCreateEntity } from "@/lib/actions/admin";
import { createProject } from "@/lib/actions/projects";
import { ImportRegisterModal } from "@/components/action-items/ImportRegisterModal";
import { PriorityFlag } from "@/components/ui/PriorityFlag";

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
  secondaryAssigneeIds?: string[];
  secondaryAssigneeNames?: string[];
  commentCount?: number;
  tag?: string | null;
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
  upcomingMeetings?: MeetingSummary[];
  recentActivities: ActivitySummary[];
  defaultView?: "todo" | "kanban" | "planner";
  kanbanColumns?: string[];
  projects?: Array<{ id: string; name: string; entityName: string; entityBrandColor?: string; entityId?: string }>;
  entities?: Array<{ id: string; name: string; brandPrimaryColor?: string }>;
  users?: Array<{ id: string; name: string }>;
  currentUserId?: string;
  initialFilter?: "all" | "open" | "overdue" | "due_this_week" | "completed";
}

export function DashboardClient({
  userName,
  initialItems,
  upcomingMeetings = [],
  recentActivities,
  defaultView = "todo",
  kanbanColumns = ["Not Started", "In-Progress", "Done"],
  projects = [],
  entities = [],
  users = [],
  currentUserId,
  initialFilter = "all",
}: DashboardClientProps) {
  const { selectedEntityId, openActionItem } = useAppShell();
  const [currentView, setCurrentView] = useState<"todo" | "kanban" | "planner">(defaultView);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [items, setItems] = useState<ActionItemSummary[]>(initialItems);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
    if (typeof window !== "undefined") {
      const newUrl = nextFilter === "all" ? window.location.pathname : `?filter=${nextFilter}`;
      window.history.replaceState(null, "", newUrl);
    }
    // Smooth scroll down to tasks view container
    const el = document.getElementById("tasks-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  // Dynamic lists supporting inline creation
  const [projectsList, setProjectsList] = useState(projects);
  const [usersList, setUsersList] = useState(users);
  const [entitiesList, setEntitiesList] = useState(entities);

  // Quick Add Task modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddComments, setQuickAddComments] = useState("");
  const [quickAddProjectId, setQuickAddProjectId] = useState(projects[0]?.id || "");
  const [quickAddAssigneeId, setQuickAddAssigneeId] = useState(currentUserId || users[0]?.id || "");
  const [quickAddSecondaryAssigneeIds, setQuickAddSecondaryAssigneeIds] = useState<string[]>([]);
  const [quickAddStatus, setQuickAddStatus] = useState<"not_started" | "in_progress" | "done">("not_started");
  const [quickAddDeadline, setQuickAddDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [quickAddPriority, setQuickAddPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  // Inline Add User / Responsible Party state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Inline Add Project state
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectEntityId, setNewProjectEntityId] = useState(entities[0]?.id || "");
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Inline Add Subsidiary state
  const [isAddingSubsidiary, setIsAddingSubsidiary] = useState(false);
  const [newSubsidiaryName, setNewSubsidiaryName] = useState("");
  const [isSavingSubsidiary, setIsSavingSubsidiary] = useState(false);

  const handleSaveNewUser = async () => {
    if (!newUserName.trim()) return;
    setIsSavingUser(true);
    try {
      const res = await quickCreateUser({
        name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        entityId: newProjectEntityId || entitiesList[0]?.id,
      });
      if (res.success && res.user) {
        setUsersList((prev) => [...prev, { id: res.user!.id, name: res.user!.name }]);
        setQuickAddAssigneeId(res.user.id);
        setNewUserName("");
        setNewUserEmail("");
        setIsAddingUser(false);
      }
    } catch (err) {
      console.error("Failed to create user:", err);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveNewSubsidiary = async () => {
    if (!newSubsidiaryName.trim()) return;
    setIsSavingSubsidiary(true);
    try {
      const res = await quickCreateEntity({ name: newSubsidiaryName.trim() });
      if (res.success && res.entity) {
        setEntitiesList((prev) => [
          ...prev,
          {
            id: res.entity!.id,
            name: res.entity!.name,
            brandPrimaryColor: res.entity!.brandPrimaryColor,
          },
        ]);
        setNewProjectEntityId(res.entity.id);
        setNewSubsidiaryName("");
        setIsAddingSubsidiary(false);
      }
    } catch (err) {
      console.error("Failed to create subsidiary:", err);
    } finally {
      setIsSavingSubsidiary(false);
    }
  };

  const handleSaveNewProject = async () => {
    if (!newProjectName.trim()) return;
    setIsSavingProject(true);
    try {
      const ent = entitiesList.find((e) => e.id === newProjectEntityId) || entitiesList[0];
      const today = new Date().toISOString().split("T")[0];
      const res = await createProject({
        name: newProjectName.trim(),
        entityId: ent?.id || entities[0]?.id || "",
        category: "operations",
        status: "in_progress",
        priority: "medium",
        startDate: today,
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      });
      if (res.success && res.project) {
        const newProjItem = {
          id: res.project.id,
          name: res.project.name,
          entityId: res.project.entityId,
          entityName: ent?.name || "Subsidiary",
          entityBrandColor: ent?.brandPrimaryColor || "#023542",
        };
        setProjectsList((prev) => [...prev, newProjItem]);
        setQuickAddProjectId(res.project.id);
        setNewProjectName("");
        setIsAddingProject(false);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleOpenQuickAdd = (targetStatus?: "not_started" | "in_progress" | "done") => {
    const status = targetStatus || "not_started";
    setQuickAddStatus(status);
    const today = new Date().toISOString().split("T")[0];
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    if (status === "not_started") {
      setQuickAddDeadline(in7Days);
    } else if (status === "in_progress") {
      setQuickAddDeadline(in3Days);
    } else if (status === "done") {
      setQuickAddDeadline(today);
    }
    setIsQuickAddOpen(true);
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAddProjectId) return;

    setIsSubmittingQuickAdd(true);

    const targetStatus = quickAddStatus;

    const selectedProj = projectsList.find((p) => p.id === quickAddProjectId);
    const selectedUser = usersList.find((u) => u.id === quickAddAssigneeId);

    const secNames = quickAddSecondaryAssigneeIds
      .map((id) => usersList.find((u) => u.id === id)?.name)
      .filter(Boolean) as string[];

    const res = await createActionItem({
      projectId: quickAddProjectId,
      title: quickAddTitle.trim(),
      description: quickAddComments.trim() || undefined,
      assigneeId: quickAddAssigneeId || currentUserId || "00000000-0000-0000-0000-000000000000",
      secondaryAssigneeIds: quickAddSecondaryAssigneeIds,
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
          entityId: selectedProj?.entityId || "",
          entityName: selectedProj?.entityName || "Subsidiary",
          entityBrandColor: selectedProj?.entityBrandColor || "#023542",
          title: res.item.title,
          deadline: res.item.deadline,
          status: res.item.status as any,
          priority: res.item.priority as any,
          assigneeId: res.item.assigneeId,
          assigneeName: selectedUser?.name || userName,
          secondaryAssigneeIds: quickAddSecondaryAssigneeIds,
          secondaryAssigneeNames: secNames,
          commentCount: 0,
        },
        ...prev,
      ]);

      setQuickAddTitle("");
      setQuickAddComments("");
      setQuickAddSecondaryAssigneeIds([]);
      setQuickAddStatus("not_started");
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
    targetCol: "not_started" | "in_progress" | "done"
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
    } else if (targetCol === "not_started") {
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
    } catch (err) {
      console.error("Failed to update deadline on drop:", err);
    }
  };

  // Priority metrics across all entity-filtered items
  const priorityCounts = {
    critical: filteredItems.filter((i) => i.priority === "critical" && i.status !== "done").length,
    high: filteredItems.filter((i) => i.priority === "high" && i.status !== "done").length,
    medium: filteredItems.filter((i) => i.priority === "medium" && i.status !== "done").length,
    low: filteredItems.filter((i) => i.priority === "low" && i.status !== "done").length,
  };

  // Filter items based on active metric filter AND active priority filter
  const displayedItems = filteredItems.filter((i) => {
    if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
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

  const renderTaskItemRow = (item: ActionItemSummary) => (
    <div
      key={item.id}
      onClick={() => openActionItem(item.id)}
      className="py-2.5 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={item.status === "done"}
          onChange={(e) => handleToggleDone(e, item.id, item.status)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs font-medium text-duston-dark",
                item.status === "done" && "line-through text-duston-muted"
              )}
            >
              {item.title}
            </span>
            <PriorityFlag priority={item.priority} />
          </div>
          <div className="text-[11px] text-duston-muted flex items-center gap-2 mt-0.5 flex-wrap">
            {item.entityBrandColor && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.entityBrandColor }}
              />
            )}
            <span>{item.entityName}</span>
            <span>•</span>
            <span className="truncate max-w-[180px]">{item.projectName}</span>
            {item.assigneeName && (
              <>
                <span>•</span>
                <span>{item.assigneeName}</span>
                {Boolean(item.secondaryAssigneeNames && item.secondaryAssigneeNames.length > 0) && (
                  <span
                    className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-duston-bg border border-duston-border text-duston-dark shrink-0 cursor-help"
                    title={`Co-owners: ${item.secondaryAssigneeNames?.join(", ")}`}
                  >
                    +{item.secondaryAssigneeNames?.length}
                  </span>
                )}
              </>
            )}
            {Boolean(item.commentCount && item.commentCount > 0) && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#023542] font-semibold bg-[#1BCECE]/15 px-1.5 py-0.2 rounded border border-[#1BCECE]/30">
                  <MessageSquare size={10} className="text-[#1BCECE]" />
                  <span>{item.commentCount}</span>
                </span>
              </>
            )}
            {item.tag && (
              <>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {item.tag}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <span
          className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded",
            isDeadlineOverdue(item.deadline, item.status)
              ? "text-duston-orange bg-duston-orange/10"
              : item.deadline === todayStr
              ? "text-duston-dark bg-duston-bg border border-duston-border"
              : "text-duston-muted"
          )}
        >
          {item.deadline === todayStr ? "Today" : formatShortDate(item.deadline)}
        </span>
      </div>
    </div>
  );

  const firstName = userName.split(" ")[0] || "User";

  return (
    <div className="space-y-6">
      {/* Executive Overview Hero Banner */}
      <div className="rounded-2xl bg-[#023542] text-white p-5 sm:p-6 border border-[#03446D] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flanelines-bg" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
              Duston Project Tracker
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">
              Welcome back, {firstName} • {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
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
          title="Open items"
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
          title="Overdue items"
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
          title="Items due this week"
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
          title="Completed items"
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
          {/* View Toggle & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-duston-border rounded-2xl p-2.5 shadow-subtle">
            {/* View Switcher Tabs: 3 equal columns on mobile */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-duston-bg/60 sm:bg-transparent p-1 sm:p-0 rounded-xl">
              <button
                onClick={() => setCurrentView("todo")}
                className={cn(
                  "flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  currentView === "todo"
                    ? "bg-[#023542] text-white shadow-2xs font-semibold"
                    : "text-duston-muted hover:text-duston-dark hover:bg-white/80"
                )}
              >
                <ListTodo size={14} strokeWidth={1.5} />
                <span>Todo</span>
              </button>
              <button
                onClick={() => setCurrentView("kanban")}
                className={cn(
                  "flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  currentView === "kanban"
                    ? "bg-[#023542] text-white shadow-2xs font-semibold"
                    : "text-duston-muted hover:text-duston-dark hover:bg-white/80"
                )}
              >
                <Columns3 size={14} strokeWidth={1.5} />
                <span>Board</span>
              </button>
              <button
                onClick={() => setCurrentView("planner")}
                className={cn(
                  "flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  currentView === "planner"
                    ? "bg-[#023542] text-white shadow-2xs font-semibold"
                    : "text-duston-muted hover:text-duston-dark hover:bg-white/80"
                )}
              >
                <Calendar size={14} strokeWidth={1.5} />
                <span>Planner</span>
              </button>
            </div>

            {/* Action Buttons: 2 columns on mobile, never squished */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-white border border-duston-border hover:border-[#023542] text-duston-dark rounded-xl sm:rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="Import action register from Excel (.xlsx, .csv) or PDF"
              >
                <FileSpreadsheet size={14} className="text-[#1BCECE] shrink-0" />
                <span>Import register</span>
              </button>
              <button
                onClick={() => handleOpenQuickAdd("not_started")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl sm:rounded-lg text-xs font-medium transition-colors shadow-subtle cursor-pointer whitespace-nowrap"
                title="Add new action item"
              >
                <Plus size={14} strokeWidth={2} className="shrink-0" />
                <span>Add action item</span>
              </button>
            </div>
          </div>

          {/* Priority Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-duston-border rounded-xl px-3 py-2 text-xs shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-duston-muted flex items-center gap-1 shrink-0 mr-1">
                <Flag size={12} className="text-[#023542]" /> Priority filter:
              </span>
              {[
                { id: "all" as const, label: "All Priorities" },
                { id: "critical" as const, label: "Critical", count: priorityCounts.critical, dot: "bg-rose-500" },
                { id: "high" as const, label: "High", count: priorityCounts.high, dot: "bg-amber-500" },
                { id: "medium" as const, label: "Medium", count: priorityCounts.medium, dot: "bg-blue-500" },
                { id: "low" as const, label: "Low", count: priorityCounts.low, dot: "bg-slate-400" },
              ].map((p) => {
                const isSelected = priorityFilter === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriorityFilter(p.id)}
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
            {priorityFilter !== "all" && (
              <button
                type="button"
                onClick={() => setPriorityFilter("all")}
                className="text-[11px] text-duston-muted hover:text-duston-dark underline cursor-pointer"
              >
                Reset priority filter
              </button>
            )}
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
                    {groupedTodo.overdue.map(renderTaskItemRow)}
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
                    {groupedTodo.today.map(renderTaskItemRow)}
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
                    {groupedTodo.thisWeek.map(renderTaskItemRow)}
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
                    {groupedTodo.later.map(renderTaskItemRow)}
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
                    {groupedTodo.completed.map(renderTaskItemRow)}
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
                    {metricFilter !== "all" || priorityFilter !== "all"
                      ? "There are no action items matching your active filter criteria."
                      : "You have no action items recorded."}
                  </p>
                  {(metricFilter !== "all" || priorityFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setMetricFilter("all");
                        setPriorityFilter("all");
                      }}
                      className="px-3 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <X size={12} />
                      <span>Clear all filters</span>
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
                  key: "not_started" as const,
                  label: "Not Started",
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
                    (i.status === "in_progress" || isDeadlineOverdue(i.deadline, i.status)),
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
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="text-xs font-medium text-duston-dark line-clamp-2">
                                  {item.title}
                                </div>
                                <PriorityFlag priority={item.priority} showLabel={false} />
                              </div>
                              <div className="flex items-center justify-between text-[11px] gap-1">
                                <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate"
                                    style={{
                                      backgroundColor: `${item.entityBrandColor}15`,
                                      color: item.entityBrandColor,
                                    }}
                                  >
                                    {item.entityName}
                                  </span>
                                  {item.tag && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-200 truncate">
                                      {item.tag}
                                    </span>
                                  )}
                                </div>
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

                              {/* Card Footer: Assignees & Updates */}
                              <div className="flex items-center justify-between text-[11px] gap-1 pt-1 border-t border-duston-border/40 text-duston-muted">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-[10px] text-duston-dark font-medium truncate max-w-[110px]">
                                    {item.assigneeName}
                                  </span>
                                  {Boolean(item.secondaryAssigneeNames?.length && item.secondaryAssigneeNames.length > 0) && (
                                    <span
                                      className="px-1 py-0.2 rounded text-[9px] font-semibold bg-duston-bg border border-duston-border text-duston-dark shrink-0 cursor-help"
                                      title={`Co-owners: ${item.secondaryAssigneeNames?.join(", ")}`}
                                    >
                                      +{item.secondaryAssigneeNames?.length}
                                    </span>
                                  )}
                                </div>
                                {Boolean(item.commentCount && item.commentCount > 0) && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] text-[#023542] font-semibold bg-[#1BCECE]/15 px-1 py-0.2 rounded shrink-0">
                                    <MessageSquare size={9} className="text-[#1BCECE]" />
                                    <span>{item.commentCount}</span>
                                  </span>
                                )}
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
                                  title={`${it.title} (${it.entityName})`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="font-medium text-duston-dark line-clamp-2 leading-tight">
                                      {it.title}
                                    </div>
                                    <PriorityFlag priority={it.priority} size={9} showLabel={false} />
                                  </div>
                                  <div className="flex items-center justify-between gap-1 text-[9px] text-duston-muted">
                                    <span className="truncate">{it.entityName}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {Boolean(it.secondaryAssigneeNames && it.secondaryAssigneeNames.length > 0) && (
                                        <span
                                          className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-semibold bg-duston-bg border border-duston-border text-duston-dark"
                                          title={`Co-owners: ${it.secondaryAssigneeNames?.join(", ")}`}
                                        >
                                          +{it.secondaryAssigneeNames?.length}
                                        </span>
                                      )}
                                      {Boolean(it.commentCount && it.commentCount > 0) && (
                                        <span
                                          className="inline-flex items-center gap-0.5 text-[8px] text-[#023542] font-semibold bg-[#1BCECE]/15 px-1 py-0.2 rounded border border-[#1BCECE]/30"
                                          title={`${it.commentCount} update${it.commentCount === 1 ? "" : "s"}`}
                                        >
                                          <MessageSquare size={8} className="text-[#1BCECE]" />
                                          <span>{it.commentCount}</span>
                                        </span>
                                      )}
                                    </div>
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

        {/* Right Column (1/3 width): Recent Activity */}
        <div className="space-y-6">

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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col shadow-2xl border border-duston-border overflow-hidden my-auto animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#023542] text-white flex items-center justify-center text-sm font-semibold shadow-2xs">
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
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateQuickTask} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Action item <span className="text-duston-orange">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    placeholder="e.g., Review mining lease agreement with Norva..."
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Project selector + inline add */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-duston-dark">
                        Project <span className="text-duston-orange">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(!isAddingProject)}
                        className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FolderPlus size={12} />
                        {isAddingProject ? "Cancel" : "+ Add project"}
                      </button>
                    </div>

                    {isAddingProject ? (
                      <div className="p-3 bg-duston-bg/80 border border-duston-border rounded-lg space-y-2 mb-2">
                        <input
                          type="text"
                          placeholder="Project name *"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-duston-border bg-white text-duston-dark"
                        />
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-medium text-duston-muted">Subsidiary</label>
                          <button
                            type="button"
                            onClick={() => setIsAddingSubsidiary(!isAddingSubsidiary)}
                            className="text-[10px] text-[#023542] hover:text-[#1BCECE] cursor-pointer"
                          >
                            {isAddingSubsidiary ? "Cancel" : "+ Add subsidiary"}
                          </button>
                        </div>
                        {isAddingSubsidiary ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="New subsidiary name *"
                              value={newSubsidiaryName}
                              onChange={(e) => setNewSubsidiaryName(e.target.value)}
                              className="flex-1 text-xs p-1.5 rounded border border-duston-border bg-white text-duston-dark"
                            />
                            <button
                              type="button"
                              onClick={handleSaveNewSubsidiary}
                              disabled={isSavingSubsidiary || !newSubsidiaryName.trim()}
                              className="px-2.5 py-1 text-[11px] bg-[#023542] text-white rounded font-medium disabled:opacity-50 cursor-pointer"
                            >
                              {isSavingSubsidiary ? "Saving..." : "Save"}
                            </button>
                          </div>
                        ) : (
                          <select
                            value={newProjectEntityId}
                            onChange={(e) => setNewProjectEntityId(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-duston-border bg-white text-duston-dark"
                          >
                            {entitiesList.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingProject(false)}
                            className="px-2.5 py-1 text-[11px] text-duston-muted hover:text-duston-dark rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewProject}
                            disabled={isSavingProject || !newProjectName.trim()}
                            className="px-3 py-1 text-[11px] bg-[#023542] hover:bg-[#1BCECE] text-white rounded font-medium disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingProject ? "Saving..." : "Save & Select"}
                          </button>
                        </div>
                      </div>
                    ) : projectsList.length === 0 ? (
                      <div className="p-2.5 bg-duston-bg/60 border border-dashed border-duston-border rounded-lg text-center">
                        <p className="text-[11px] text-duston-muted mb-1.5">No projects created yet</p>
                        <button
                          type="button"
                          onClick={() => setIsAddingProject(true)}
                          className="inline-flex items-center gap-1 text-xs text-[#023542] hover:text-[#1BCECE] font-semibold cursor-pointer"
                        >
                          <FolderPlus size={13} />
                          + Create a project
                        </button>
                      </div>
                    ) : (
                      <select
                        value={quickAddProjectId}
                        onChange={(e) => setQuickAddProjectId(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                      >
                        {projectsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.entityName} — {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Primary Responsible Party selector + inline add */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-duston-dark">
                        Primary Responsible Party (Lead) <span className="text-duston-orange">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingUser(!isAddingUser)}
                        className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <UserPlus size={12} />
                        {isAddingUser ? "Cancel" : "+ Add person"}
                      </button>
                    </div>

                    {isAddingUser ? (
                      <div className="p-3 bg-duston-bg/80 border border-duston-border rounded-lg space-y-2 mb-2">
                        <input
                          type="text"
                          placeholder="Full name *"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-duston-border bg-white text-duston-dark"
                        />
                        <input
                          type="email"
                          placeholder="Email (optional)"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-duston-border bg-white text-duston-dark"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingUser(false)}
                            className="px-2.5 py-1 text-[11px] text-duston-muted hover:text-duston-dark rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewUser}
                            disabled={isSavingUser || !newUserName.trim()}
                            className="px-3 py-1 text-[11px] bg-[#023542] hover:bg-[#1BCECE] text-white rounded font-medium disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingUser ? "Saving..." : "Save & Select"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={quickAddAssigneeId}
                        onChange={(e) => {
                          const newPrimary = e.target.value;
                          setQuickAddAssigneeId(newPrimary);
                          // Remove from secondary if was there
                          setQuickAddSecondaryAssigneeIds((prev) => prev.filter((id) => id !== newPrimary));
                        }}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                      >
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Secondary Responsible Parties (Co-owners) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-duston-dark">
                      Secondary Responsible Parties (Optional co-owners)
                    </label>

                    {quickAddSecondaryAssigneeIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-duston-bg rounded-lg border border-duston-border/70">
                        {quickAddSecondaryAssigneeIds.map((secId) => {
                          const u = usersList.find((usr) => usr.id === secId);
                          return (
                            <span
                              key={secId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-duston-border text-duston-dark shadow-2xs"
                            >
                              <span>{u?.name || "User"}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuickAddSecondaryAssigneeIds((prev) =>
                                    prev.filter((id) => id !== secId)
                                  )
                                }
                                className="text-duston-muted hover:text-duston-orange transition-colors cursor-pointer"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !quickAddSecondaryAssigneeIds.includes(val)) {
                          setQuickAddSecondaryAssigneeIds((prev) => [...prev, val]);
                        }
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white text-duston-dark focus:outline-none focus:border-[#1BCECE]"
                    >
                      <option value="">+ Add secondary responsible party...</option>
                      {usersList
                        .filter(
                          (u) =>
                            u.id !== quickAddAssigneeId &&
                            !quickAddSecondaryAssigneeIds.includes(u.id)
                        )
                        .map((u) => (
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
                      Status
                    </label>
                    <select
                      value={quickAddStatus}
                      onChange={(e) => {
                        const val = e.target.value as "not_started" | "in_progress" | "done";
                        setQuickAddStatus(val);
                        const today = new Date().toISOString().split("T")[0];
                        const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
                        const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                        if (val === "not_started") setQuickAddDeadline(in7Days);
                        else if (val === "in_progress") setQuickAddDeadline(in3Days);
                        else if (val === "done") setQuickAddDeadline(today);
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark"
                    >
                      <option value="not_started">Not Started</option>
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

                <div>
                  <label className="block text-xs font-medium text-duston-dark mb-1">
                    Comments / Variance note (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={quickAddComments}
                    onChange={(e) => setQuickAddComments(e.target.value)}
                    placeholder="Optionally explain milestone variances, dependencies, or scope context..."
                    className="w-full text-xs p-2.5 rounded-lg border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark resize-none"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-duston-border flex items-center justify-end gap-2 bg-duston-bg/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickAdd || !quickAddTitle.trim()}
                  className="px-4 py-2 text-xs font-medium bg-[#023542] hover:bg-[#1BCECE] disabled:opacity-50 text-white rounded-xl transition-colors shadow-subtle flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingQuickAdd ? "Creating..." : "Create action item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Action Register Modal */}
      <ImportRegisterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entities={entities}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          entityId: p.entityId || "",
          entityName: p.entityName,
        }))}
        users={users}
        currentUserId={currentUserId || ""}
        defaultEntityId={selectedEntityId === "all" ? null : selectedEntityId}
      />
    </div>
  );
}
