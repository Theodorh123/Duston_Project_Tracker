"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  User,
  Users,
  Calendar,
  X,
  ChevronRight,
  Flag,
} from "lucide-react";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";
import { ImportRegisterModal } from "./ImportRegisterModal";
import { useAppShell } from "../layout/AppShell";
import { updateActionItemField } from "@/lib/actions/action-items";
import { useRouter, useSearchParams } from "next/navigation";
import { PriorityFlag } from "@/components/ui/PriorityFlag";

export interface RegisterItem {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  status: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority: "low" | "medium" | "high" | "critical";
  tag?: string | null;
  assigneeId: string;
  assigneeName: string;
  projectId: string;
  projectName: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  sourceMeetingId?: string | null;
  sourceMeetingSubject?: string | null;
  createdBy?: string;
  createdAt: string;
}

interface ActionRegisterClientProps {
  items: RegisterItem[];
  entities: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; entityId: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
  currentUserName: string;
  userRole?: string;
}

export function ActionRegisterClient({
  items: initialItems,
  entities,
  projects,
  users,
  currentUserId,
  currentUserName,
  userRole,
}: ActionRegisterClientProps) {
  const router = useRouter();
  const { openActionItem, selectedEntityId } = useAppShell();
  const [items, setItems] = useState<RegisterItem[]>(initialItems);

  // Sync state if props change
  useMemo(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Primary Scope: "my" (My Action Items) vs "global" (All Action Items)
  const searchParams = useSearchParams();
  const initialScope = searchParams.get("scope") === "global" ? "global" : "my";
  const [scope, setScope] = useState<"my" | "global">(initialScope);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedDeliverableType, setSelectedDeliverableType] = useState<"all" | "in_house" | "outsider">("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "priority">("table");

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter projects by selected entity in filter bar
  const availableProjects = useMemo(() => {
    if (selectedEntity === "all") return projects;
    return projects.filter((p) => p.entityId === selectedEntity);
  }, [projects, selectedEntity]);

  // Filter items based on active criteria
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Primary Scope: "my" items vs "global"
      if (scope === "my" && item.assigneeId !== currentUserId) {
        return false;
      }

      // 2. Global Entity Filter (AppShell TopBar)
      if (selectedEntityId && item.entityId !== selectedEntityId) {
        return false;
      }

      // 3. Subsidiary Filter (in-page dropdown)
      if (selectedEntity !== "all" && item.entityId !== selectedEntity) {
        return false;
      }

      // 4. Project Filter
      if (selectedProject !== "all" && item.projectId !== selectedProject) {
        return false;
      }

      // 5. Status Filter
      if (selectedStatus === "not_started" && item.status !== "not_started") {
        return false;
      }
      if (selectedStatus === "open" && item.status !== "not_started") {
        return false;
      }
      if (selectedStatus === "in_progress" && item.status !== "in_progress") {
        return false;
      }
      if (selectedStatus === "done" && item.status !== "done") {
        return false;
      }
      if (selectedStatus === "overdue") {
        if (item.status === "done" || !isDeadlineOverdue(item.deadline, item.status)) {
          return false;
        }
      }

      // 6. Assignee Filter
      if (selectedAssignee !== "all" && item.assigneeId !== selectedAssignee) {
        return false;
      }

      // 7. Deliverable Type Filter (Internal vs External/Counterparty)
      if (selectedDeliverableType === "in_house") {
        const isOutsider =
          item.tag &&
          (item.tag.toLowerCase().includes("follow-up") ||
            item.tag.toLowerCase().includes("external") ||
            item.tag.toLowerCase().includes("counterparty"));
        if (isOutsider) return false;
      } else if (selectedDeliverableType === "outsider") {
        const isOutsider =
          item.tag &&
          (item.tag.toLowerCase().includes("follow-up") ||
            item.tag.toLowerCase().includes("external") ||
            item.tag.toLowerCase().includes("counterparty"));
        if (!isOutsider) return false;
      }

      // 8. Priority Filter
      if (selectedPriority !== "all" && item.priority !== selectedPriority) {
        return false;
      }

      // 9. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesAssignee = item.assigneeName.toLowerCase().includes(q);
        const matchesProject = item.projectName.toLowerCase().includes(q);
        const matchesTag = item.tag ? item.tag.toLowerCase().includes(q) : false;
        const matchesDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesAssignee && !matchesProject && !matchesTag && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    scope,
    currentUserId,
    selectedEntityId,
    selectedEntity,
    selectedProject,
    selectedStatus,
    selectedAssignee,
    selectedDeliverableType,
    selectedPriority,
    searchQuery,
  ]);

  // Counts for scope pills
  const myItemsCount = useMemo(
    () => items.filter((it) => it.assigneeId === currentUserId).length,
    [items, currentUserId]
  );
  const globalItemsCount = items.length;

  // KPI counts based on currently selected scope
  const scopedAll = useMemo(() => {
    return scope === "my"
      ? items.filter((it) => it.assigneeId === currentUserId)
      : items;
  }, [items, scope, currentUserId]);

  const stats = useMemo(() => {
    const total = scopedAll.length;
    const notStarted = scopedAll.filter((i) => i.status === "not_started").length;
    const inProgress = scopedAll.filter((i) => i.status === "in_progress").length;
    const done = scopedAll.filter((i) => i.status === "done").length;
    const overdue = scopedAll.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length;
    const critical = scopedAll.filter((i) => i.priority === "critical" && i.status !== "done").length;
    const high = scopedAll.filter((i) => i.priority === "high" && i.status !== "done").length;
    const medium = scopedAll.filter((i) => i.priority === "medium" && i.status !== "done").length;
    const low = scopedAll.filter((i) => i.priority === "low" && i.status !== "done").length;
    return { total, notStarted, open: notStarted, inProgress, done, overdue, critical, high, medium, low };
  }, [scopedAll]);

  const groupedByPriority = useMemo(() => {
    return {
      critical: filteredItems.filter((i) => i.priority === "critical"),
      high: filteredItems.filter((i) => i.priority === "high"),
      medium: filteredItems.filter((i) => i.priority === "medium"),
      low: filteredItems.filter((i) => i.priority === "low"),
    };
  }, [filteredItems]);

  const isPrivileged = ["admin", "ceo", "ea"].includes(userRole || "");

  // Quick toggle item status (Done <-> In Progress)
  const handleToggleStatus = async (item: RegisterItem) => {
    const canEdit = isPrivileged || (Boolean(item.createdBy) && item.createdBy === currentUserId);
    if (!canEdit) {
      alert("Permission denied: Only EA, Admin, CEO, or the person who created this action item can amend its status.");
      return;
    }

    const newStatus = item.status === "done" ? "in_progress" : "done";
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: newStatus } : it))
    );

    try {
      const res = await updateActionItemField(item.id, "status", newStatus, currentUserId);
      if (!res.success) {
        alert(res.error || "Permission denied: Unable to update status.");
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: item.status } : it))
        );
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle status:", err);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: item.status } : it))
      );
    }
  };

  // Export filtered register to CSV
  const handleExportCSV = () => {
    const headers = [
      "No.",
      "Action Item",
      "Responsible Party",
      "Follow-up / Counterparty",
      "Deadline",
      "Status",
      "Priority",
      "Project",
      "Subsidiary",
    ];

    const rows = filteredItems.map((it, idx) => [
      idx + 1,
      `"${it.title.replace(/"/g, '""')}"`,
      `"${it.assigneeName.replace(/"/g, '""')}"`,
      it.tag ? `"${it.tag.replace(/"/g, '""')}"` : '""',
      it.deadline,
      it.status,
      it.priority,
      `"${it.projectName.replace(/"/g, '""')}"`,
      `"${it.entityName.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute(
      "download",
      `Duston_Action_Register_${scope === "my" ? "My_Items_" : "Global_"}${dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedEntity("all");
    setSelectedProject("all");
    setSelectedStatus("all");
    setSelectedAssignee("all");
    setSelectedDeliverableType("all");
    setSelectedPriority("all");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedEntity !== "all" ||
    selectedProject !== "all" ||
    selectedStatus !== "all" ||
    selectedAssignee !== "all" ||
    selectedDeliverableType !== "all" ||
    selectedPriority !== "all";

  const renderRegisterRow = (item: RegisterItem, idx: number) => {
    const isOverdue = isDeadlineOverdue(item.deadline, item.status);
    const isOutsider =
      !!item.tag &&
      (item.tag.toLowerCase().includes("follow-up") ||
        item.tag.toLowerCase().includes("external") ||
        item.tag.toLowerCase().includes("counterparty"));

    return (
      <tr
        key={item.id}
        onClick={() => openActionItem(item.id)}
        className={cn(
          "hover:bg-duston-bg/50 transition-colors cursor-pointer group",
          item.status === "done" && "opacity-60 bg-duston-bg/15"
        )}
      >
        {/* 1. Item No. */}
        <td className="py-3 px-3 text-center text-duston-muted font-mono text-[11px]">
          {idx + 1}
        </td>

        {/* 2. Action Item Description */}
        <td className="py-3 px-4">
          <div className="space-y-1">
            <div className="font-medium text-duston-dark group-hover:text-[#023542] transition-colors line-clamp-2">
              {item.title}
            </div>

            {item.description && (
              <p className="text-[11px] text-duston-muted line-clamp-1">
                {item.description}
              </p>
            )}

            {item.sourceMeetingSubject && (
              <span className="inline-flex items-center gap-1 text-[10px] text-duston-muted font-medium bg-duston-bg px-2 py-0.5 rounded border border-duston-border/60">
                <Calendar size={10} />
                <span className="truncate max-w-[200px]">
                  Minutes: {item.sourceMeetingSubject}
                </span>
              </span>
            )}
          </div>
        </td>

        {/* 3. Priority Flag */}
        <td className="py-3 px-3">
          <PriorityFlag priority={item.priority} />
        </td>

        {/* 4. Responsible Party / Follow-up Lead */}
        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
          {isOutsider ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  {item.tag}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-duston-dark font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span className="truncate">Lead: {item.assigneeName}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#023542]/10 text-[#023542] text-[10px] font-semibold flex items-center justify-center shrink-0">
                {item.assigneeName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span className="font-medium text-duston-dark truncate">
                {item.assigneeName}
              </span>
            </div>
          )}
        </td>

        {/* 5. Deadline */}
        <td className="py-3 px-4">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded font-medium",
              isOverdue
                ? "bg-duston-orange/10 text-duston-orange border border-duston-orange/20"
                : item.status === "done"
                ? "text-duston-muted"
                : "bg-duston-bg text-duston-dark border border-duston-border/70"
            )}
          >
            <Clock size={11} />
            <span>{formatDate(item.deadline)}</span>
          </span>
        </td>

        {/* 6. Status with Inline Quick Toggle */}
        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleToggleStatus(item)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer",
              item.status === "done"
                ? "bg-[#39B54A]/15 text-[#39B54A] hover:bg-[#39B54A]/25"
                : item.status === "in_progress"
                ? "bg-[#1BCECE]/15 text-[#023542] hover:bg-[#1BCECE]/25"
                : "bg-duston-bg text-duston-muted border border-duston-border hover:bg-duston-border/50"
            )}
            title="Toggle status"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                item.status === "done"
                  ? "bg-[#39B54A]"
                  : item.status === "in_progress"
                  ? "bg-[#1BCECE]"
                  : "bg-duston-muted"
              )}
            />
            <span>
              {item.status === "done"
                ? "Done"
                : item.status === "in_progress"
                ? "In progress"
                : "Not started"}
            </span>
          </button>
        </td>

        {/* 7. Project & Subsidiary */}
        <td className="py-3 px-4">
          <div className="space-y-0.5">
            <span
              className="px-1.5 py-0.2 rounded text-[9px] font-medium inline-block truncate max-w-[130px]"
              style={{
                backgroundColor: `${item.entityBrandColor}15`,
                color: item.entityBrandColor,
              }}
            >
              {item.entityName}
            </span>
            <p className="text-[11px] text-duston-dark font-medium truncate max-w-[150px]">
              {item.projectName}
            </p>
          </div>
        </td>

        {/* 8. Action Arrow */}
        <td className="py-3 px-3 text-center text-duston-muted group-hover:text-[#023542]">
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-[#023542] tracking-tight flex items-center gap-2.5">
            <span>Action Register</span>
          </h1>
          <p className="text-xs text-duston-muted mt-1">
            Group deliverable register tracking executive action items, counterparties, and deadlines
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import Register Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-duston-border text-duston-dark hover:border-[#1BCECE] rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title="Import Excel or PDF minutes register"
          >
            <Upload size={14} className="text-[#1BCECE]" />
            <span>Import register</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-duston-border text-duston-dark hover:border-[#023542] rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title="Export filtered items to CSV / Excel spreadsheet"
          >
            <Download size={14} className="text-[#023542]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scope Segmented Switcher & KPI Overview */}
      <div className="bg-white border border-duston-border rounded-2xl p-4 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-duston-border/60 pb-3.5">
          {/* My Items vs Global Register Toggle */}
          <div className="flex items-center bg-duston-bg p-1 rounded-xl border border-duston-border self-start">
            <button
              type="button"
              onClick={() => setScope("my")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                scope === "my"
                  ? "bg-white text-[#023542] shadow-2xs font-semibold"
                  : "text-duston-muted hover:text-duston-dark"
              )}
            >
              <User size={13} />
              <span>My Action Items</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  scope === "my"
                    ? "bg-[#023542]/10 text-[#023542]"
                    : "bg-duston-border/60 text-duston-muted"
                )}
              >
                {myItemsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setScope("global")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                scope === "global"
                  ? "bg-white text-[#023542] shadow-2xs font-semibold"
                  : "text-duston-muted hover:text-duston-dark"
              )}
            >
              <Users size={13} />
              <span>Global Action Register</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px]",
                  scope === "global"
                    ? "bg-[#023542]/10 text-[#023542]"
                    : "bg-duston-border/60 text-duston-muted"
                )}
              >
                {globalItemsCount}
              </span>
            </button>
          </div>

          {/* Scope Indicator Note */}
          <div className="text-[11px] text-duston-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1BCECE]" />
            <span>
              {scope === "my"
                ? `Showing deliverables assigned to ${currentUserName}`
                : "Showing group-wide deliverables across all subsidiaries"}
            </span>
          </div>
        </div>

        {/* Executive KPI Micro-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-0.5">
          {/* 1. Total Action Items */}
          <div
            onClick={() => setSelectedStatus("all")}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between",
              selectedStatus === "all"
                ? "bg-[#023542]/15 border-[#023542] ring-2 ring-[#023542]/25 shadow-xs"
                : "bg-[#023542]/[0.04] border-[#023542]/15 hover:bg-[#023542]/[0.08] hover:border-[#023542]/35"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#023542] shrink-0" />
                <span className="text-[11px] font-semibold text-[#023542]">Total Action Items</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#023542]/10 text-[#023542]">
                All
              </span>
            </div>
            <div className="text-2xl font-bold text-[#023542] tracking-tight">
              {stats.total}
            </div>
          </div>

          {/* 2. Not Started */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "not_started" ? "all" : "not_started")}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between",
              selectedStatus === "not_started"
                ? "bg-amber-100/80 border-[#FBB03B] ring-2 ring-[#FBB03B]/35 shadow-xs"
                : "bg-amber-50/50 border-amber-200/70 hover:bg-amber-50 hover:border-amber-300"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FBB03B] shrink-0" />
                <span className="text-[11px] font-semibold text-amber-900">Not Started</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                {stats.total > 0 ? Math.round((stats.notStarted / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-amber-900 tracking-tight">
              {stats.notStarted}
            </div>
          </div>

          {/* 3. In Progress */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "in_progress" ? "all" : "in_progress")}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between",
              selectedStatus === "in_progress"
                ? "bg-cyan-100/80 border-[#1BCECE] ring-2 ring-[#1BCECE]/35 shadow-xs"
                : "bg-cyan-50/50 border-cyan-100 hover:bg-cyan-50 hover:border-[#1BCECE]/50"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1BCECE] shrink-0" />
                <span className="text-[11px] font-semibold text-[#023542]">In Progress</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#1BCECE]/20 text-[#023542]">
                {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#023542] tracking-tight">
              {stats.inProgress}
            </div>
          </div>

          {/* 4. Overdue */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "overdue" ? "all" : "overdue")}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between",
              selectedStatus === "overdue"
                ? "bg-rose-100/80 border-[#F15A24] ring-2 ring-[#F15A24]/35 shadow-xs"
                : "bg-rose-50/40 border-rose-100 hover:bg-rose-50 hover:border-[#F15A24]/50"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F15A24] shrink-0" />
                <span className="text-[11px] font-semibold text-[#F15A24]">Overdue</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#F15A24]/15 text-[#F15A24]">
                {stats.total > 0 ? Math.round((stats.overdue / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[#F15A24] tracking-tight">
              {stats.overdue}
            </div>
          </div>

          {/* 5. Completed */}
          <div
            onClick={() => setSelectedStatus(selectedStatus === "done" ? "all" : "done")}
            className={cn(
              "p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between",
              selectedStatus === "done"
                ? "bg-emerald-100/80 border-emerald-500 ring-2 ring-emerald-500/35 shadow-xs"
                : "bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-400"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-800">Completed</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {stats.done}
            </div>
          </div>
        </div>

        {/* Interactive Priority Distribution Summary & View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-duston-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-duston-muted flex items-center gap-1 mr-1">
              <Flag size={11} className="text-[#023542]" /> Priority breakdown:
            </span>
            <button
              type="button"
              onClick={() => setSelectedPriority(selectedPriority === "critical" ? "all" : "critical")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                selectedPriority === "critical"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Critical:</span>
              <span className="font-bold">{stats.critical}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPriority(selectedPriority === "high" ? "all" : "high")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                selectedPriority === "high"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>High:</span>
              <span className="font-bold">{stats.high}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPriority(selectedPriority === "medium" ? "all" : "medium")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                selectedPriority === "medium"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Medium:</span>
              <span className="font-bold">{stats.medium}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPriority(selectedPriority === "low" ? "all" : "low")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                selectedPriority === "low"
                  ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Low:</span>
              <span className="font-bold">{stats.low}</span>
            </button>
          </div>

          {/* Table View vs Group by Priority View Toggle */}
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
              <span>Group by Priority</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-duston-border rounded-xl p-3.5 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-duston-muted" />
            <input
              type="text"
              placeholder="Search action items, parties, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-duston-bg border border-duston-border rounded-lg text-duston-dark placeholder:text-duston-muted outline-none focus:border-[#1BCECE] transition-colors"
            />
          </div>

          {/* Subsidiary Filter */}
          <div>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setSelectedProject("all");
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-duston-bg border border-duston-border rounded-lg text-duston-dark outline-none focus:border-[#1BCECE]"
            >
              <option value="all">All subsidiaries</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-duston-bg border border-duston-border rounded-lg text-duston-dark outline-none focus:border-[#1BCECE]"
            >
              <option value="all">All projects</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-duston-bg border border-duston-border rounded-lg text-duston-dark outline-none focus:border-[#1BCECE]"
            >
              <option value="all">All statuses</option>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="done">Completed</option>
              <option value="overdue">Overdue only</option>
            </select>
          </div>

          {/* Deliverable Type (In-house vs Outsider) */}
          <div>
            <select
              value={selectedDeliverableType}
              onChange={(e) => setSelectedDeliverableType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-duston-bg border border-duston-border rounded-lg text-duston-dark outline-none focus:border-[#1BCECE]"
            >
              <option value="all">All parties</option>
              <option value="in_house">In-house deliverables</option>
              <option value="outsider">Outsider / Follow-ups</option>
            </select>
          </div>
        </div>

        {/* Active Filters Row */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between border-t border-duston-border/60 pt-2 text-xs">
            <span className="text-[11px] text-duston-muted">
              Showing {filteredItems.length} of {scopedAll.length} deliverables
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] text-[#023542] hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <X size={12} />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Register Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-duston-border rounded-2xl p-12 text-center shadow-subtle space-y-3">
          <div className="w-10 h-10 rounded-xl bg-duston-bg text-duston-muted flex items-center justify-center mx-auto">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="text-sm font-semibold text-duston-dark">No deliverables match this filter</h3>
          <p className="text-xs text-duston-muted max-w-sm mx-auto">
            Try adjusting your search criteria or reset filters to display all registered deliverables.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3.5 py-1.5 bg-duston-bg hover:bg-duston-border/60 text-duston-dark rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white border border-duston-border rounded-2xl shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/70 text-duston-muted font-medium text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">No.</th>
                  <th className="py-3 px-4 min-w-[260px]">Action Item</th>
                  <th className="py-3 px-3 w-28">Priority</th>
                  <th className="py-3 px-4 w-52">Responsible Party / Follow-up</th>
                  <th className="py-3 px-4 w-36">Deadline</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 w-44">Project & Subsidiary</th>
                  <th className="py-3 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border/60">
                {filteredItems.map(renderRegisterRow)}
              </tbody>
            </table>
          </div>

          {/* Table Footer Count */}
          <div className="p-3 bg-duston-bg/50 border-t border-duston-border flex items-center justify-between text-[11px] text-duston-muted">
            <span>
              Showing {filteredItems.length} {filteredItems.length === 1 ? "row" : "rows"} in {scope === "my" ? "Personal Register" : "Global Group Register"}
            </span>
          </div>
        </div>
      ) : (
        /* Grouped by Priority View */
        <div className="space-y-6">
          {[
            {
              level: "critical" as const,
              title: "Critical Priority",
              subtitle: "Immediate executive attention required",
              items: groupedByPriority.critical,
              headerBg: "bg-rose-50/80 border-rose-200 text-rose-900",
              dotColor: "bg-rose-500",
              countBadge: "bg-rose-100 text-rose-800 border-rose-300",
            },
            {
              level: "high" as const,
              title: "High Priority",
              subtitle: "Urgent milestone deliverables",
              items: groupedByPriority.high,
              headerBg: "bg-amber-50/80 border-amber-200 text-amber-900",
              dotColor: "bg-amber-500",
              countBadge: "bg-amber-100 text-amber-800 border-amber-300",
            },
            {
              level: "medium" as const,
              title: "Medium Priority",
              subtitle: "Standard operational deliverables",
              items: groupedByPriority.medium,
              headerBg: "bg-blue-50/70 border-blue-200 text-blue-900",
              dotColor: "bg-blue-500",
              countBadge: "bg-blue-100 text-blue-800 border-blue-300",
            },
            {
              level: "low" as const,
              title: "Low Priority",
              subtitle: "Routine and backlog items",
              items: groupedByPriority.low,
              headerBg: "bg-slate-50/80 border-slate-200 text-slate-900",
              dotColor: "bg-slate-400",
              countBadge: "bg-slate-100 text-slate-700 border-slate-300",
            },
          ].map((group) => (
            <div
              key={group.level}
              className="bg-white border border-duston-border rounded-2xl shadow-subtle overflow-hidden"
            >
              <div className={cn("p-4 border-b flex items-center justify-between", group.headerBg)}>
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
                <div className="p-6 text-center text-xs text-duston-muted italic">
                  No {group.title.toLowerCase()} deliverables match the active filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-duston-border bg-duston-bg/70 text-duston-muted font-medium text-[11px]">
                        <th className="py-3 px-3 w-12 text-center">No.</th>
                        <th className="py-3 px-4 min-w-[260px]">Action Item</th>
                        <th className="py-3 px-3 w-28">Priority</th>
                        <th className="py-3 px-4 w-52">Responsible Party / Follow-up</th>
                        <th className="py-3 px-4 w-36">Deadline</th>
                        <th className="py-3 px-4 w-32">Status</th>
                        <th className="py-3 px-4 w-44">Project & Subsidiary</th>
                        <th className="py-3 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-duston-border/60">
                      {group.items.map(renderRegisterRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Import Register Modal */}
      <ImportRegisterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entities={entities}
        projects={projects}
        users={users}
        currentUserId={currentUserId}
      />
    </div>
  );
}
