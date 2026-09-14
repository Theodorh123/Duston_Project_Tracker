"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckSquare, X, ChevronDown, Check, Building2, Calendar, Folder } from "lucide-react";
import { createTodo } from "@/lib/actions/todos";

interface SyncToTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  initialEntityId?: string | null;
  initialProjectId?: string | null;
  initialDeadline?: string | null;
  entities: Array<{ id: string; name: string; brandPrimaryColor?: string }>;
  projects: Array<{ id: string; name: string; entityId: string }>;
  onSuccess?: () => void;
}

export function SyncToTodoModal({
  isOpen,
  onClose,
  initialTitle,
  initialEntityId,
  initialProjectId,
  initialDeadline,
  entities = [],
  projects = [],
  onSuccess,
}: SyncToTodoModalProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [entityId, setEntityId] = useState(initialEntityId || entities[0]?.id || "");
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [deadline, setDeadline] = useState(initialDeadline || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");
      const resolvedEntity = initialEntityId || entities[0]?.id || "";
      setEntityId(resolvedEntity);
      setProjectId(initialProjectId || "");
      setDeadline(initialDeadline || "");
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialTitle, initialEntityId, initialProjectId, initialDeadline, entities]);

  // Projects filtered by selected entity
  const availableProjects = useMemo(() => {
    if (!entityId) return [];
    return projects.filter((p) => p.entityId === entityId);
  }, [projects, entityId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !entityId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createTodo({
        title: title.trim(),
        entityId,
        projectId: projectId || null,
        dueDate: deadline || null,
        status: "not_started",
      });

      if (res.success) {
        setIsSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error || "Failed to sync to To-Do list");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sync to To-Do list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-xl border border-duston-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1BCECE]/15 flex items-center justify-center text-[#023542]">
              <CheckSquare size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-duston-dark">
                Sync to My To-Do List
              </h2>
              <p className="text-[11px] text-duston-muted">
                Customize this task before saving to your private list
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span>Successfully added to your To-Do list!</span>
            </div>
          )}

          {/* Action Title */}
          <div>
            <label className="block text-xs font-medium text-duston-dark mb-1">
              Action to be done *
            </label>
            <textarea
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Action title..."
              required
              className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#023542] focus:ring-1 focus:ring-[#023542] text-duston-dark resize-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Required Subsidiary */}
            <div>
              <label className="block text-xs font-medium text-duston-dark mb-1">
                Subsidiary *
              </label>
              <div className="relative">
                <select
                  value={entityId}
                  onChange={(e) => {
                    setEntityId(e.target.value);
                    setProjectId("");
                  }}
                  required
                  className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white text-duston-dark focus:outline-none focus:border-[#023542] cursor-pointer appearance-none pr-6 font-medium truncate"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-duston-muted pointer-events-none" />
              </div>
            </div>

            {/* Optional Project */}
            <div>
              <label className="block text-xs font-medium text-duston-dark mb-1">
                Project (optional)
              </label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white text-duston-dark focus:outline-none focus:border-[#023542] cursor-pointer appearance-none pr-6 font-medium truncate"
                >
                  <option value="">No Project</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-duston-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-duston-dark mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white text-duston-dark focus:outline-none focus:border-[#023542] cursor-pointer font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-duston-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !entityId}
              className="px-4 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white disabled:opacity-50 text-xs font-medium rounded-lg transition-colors shadow-subtle flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare size={13} />
              <span>{isSubmitting ? "Saving..." : "Save to To-Do List"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
