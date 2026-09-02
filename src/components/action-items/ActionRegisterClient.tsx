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
} from "lucide-react";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";
import { ImportRegisterModal } from "./ImportRegisterModal";
import { useAppShell } from "../layout/AppShell";
import { updateActionItemField } from "@/lib/actions/action-items";
import { useRouter } from "next/navigation";

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
  const [scope, setScope] = useState<"my" | "global">("my");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedDeliverableType, setSelectedDeliverableType] = useState<"all" | "in_house" | "outsider">("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter projects by selected entity in filter bar
  const availableProjects = useMemo(() => {
    if (selectedEntity === "all") return projects;
    return projects.filter((p) => p.entityId === selectedEntity);
  }, [projects, selectedEntity]);

  // Combined filtering logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Global AppShell entity selector
      if (selectedEntityId && item.entityId !== selectedEntityId) return false;

      // 1. Primary Scope Filter
      if (scope === "my") {
        if (item.assigneeId !== currentUserId) return false;
      }

      // 2. Subsidiary Filter
      if (selectedEntity !== "all" && item.entityId !== selectedEntity) return false;

      // 3. Project Filter
      if (selectedProject !== "all" && item.projectId !== selectedProject) return false;

      // 4. Status Filter
      if (selectedStatus === "open") {
        if (item.status === "done") return false;
      } else if (selectedStatus === "overdue") {
        if (!isDeadlineOverdue(item.deadline, item.status)) return false;
      } else if (selectedStatus !== "all") {
        if (item.status !== selectedStatus) return false;
      }

      // 5. Assignee Filter
      if (selectedAssignee !== "all" && item.assigneeId !== selectedAssignee) return false;

      // 6. Deliverable Type Filter (In-house vs Outsider)
      const isOutsider = !!item.tag && (item.tag.toLowerCase().includes("follow-up") || item.tag.toLowerCase().includes("external") || item.tag.toLowerCase().includes("counterparty"));
      if (selectedDeliverableType === "outsider" && !isOutsider) return false;
      if (selectedDeliverableType === "in_house" && isOutsider) return false;

      // 7. Priority Filter
      if (selectedPriority !== "all" && item.priority !== selectedPriority) return false;

      // 8. Search query
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
    const open = scopedAll.filter((i) => i.status !== "done").length;
    const inProgress = scopedAll.filter((i) => i.status === "in_progress").length;
    const blocked = scopedAll.filter((i) => i.status === "blocked").length;
    const done = scopedAll.filter((i) => i.status === "done").length;
    const overdue = scopedAll.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length;
    return { total, open, inProgress, blocked, done, overdue };
  }, [scopedAll]);

  // Quick toggle item status (Done <-> In Progress)
  const handleToggleStatus = async (item: RegisterItem) => {
    const newStatus = item.status === "done" ? "in_progress" : "done";
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: newStatus } : it))
    );

    try {
      await updateActionItemField(item.id, "status", newStatus, currentUserId);
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle status:", err);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-0.5">
          <div
            onClick={() => setSelectedStatus("all")}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              selectedStatus === "all"
                ? "bg-[#023542]/5 border-[#023542] ring-1 ring-[#023542]"
                : "bg-duston-bg/40 border-duston-border/70 hover:border-duston-border"
            )}
          >
            <span className="text-[10px] text-duston-muted font-medium block">Total in view</span>
            <span className="text-lg font-semibold text-duston-dark">{stats.total}</span>
          </div>

          <div
            onClick={() => setSelectedStatus("open")}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              selectedStatus === "open"
                ? "bg-[#023542]/5 border-[#023542] ring-1 ring-[#023542]"
                : "bg-duston-bg/40 border-duston-border/70 hover:border-duston-border"
            )}
          >
            <span className="text-[10px] text-duston-muted font-medium block">Pending / Open</span>
            <span className="text-lg font-semibold text-[#023542]">{stats.open}</span>
          </div>

          <div
            onClick={() => setSelectedStatus("in_progress")}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              selectedStatus === "in_progress"
                ? "bg-[#1BCECE]/10 border-[#1BCECE] ring-1 ring-[#1BCECE]"
                : "bg-duston-bg/40 border-duston-border/70 hover:border-duston-border"
            )}
          >
            <span className="text-[10px] text-duston-muted font-medium block">In progress</span>
            <span className="text-lg font-semibold text-[#023542]">{stats.inProgress}</span>
          </div>

          <div
            onClick={() => setSelectedStatus("blocked")}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              selectedStatus === "blocked"
                ? "bg-duston-orange/10 border-duston-orange ring-1 ring-duston-orange"
                : "bg-duston-bg/40 border-duston-border/70 hover:border-duston-border"
            )}
          >
            <span className="text-[10px] text-duston-orange font-medium block">Blocked</span>
            <span className="text-lg font-semibold text-duston-orange">{stats.blocked}</span>
          </div>

          <div
            onClick={() => setSelectedStatus("overdue")}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              selectedStatus === "overdue"
                ? "bg-[#F15A24]/10 border-[#F15A24] ring-1 ring-[#F15A24]"
                : "bg-duston-bg/40 border-duston-border/70 hover:border-duston-border"
            )}
          >
            <span className="text-[10px] text-[#F15A24] font-medium block">Overdue</span>
            <span className="text-lg font-semibold text-[#F15A24]">{stats.overdue}</span>
          </div>

          <div
            onClick={() => setSelectedStatus("done")}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              selectedStatus === "done"
                ? "bg-[#39B54A]/10 border-[#39B54A] ring-1 ring-[#39B54A]"
                : "bg-duston-bg/40 border-duston-border/70 hover:border-duston-border"
            )}
          >
            <span className="text-[10px] text-[#39B54A] font-medium block">Completed</span>
            <span className="text-lg font-semibold text-[#39B54A]">{stats.done}</span>
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
              <option value="open">Pending / Open</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
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
      ) : (
        <div className="bg-white border border-duston-border rounded-2xl shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/70 text-duston-muted font-medium text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">No.</th>
                  <th className="py-3 px-4 min-w-[280px]">Action Item</th>
                  <th className="py-3 px-4 w-52">Responsible Party / Follow-up</th>
                  <th className="py-3 px-4 w-36">Deadline</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 w-44">Project & Subsidiary</th>
                  <th className="py-3 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border/60">
                {filteredItems.map((item, idx) => {
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

                      {/* 3. Responsible Party / Follow-up Lead */}
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

                      {/* 4. Deadline */}
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

                      {/* 5. Status with Inline Quick Toggle */}
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
                              : item.status === "blocked"
                              ? "bg-duston-orange/15 text-duston-orange hover:bg-duston-orange/25"
                              : "bg-duston-bg text-duston-muted border border-duston-border hover:bg-duston-border/50"
                          )}
                          title="Click to toggle status (Done / In Progress)"
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              item.status === "done"
                                ? "bg-[#39B54A]"
                                : item.status === "in_progress"
                                ? "bg-[#1BCECE]"
                                : item.status === "blocked"
                                ? "bg-duston-orange"
                                : "bg-duston-muted"
                            )}
                          />
                          <span>
                            {item.status === "done"
                              ? "Done"
                              : item.status === "in_progress"
                              ? "In progress"
                              : item.status === "blocked"
                              ? "Blocked"
                              : "Not started"}
                          </span>
                        </button>
                      </td>

                      {/* 6. Project & Subsidiary */}
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

                      {/* 7. Action Arrow */}
                      <td className="py-3 px-3 text-center text-duston-muted group-hover:text-[#023542]">
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Count */}
          <div className="p-3 bg-duston-bg/50 border-t border-duston-border flex items-center justify-between text-[11px] text-duston-muted">
            <span>
              Showing {filteredItems.length} {filteredItems.length === 1 ? "row" : "rows"} in {scope === "my" ? "Personal Register" : "Global Group Register"}
            </span>
            <span>Click any row to open full audit trail and comments</span>
          </div>
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
