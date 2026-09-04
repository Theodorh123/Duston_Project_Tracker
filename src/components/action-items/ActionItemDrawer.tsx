"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Trash2,
  Plus,
  Users,
  Edit2,
  Check,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";

export interface ActionItemDetail {
  id: string;
  projectId: string;
  projectName?: string;
  entityName?: string;
  entityBrandColor?: string;
  title: string;
  description?: string | null;
  assigneeId: string;
  assigneeName?: string;
  secondaryAssigneeIds?: string[];
  secondaryAssignees?: Array<{ id: string; name: string }>;
  deadline: string;
  status: "not_started" | "in_progress" | "blocked" | "done" | "postponed";
  priority: "low" | "medium" | "high" | "critical";
  tag?: string | null;
  sourceMeetingId?: string | null;
  sourceMeetingSubject?: string | null;
  createdBy?: string;
  comments?: Array<{
    id: string;
    userName: string;
    userRole?: string | null;
    body: string;
    createdAt: string;
  }>;
  activityLogs?: Array<{
    id: string;
    actorName: string;
    eventType: string;
    fromValue?: string | null;
    toValue?: string | null;
    note?: string | null;
    createdAt: string;
  }>;
}

interface ActionItemDrawerProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedItem: Partial<ActionItemDetail>) => void;
  onDelete?: (deletedItemId: string) => void;
  currentUserId?: string;
  currentUserRole?: string;
}

export function ActionItemDrawer({
  itemId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  currentUserId,
  currentUserRole,
}: ActionItemDrawerProps) {
  const [item, setItem] = useState<ActionItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [availableProjects, setAvailableProjects] = useState<
    Array<{ id: string; name: string; entityName?: string; entityBrandColor?: string }>
  >([]);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Edit Action Item Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    secondaryAssigneeIds: [] as string[],
    status: "not_started" as "not_started" | "in_progress" | "blocked" | "done" | "postponed",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    deadline: "",
    tag: "",
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setAvailableUsers(data);
        })
        .catch(() => {});

      fetch("/api/projects")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setAvailableProjects(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const normalizedRole = (currentUserRole || "").toLowerCase().trim();
  const isPrivileged = ["admin", "ceo", "ea"].includes(normalizedRole);
  const canDelete = isPrivileged;
  const canEdit = isPrivileged || (Boolean(item?.createdBy) && item?.createdBy === currentUserId);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch or populate action item details when itemId changes
  useEffect(() => {
    if (!itemId || !isOpen) {
      setItem(null);
      return;
    }

    setLoading(true);
    // Fetch from API or Server Action; for initial render, mock/fetch
    fetch(`/api/action-items/${itemId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setItem(data);
        } else {
          // Fallback realistic item state
          setItem({
            id: itemId,
            projectId: "proj-1",
            projectName: "EBID Trade Finance Facility (USD 50M)",
            entityName: "MOSL Ltd",
            entityBrandColor: "#FF8B00",
            title: "Submit draft term sheet to Stanbic Bank",
            description:
              "Stanbic syndication desk requires confirmed sign-off on sovereign pledge clauses before legal documentation circulation.",
            assigneeId: "user-1",
            assigneeName: "Theophilus Dorh",
            deadline: "2026-09-05",
            status: "in_progress",
            priority: "critical",
            tag: "Syndication",
            sourceMeetingId: "meet-1",
            sourceMeetingSubject: "MOSL Board & Financing Committee Review",
            comments: [
              {
                id: "c1",
                userName: "Elton K. Dusi",
                body: "Stanbic MD confirmed verbally they will accept the sovereign backstop if signed by Tuesday.",
                createdAt: "2026-09-01T14:30:00Z",
              },
            ],
            activityLogs: [
              {
                id: "a1",
                actorName: "Elton K. Dusi",
                eventType: "created",
                note: "Created action item from Board meeting",
                createdAt: "2026-08-30T10:00:00Z",
              },
              {
                id: "a2",
                actorName: "Theophilus Dorh",
                eventType: "status_change",
                fromValue: "not_started",
                toValue: "in_progress",
                note: "Moved to In Progress",
                createdAt: "2026-08-31T09:15:00Z",
              },
            ],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [itemId, isOpen]);

  const handleFieldChange = async (field: keyof ActionItemDetail, value: any) => {
    if (!item) return;
    if (!canEdit) {
      setErrorMessage("Permission denied: Only EA, Admin, CEO, or the creator can amend this action item.");
      return;
    }
    setErrorMessage(null);
    const updated = { ...item, [field]: value };
    setItem(updated);
    if (onUpdate) onUpdate({ [field]: value });

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to update field");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update field");
    }
  };

  const openEditModal = () => {
    if (!item) return;
    setEditFormData({
      title: item.title || "",
      projectId: item.projectId || "",
      assigneeId: item.assigneeId || "",
      secondaryAssigneeIds: item.secondaryAssigneeIds ? [...item.secondaryAssigneeIds] : [],
      status: item.status,
      priority: item.priority,
      deadline: item.deadline ? item.deadline.slice(0, 10) : "",
      tag: item.tag || "",
      description: item.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || isSavingAll) return;
    if (!editFormData.title.trim()) {
      setErrorMessage("Action item title is required.");
      return;
    }
    setIsSavingAll(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update action item");
      }

      // Re-fetch updated full item
      const refreshed = await fetch(`/api/action-items/${item.id}`).then((r) =>
        r.ok ? r.json() : null
      );
      if (refreshed) {
        setItem(refreshed);
        if (onUpdate) onUpdate(refreshed);
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update action item");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!canDelete) {
      setErrorMessage("Only EA, Admin, or CEO can delete action items.");
      return;
    }
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDeleteConfirm(false);
        if (onDelete) onDelete(item.id);
        onClose();
        window.location.reload();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to delete action item");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete action item");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveSecondary = (idToRemove: string) => {
    if (!item || !canEdit) return;
    const newIds = (item.secondaryAssigneeIds || []).filter((id) => id !== idToRemove);
    const newAssignees = (item.secondaryAssignees || []).filter((u) => u.id !== idToRemove);
    setItem({ ...item, secondaryAssigneeIds: newIds, secondaryAssignees: newAssignees });
    handleFieldChange("secondaryAssigneeIds", newIds);
  };

  const handleAddSecondary = (userIdToAdd: string) => {
    if (!item || !canEdit || !userIdToAdd) return;
    if (item.secondaryAssigneeIds?.includes(userIdToAdd)) return;
    const newIds = [...(item.secondaryAssigneeIds || []), userIdToAdd];
    const addedUser = availableUsers.find((u) => u.id === userIdToAdd);
    const newAssignees = addedUser
      ? [...(item.secondaryAssignees || []), addedUser]
      : (item.secondaryAssignees || []);
    setItem({ ...item, secondaryAssigneeIds: newIds, secondaryAssignees: newAssignees });
    handleFieldChange("secondaryAssigneeIds", newIds);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !item) return;
    const commentBody = newComment.trim();
    setNewComment("");

    const isLead = currentUserId === item.assigneeId;
    const isCoOwner = item.secondaryAssigneeIds?.includes(currentUserId || "");
    const calculatedRole = isLead ? "Lead Owner" : isCoOwner ? "Co-Owner" : undefined;

    const commentObj = {
      id: `c_${Date.now()}`,
      userName: "You",
      userRole: calculatedRole,
      body: commentBody,
      createdAt: new Date().toISOString(),
    };
    setItem({
      ...item,
      comments: [commentObj, ...(item.comments || [])],
    });

    try {
      const res = await fetch(`/api/action-items/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (res.ok) {
        // Refresh item to get server-rendered comment list and roles
        const refreshed = await fetch(`/api/action-items/${item.id}`).then((r) =>
          r.ok ? r.json() : null
        );
        if (refreshed) {
          setItem(refreshed);
        }
      }
    } catch {
      // Keep optimistic comment on error
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 bg-white border-l border-duston-border flex flex-col transition-transform duration-200 ease-in-out shadow-2xl",
          "w-full sm:w-[480px]"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-duston-border flex items-center justify-between bg-duston-bg/60">
          <div className="flex items-center gap-2">
            {item?.entityBrandColor && (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.entityBrandColor }}
              />
            )}
            <span className="text-xs font-semibold text-duston-dark truncate max-w-[200px]">
              {item?.entityName || "Action Item"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Prominent Edit Item Button */}
            {canEdit && (
              <button
                type="button"
                onClick={openEditModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#023542] hover:bg-[#1BCECE] text-white transition-colors cursor-pointer shadow-2xs"
                title="Edit this action item (Admin, EA, CEO, Creator)"
              >
                <Edit2 size={13} />
                <span>Edit item</span>
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg text-duston-muted hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                title="Delete action item (EA, Admin, CEO)"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-white border border-transparent hover:border-duston-border transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        {loading || !item ? (
          <div className="p-6 space-y-4">
            <div className="h-6 w-3/4 skeleton-quiet" />
            <div className="h-4 w-1/2 skeleton-quiet" />
            <div className="h-24 w-full skeleton-quiet" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700">
                  <X size={14} />
                </button>
              </div>
            )}

            {canEdit ? (
              <div className="flex items-center justify-between p-2.5 bg-[#1BCECE]/10 border border-[#1BCECE]/30 rounded-xl text-xs text-[#023542]">
                <span className="font-medium flex items-center gap-1.5">
                  <Edit2 size={13} className="text-[#023542]" />
                  <span>Authorized to edit (Admin / EA / Owner)</span>
                </span>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="text-xs font-bold underline hover:text-[#1BCECE] cursor-pointer"
                >
                  Edit all fields →
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>Read-only: Action items can only be amended by EA, Admin, CEO, or the person who created them.</span>
              </div>
            )}

            {/* Title (inline-editable with save confirmation) */}
            <div>
              {isEditingTitle && canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={item.title}
                    autoFocus
                    onChange={(e) => setItem({ ...item, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleFieldChange("title", item.title);
                        setIsEditingTitle(false);
                      } else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                      }
                    }}
                    className="w-full text-lg sm:text-xl font-medium text-duston-dark border border-[#1BCECE] rounded-lg px-2.5 py-1 outline-none ring-2 ring-[#1BCECE]/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange("title", item.title);
                      setIsEditingTitle(false);
                    }}
                    className="p-1.5 rounded-lg bg-[#023542] text-white hover:bg-[#1BCECE] transition-colors shrink-0 cursor-pointer"
                    title="Save title"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2 group">
                  <h2
                    onClick={() => canEdit && setIsEditingTitle(true)}
                    className={cn(
                      "text-lg sm:text-xl font-medium text-duston-dark p-1 -m-1 rounded transition-colors flex-1",
                      canEdit ? "hover:bg-duston-bg cursor-pointer" : "cursor-default"
                    )}
                    title={canEdit ? "Click to edit title" : "Title (read-only)"}
                  >
                    {item.title}
                  </h2>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 rounded-md text-duston-muted hover:text-[#023542] hover:bg-duston-bg opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0 mt-0.5"
                      title="Edit title"
                    >
                      <Edit2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Breadcrumb Links Strip */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-duston-muted">
              <span>Project:</span>
              <Link
                href={`/projects/${item.projectId}`}
                className="font-medium text-[#023542] hover:text-[#1BCECE] underline underline-offset-2"
              >
                {item.projectName || "View project"}
              </Link>
              {item.sourceMeetingSubject && (
                <>
                  <span className="text-duston-border">•</span>
                  <span>Meeting:</span>
                  <Link
                    href={`/meetings/${item.sourceMeetingId}`}
                    className="font-medium text-[#023542] hover:text-[#1BCECE] underline underline-offset-2"
                  >
                    {item.sourceMeetingSubject}
                  </Link>
                </>
              )}
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-duston-border bg-duston-bg/40 text-xs">
              {/* Project Selection / Reassignment */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-duston-muted font-medium">Assigned Project</label>
                  <Link
                    href={`/projects/${item.projectId}`}
                    className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-semibold underline underline-offset-2"
                  >
                    View project details →
                  </Link>
                </div>
                {canEdit && availableProjects.length > 0 ? (
                  <select
                    value={item.projectId}
                    onChange={(e) => {
                      const proj = availableProjects.find((p) => p.id === e.target.value);
                      setItem({
                        ...item,
                        projectId: e.target.value,
                        projectName: proj?.name || item.projectName,
                        entityName: proj?.entityName || item.entityName,
                        entityBrandColor: proj?.entityBrandColor || item.entityBrandColor,
                      });
                      handleFieldChange("projectId", e.target.value);
                    }}
                    className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
                  >
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.entityName ? `(${p.entityName})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-dark font-medium">
                    {item.projectName}
                  </div>
                )}
              </div>

              {/* Primary Responsible Party (Lead) */}
              <div className="col-span-2">
                <label className="block text-duston-muted mb-1 font-medium">Primary Responsible Party (Lead)</label>
                {canEdit && availableUsers.length > 0 ? (
                  <select
                    value={item.assigneeId}
                    onChange={(e) => {
                      const u = availableUsers.find((user) => user.id === e.target.value);
                      setItem({
                        ...item,
                        assigneeId: e.target.value,
                        assigneeName: u?.name || item.assigneeName,
                      });
                      handleFieldChange("assigneeId", e.target.value);
                    }}
                    className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer font-medium"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-dark font-medium flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[9px] font-semibold">
                      {(item.assigneeName || "RP").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{item.assigneeName || "Unassigned"}</span>
                    <span className="ml-auto text-[10px] text-duston-muted bg-duston-bg px-2 py-0.5 rounded border border-duston-border">
                      Lead Owner
                    </span>
                  </div>
                )}
              </div>

              {/* Secondary Responsible Parties (Co-owners) */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-duston-muted font-medium">
                    Secondary Responsible Parties (Co-owners)
                  </label>
                  <span className="text-[10px] text-duston-muted">
                    {(item.secondaryAssignees?.length ?? 0)} co-owner{(item.secondaryAssignees?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Chips list */}
                <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-white border border-duston-border rounded-lg items-center">
                  {(!item.secondaryAssignees || item.secondaryAssignees.length === 0) ? (
                    <span className="text-duston-muted text-xs italic">No secondary co-owners assigned.</span>
                  ) : (
                    item.secondaryAssignees.map((sec) => (
                      <span
                        key={sec.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-duston-bg border border-duston-border text-duston-dark"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#1BCECE]/20 text-[#023542] font-semibold text-[8px] flex items-center justify-center">
                          {sec.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span>{sec.name}</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSecondary(sec.id)}
                            className="text-duston-muted hover:text-rose-600 ml-0.5 cursor-pointer"
                            title={`Remove ${sec.name}`}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>

                {/* Add Secondary Selector (if canEdit) */}
                {canEdit && availableUsers.length > 0 && (
                  <div className="pt-0.5">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddSecondary(e.target.value);
                        }
                      }}
                      className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-xs text-duston-text outline-none focus:border-[#1BCECE] cursor-pointer"
                    >
                      <option value="" disabled>+ Add secondary responsible party (co-owner)...</option>
                      {availableUsers
                        .filter((u) => u.id !== item.assigneeId && !item.secondaryAssigneeIds?.includes(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Status</label>
                <select
                  value={item.status}
                  disabled={!canEdit}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  className={cn(
                    "w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]",
                    !canEdit && "opacity-60 cursor-not-allowed bg-slate-50"
                  )}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In-Progress</option>
                  <option value="done">Done</option>
                  <option value="postponed">Postponed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Priority</label>
                <select
                  value={item.priority}
                  disabled={!canEdit}
                  onChange={(e) => handleFieldChange("priority", e.target.value)}
                  className={cn(
                    "w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]",
                    !canEdit && "opacity-60 cursor-not-allowed bg-slate-50"
                  )}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Deadline</label>
                <input
                  type="date"
                  value={item.deadline}
                  disabled={!canEdit}
                  onChange={(e) => handleFieldChange("deadline", e.target.value)}
                  className={cn(
                    "w-full bg-white border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]",
                    isDeadlineOverdue(item.deadline, item.status)
                      ? "border-duston-orange text-duston-orange"
                      : "border-duston-border",
                    !canEdit && "opacity-60 cursor-not-allowed bg-slate-50"
                  )}
                />
              </div>

              {/* Tag */}
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Legal, Treasury"
                  value={item.tag || ""}
                  disabled={!canEdit}
                  onChange={(e) => handleFieldChange("tag", e.target.value)}
                  className={cn(
                    "w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]",
                    !canEdit && "opacity-60 cursor-not-allowed bg-slate-50"
                  )}
                />
              </div>
            </div>

            {/* Description Textarea (auto-save on blur) */}
            <div>
              <label className="block text-xs font-medium text-duston-muted mb-1.5">
                Description / Variance notes
              </label>
              <textarea
                rows={4}
                value={item.description || ""}
                disabled={!canEdit}
                onChange={(e) => setItem({ ...item, description: e.target.value })}
                onBlur={() => handleFieldChange("description", item.description)}
                placeholder="Add contextual details, variance explanations, or operational notes..."
                className={cn(
                  "w-full bg-white border border-duston-border rounded-xl p-3 text-xs text-duston-text outline-none focus:border-[#1BCECE] resize-none",
                  !canEdit && "opacity-60 cursor-not-allowed bg-slate-50"
                )}
              />
            </div>

            {/* Comments & Progress Updates Section */}
            <div className="border-t border-duston-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-duston-dark">
                  <MessageSquare size={14} strokeWidth={1.5} className="text-[#1BCECE]" />
                  <span>Progress Updates & Comments ({item.comments?.length || 0})</span>
                </div>
                <span className="text-[10px] text-duston-muted">
                  Visible to all project members
                </span>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {item.comments && item.comments.length > 0 ? (
                  item.comments.map((c) => (
                    <div key={c.id} className="p-3 bg-duston-bg rounded-xl border border-duston-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-duston-muted text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-duston-dark">{c.userName}</span>
                          {c.userRole && (
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded text-[9px] font-semibold",
                                c.userRole === "Lead Owner"
                                  ? "bg-[#023542] text-white"
                                  : "bg-[#1BCECE]/20 text-[#023542] border border-[#1BCECE]/40"
                              )}
                            >
                              {c.userRole}
                            </span>
                          )}
                        </div>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-duston-text leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-duston-muted italic bg-duston-bg/60 p-3 rounded-xl border border-duston-border text-center">
                    No progress updates recorded yet. Any responsible party can post updates here.
                  </p>
                )}
              </div>

              {/* Comment / Progress Update Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post an official progress update or comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-white border border-duston-border rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1BCECE]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3.5 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send size={13} strokeWidth={1.5} />
                  <span>Update</span>
                </button>
              </form>
            </div>

            {/* Collapsible Activity Timeline */}
            <div className="border-t border-duston-border pt-4">
              <button
                type="button"
                onClick={() => setIsActivityOpen(!isActivityOpen)}
                className="w-full flex items-center justify-between text-xs font-medium text-duston-muted hover:text-duston-dark py-1"
              >
                <span>Activity timeline ({item.activityLogs?.length || 0})</span>
                {isActivityOpen ? (
                  <ChevronUp size={14} strokeWidth={1.5} />
                ) : (
                  <ChevronDown size={14} strokeWidth={1.5} />
                )}
              </button>

              {isActivityOpen && (
                <div className="mt-3 space-y-3 pl-2 border-l-2 border-duston-border ml-1">
                  {item.activityLogs?.map((log) => (
                    <div key={log.id} className="text-xs space-y-0.5">
                      <div className="text-duston-dark font-medium">
                        {log.actorName}{" "}
                        <span className="text-duston-muted font-normal">
                          {log.note || log.eventType}
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

            {/* Delete Action Item Section (for EA, Admin, CEO) */}
            {canDelete && (
              <div className="pt-4 border-t border-duston-border">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete action item</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dedicated Edit Action Item Modal */}
      {isEditModalOpen && item && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-duston-border overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-duston-dark flex items-center gap-2">
                  <Edit2 size={16} className="text-[#023542]" />
                  <span>Edit Action Item</span>
                </h3>
                <p className="text-[11px] text-duston-muted mt-0.5">
                  Update deliverable details, assignees, deadlines, and project assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-white border border-transparent hover:border-duston-border transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Deliverable Title */}
              <div>
                <label className="block font-semibold text-duston-dark mb-1">
                  Action Item Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Submit draft term sheet to Stanbic Bank"
                  className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE] ring-1 ring-transparent focus:ring-[#1BCECE]/20 font-medium"
                />
              </div>

              {/* Project Assignment */}
              <div>
                <label className="block font-semibold text-duston-dark mb-1">
                  Assigned Project <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editFormData.projectId}
                  onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })}
                  className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
                >
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.entityName ? `(${p.entityName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary Responsible Party (Lead) */}
              <div>
                <label className="block font-semibold text-duston-dark mb-1">
                  Primary Responsible Party (Lead) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editFormData.assigneeId}
                  onChange={(e) => setEditFormData({ ...editFormData, assigneeId: e.target.value })}
                  className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Secondary Responsible Parties (Co-owners) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-duston-dark">
                    Secondary Responsible Parties (Co-owners)
                  </label>
                  <span className="text-[10px] text-duston-muted">
                    {editFormData.secondaryAssigneeIds.length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-duston-bg/40 border border-duston-border rounded-xl items-center">
                  {editFormData.secondaryAssigneeIds.length === 0 ? (
                    <span className="text-duston-muted text-xs italic">No co-owners selected.</span>
                  ) : (
                    editFormData.secondaryAssigneeIds.map((userId) => {
                      const u = availableUsers.find((x) => x.id === userId);
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-duston-border text-duston-dark shadow-2xs"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#1BCECE]/20 text-[#023542] font-semibold text-[8px] flex items-center justify-center">
                            {(u?.name || "U").slice(0, 2).toUpperCase()}
                          </span>
                          <span>{u?.name || "User"}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditFormData({
                                ...editFormData,
                                secondaryAssigneeIds: editFormData.secondaryAssigneeIds.filter((id) => id !== userId),
                              })
                            }
                            className="text-duston-muted hover:text-rose-600 ml-0.5 cursor-pointer"
                            title={`Remove ${u?.name || "User"}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                {availableUsers.filter(
                  (u) =>
                    u.id !== editFormData.assigneeId &&
                    !editFormData.secondaryAssigneeIds.includes(u.id)
                ).length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !editFormData.secondaryAssigneeIds.includes(e.target.value)) {
                        setEditFormData({
                          ...editFormData,
                          secondaryAssigneeIds: [...editFormData.secondaryAssigneeIds, e.target.value],
                        });
                      }
                    }}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
                  >
                    <option value="" disabled>+ Add secondary responsible party...</option>
                    {availableUsers
                      .filter(
                        (u) =>
                          u.id !== editFormData.assigneeId &&
                          !editFormData.secondaryAssigneeIds.includes(u.id)
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-duston-dark mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In-Progress</option>
                    <option value="done">Done</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-duston-dark mb-1">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Tag Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-duston-dark mb-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-duston-dark mb-1">Tag / Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Legal, Treasury"
                    value={editFormData.tag}
                    onChange={(e) => setEditFormData({ ...editFormData, tag: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-duston-dark outline-none focus:border-[#1BCECE]"
                  />
                </div>
              </div>

              {/* Description / Variance Notes */}
              <div>
                <label className="block font-semibold text-duston-dark mb-1">
                  Description / Operational Notes
                </label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Context, counterparty requirements, or variance explanations..."
                  className="w-full bg-white border border-duston-border rounded-xl p-3 text-duston-dark outline-none focus:border-[#1BCECE] resize-none"
                />
              </div>

              {/* Form Footer */}
              <div className="pt-2 border-t border-duston-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingAll}
                  className="px-4 py-2 border border-duston-border hover:bg-duston-bg text-duston-muted hover:text-duston-dark rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAll}
                  className="px-5 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingAll ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-duston-border space-y-4 my-auto">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-duston-dark">Delete Action Item?</h3>
              <p className="text-xs text-duston-muted mt-1">
                Are you sure you want to permanently delete "{item?.title}"? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-duston-border text-duston-muted hover:text-duston-dark text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
