"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Calendar,
  Trash2,
  ChevronDown,
  User,
  Building2,
  Check,
  X,
  FolderPlus,
} from "lucide-react";
import { cn, formatDate, formatShortDate, isDeadlineOverdue, isTbaDeadline } from "@/lib/utils";
import {
  TodoItemData,
  createTodo,
  updateTodoStatus,
  updateTodo,
  deleteTodo,
  getUserTodos,
} from "@/lib/actions/todos";
import { createQuickProject } from "@/lib/actions/projects";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { TargetDeadlinePicker } from "@/components/ui/TargetDeadlinePicker";

export interface EntityOption {
  id: string;
  name: string;
  brandPrimaryColor?: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  entityId: string;
}

interface TodoListClientProps {
  initialTodos: TodoItemData[];
  entities: EntityOption[];
  projects: ProjectOption[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  isAdmin: boolean;
  allUsers: Array<{ id: string; name: string; email: string; role: string }>;
}

export function TodoListClient({
  initialTodos,
  entities = [],
  projects = [],
  currentUserId,
  currentUserName,
  currentUserRole,
  isAdmin,
  allUsers = [],
}: TodoListClientProps) {
  const router = useRouter();
  const [todos, setTodos] = useState<TodoItemData[]>(initialTodos);
  const [projectList, setProjectList] = useState<ProjectOption[]>(projects);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "done">("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(currentUserId);
  const [isLoadingUserTodos, setIsLoadingUserTodos] = useState(false);

  // Sync projectList when props change
  useEffect(() => {
    setProjectList(projects);
  }, [projects]);

  // Listen for real-time project creation across tabs/drawers
  useEffect(() => {
    const handleProjectCreated = (e: Event) => {
      const proj = (e as CustomEvent).detail;
      if (!proj || !proj.id) return;
      setProjectList((prev) => {
        if (prev.some((p) => p.id === proj.id)) return prev;
        return [{ id: proj.id, name: proj.name, entityId: proj.entityId }, ...prev];
      });
    };

    window.addEventListener("project-created", handleProjectCreated);
    return () => {
      window.removeEventListener("project-created", handleProjectCreated);
    };
  }, []);

  // Minimal Quick-Add State
  const [newTitle, setNewTitle] = useState("");
  const [newEntityId, setNewEntityId] = useState<string>("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newDeadline, setNewDeadline] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline Editing State
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEntityId, setEditEntityId] = useState<string>("");
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editDeadline, setEditDeadline] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // New Project Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectModalEntityId, setNewProjectModalEntityId] = useState<string>("");
  const [newProjectModalName, setNewProjectModalName] = useState("");
  const [newProjectTargetField, setNewProjectTargetField] = useState<"new" | "edit">("new");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectCreateError, setProjectCreateError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Available projects for the currently selected new subsidiary
  const availableProjectsForNew = useMemo(() => {
    if (!newEntityId) return projectList;
    return projectList.filter((p) => p.entityId === newEntityId);
  }, [projectList, newEntityId]);

  // Available projects for edit subsidiary
  const availableProjectsForEdit = useMemo(() => {
    if (!editEntityId) return [];
    return projectList.filter((p) => p.entityId === editEntityId);
  }, [projectList, editEntityId]);

  const openNewProjectModal = (entityId: string, target: "new" | "edit") => {
    setNewProjectModalEntityId(entityId || entities[0]?.id || "");
    setNewProjectModalName("");
    setNewProjectTargetField(target);
    setProjectCreateError(null);
    setIsNewProjectModalOpen(true);
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectModalName.trim() || !newProjectModalEntityId) return;

    setIsCreatingProject(true);
    setProjectCreateError(null);

    try {
      const res = await createQuickProject({
        name: newProjectModalName.trim(),
        entityId: newProjectModalEntityId,
      });

      if (res.success && res.project) {
        const created: ProjectOption = {
          id: res.project.id,
          name: res.project.name,
          entityId: res.project.entityId,
        };

        setProjectList((prev) => [created, ...prev]);

        if (newProjectTargetField === "new") {
          setNewEntityId(created.entityId);
          setNewProjectId(created.id);
        } else {
          setEditEntityId(created.entityId);
          setEditProjectId(created.id);
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("project-created", { detail: res.project })
          );
        }
        router.refresh();

        setIsNewProjectModalOpen(false);
      } else {
        setProjectCreateError(res.error || "Failed to create project");
      }
    } catch (err: any) {
      setProjectCreateError(err.message || "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Admin switch team member
  const handleSwitchUser = async (targetUserId: string) => {
    setSelectedUserFilter(targetUserId);
    setIsLoadingUserTodos(true);
    try {
      const res = await getUserTodos(targetUserId);
      if (res.success && res.todos) {
        setTodos(res.todos);
      }
    } catch (err) {
      console.error("Failed to load user todos:", err);
    } finally {
      setIsLoadingUserTodos(false);
    }
  };

  // Create Todo
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newEntityId) return;

    setIsSubmitting(true);
    const targetUser = isAdmin && selectedUserFilter !== currentUserId ? selectedUserFilter : currentUserId;
    const selectedEnt = entities.find((e) => e.id === newEntityId);
    const selectedProj = projectList.find((p) => p.id === newProjectId);

    const tempId = "temp-" + Date.now();
    const optimisticItem: TodoItemData = {
      id: tempId,
      userId: targetUser,
      title: newTitle.trim(),
      entityId: newEntityId,
      entityName: selectedEnt?.name || "Subsidiary",
      entityBrandColor: selectedEnt?.brandPrimaryColor || null,
      projectId: newProjectId || null,
      projectName: selectedProj?.name || null,
      dueDate: newDeadline || null,
      status: "not_started",
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => [optimisticItem, ...prev]);

    // Reset inputs
    setNewTitle("");
    setNewEntityId("");
    setNewProjectId("");
    setNewDeadline("");

    try {
      const res = await createTodo({
        title: optimisticItem.title,
        entityId: optimisticItem.entityId,
        projectId: optimisticItem.projectId,
        dueDate: optimisticItem.dueDate,
        status: "not_started",
        targetUserId: targetUser,
      });

      if (res.success && res.todo) {
        setTodos((prev) => prev.map((t) => (t.id === tempId ? res.todo! : t)));
      } else {
        setTodos((prev) => prev.filter((t) => t.id !== tempId));
        alert(res.error || "Failed to create to-do");
      }
    } catch (err) {
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      console.error("Failed to create todo:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Status
  const handleStatusChange = async (
    todoId: string,
    newStatus: "not_started" | "in_progress" | "done"
  ) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? {
              ...t,
              status: newStatus,
              isCompleted: newStatus === "done",
            }
          : t
      )
    );

    try {
      await updateTodoStatus(todoId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Toggle Done Checkbox
  const handleToggleDone = (todo: TodoItemData) => {
    const nextStatus = todo.status === "done" ? "in_progress" : "done";
    handleStatusChange(todo.id, nextStatus);
  };

  // Delete Todo
  const handleDeleteTodo = async (todoId: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await deleteTodo(todoId);
    } catch (err) {
      console.error("Failed to delete todo:", err);
    }
  };

  // Start Editing
  const handleStartEdit = (todo: TodoItemData) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditEntityId(todo.entityId);
    setEditProjectId(todo.projectId || "");
    setEditDeadline(todo.dueDate || "");
  };

  // Save Edit
  const handleSaveEdit = async (todoId: string) => {
    if (!editTitle.trim() || !editEntityId) return;
    setIsSavingEdit(true);

    const selectedEnt = entities.find((e) => e.id === editEntityId);
    const selectedProj = projectList.find((p) => p.id === editProjectId && p.entityId === editEntityId);

    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? {
              ...t,
              title: editTitle.trim(),
              entityId: editEntityId,
              entityName: selectedEnt?.name || "Subsidiary",
              entityBrandColor: selectedEnt?.brandPrimaryColor || null,
              projectId: selectedProj ? selectedProj.id : null,
              projectName: selectedProj ? selectedProj.name : null,
              dueDate: editDeadline || null,
            }
          : t
      )
    );

    setEditingTodoId(null);

    try {
      await updateTodo(todoId, {
        title: editTitle.trim(),
        entityId: editEntityId,
        projectId: selectedProj ? selectedProj.id : null,
        dueDate: editDeadline || null,
      });
    } catch (err) {
      console.error("Failed to update todo:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    if (activeTab === "active") return todos.filter((t) => t.status !== "done");
    if (activeTab === "done") return todos.filter((t) => t.status === "done");
    return todos;
  }, [todos, activeTab]);

  const activeCount = todos.filter((t) => t.status !== "done").length;
  const doneCount = todos.filter((t) => t.status === "done").length;

  const viewingUserName = useMemo(() => {
    if (!isAdmin || selectedUserFilter === currentUserId) return "To-Do List";
    const found = allUsers.find((u) => u.id === selectedUserFilter);
    return found ? `${found.name}'s To-Do List` : "To-Do List";
  }, [isAdmin, selectedUserFilter, currentUserId, allUsers]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-duston-border/60 pb-3">
        <h1 className="text-xl font-medium tracking-tight text-duston-dark">
          {viewingUserName}
        </h1>

        {/* Admin Team Switcher */}
        {isAdmin && (
          <DropdownFilter
            label="To-Do List"
            value={selectedUserFilter}
            options={[
              { value: currentUserId, label: "My To-Do List (Admin)" },
              ...allUsers
                .filter((u) => u.id !== currentUserId)
                .map((u) => ({
                  value: u.id,
                  label: u.name,
                  sublabel: u.role,
                })),
            ]}
            onChange={(val) => handleSwitchUser(val)}
            icon={<User size={12} />}
            align="right"
          />
        )}
      </div>

      {/* Minimal Quick-Add Bar */}
      <form
        onSubmit={handleCreateTodo}
        className="bg-white border border-duston-border rounded-xl px-3 py-2 shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2 transition-colors focus-within:border-[#023542]"
      >
        {/* Action Title Input */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <CheckSquare size={16} className="text-[#1BCECE] shrink-0" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new task..."
            className="w-full text-xs sm:text-sm bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 placeholder:text-duston-muted/70 text-duston-dark font-medium p-0 m-0 shadow-none"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto pt-1 sm:pt-0 border-t border-duston-border/40 sm:border-0">
          {/* Required Subsidiary Dropdown */}
          <DropdownFilter
            label="Subsidiary"
            value={newEntityId}
            options={entities.map((ent) => ({
              value: ent.id,
              label: ent.name,
              dotColor: ent.brandPrimaryColor,
            }))}
            onChange={(val) => {
              setNewEntityId(val);
              if (newProjectId) {
                const proj = projectList.find((p) => p.id === newProjectId);
                if (proj && proj.entityId !== val) {
                  setNewProjectId("");
                }
              }
            }}
            icon={<Building2 size={11} />}
            enableSearch={entities.length > 5}
            showSelectedValue={true}
          />

          {/* Optional Project Dropdown */}
          <DropdownFilter
            label="Project"
            value={newProjectId}
            options={[
              { value: "", label: "No Project" },
              { value: "__NEW_PROJECT__", label: "+ New Project" },
              ...availableProjectsForNew.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
            onChange={(val) => {
              if (val === "__NEW_PROJECT__") {
                openNewProjectModal(newEntityId, "new");
              } else {
                setNewProjectId(val);
                if (val && !newEntityId) {
                  const proj = projectList.find((p) => p.id === val);
                  if (proj) {
                    setNewEntityId(proj.entityId);
                  }
                }
              }
            }}
            enableSearch={availableProjectsForNew.length > 5}
            showSelectedValue={true}
          />

          {/* Target Deadline */}
          <TargetDeadlinePicker
            value={newDeadline}
            onChange={setNewDeadline}
            placeholder="Target Deadline"
          />

          {/* Add Button */}
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim() || !newEntityId}
            className="px-3.5 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white disabled:opacity-40 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1 shrink-0 w-full sm:w-auto"
          >
            <Plus size={13} strokeWidth={2} />
            <span>Add</span>
          </button>
        </div>
      </form>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-duston-bg/80 p-1 rounded-xl border border-duston-border text-xs w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex-1 sm:flex-initial text-center",
              activeTab === "all"
                ? "bg-[#023542] text-white shadow-2xs font-semibold"
                : "text-duston-muted hover:text-duston-dark"
            )}
          >
            All ({todos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex-1 sm:flex-initial text-center",
              activeTab === "active"
                ? "bg-[#023542] text-white shadow-2xs font-semibold"
                : "text-duston-muted hover:text-duston-dark"
            )}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("done")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex-1 sm:flex-initial text-center",
              activeTab === "done"
                ? "bg-[#023542] text-white shadow-2xs font-semibold"
                : "text-duston-muted hover:text-duston-dark"
            )}
          >
            Done ({doneCount})
          </button>
        </div>
      </div>

      {/* Minimal Todo List */}
      <div className="bg-white border border-duston-border rounded-2xl shadow-subtle divide-y divide-duston-border overflow-hidden">
        {isLoadingUserTodos ? (
          <div className="p-8 text-center text-xs text-duston-muted">Loading tasks...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-8 text-center text-xs text-duston-muted">
            {activeTab === "done" ? "No completed to-dos yet." : "No to-do items found. Add one above."}
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isEditing = editingTodoId === todo.id;
            const isOverdue = todo.dueDate && isDeadlineOverdue(todo.dueDate, todo.status);
            const isToday = todo.dueDate === todayStr;

            if (isEditing) {
              return (
                <div key={todo.id} className="p-3 bg-[#023542]/5 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs font-medium p-2 bg-white rounded-lg border border-duston-border focus:outline-none focus:border-[#023542] text-duston-dark"
                    placeholder="Task title..."
                    autoFocus
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Edit Subsidiary (Required) */}
                      <DropdownFilter
                        label="Subsidiary"
                        value={editEntityId}
                        options={entities.map((ent) => ({
                          value: ent.id,
                          label: ent.name,
                          dotColor: ent.brandPrimaryColor,
                        }))}
                        onChange={(val) => {
                          setEditEntityId(val);
                          setEditProjectId("");
                        }}
                        icon={<Building2 size={11} />}
                        enableSearch={entities.length > 5}
                        showSelectedValue={true}
                      />

                      {/* Edit Project (Optional or Add New) */}
                      <DropdownFilter
                        label="Project"
                        value={editProjectId}
                        options={[
                          { value: "", label: "No Project" },
                          { value: "__NEW_PROJECT__", label: "+ New Project" },
                          ...availableProjectsForEdit.map((p) => ({
                            value: p.id,
                            label: p.name,
                          })),
                        ]}
                        onChange={(val) => {
                          if (val === "__NEW_PROJECT__") {
                            openNewProjectModal(editEntityId, "edit");
                          } else {
                            setEditProjectId(val);
                          }
                        }}
                        enableSearch={availableProjectsForEdit.length > 5}
                        showSelectedValue={true}
                      />

                      {/* Edit Target Deadline */}
                      <TargetDeadlinePicker
                        value={editDeadline}
                        onChange={setEditDeadline}
                        placeholder="Target Deadline"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(todo.id)}
                        disabled={isSavingEdit || !editTitle.trim() || !editEntityId}
                        className="px-2.5 py-1 bg-[#023542] text-white text-xs rounded-lg font-medium hover:bg-[#1BCECE] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={12} />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTodoId(null)}
                        className="px-2.5 py-1 border border-duston-border text-duston-muted text-xs rounded-lg font-medium hover:text-duston-dark hover:bg-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={todo.id}
                className={cn(
                  "px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 hover:bg-duston-bg/60 transition-colors group",
                  todo.status === "done" && "bg-duston-bg/20"
                )}
              >
                {/* Left: Checkbox, Title, Subsidiary & Optional Project */}
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={todo.status === "done"}
                    onChange={() => handleToggleDone(todo)}
                    className="rounded border-duston-border text-[#023542] focus:ring-0 cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                  />
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span
                      onClick={() => handleStartEdit(todo)}
                      className={cn(
                        "text-xs font-medium cursor-pointer hover:underline text-duston-dark",
                        todo.status === "done" && "text-duston-muted"
                      )}
                      title="Click to edit action"
                    >
                      {todo.title}
                    </span>

                    {/* Required Subsidiary Pill */}
                    {todo.entityName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-duston-bg text-duston-dark border border-duston-border shrink-0">
                        {todo.entityBrandColor && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: todo.entityBrandColor }}
                          />
                        )}
                        <span className="truncate max-w-[120px]">{todo.entityName}</span>
                      </span>
                    )}

                    {/* Optional Project Pill */}
                    {todo.projectName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#023542]/5 text-[#023542] border border-[#023542]/15 shrink-0">
                        <span className="truncate max-w-[130px]">• {todo.projectName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Deadline & Status Dropdown & Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-duston-border/30 sm:border-0 pl-6 sm:pl-0">
                  {/* Deadline Badge */}
                  {todo.dueDate ? (
                    <span
                      className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded shrink-0",
                        isOverdue
                          ? "text-duston-orange bg-duston-orange/10 font-semibold"
                          : isToday
                          ? "text-duston-dark bg-duston-bg border border-duston-border font-semibold"
                          : isTbaDeadline(todo.dueDate)
                          ? "bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold"
                          : "text-duston-muted"
                      )}
                    >
                      {isToday ? "Today" : formatShortDate(todo.dueDate)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 bg-amber-50 text-amber-800 border border-amber-200/80">
                      To Be Actioned
                    </span>
                  )}

                  {/* Status Dropdown */}
                  <div className="relative inline-block shrink-0">
                    <select
                      value={todo.status}
                      onChange={(e) => handleStatusChange(todo.id, e.target.value as any)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border outline-none cursor-pointer appearance-none pr-4.5 shadow-2xs",
                        todo.status === "done"
                          ? "bg-[#39B54A]/15 text-[#39B54A] border-[#39B54A]/30 hover:bg-[#39B54A]/25"
                          : isOverdue
                          ? "bg-duston-orange/15 text-duston-orange border-duston-orange/30 font-semibold"
                          : todo.status === "in_progress"
                          ? "bg-[#1BCECE]/15 text-[#023542] border-[#1BCECE]/30 hover:bg-[#1BCECE]/25"
                          : "bg-duston-bg text-duston-dark border-duston-border hover:bg-duston-border/50"
                      )}
                      title="Change status"
                    >
                      {isOverdue && <option value="not_started">Overdue</option>}
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In-Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <ChevronDown
                      size={10}
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none",
                        todo.status === "done"
                          ? "text-[#39B54A]"
                          : todo.status === "in_progress"
                          ? "text-[#023542]"
                          : "text-duston-muted"
                      )}
                    />
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-1 text-duston-muted hover:text-duston-orange rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-xl border border-duston-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-duston-border flex items-center justify-between bg-duston-bg/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1BCECE]/15 flex items-center justify-center text-[#023542]">
                  <Building2 size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-duston-dark">
                    New Project
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 text-duston-muted hover:text-duston-dark rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="p-4 space-y-3.5">
              {projectCreateError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg">
                  {projectCreateError}
                </div>
              )}

              {/* Target Subsidiary */}
              <div>
                <label className="block text-[11px] font-medium text-duston-dark mb-1">
                  Subsidiary *
                </label>
                <select
                  value={newProjectModalEntityId}
                  onChange={(e) => setNewProjectModalEntityId(e.target.value)}
                  required
                  className="w-full text-xs p-2 rounded-lg border border-duston-border bg-white text-duston-dark focus:outline-none focus:border-[#023542] font-medium cursor-pointer"
                >
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-[11px] font-medium text-duston-dark mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Project name..."
                  value={newProjectModalName}
                  onChange={(e) => setNewProjectModalName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-duston-border focus:outline-none focus:border-[#023542] text-duston-dark font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-3 py-1.5 border border-duston-border text-duston-muted hover:text-duston-dark text-xs rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject || !newProjectModalName.trim()}
                  className="px-3 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {isCreatingProject ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
