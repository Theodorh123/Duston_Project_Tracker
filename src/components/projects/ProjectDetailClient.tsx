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
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { cn, formatDate, formatShortDate, isDeadlineOverdue } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";
import { updateProject } from "@/lib/actions/projects";
import { createActionItem } from "@/lib/actions/action-items";
import { ImportRegisterModal } from "../action-items/ImportRegisterModal";

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
  const [actionItemsView, setActionItemsView] = useState<"list" | "kanban">("list");
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemsList, setItemsList] = useState(actionItems);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

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

  // New action item state
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemAssignee, setNewItemAssignee] = useState(currentUserId);
  const [newItemDeadline, setNewItemDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [newItemPriority, setNewItemPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

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
      assigneeId: newItemAssignee,
      deadline: newItemDeadline,
      priority: newItemPriority,
      createdBy: currentUserId,
    });

    if (res.success && res.item) {
      const assignedUser = users.find((u) => u.id === newItemAssignee);
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
        },
        ...prev,
      ]);
      setNewItemTitle("");
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
              <table className="w-full min-w-[650px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Responsible Party</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-duston-border">
                  {itemsList.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openActionItem(item.id)}
                      className="hover:bg-duston-bg cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-duston-dark">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-duston-dark">
                        {item.assigneeName}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-duston-bg border border-duston-border text-[11px] text-duston-text">
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "capitalize text-[11px] font-medium",
                            item.priority === "critical"
                              ? "text-duston-orange"
                              : item.priority === "high"
                              ? "text-duston-amber"
                              : "text-duston-muted"
                          )}
                        >
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                const colItems = itemsList.filter(col.filterFn);
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
                      "rounded-xl p-3.5 flex flex-col space-y-3 min-h-[380px] transition-all duration-150",
                      isOver
                        ? "bg-[#1BCECE]/10 border-2 border-dashed border-[#1BCECE] shadow-sm scale-[1.01]"
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
                              <div className="text-xs font-medium text-duston-dark line-clamp-2">{item.title}</div>
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
            <h3 className="text-sm font-medium text-duston-dark mb-4">
              Create action item
            </h3>
            <form onSubmit={handleCreateActionItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sign ministerial bilateral guarantee letter"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-duston-muted mb-1 font-medium">Responsible Party</label>
                  <select
                    value={newItemAssignee}
                    onChange={(e) => setNewItemAssignee(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-duston-border text-duston-text hover:bg-duston-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#023542] hover:bg-[#1BCECE] text-white font-medium transition-colors"
                >
                  Add item
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
