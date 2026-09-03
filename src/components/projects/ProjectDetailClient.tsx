"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Calendar,
  Clock,
  MessageSquare,
  List,
  Columns3,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Flag,
  UserPlus,
  X,
} from "lucide-react";
import { cn, formatDate, formatShortDate, isDeadlineOverdue } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";
import { updateProject } from "@/lib/actions/projects";
import { createActionItem } from "@/lib/actions/action-items";
import { quickCreateUser } from "@/lib/actions/admin";
import { ImportRegisterModal } from "../action-items/ImportRegisterModal";
import { PriorityFlag } from "@/components/ui/PriorityFlag";

interface ProjectDetailProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    category: string;
    status: string;
    priority: string;
    startDate: string;
    targetDate: string;
    budgetNotes?: string | null;
    entityId: string;
    entityName: string;
    entityBrandColor: string;
    ownerId: string;
    ownerName: string;
    sponsorId?: string | null;
    sponsorName?: string | null;
  };
  actionItems: Array<{
    id: string;
    title: string;
    assigneeId: string;
    assigneeName: string;
    deadline: string;
    status: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
    priority: "low" | "medium" | "high" | "critical";
    tag?: string | null;
    comments?: string | null;
  }>;
  meetings: Array<{
    id: string;
    subject: string;
    meetingDate: string;
    attendeeCount: number;
  }>;
  activityLogs: Array<{
    id: string;
    actorName: string;
    actionItemTitle: string;
    eventType: string;
    note?: string | null;
    createdAt: string;
  }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

export function ProjectDetailClient({
  project,
  actionItems,
  meetings,
  activityLogs,
  users,
  currentUserId,
}: ProjectDetailProps) {
  const { openActionItem } = useAppShell();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"items" | "meetings" | "activity" | "details">("items");
  const [actionItemsView, setActionItemsView] = useState<"list" | "priority" | "kanban">("list");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemsList, setItemsList] = useState(actionItems);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const priorityCounts = {
    critical: itemsList.filter((i) => i.priority === "critical" && i.status !== "done").length,
    high: itemsList.filter((i) => i.priority === "high" && i.status !== "done").length,
    medium: itemsList.filter((i) => i.priority === "medium" && i.status !== "done").length,
    low: itemsList.filter((i) => i.priority === "low" && i.status !== "done").length,
  };

  const displayedProjectItems = itemsList.filter((i) => {
    if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
    return true;
  });

  const groupedByPriority = {
    critical: displayedProjectItems.filter((i) => i.priority === "critical"),
    high: displayedProjectItems.filter((i) => i.priority === "high"),
    medium: displayedProjectItems.filter((i) => i.priority === "medium"),
    low: displayedProjectItems.filter((i) => i.priority === "low"),
  };

  const handleDropItem = async (itemId: string, newColStatus: "not_started" | "in_progress" | "done") => {
    setDragOverCol(null);
    setDraggingItemId(null);

    const targetItem = itemsList.find((it) => it.id === itemId);
    if (!targetItem) return;
    if (targetItem.status === newColStatus) return;

    setItemsList((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: newColStatus } : it))
    );

    try {
      await fetch(`/api/action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newColStatus }),
      });
    } catch (err) {
      console.error("Failed to update status on drop:", err);
    }
  };

  // User list with support for inline adding
  const [usersList, setUsersList] = useState(users);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);

  // New action item state
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemAssignee, setNewItemAssignee] = useState(currentUserId);
  const [newItemDeadline, setNewItemDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [newItemPriority, setNewItemPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [newItemComments, setNewItemComments] = useState("");

  // Variance note editing state (for table cell inline editing / modal)
  const [editingVarianceItem, setEditingVarianceItem] = useState<{ id: string; title: string; comments: string } | null>(null);
  const [varianceText, setVarianceText] = useState("");
  const [isSavingVariance, setIsSavingVariance] = useState(false);

  const handleSaveVariance = async () => {
    if (!editingVarianceItem) return;
    setIsSavingVariance(true);
    try {
      const res = await fetch(`/api/action-items/${editingVarianceItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: varianceText }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Permission denied: Only EA, Admin, CEO, or the creator can amend this action item.");
        return;
      }
      setItemsList((prev) =>
        prev.map((it) => (it.id === editingVarianceItem.id ? { ...it, comments: varianceText } : it))
      );
      setEditingVarianceItem(null);
    } catch (err) {
      console.error("Failed to update variance note:", err);
    } finally {
      setIsSavingVariance(false);
    }
  };

  const handleSaveNewUser = async () => {
    if (!newUserName.trim()) return;
    setIsSavingUser(true);
    try {
      const res = await quickCreateUser({
        name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        entityId: project.entityId,
      });
      if (res.success && res.user) {
        setUsersList((prev) => [...prev, { id: res.user!.id, name: res.user!.name }]);
        setNewItemAssignee(res.user.id);
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

  // Editable details state
  const [details, setDetails] = useState({
    description: project.description || "",
    startDate: project.startDate,
    targetDate: project.targetDate,
    budgetNotes: project.budgetNotes || "",
    ownerId: project.ownerId,
    sponsorId: project.sponsorId || "",
  });

  const handleSaveDetailsField = async (field: string, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
    await updateProject(project.id, { [field]: value });
  };

  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const res = await createActionItem({
      projectId: project.id,
      title: newItemTitle.trim(),
      description: newItemComments.trim() || undefined,
      assigneeId: newItemAssignee,
      deadline: newItemDeadline,
      priority: newItemPriority,
      createdBy: currentUserId,
    });

    if (res.success && res.item) {
      const assignedUser = usersList.find((u) => u.id === newItemAssignee);
      setItemsList((prev) => [
        {
          id: res.item.id,
          title: res.item.title,
          assigneeId: res.item.assigneeId,
          assigneeName: assignedUser?.name || "Assignee",
          deadline: res.item.deadline,
          status: res.item.status as any,
          priority: res.item.priority as any,
          tag: res.item.tag,
          comments: res.item.description || newItemComments.trim() || null,
        },
        ...prev,
      ]);
      setNewItemTitle("");
      setNewItemComments("");
      setIsNewItemModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Block with Breadcrumbs */}
      <div className="space-y-2">
        <nav className="flex items-center gap-1.5 text-xs text-duston-muted">
          <Link href="/projects" className="hover:text-duston-dark">
            Projects
          </Link>
          <ChevronRight size={12} strokeWidth={1.5} />
          <span>{project.entityName}</span>
          <ChevronRight size={12} strokeWidth={1.5} />
          <span className="text-duston-dark font-medium">{project.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
              {project.name}
            </h1>

            {/* Meta Strip */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-duston-muted mt-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1.5"
                style={{
                  backgroundColor: `${project.entityBrandColor}15`,
                  color: project.entityBrandColor,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: project.entityBrandColor }}
                />
                <span>{project.entityName}</span>
              </span>

              <span>•</span>
              <span>Responsible Party: <strong className="font-medium text-duston-dark">{project.ownerName}</strong></span>
              {project.sponsorName && (
                <>
                  <span>•</span>
                  <span>Sponsor: <strong className="font-medium text-duston-dark">{project.sponsorName}</strong></span>
                </>
              )}
              <span>•</span>
              <span>Target: {formatDate(project.targetDate)}</span>
              <span>•</span>
              <span className="capitalize text-duston-dark font-medium px-2 py-0.5 rounded bg-duston-bg border border-duston-border text-[11px]">
                {project.status.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-duston-border bg-white text-duston-dark hover:border-[#023542] rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Import action register from Excel (.xlsx, .csv) or PDF"
            >
              <FileSpreadsheet size={15} className="text-[#1BCECE]" />
              <span>Import register</span>
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className="px-3.5 py-2 border border-duston-border bg-white text-duston-dark hover:bg-duston-bg rounded-xl text-xs font-medium transition-colors"
            >
              Edit project
            </button>
            <button
              onClick={() => setIsNewItemModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-subtle cursor-pointer"
            >
              <Plus size={15} strokeWidth={1.5} />
              <span>New action item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-duston-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("items")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 transition-colors",
              activeTab === "items"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            Action items ({itemsList.length})
          </button>
          <button
            onClick={() => setActiveTab("meetings")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 transition-colors",
              activeTab === "meetings"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            Meetings ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 transition-colors",
              activeTab === "activity"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            Activity ({activityLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 transition-colors",
              activeTab === "details"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            Details
          </button>
        </div>

        {activeTab === "items" && (
          <div className="flex items-center gap-1 pb-2">
            <button
              onClick={() => setActionItemsView("list")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors",
                actionItemsView === "list"
                  ? "bg-[#023542] text-white"
                  : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg"
              )}
              title="List view"
            >
              <List size={15} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setActionItemsView("priority")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors",
                actionItemsView === "priority"
                  ? "bg-[#023542] text-white"
                  : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg"
              )}
              title="Group by priority"
            >
              <Flag size={15} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setActionItemsView("kanban")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors",
                actionItemsView === "kanban"
                  ? "bg-[#023542] text-white"
                  : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg"
              )}
              title="Board view"
            >
              <Columns3 size={15} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Priority Filter Bar */}
      {activeTab === "items" && itemsList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-duston-border rounded-xl px-3 py-2 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-duston-muted flex items-center gap-1 shrink-0 mr-1">
              <Flag size={12} className="text-[#023542]" /> Priority filter:
            </span>
            {[
              { id: "all" as const, label: "All" },
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
              Reset filter
            </button>
          )}
        </div>
      )}

      {/* Tab 1: Action items */}
      {activeTab === "items" && (
        <>
          {itemsList.length === 0 ? (
            <div className="bg-white border border-duston-border rounded-xl p-12 text-center shadow-subtle">
              <CheckCircle2 size={32} strokeWidth={1.5} className="mx-auto text-duston-muted mb-3" />
              <h3 className="text-sm font-medium text-duston-dark">
                No action items yet
              </h3>
              <p className="text-xs text-duston-muted mt-1 max-w-sm mx-auto">
                Create your first action item to start tracking deliverables for this project.
              </p>
              <button
                onClick={() => setIsNewItemModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Create action item
              </button>
            </div>
          ) : actionItemsView === "list" ? (
            <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
              <table className="w-full min-w-[880px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                    <th className="py-3 px-4">Subsidiary</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Action item</th>
                    <th className="py-3 px-4">Responsible Party</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Comments (variance notes)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-duston-border">
                  {displayedProjectItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-duston-bg/80 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap"
                          style={{
                            backgroundColor: `${project.entityBrandColor}15`,
                            color: project.entityBrandColor,
                            borderColor: `${project.entityBrandColor}30`,
                          }}
                        >
                          {project.entityName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-duston-dark whitespace-nowrap">
                        {project.name}
                      </td>
                      <td
                        onClick={() => openActionItem(item.id)}
                        className="py-3 px-4 font-medium text-duston-dark hover:text-[#1BCECE] cursor-pointer"
                      >
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-duston-dark whitespace-nowrap">
                        {item.assigneeName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize px-2 py-0.5 rounded bg-duston-bg border border-duston-border text-[11px] text-duston-text">
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-medium",
                            isDeadlineOverdue(item.deadline, item.status)
                              ? "bg-duston-orange/10 text-duston-orange"
                              : "text-duston-muted"
                          )}
                        >
                          {formatDate(item.deadline)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityFlag priority={item.priority} />
                      </td>
                      <td className="py-3 px-4 text-duston-muted max-w-xs">
                        {item.comments ? (
                          <div
                            onClick={() => {
                              setEditingVarianceItem({ id: item.id, title: item.title, comments: item.comments || "" });
                              setVarianceText(item.comments || "");
                            }}
                            className="flex items-center gap-1.5 cursor-pointer hover:text-duston-dark"
                            title="Click to edit variance note"
                          >
                            <span className="line-clamp-1 text-[11px] text-duston-dark/90 italic">{item.comments}</span>
                            <span className="text-[10px] text-[#1BCECE] opacity-0 group-hover:opacity-100 font-medium">Edit</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVarianceItem({ id: item.id, title: item.title, comments: "" });
                              setVarianceText("");
                            }}
                            className="text-[11px] text-duston-muted hover:text-[#023542] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span className="text-xs">+</span> Add comment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : actionItemsView === "priority" ? (
            /* Grouped by Priority View */
            <div className="space-y-6">
              {[
                {
                  level: "critical" as const,
                  title: "Critical Priority",
                  subtitle: "Immediate attention required",
                  items: groupedByPriority.critical,
                  headerBg: "bg-rose-50/80 border-rose-200 text-rose-900",
                  dotColor: "bg-rose-500",
                  countBadge: "bg-rose-100 text-rose-800 border-rose-300",
                },
                {
                  level: "high" as const,
                  title: "High Priority",
                  subtitle: "Urgent deliverables",
                  items: groupedByPriority.high,
                  headerBg: "bg-amber-50/80 border-amber-200 text-amber-900",
                  dotColor: "bg-amber-500",
                  countBadge: "bg-amber-100 text-amber-800 border-amber-300",
                },
                {
                  level: "medium" as const,
                  title: "Medium Priority",
                  subtitle: "Standard project tasks",
                  items: groupedByPriority.medium,
                  headerBg: "bg-blue-50/70 border-blue-200 text-blue-900",
                  dotColor: "bg-blue-500",
                  countBadge: "bg-blue-100 text-blue-800 border-blue-300",
                },
                {
                  level: "low" as const,
                  title: "Low Priority",
                  subtitle: "Backlog & non-urgent tasks",
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
                    <div className="p-6 text-center text-xs text-duston-muted italic">
                      No {group.title.toLowerCase()} deliverables in this project.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[880px] text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                            <th className="py-3 px-4">Subsidiary</th>
                            <th className="py-3 px-4">Project</th>
                            <th className="py-3 px-4">Action item</th>
                            <th className="py-3 px-4">Responsible Party</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Deadline</th>
                            <th className="py-3 px-4">Priority</th>
                            <th className="py-3 px-4">Comments (variance notes)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-duston-border">
                          {group.items.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-duston-bg/80 transition-colors group"
                            >
                              <td className="py-3 px-4">
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap"
                                  style={{
                                    backgroundColor: `${project.entityBrandColor}15`,
                                    color: project.entityBrandColor,
                                    borderColor: `${project.entityBrandColor}30`,
                                  }}
                                >
                                  {project.entityName}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium text-duston-dark whitespace-nowrap">
                                {project.name}
                              </td>
                              <td
                                onClick={() => openActionItem(item.id)}
                                className="py-3 px-4 font-medium text-duston-dark hover:text-[#1BCECE] cursor-pointer"
                              >
                                {item.title}
                              </td>
                              <td className="py-3 px-4 text-duston-dark whitespace-nowrap">
                                {item.assigneeName}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="capitalize px-2 py-0.5 rounded bg-duston-bg border border-duston-border text-[11px] text-duston-text">
                                  {item.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-medium",
                                    isDeadlineOverdue(item.deadline, item.status)
                                      ? "bg-duston-orange/10 text-duston-orange"
                                      : "text-duston-muted"
                                  )}
                                >
                                  {formatDate(item.deadline)}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <PriorityFlag priority={item.priority} />
                              </td>
                              <td className="py-3 px-4 text-duston-muted max-w-xs">
                                {item.comments ? (
                                  <div
                                    onClick={() => {
                                      setEditingVarianceItem({ id: item.id, title: item.title, comments: item.comments || "" });
                                      setVarianceText(item.comments || "");
                                    }}
                                    className="flex items-center gap-1.5 cursor-pointer hover:text-duston-dark"
                                    title="Click to edit variance note"
                                  >
                                    <span className="line-clamp-1 text-[11px] text-duston-dark/90 italic">{item.comments}</span>
                                    <span className="text-[10px] text-[#1BCECE] opacity-0 group-hover:opacity-100 font-medium">Edit</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingVarianceItem({ id: item.id, title: item.title, comments: "" });
                                      setVarianceText("");
                                    }}
                                    className="text-[11px] text-duston-muted hover:text-[#023542] flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <span className="text-xs">+</span> Add comment
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Board view with interactive Drag & Drop */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: "Todo",
                  status: "not_started" as const,
                  dotColor: "bg-slate-400",
                  filterFn: (i: any) =>
                    i.status === "not_started" && !isDeadlineOverdue(i.deadline, i.status),
                },
                {
                  label: "In-Progress",
                  status: "in_progress" as const,
                  dotColor: "bg-[#1BCECE]",
                  filterFn: (i: any) =>
                    i.status !== "done" &&
                    (i.status === "in_progress" || isDeadlineOverdue(i.deadline, i.status)),
                },
                {
                  label: "Done",
                  status: "done" as const,
                  dotColor: "bg-[#39B54A]",
                  filterFn: (i: any) => i.status === "done",
                },
              ].map((col) => {
                const colItems = displayedProjectItems.filter(col.filterFn);
                const isOver = dragOverCol === col.status;

                return (
                  <div
                    key={col.status}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverCol !== col.status) setDragOverCol(col.status);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setDragOverCol(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedId = e.dataTransfer.getData("text/plain");
                      if (droppedId) {
                        handleDropItem(droppedId, col.status);
                      }
                    }}
                    className={cn(
                      "rounded-xl p-3 flex flex-col gap-3 transition-colors min-h-[380px]",
                      isOver
                        ? "bg-[#1BCECE]/10 border-2 border-dashed border-[#1BCECE]"
                        : "bg-duston-bg/60 border border-duston-border"
                    )}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-duston-border/50">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                        <span className="text-xs font-semibold text-duston-dark">{col.label}</span>
                      </div>
                      <span className="text-[10px] text-duston-muted bg-white px-2 py-0.5 rounded-full border border-duston-border font-medium">
                        {colItems.length}
                      </span>
                    </div>

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
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-xs font-medium text-duston-dark line-clamp-2">{item.title}</div>
                                <PriorityFlag priority={item.priority} showLabel={false} />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-duston-muted">{item.assigneeName}</span>
                                <span
                                  className={cn(
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                    isDeadlineOverdue(item.deadline, item.status)
                                      ? "bg-duston-orange/10 text-duston-orange"
                                      : "bg-duston-bg text-duston-muted border border-duston-border"
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
                      onClick={() => {
                        setNewItemPriority("medium");
                        setIsNewItemModalOpen(true);
                      }}
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
        </>
      )}

      {/* Tab 2: Meetings */}
      {activeTab === "meetings" && (
        <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-4">
          {meetings.length === 0 ? (
            <p className="text-xs text-duston-muted italic py-6 text-center">
              No meetings currently tied to this project.
            </p>
          ) : (
            <div className="divide-y divide-duston-border">
              {meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="py-3 flex items-center justify-between hover:bg-duston-bg px-2 rounded-lg transition-colors"
                >
                  <div>
                    <div className="text-xs font-medium text-duston-dark">{m.subject}</div>
                    <div className="text-[11px] text-duston-muted mt-0.5">
                      {m.attendeeCount} attendees recorded
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-duston-muted">
                    <span>{formatDate(m.meetingDate)}</span>
                    <ExternalLink size={14} strokeWidth={1.5} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Activity Timeline */}
      {activeTab === "activity" && (
        <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-6 space-y-4">
          <h3 className="text-xs font-medium text-duston-dark">Project audit timeline</h3>
          {activityLogs.length === 0 ? (
            <p className="text-xs text-duston-muted italic py-4 text-center">
              No activity logs recorded yet.
            </p>
          ) : (
            <div className="space-y-4 border-l-2 border-duston-border pl-4">
              {activityLogs.map((log) => (
                <div key={log.id} className="text-xs space-y-1">
                  <div className="text-duston-dark font-medium">
                    {log.actorName}{" "}
                    <span className="font-normal text-duston-muted">
                      {log.note || `performed ${log.eventType} on "${log.actionItemTitle}"`}
                    </span>
                  </div>
                  <div className="text-[10px] text-duston-muted">
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Details (Inline editable) */}
      {activeTab === "details" && (
        <div className="bg-white border border-duston-border rounded-xl shadow-subtle p-6 space-y-5 text-xs max-w-2xl">
          <div>
            <label className="block text-duston-muted mb-1 font-medium">Description</label>
            <textarea
              rows={4}
              value={details.description}
              onChange={(e) => setDetails({ ...details, description: e.target.value })}
              onBlur={() => handleSaveDetailsField("description", details.description)}
              placeholder="Detailed description of deliverables and scope..."
              className="w-full bg-white border border-duston-border rounded-xl p-3 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Start date</label>
              <input
                type="date"
                value={details.startDate}
                onChange={(e) => {
                  setDetails({ ...details, startDate: e.target.value });
                  handleSaveDetailsField("startDate", e.target.value);
                }}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              />
            </div>
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Target date</label>
              <input
                type="date"
                value={details.targetDate}
                onChange={(e) => {
                  setDetails({ ...details, targetDate: e.target.value });
                  handleSaveDetailsField("targetDate", e.target.value);
                }}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Responsible Party</label>
              <select
                value={details.ownerId}
                onChange={(e) => {
                  setDetails({ ...details, ownerId: e.target.value });
                  handleSaveDetailsField("ownerId", e.target.value);
                }}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Executive sponsor</label>
              <select
                value={details.sponsorId}
                onChange={(e) => {
                  setDetails({ ...details, sponsorId: e.target.value });
                  handleSaveDetailsField("sponsorId", e.target.value);
                }}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              >
                <option value="">None</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Budget & financing notes</label>
            <textarea
              rows={3}
              value={details.budgetNotes}
              onChange={(e) => setDetails({ ...details, budgetNotes: e.target.value })}
              onBlur={() => handleSaveDetailsField("budgetNotes", details.budgetNotes)}
              placeholder="Financing tranches, syndication terms, covenants..."
              className="w-full bg-white border border-duston-border rounded-xl p-3 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>
        </div>
      )}

      {/* New Action Item Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-2xl p-6">
            <h3 className="text-sm font-semibold text-duston-dark mb-4">
              Create action item
            </h3>
            <form onSubmit={handleCreateActionItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Action item *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sign ministerial bilateral guarantee letter"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                />
              </div>

              {/* Responsible Party + inline Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-duston-muted font-medium">Responsible Party *</label>
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
                    value={newItemAssignee}
                    onChange={(e) => setNewItemAssignee(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                  >
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-duston-muted mb-1 font-medium">Priority</label>
                  <select
                    value={newItemPriority}
                    onChange={(e) => setNewItemPriority(e.target.value as any)}
                    className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-duston-muted mb-1 font-medium">Deadline</label>
                  <input
                    type="date"
                    required
                    value={newItemDeadline}
                    onChange={(e) => setNewItemDeadline(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-duston-muted mb-1 font-medium">Comments / Variance note (optional)</label>
                <textarea
                  rows={2}
                  value={newItemComments}
                  onChange={(e) => setNewItemComments(e.target.value)}
                  placeholder="Explain any scope variances, milestone context, or operational notes..."
                  className="w-full bg-white border border-duston-border rounded-lg p-2.5 text-duston-text outline-none focus:border-[#1BCECE] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-duston-border text-duston-text hover:bg-duston-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#023542] hover:bg-[#1BCECE] text-white font-medium transition-colors cursor-pointer"
                >
                  Create action item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variance Note Edit Modal */}
      {editingVarianceItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-duston-dark">
                Variance Explanation / Comments
              </h3>
              <button
                onClick={() => setEditingVarianceItem(null)}
                className="p-1 rounded-md text-duston-muted hover:text-duston-dark cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-duston-muted mb-3">
              Action item: <span className="font-medium text-duston-dark">{editingVarianceItem.title}</span>
            </p>
            <textarea
              rows={4}
              value={varianceText}
              onChange={(e) => setVarianceText(e.target.value)}
              placeholder="Explain any schedule/budget variances, bottlenecks, or delivery notes..."
              className="w-full bg-white border border-duston-border rounded-lg p-3 text-xs text-duston-text outline-none focus:border-[#1BCECE] resize-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingVarianceItem(null)}
                className="px-3 py-1.5 rounded-lg border border-duston-border text-xs text-duston-text hover:bg-duston-bg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVariance}
                disabled={isSavingVariance}
                className="px-4 py-1.5 rounded-lg bg-[#023542] hover:bg-[#1BCECE] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSavingVariance ? "Saving..." : "Save comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Action Register Modal */}
      <ImportRegisterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entities={[{ id: project.entityId, name: project.entityName, brandPrimaryColor: project.entityBrandColor }]}
        projects={[{ id: project.id, name: project.name, entityId: project.entityId, entityName: project.entityName }]}
        users={users}
        currentUserId={currentUserId}
        defaultEntityId={project.entityId}
        defaultProjectId={project.id}
      />
    </div>
  );
}
