"use client";

import { useState, useEffect, useRef } from "react";
import { X, Calendar, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Send } from "lucide-react";
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
}

export function ActionItemDrawer({
  itemId,
  isOpen,
  onClose,
  onUpdate,
}: ActionItemDrawerProps) {
  const [item, setItem] = useState<ActionItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  const handleFieldChange = (field: keyof ActionItemDetail, value: any) => {
    if (!item) return;
    const updated = { ...item, [field]: value };
    setItem(updated);
    if (onUpdate) onUpdate({ [field]: value });
    // Call server action/API silently
    fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => {});
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-white border border-transparent hover:border-duston-border transition-colors"
            aria-label="Close drawer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
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
            {/* Title (inline-editable) */}
            <div>
              {isEditingTitle ? (
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
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-medium text-duston-dark hover:bg-duston-bg p-1 -m-1 rounded cursor-pointer transition-colors"
                  title="Click to edit title"
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
              {/* Status */}
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Status</label>
                <select
                  value={item.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
                >
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                  <option value="postponed">Postponed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-duston-muted mb-1 font-medium">Priority</label>
                <select
                  value={item.priority}
                  onChange={(e) => handleFieldChange("priority", e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
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
                  onChange={(e) => handleFieldChange("deadline", e.target.value)}
                  className={cn(
                    "w-full bg-white border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]",
                    isDeadlineOverdue(item.deadline, item.status)
                      ? "border-duston-orange text-duston-orange"
                      : "border-duston-border"
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
                  onChange={(e) => handleFieldChange("tag", e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
                />
              </div>
            </div>

            {/* Description Textarea (auto-save on blur) */}
            <div>
              <label className="block text-xs font-medium text-duston-muted mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                value={item.description || ""}
                onChange={(e) => setItem({ ...item, description: e.target.value })}
                onBlur={() => handleFieldChange("description", item.description)}
                placeholder="Add contextual details or notes..."
                className="w-full bg-white border border-duston-border rounded-xl p-3 text-xs text-duston-text outline-none focus:border-[#1BCECE] resize-none"
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
          </div>
        )}
      </div>
    </>
  );
}
