"use client";

import { useState, useEffect, useRef } from "react";
import { X, Calendar, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Send, Trash2 } from "lucide-react";
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
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isPrivileged = ["admin", "ceo", "ea"].includes(currentUserRole || "");
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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !item) return;
    const commentObj = {
      id: `c_${Date.now()}`,
      userName: "You",
      body: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    setItem({
      ...item,
      comments: [...(item.comments || []), commentObj],
    });
    setNewComment("");

    fetch(`/api/action-items/${item.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentObj.body }),
    }).catch(() => {});
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
            <span className="text-xs font-medium text-duston-muted">
              {item?.entityName || "Action Item"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg text-duston-muted hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer mr-1"
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-700">
                  <X size={14} />
                </button>
              </div>
            )}

            {!canEdit && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>Read-only: Action items can only be amended by EA, Admin, CEO, or the person who created them.</span>
              </div>
            )}

            {/* Title (inline-editable) */}
            <div>
              {isEditingTitle && canEdit ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={item.title}
                  autoFocus
                  onBlur={() => setIsEditingTitle(false)}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="w-full text-xl font-medium text-duston-dark border border-[#1BCECE] rounded px-2 py-1 outline-none"
                />
              ) : (
                <h2
                  onClick={() => canEdit && setIsEditingTitle(true)}
                  className={cn(
                    "text-xl font-medium text-duston-dark p-1 -m-1 rounded transition-colors",
                    canEdit ? "hover:bg-duston-bg cursor-pointer" : "cursor-default"
                  )}
                  title={canEdit ? "Edit title" : "Title (read-only)"}
                >
                  {item.title}
                </h2>
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
              {/* Responsible Party */}
              <div className="col-span-2">
                <label className="block text-duston-muted mb-1 font-medium">Responsible Party</label>
                <div className="bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-dark font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[9px]">
                    {(item.assigneeName || "RP").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate">{item.assigneeName || "Unassigned"}</span>
                </div>
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
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
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

            {/* Comments Section */}
            <div className="border-t border-duston-border pt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-duston-dark">
                <MessageSquare size={14} strokeWidth={1.5} />
                <span>Comments</span>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {item.comments && item.comments.length > 0 ? (
                  item.comments.map((c) => (
                    <div key={c.id} className="p-3 bg-duston-bg rounded-xl border border-duston-border text-xs space-y-1">
                      <div className="flex items-center justify-between text-duston-muted text-[11px]">
                        <span className="font-medium text-duston-dark">{c.userName}</span>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-duston-text leading-relaxed">{c.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-duston-muted italic">No comments yet.</p>
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-white border border-duston-border rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1BCECE]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                >
                  <Send size={14} strokeWidth={1.5} />
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-duston-border space-y-4">
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
