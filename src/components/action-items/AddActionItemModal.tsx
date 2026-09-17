"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Calendar,
  Building2,
  FolderKanban,
  User,
  Users,
  AlertCircle,
  Flag,
  Tag,
  MessageSquare,
} from "lucide-react";
import { cn, formatDate, TBA_DEADLINE, isTbaDeadline } from "@/lib/utils";
import { createActionItem } from "@/lib/actions/action-items";
import { quickCreateUser, quickCreateEntity } from "@/lib/actions/admin";
import { createQuickProject } from "@/lib/actions/projects";
import { useRouter } from "next/navigation";
import { RegisterItem } from "./ActionRegisterClient";

interface AddActionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: RegisterItem) => void;
  entities: Array<{ id: string; name: string; brandPrimaryColor?: string }>;
  projects: Array<{ id: string; name: string; entityId: string; entityName?: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
  currentUserName: string;
  defaultEntityId?: string | null;
}

export function AddActionItemModal({
  isOpen,
  onClose,
  onCreated,
  entities,
  projects,
  users,
  currentUserId,
  currentUserName,
  defaultEntityId,
}: AddActionItemModalProps) {
  const router = useRouter();

  // Local lists to support instant inline additions
  const [entitiesList, setEntitiesList] = useState(entities);
  const [projectsList, setProjectsList] = useState(projects);
  const [usersList, setUsersList] = useState(users);

  // Sync props
  useEffect(() => {
    setEntitiesList(entities);
  }, [entities]);

  useEffect(() => {
    setProjectsList(projects);
  }, [projects]);

  useEffect(() => {
    setUsersList(users);
  }, [users]);

  // Form Fields
  const [title, setTitle] = useState("");
  const [entityId, setEntityId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [secondaryAssigneeIds, setSecondaryAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"not_started" | "in_progress" | "done">("not_started");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [isDeadlineTba, setIsDeadlineTba] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Add Subsidiary
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Inline Add Project
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Inline Add Assignee
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      const initialEntity = defaultEntityId || entitiesList[0]?.id || "";
      setEntityId(initialEntity);
      setProjectId("");
      setAssigneeId(currentUserId || usersList[0]?.id || "");
      setSecondaryAssigneeIds([]);
      setStatus("not_started");
      setDeadline(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
      setIsDeadlineTba(false);
      setPriority("medium");
      setTag("");
      setDescription("");
      setFormError(null);
      setIsAddingEntity(false);
      setIsAddingProject(false);
      setIsAddingUser(false);
    }
  }, [isOpen, defaultEntityId, currentUserId]);

  // Projects filtered by selected subsidiary
  const availableProjects = projectsList.filter((p) => {
    if (!entityId) return true;
    return p.entityId === entityId;
  });

  if (!isOpen) return null;

  // Inline Save Subsidiary
  const handleSaveNewEntity = async () => {
    if (!newEntityName.trim()) return;
    setIsSavingEntity(true);
    try {
      const res = await quickCreateEntity({ name: newEntityName.trim() });
      if (res.success && res.entity) {
        const newEnt = {
          id: res.entity.id,
          name: res.entity.name,
          brandPrimaryColor: res.entity.brandPrimaryColor || "#023542",
        };
        setEntitiesList((prev) => [...prev, newEnt]);
        setEntityId(newEnt.id);
        setNewEntityName("");
        setIsAddingEntity(false);
      } else {
        setFormError(res.error || "Failed to create subsidiary");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create subsidiary");
    } finally {
      setIsSavingEntity(false);
    }
  };

  // Inline Save Project
  const handleSaveNewProject = async () => {
    if (!newProjectName.trim() || !entityId) return;
    setIsSavingProject(true);
    try {
      const res = await createQuickProject({
        name: newProjectName.trim(),
        entityId: entityId,
      });
      if (res.success && res.project) {
        const newProj = {
          id: res.project.id,
          name: res.project.name,
          entityId: res.project.entityId,
          entityName: entitiesList.find((e) => e.id === res.project.entityId)?.name || "Subsidiary",
        };
        setProjectsList((prev) => [newProj, ...prev]);
        setProjectId(newProj.id);
        setNewProjectName("");
        setIsAddingProject(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("project-created", { detail: res.project }));
        }
      } else {
        setFormError(res.error || "Failed to create project");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create project");
    } finally {
      setIsSavingProject(false);
    }
  };

  // Inline Save Person
  const handleSaveNewUser = async () => {
    if (!newUserName.trim()) return;
    setIsSavingUser(true);
    try {
      const res = await quickCreateUser({
        name: newUserName.trim(),
        email: newUserEmail.trim() || undefined,
        entityId: entityId || entitiesList[0]?.id,
      });
      if (res.success && res.user) {
        const newUser = { id: res.user.id, name: res.user.name };
        setUsersList((prev) => [...prev, newUser]);
        setAssigneeId(newUser.id);
        setNewUserName("");
        setNewUserEmail("");
        setIsAddingUser(false);
      } else {
        setFormError(res.error || "Failed to add person");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to add person");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Action item title is required.");
      return;
    }
    if (!entityId) {
      setFormError("Please select a subsidiary.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const resolvedDeadline = isDeadlineTba || !deadline.trim() ? TBA_DEADLINE : deadline;
    const resolvedProjectId = projectId && projectId !== "none" && projectId !== "no_project" ? projectId : null;

    try {
      const res = await createActionItem({
        entityId,
        projectId: resolvedProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId: assigneeId || currentUserId,
        secondaryAssigneeIds,
        deadline: resolvedDeadline,
        status,
        priority,
        tag: tag.trim() || undefined,
        createdBy: currentUserId,
      });

      if (res.success && res.item) {
        const selectedEnt = entitiesList.find((e) => e.id === res.item.entityId) || entitiesList.find((e) => e.id === entityId);
        const selectedProj = projectsList.find((p) => p.id === res.item.projectId);
        const selectedUser = usersList.find((u) => u.id === res.item.assigneeId);
        const secNames = secondaryAssigneeIds
          .map((id) => usersList.find((u) => u.id === id)?.name)
          .filter(Boolean) as string[];

        const newItem: RegisterItem = {
          id: res.item.id,
          title: res.item.title,
          description: res.item.description,
          deadline: res.item.deadline,
          status: res.item.status as any,
          priority: res.item.priority as any,
          tag: res.item.tag,
          assigneeId: res.item.assigneeId,
          assigneeName: selectedUser?.name || currentUserName,
          secondaryAssigneeIds: secondaryAssigneeIds,
          secondaryAssigneeNames: secNames,
          commentCount: 0,
          projectId: res.item.projectId || null,
          projectName: selectedProj?.name || null,
          entityId: res.item.entityId || entityId,
          entityName: selectedEnt?.name || "Subsidiary",
          entityBrandColor: selectedEnt?.brandPrimaryColor || "#023542",
          createdBy: currentUserId,
          createdAt: res.item.createdAt ? new Date(res.item.createdAt).toISOString() : new Date().toISOString(),
        };

        onCreated(newItem);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("action-item-created", { detail: newItem }));
          window.dispatchEvent(new CustomEvent("action-item-updated", { detail: newItem }));
        }

        router.refresh();
        onClose();
      } else {
        setFormError(res.error || "Failed to create action item");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-duston-border shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-duston-border flex items-center justify-between bg-duston-bg/50 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-[#023542] flex items-center gap-2">
              <span>Add Action Item</span>
            </h3>
            <p className="text-xs text-duston-muted mt-0.5">
              Add a deliverable to the executive action register
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Action Item Title */}
            <div>
              <label className="block text-xs font-semibold text-duston-dark mb-1">
                Action Item / Deliverable Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complete audited financial model for board review"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE]/30 bg-white text-duston-dark shadow-2xs"
                autoFocus
              />
            </div>

            {/* Subsidiary & Project Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Subsidiary */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-duston-dark">
                    Subsidiary <span className="text-rose-500">*</span>
                  </label>
                  {!isAddingEntity && (
                    <button
                      type="button"
                      onClick={() => setIsAddingEntity(true)}
                      className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-medium transition-colors cursor-pointer"
                    >
                      + New Subsidiary
                    </button>
                  )}
                </div>

                {isAddingEntity ? (
                  <div className="p-2.5 bg-duston-bg rounded-xl border border-duston-border space-y-2">
                    <input
                      type="text"
                      placeholder="Subsidiary name..."
                      value={newEntityName}
                      onChange={(e) => setNewEntityName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingEntity(false)}
                        className="px-2.5 py-1 text-xs text-duston-muted hover:text-duston-dark"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewEntity}
                        disabled={isSavingEntity || !newEntityName.trim()}
                        className="px-3 py-1 text-xs bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {isSavingEntity ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={entityId}
                    onChange={(e) => {
                      setEntityId(e.target.value);
                      if (projectId) {
                        const p = projectsList.find((prj) => prj.id === projectId);
                        if (p && p.entityId !== e.target.value) {
                          setProjectId("");
                        }
                      }
                    }}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
                  >
                    <option value="" disabled>
                      Select Subsidiary...
                    </option>
                    {entitiesList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Project (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-duston-dark">
                    Project <span className="text-duston-muted text-[11px] font-normal">(Optional)</span>
                  </label>
                  {!isAddingProject && (
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(true)}
                      className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-medium transition-colors cursor-pointer"
                    >
                      + New Project
                    </button>
                  )}
                </div>

                {isAddingProject ? (
                  <div className="p-2.5 bg-duston-bg rounded-xl border border-duston-border space-y-2">
                    <input
                      type="text"
                      placeholder="Project name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(false)}
                        className="px-2.5 py-1 text-xs text-duston-muted hover:text-duston-dark"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewProject}
                        disabled={isSavingProject || !newProjectName.trim()}
                        className="px-3 py-1 text-xs bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {isSavingProject ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={projectId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjectId(val);
                      if (val && !entityId) {
                        const proj = projectsList.find((p) => p.id === val);
                        if (proj) setEntityId(proj.entityId);
                      }
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
                  >
                    <option value="">No Project (Standalone Action)</option>
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Assignee & Co-Owners Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Primary Assignee */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-duston-dark">
                    Responsible Party / Assignee <span className="text-rose-500">*</span>
                  </label>
                  {!isAddingUser && (
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(true)}
                      className="text-[11px] text-[#023542] hover:text-[#1BCECE] font-medium transition-colors cursor-pointer"
                    >
                      + Add Person
                    </button>
                  )}
                </div>

                {isAddingUser ? (
                  <div className="p-2.5 bg-duston-bg rounded-xl border border-duston-border space-y-2">
                    <input
                      type="text"
                      placeholder="Full Name..."
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white"
                      autoFocus
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)..."
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingUser(false)}
                        className="px-2.5 py-1 text-xs text-duston-muted hover:text-duston-dark"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewUser}
                        disabled={isSavingUser || !newUserName.trim()}
                        className="px-3 py-1 text-xs bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {isSavingUser ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={assigneeId}
                    onChange={(e) => {
                      const newPrimary = e.target.value;
                      setAssigneeId(newPrimary);
                      setSecondaryAssigneeIds((prev) => prev.filter((id) => id !== newPrimary));
                    }}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
                  >
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Secondary Co-owners */}
              <div>
                <label className="block text-xs font-semibold text-duston-dark mb-1">
                  Co-owners <span className="text-duston-muted text-[11px] font-normal">(Optional)</span>
                </label>

                {secondaryAssigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-1.5 mb-1.5 bg-duston-bg rounded-xl border border-duston-border/70 max-h-20 overflow-y-auto">
                    {secondaryAssigneeIds.map((secId) => {
                      const u = usersList.find((usr) => usr.id === secId);
                      return (
                        <span
                          key={secId}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-duston-border text-duston-dark shadow-2xs"
                        >
                          <span>{u?.name || "User"}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSecondaryAssigneeIds((prev) => prev.filter((id) => id !== secId))
                            }
                            className="text-duston-muted hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !secondaryAssigneeIds.includes(val)) {
                      setSecondaryAssigneeIds((prev) => [...prev, val]);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-duston-border bg-white text-duston-dark focus:outline-none focus:border-[#1BCECE] shadow-2xs"
                >
                  <option value="">+ Add co-owner...</option>
                  {usersList
                    .filter((u) => u.id !== assigneeId && !secondaryAssigneeIds.includes(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Target Deadline, Status & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Target Deadline */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-duston-dark">
                    Target Deadline <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDeadlineTba((prev) => !prev)}
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.2 rounded transition-colors cursor-pointer",
                      isDeadlineTba
                        ? "bg-amber-100 text-amber-800 font-semibold"
                        : "bg-duston-bg text-duston-muted hover:bg-duston-border/60"
                    )}
                  >
                    {isDeadlineTba ? "✓ To Be Actioned" : "To Be Actioned"}
                  </button>
                </div>

                {isDeadlineTba ? (
                  <div className="w-full bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-amber-800 text-xs font-semibold flex items-center justify-between">
                    <span>To Be Actioned</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeadlineTba(false);
                        setDeadline(new Date().toISOString().split("T")[0]);
                      }}
                      className="text-[10px] text-amber-700 underline font-normal hover:text-amber-900 cursor-pointer"
                    >
                      Set date
                    </button>
                  </div>
                ) : (
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
                  />
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-duston-dark mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const val = e.target.value as "not_started" | "in_progress" | "done";
                    setStatus(val);
                    const today = new Date().toISOString().split("T")[0];
                    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
                    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                    if (val === "not_started") setDeadline(in7Days);
                    else if (val === "in_progress") setDeadline(in3Days);
                    else if (val === "done") setDeadline(today);
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In-Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-duston-dark mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Deliverable Tag / Category (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-duston-dark mb-1">
                Category / Tag <span className="text-duston-muted text-[11px] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g., Finance, Legal, Regulatory, Operations, External Counterparty"
                className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs"
              />
            </div>

            {/* Scope Notes / Comments (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-duston-dark mb-1">
                Notes / Scope Description <span className="text-duston-muted text-[11px] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context, milestone dependencies, or deliverable scope..."
                className="w-full text-xs p-2.5 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:px-6 sm:py-3.5 border-t border-duston-border flex items-center justify-end gap-2 bg-duston-bg/40 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !entityId}
              className="px-4 py-2 text-xs font-semibold bg-[#023542] hover:bg-[#1BCECE] disabled:opacity-50 text-white rounded-xl transition-colors shadow-subtle flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Create Action Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
