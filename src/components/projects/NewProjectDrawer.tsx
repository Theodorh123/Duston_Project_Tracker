"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createProject, CreateProjectInput } from "@/lib/actions/projects";

interface NewProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

export function NewProjectDrawer({
  isOpen,
  onClose,
  entities,
  users,
  currentUserId,
}: NewProjectDrawerProps) {
  const [formData, setFormData] = useState<CreateProjectInput>({
    entityId: entities[0]?.id || "",
    name: "",
    description: "",
    category: "operations",
    status: "not_started",
    priority: "medium",
    ownerId: currentUserId,
    sponsorId: "",
    startDate: new Date().toISOString().split("T")[0],
    targetDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    budgetNotes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createProject({
      ...formData,
      sponsorId: formData.sponsorId || undefined,
    });

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create project");
    }
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 z-40" />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white border-l border-duston-border z-50 flex flex-col shadow-2xl">
        <div className="p-4 border-b border-duston-border flex items-center justify-between bg-duston-bg/50">
          <h2 className="text-sm font-medium text-duston-dark">New project</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-duston-muted hover:text-duston-dark"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Subsidiary *</label>
            <select
              value={formData.entityId}
              onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
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
            <label className="block text-duston-muted mb-1 font-medium">Project name *</label>
            <input
              type="text"
              required
              placeholder="e.g. EBID Trade Finance Facility (USD 50M)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              >
                <option value="capex">CAPEX</option>
                <option value="financing">Financing</option>
                <option value="regulatory">Regulatory</option>
                <option value="commercial">Commercial</option>
                <option value="operations">Operations</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-duston-muted mb-1 font-medium">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Responsible Party *</label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-duston-muted mb-1 font-medium">Executive sponsor</label>
              <select
                value={formData.sponsorId}
                onChange={(e) => setFormData({ ...formData, sponsorId: e.target.value })}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Start date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              />
            </div>

            <div>
              <label className="block text-duston-muted mb-1 font-medium">Target date *</label>
              <input
                type="date"
                required
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-duston-text outline-none focus:border-[#1BCECE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Description</label>
            <textarea
              rows={3}
              placeholder="Strategic goals, scope, and background..."
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-duston-border rounded-lg p-3 text-duston-text outline-none focus:border-[#1BCECE] resize-none"
            />
          </div>

          <div>
            <label className="block text-duston-muted mb-1 font-medium">Budget & financing notes</label>
            <textarea
              rows={2}
              placeholder="Facility fees, covenants, contractor terms..."
              value={formData.budgetNotes || ""}
              onChange={(e) => setFormData({ ...formData, budgetNotes: e.target.value })}
              className="w-full bg-white border border-duston-border rounded-lg p-3 text-duston-text outline-none focus:border-[#1BCECE] resize-none"
            />
          </div>

          <div className="pt-4 border-t border-duston-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-duston-border text-duston-text hover:bg-duston-bg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#023542] hover:bg-[#1BCECE] text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
