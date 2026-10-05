"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, CheckCircle2, AlertTriangle, Building2, Calendar, User, Tag, ShieldAlert } from "lucide-react";
import { updateProject, deleteProject, CreateProjectInput } from "@/lib/actions/projects";

export interface ProjectData {
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
  entityName?: string;
  ownerId?: string | null;
  ownerName?: string | null;
  sponsorId?: string | null;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  entities: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  canDelete?: boolean;
  onProjectUpdated?: (updated: ProjectData) => void;
  onProjectDeleted?: (projectId: string) => void;
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  entities,
  users,
  canDelete = true,
  onProjectUpdated,
  onProjectDeleted,
}: EditProjectModalProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<CreateProjectInput>({
    entityId: project.entityId,
    name: project.name,
    description: project.description || "",
    category: (project.category as any) || "operations",
    status: (project.status as any) || "not_started",
    priority: (project.priority as any) || "medium",
    ownerId: project.ownerId || "",
    sponsorId: project.sponsorId || "",
    startDate: project.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
    targetDate: project.targetDate?.split("T")[0] || new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    budgetNotes: project.budgetNotes || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state if project prop changes
  useEffect(() => {
    setFormData({
      entityId: project.entityId,
      name: project.name,
      description: project.description || "",
      category: (project.category as any) || "operations",
      status: (project.status as any) || "not_started",
      priority: (project.priority as any) || "medium",
      ownerId: project.ownerId || "",
      sponsorId: project.sponsorId || "",
      startDate: project.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      targetDate: project.targetDate?.split("T")[0] || new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
      budgetNotes: project.budgetNotes || "",
    });
    setError(null);
    setShowDeleteConfirm(false);
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await updateProject(project.id, {
      entityId: formData.entityId,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      category: formData.category,
      status: formData.status,
      priority: formData.priority,
      ownerId: formData.ownerId || undefined,
      sponsorId: formData.sponsorId || undefined,
      startDate: formData.startDate,
      targetDate: formData.targetDate,
      budgetNotes: formData.budgetNotes?.trim() || undefined,
    });

    if (res.success) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("project-updated", { detail: { id: project.id, ...formData } })
        );
      }
      onProjectUpdated?.({
        ...project,
        ...formData,
        description: formData.description || null,
        budgetNotes: formData.budgetNotes || null,
        ownerId: formData.ownerId || null,
        sponsorId: formData.sponsorId || null,
      });
      router.refresh();
      onClose();
    } else {
      setError(res.error || "Failed to update project.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    const res = await deleteProject(project.id);

    if (res.success) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("project-deleted", { detail: { id: project.id } })
        );
      }
      onProjectDeleted?.(project.id);
      onClose();
      router.refresh();
    } else {
      setError(res.error || "Failed to delete project.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] flex flex-col shadow-2xl border border-duston-border overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-duston-dark">
              Edit Project
            </h2>
            <p className="text-[11px] text-duston-muted">
              Update project details, timelines, ownership, and scope
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Delete Confirmation Banner View */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-duston-orange/10 border border-duston-orange/25 text-duston-orange flex items-start gap-3">
              <ShieldAlert size={22} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-sm block">Delete Project Permanently?</span>
                <p className="text-xs leading-relaxed text-duston-dark">
                  Are you sure you want to delete <strong>{project.name}</strong>?
                </p>
                <p className="text-[11px] text-duston-muted leading-relaxed pt-1">
                  Deliverables and action items associated with this project will remain intact in the action register under their subsidiary, but will no longer be linked to this project.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-duston-border">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 border border-duston-border rounded-xl bg-white hover:bg-duston-bg text-duston-dark font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2.5 bg-duston-orange hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-subtle"
              >
                <Trash2 size={14} />
                <span>{deleting ? "Deleting..." : "Confirm & Delete"}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain">
              {error && (
                <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Project Name */}
              <div>
                <label className="block text-duston-dark mb-1 font-semibold">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Expansion of Tarkwa Retail Site"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-duston-border rounded-xl px-3.5 py-2.5 text-xs text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE] transition-all font-medium"
                />
              </div>

              {/* Subsidiary & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Subsidiary Entity *
                  </label>
                  <select
                    value={formData.entityId}
                    onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                    required
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                  >
                    <option value="operations">Operations</option>
                    <option value="capex">CAPEX</option>
                    <option value="financing">Financing</option>
                    <option value="commercial">Commercial</option>
                    <option value="regulatory">Regulatory</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="on_hold">On hold</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Project Lead (Owner) & Sponsor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Project Lead / Owner
                  </label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Executive Sponsor
                  </label>
                  <select
                    value={formData.sponsorId}
                    onChange={(e) => setFormData({ ...formData, sponsorId: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                  >
                    <option value="">None</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                  />
                </div>
                <div>
                  <label className="block text-duston-dark mb-1 font-semibold">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                  />
                </div>
              </div>

              {/* Description / Scope */}
              <div>
                <label className="block text-duston-dark mb-1 font-semibold">
                  Scope & Deliverables Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed project description, strategic rationale, and target outcomes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-duston-border rounded-xl p-3 text-xs text-duston-text outline-none focus:border-[#1BCECE] resize-none"
                />
              </div>

              {/* Budget Notes */}
              <div>
                <label className="block text-duston-dark mb-1 font-semibold">
                  Budget & Financing Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Approved budget, syndication terms, covenants, disbursement tranches..."
                  value={formData.budgetNotes}
                  onChange={(e) => setFormData({ ...formData, budgetNotes: e.target.value })}
                  className="w-full bg-white border border-duston-border rounded-xl p-3 text-xs text-duston-text outline-none focus:border-[#1BCECE] resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-duston-orange hover:bg-duston-orange/10 border border-transparent hover:border-duston-orange/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete project</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-duston-border bg-white hover:bg-duston-bg text-duston-dark text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-subtle"
                >
                  <CheckCircle2 size={14} />
                  <span>{loading ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
