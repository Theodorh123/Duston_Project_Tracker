"use client";

import { useState, useMemo } from "react";
import {
  CheckSquare,
  Plus,
  Clock,
  Bell,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X,
  Tag,
  AlertCircle,
  Flag,
  User,
  Users,
  Search,
  Filter,
  Sparkles,
} from "lucide-react";
import { cn, formatDate, formatShortDate } from "@/lib/utils";
import {
  TodoItemData,
  createTodo,
  toggleTodoComplete,
  updateTodo,
  deleteTodo,
  getUserTodos,
} from "@/lib/actions/todos";
import { PriorityFlag } from "@/components/ui/PriorityFlag";

interface TodoListClientProps {
  initialTodos: TodoItemData[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  isAdmin: boolean;
  allUsers: Array<{ id: string; name: string; email: string; role: string }>;
}

export function TodoListClient({
  initialTodos,
  currentUserId,
  currentUserName,
  currentUserRole,
  isAdmin,
  allUsers,
}: TodoListClientProps) {
  const [todos, setTodos] = useState<TodoItemData[]>(initialTodos);
  const [activeTab, setActiveTab] = useState<"all" | "today" | "upcoming" | "reminders" | "completed">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(currentUserId);
  const [isLoadingUserTodos, setIsLoadingUserTodos] = useState(false);

  // Quick Add State
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [newCategory, setNewCategory] = useState("General");
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline Editing State
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminderTime, setEditReminderTime] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [editCategory, setEditCategory] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Admin: switch viewed user
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
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    const targetUser = isAdmin && selectedUserFilter !== currentUserId ? selectedUserFilter : currentUserId;

    // Optimistic temporary item
    const tempId = "temp-" + Date.now();
    const optimisticItem: TodoItemData = {
      id: tempId,
      userId: targetUser,
      title: newTitle.trim(),
      notes: newNotes.trim() || null,
      isCompleted: false,
      dueDate: newDueDate || null,
      reminderTime: newReminderTime || null,
      priority: newPriority,
      category: newCategory.trim() || "General",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTodos((prev) => [optimisticItem, ...prev]);

    // Clear form
    setNewTitle("");
    setNewNotes("");
    setNewDueDate("");
    setNewReminderTime("");
    setNewPriority("medium");
    setShowAdvancedAdd(false);

    try {
      const res = await createTodo({
        title: optimisticItem.title,
        notes: optimisticItem.notes || undefined,
        dueDate: optimisticItem.dueDate || undefined,
        reminderTime: optimisticItem.reminderTime || undefined,
        priority: optimisticItem.priority,
        category: optimisticItem.category || undefined,
        targetUserId: targetUser,
      });

      if (res.success && res.todo) {
        setTodos((prev) => prev.map((t) => (t.id === tempId ? res.todo! : t)));
      } else {
        // Rollback on error
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

  // Toggle Complete
  const handleToggleComplete = async (todo: TodoItemData) => {
    const nextState = !todo.isCompleted;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? {
              ...t,
              isCompleted: nextState,
              completedAt: nextState ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      const res = await toggleTodoComplete(todo.id, nextState);
      if (!res.success) {
        // Rollback
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: todo.isCompleted } : t))
        );
      }
    } catch (err) {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: todo.isCompleted } : t))
      );
    }
  };

  // Delete Todo
  const handleDeleteTodo = async (todoId: string) => {
    const prevList = [...todos];
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      const res = await deleteTodo(todoId);
      if (!res.success) {
        setTodos(prevList);
        alert(res.error || "Failed to delete to-do");
      }
    } catch (err) {
      setTodos(prevList);
    }
  };

  // Start Editing
  const handleStartEdit = (todo: TodoItemData) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditNotes(todo.notes || "");
    setEditDueDate(todo.dueDate || "");
    setEditReminderTime(
      todo.reminderTime ? new Date(todo.reminderTime).toISOString().slice(0, 16) : ""
    );
    setEditPriority(todo.priority);
    setEditCategory(todo.category || "General");
  };

  // Save Edit
  const handleSaveEdit = async (todoId: string) => {
    if (!editTitle.trim()) return;

    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? {
              ...t,
              title: editTitle.trim(),
              notes: editNotes.trim() || null,
              dueDate: editDueDate || null,
              reminderTime: editReminderTime ? new Date(editReminderTime).toISOString() : null,
              priority: editPriority,
              category: editCategory.trim() || "General",
            }
          : t
      )
    );

    setEditingTodoId(null);

    try {
      await updateTodo(todoId, {
        title: editTitle.trim(),
        notes: editNotes.trim() || undefined,
        dueDate: editDueDate || null,
        reminderTime: editReminderTime ? new Date(editReminderTime).toISOString() : null,
        priority: editPriority,
        category: editCategory.trim() || undefined,
      });
    } catch (err) {
      console.error("Failed to update todo:", err);
    }
  };

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    todos.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [todos]);

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = todo.title.toLowerCase().includes(q);
        const matchesNotes = (todo.notes || "").toLowerCase().includes(q);
        const matchesCat = (todo.category || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCat) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== "all" && todo.category !== selectedCategory) {
        return false;
      }

      // 3. Tab Filter
      if (activeTab === "completed") {
        return todo.isCompleted;
      }

      if (activeTab === "today") {
        return !todo.isCompleted && todo.dueDate === todayStr;
      }

      if (activeTab === "upcoming") {
        if (todo.isCompleted || !todo.dueDate) return false;
        return todo.dueDate >= todayStr;
      }

      if (activeTab === "reminders") {
        return !todo.isCompleted && Boolean(todo.reminderTime);
      }

      return true;
    });
  }, [todos, activeTab, selectedCategory, searchQuery, todayStr]);

  // Counts
  const totalOpen = todos.filter((t) => !t.isCompleted).length;
  const totalCompleted = todos.filter((t) => t.isCompleted).length;
  const totalToday = todos.filter((t) => !t.isCompleted && t.dueDate === todayStr).length;
  const totalUpcoming = todos.filter((t) => !t.isCompleted && t.dueDate && t.dueDate >= todayStr).length;
  const totalWithReminders = todos.filter((t) => !t.isCompleted && Boolean(t.reminderTime)).length;

  const viewingUserName = useMemo(() => {
    if (!isAdmin || selectedUserFilter === currentUserId) return "My Personal To-Do List";
    const found = allUsers.find((u) => u.id === selectedUserFilter);
    return found ? `${found.name}'s To-Do List` : "Personal To-Do List";
  }, [isAdmin, selectedUserFilter, currentUserId, allUsers]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Minimalist Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-duston-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium tracking-tight text-duston-dark">
              {viewingUserName}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#023542]/10 text-[#023542]">
              {totalOpen} active
            </span>
          </div>
          <p className="text-xs text-duston-muted mt-0.5">
            Private, distraction-free daily tasks and reminders • Visible only to you
          </p>
        </div>

        {/* Admin User Selector */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-white border border-duston-border rounded-xl p-1.5 shadow-2xs">
            <User size={13} className="text-duston-muted shrink-0 ml-1" />
            <select
              value={selectedUserFilter}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="text-xs text-duston-dark bg-transparent border-none focus:ring-0 cursor-pointer pr-2 font-medium"
            >
              <option value={currentUserId}>My To-Do List (Admin)</option>
              <optgroup label="Team Members">
                {allUsers
                  .filter((u) => u.id !== currentUserId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        )}
      </div>

      {/* Quick Add Bar */}
      <form
        onSubmit={handleCreateTodo}
        className="bg-white border border-duston-border rounded-2xl p-3.5 shadow-subtle space-y-3 transition-all focus-within:border-[#023542] focus-within:ring-2 focus-within:ring-[#023542]/10"
      >
        <div className="flex items-center gap-3">
          <CheckSquare size={18} className="text-[#1BCECE] shrink-0 ml-1" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new to-do item... (press Enter to save)"
            className="flex-1 text-sm bg-transparent border-none focus:ring-0 placeholder:text-duston-muted/70 text-duston-dark font-medium"
          />
          <button
            type="button"
            onClick={() => setShowAdvancedAdd(!showAdvancedAdd)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1 cursor-pointer shrink-0",
              showAdvancedAdd || newDueDate || newReminderTime || newPriority !== "medium"
                ? "bg-[#023542]/10 border-[#023542]/20 text-[#023542]"
                : "border-duston-border text-duston-muted hover:text-duston-dark"
            )}
            title="Set due date, reminder, priority, or category"
          >
            <Clock size={12} />
            <span>Options</span>
          </button>
          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmitting}
            className="px-3.5 py-1.5 bg-[#023542] hover:bg-[#1BCECE] disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add</span>
          </button>
        </div>

        {/* Optional Expanded Attributes */}
        {showAdvancedAdd && (
          <div className="pt-2 border-t border-duston-border/60 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in duration-100">
            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-medium text-duston-muted mb-1 flex items-center gap-1">
                <Calendar size={10} /> Due Date
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-duston-border rounded-lg bg-duston-bg/40 focus:ring-0 focus:border-[#023542]"
              />
            </div>

            {/* Reminder Date & Time */}
            <div>
              <label className="block text-[10px] font-medium text-duston-muted mb-1 flex items-center gap-1 text-amber-700">
                <Bell size={10} /> Reminder Alert
              </label>
              <input
                type="datetime-local"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-duston-border rounded-lg bg-amber-50/50 text-amber-900 focus:ring-0 focus:border-amber-500"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-medium text-duston-muted mb-1 flex items-center gap-1">
                <Flag size={10} /> Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-2 py-1 text-xs border border-duston-border rounded-lg bg-duston-bg/40 focus:ring-0 focus:border-[#023542]"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-medium text-duston-muted mb-1 flex items-center gap-1">
                <Tag size={10} /> Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Executive, Follow-up"
                className="w-full px-2 py-1 text-xs border border-duston-border rounded-lg bg-duston-bg/40 focus:ring-0 focus:border-[#023542]"
              />
            </div>

            {/* Optional Notes */}
            <div className="sm:col-span-4">
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes or details..."
                className="w-full px-2 py-1 text-xs border border-duston-border rounded-lg bg-duston-bg/30 placeholder:text-duston-muted focus:ring-0 focus:border-[#023542]"
              />
            </div>
          </div>
        )}
      </form>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Minimalist Tabs */}
        <div className="flex items-center gap-1 bg-duston-bg/60 p-1 rounded-xl border border-duston-border/60 overflow-x-auto no-scrollbar">
          {[
            { id: "all" as const, label: "All", count: totalOpen },
            { id: "today" as const, label: "Today", count: totalToday },
            { id: "upcoming" as const, label: "Upcoming", count: totalUpcoming },
            { id: "reminders" as const, label: "Reminders", count: totalWithReminders, icon: Bell },
            { id: "completed" as const, label: "Done", count: totalCompleted },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  isSelected
                    ? "bg-white text-[#023542] shadow-2xs font-semibold"
                    : "text-duston-muted hover:text-duston-dark"
                )}
              >
                {Icon && <Icon size={12} className={isSelected ? "text-amber-600" : "text-duston-muted"} />}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    isSelected ? "bg-[#023542]/10 text-[#023542]" : "bg-duston-border/60 text-duston-muted"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-duston-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search to-dos..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-duston-border rounded-xl focus:ring-0 focus:border-[#023542]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-duston-muted hover:text-duston-dark"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white border border-duston-border rounded-2xl shadow-subtle divide-y divide-duston-border/60 overflow-hidden">
        {isLoadingUserTodos ? (
          <div className="p-8 text-center text-xs text-duston-muted">Loading to-dos...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-10 text-center space-y-2 select-none">
            <div className="w-10 h-10 rounded-full bg-duston-bg border border-duston-border flex items-center justify-center mx-auto text-duston-muted">
              <CheckSquare size={18} />
            </div>
            <div className="text-xs font-medium text-duston-dark">
              {activeTab === "completed"
                ? "No completed to-dos yet"
                : searchQuery
                ? "No to-dos matching search"
                : "Your to-do list is clear"}
            </div>
            <p className="text-[11px] text-duston-muted max-w-xs mx-auto">
              {activeTab === "completed"
                ? "Items you mark as done will appear here."
                : "Add tasks above to keep track of your private executive priorities."}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isEditing = editingTodoId === todo.id;
            const isOverdue =
              !todo.isCompleted && todo.dueDate && todo.dueDate < todayStr;
            const hasReminder = Boolean(todo.reminderTime);

            if (isEditing) {
              return (
                <div key={todo.id} className="p-4 bg-duston-bg/30 space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-duston-border rounded-lg font-medium text-duston-dark focus:ring-0 focus:border-[#023542]"
                    placeholder="Task title..."
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-1 text-xs bg-white border border-duston-border rounded-lg text-duston-dark focus:ring-0 focus:border-[#023542]"
                    placeholder="Notes..."
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-duston-muted mb-0.5">Due Date</label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-duston-border rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-700 mb-0.5">Reminder Alert</label>
                      <input
                        type="datetime-local"
                        value={editReminderTime}
                        onChange={(e) => setEditReminderTime(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-duston-border rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-duston-muted mb-0.5">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="w-full px-2 py-1 text-xs border border-duston-border rounded bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-duston-muted mb-0.5">Category</label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-duston-border rounded bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTodoId(null)}
                      className="px-3 py-1 text-xs text-duston-muted hover:text-duston-dark"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(todo.id)}
                      className="px-3 py-1 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={todo.id}
                className={cn(
                  "p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3 hover:bg-duston-bg/40 transition-colors group",
                  todo.isCompleted && "bg-duston-bg/20"
                )}
              >
                {/* Left: Checkbox + Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(todo)}
                    className={cn(
                      "w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0",
                      todo.isCompleted
                        ? "bg-[#39B54A] border-[#39B54A] text-white"
                        : "border-duston-border hover:border-[#023542] bg-white"
                    )}
                    aria-label={todo.isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {todo.isCompleted && <Check size={11} strokeWidth={3} />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-xs font-medium text-duston-dark",
                          todo.isCompleted && "line-through text-duston-muted"
                        )}
                      >
                        {todo.title}
                      </span>
                      <PriorityFlag priority={todo.priority} />
                      {todo.category && todo.category !== "General" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-duston-bg border border-duston-border text-duston-muted">
                          {todo.category}
                        </span>
                      )}
                    </div>

                    {todo.notes && (
                      <p className="text-[11px] text-duston-muted leading-relaxed">
                        {todo.notes}
                      </p>
                    )}

                    {/* Metadata tags: Due date, Reminder time */}
                    <div className="flex items-center gap-2.5 text-[10px] text-duston-muted flex-wrap">
                      {todo.dueDate && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            isOverdue
                              ? "text-duston-orange"
                              : todo.dueDate === todayStr
                              ? "text-[#023542] font-semibold"
                              : "text-duston-muted"
                          )}
                        >
                          <Calendar size={10} />
                          <span>
                            {todo.dueDate === todayStr
                              ? "Today"
                              : formatShortDate(todo.dueDate)}
                          </span>
                        </span>
                      )}

                      {hasReminder && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                          <Bell size={10} />
                          <span>
                            {new Date(todo.reminderTime!).toLocaleTimeString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(todo)}
                    className="p-1 rounded text-duston-muted hover:text-duston-dark hover:bg-white border border-transparent hover:border-duston-border cursor-pointer transition-colors"
                    title="Edit to-do"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-1 rounded text-duston-muted hover:text-duston-orange hover:bg-white border border-transparent hover:border-duston-border cursor-pointer transition-colors"
                    title="Delete to-do"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
