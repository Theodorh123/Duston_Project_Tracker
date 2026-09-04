"use client";

import { useState } from "react";
import {
  Users,
  Building2,
  Activity,
  Plus,
  KeyRound,
  UserX,
  UserCheck,
  CheckCircle2,
  X,
  Edit2,
  Filter,
  Shield,
  Globe,
  Lock,
  Database,
  Trash2,
  AlertCircle,
  Check,
  ClipboardList,
  Search,
  Clock,
  MessageSquare,
} from "lucide-react";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";
import { PriorityFlag } from "@/components/ui/PriorityFlag";
import { useAppShell } from "@/components/layout/AppShell";
import {
  updateUserRole,
  resetUserPassword,
  toggleUserStatus,
  createUser,
  createEntity,
  updateEntity,
  updateUserEntityAccess,
  clearAllNotifications,
  clearAllActivityLogs,
} from "@/lib/actions/admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "ceo" | "ea" | "md" | "hod" | "contributor" | "external";
  hasGlobalAccess: boolean;
  assignedEntities?: Array<{ id: string; name: string; brandPrimaryColor?: string }>;
  isActive: boolean;
  createdAt: string;
}

export interface AdminEntity {
  id: string;
  name: string;
  slug: string;
  parentEntityId?: string | null;
  parentName?: string | null;
  brandPrimaryColor: string;
  isActive: boolean;
}

export interface AdminActivityLog {
  id: string;
  actorName: string;
  actionItemTitle: string;
  entityName: string;
  eventType: string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface AdminActionItem {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  status: "not_started" | "in_progress" | "done" | "blocked";
  priority: "critical" | "high" | "medium" | "low";
  assigneeName: string;
  secondaryAssigneeNames?: string[];
  projectId: string;
  projectName: string;
  entityId?: string;
  entityName: string;
  entityBrandColor: string;
  commentCount: number;
  createdAt: string;
}

export interface AdminStats {
  users: number;
  entities: number;
  projects: number;
  actionItems: number;
  notifications: number;
  activityLogs: number;
}

interface AdminClientProps {
  initialUsers: AdminUser[];
  initialEntities: AdminEntity[];
  initialActivities: AdminActivityLog[];
  initialActionItems?: AdminActionItem[];
  initialStats?: AdminStats;
}

export function AdminClient({
  initialUsers,
  initialEntities,
  initialActivities,
  initialActionItems = [],
  initialStats,
}: AdminClientProps) {
  const { openActionItem } = useAppShell();
  const [activeTab, setActiveTab] = useState<"users" | "entities" | "action-items" | "activity" | "maintenance">("users");
  const [usersList, setUsersList] = useState(initialUsers);
  const [entitiesList, setEntitiesList] = useState(initialEntities);
  const [activitiesList, setActivitiesList] = useState(initialActivities);
  const [actionItemsList, setActionItemsList] = useState<AdminActionItem[]>(initialActionItems);
  const [actionItemSearch, setActionItemSearch] = useState("");
  const [actionItemStatusFilter, setActionItemStatusFilter] = useState<string>("all");
  const [actionItemEntityFilter, setActionItemEntityFilter] = useState<string>("all");
  const [stats, setStats] = useState<AdminStats>(
    initialStats || {
      users: initialUsers.length,
      entities: initialEntities.length,
      projects: 0,
      actionItems: 0,
      notifications: 0,
      activityLogs: initialActivities.length,
    }
  );
  const [maintenanceLoading, setMaintenanceLoading] = useState<string | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  // Modals & alerts
  const [tempPasswordModal, setTempPasswordModal] = useState<{ user: string; pass: string } | null>(null);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isNewEntityModalOpen, setIsNewEntityModalOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<any>("contributor");
  const [newUserGlobal, setNewUserGlobal] = useState(false);
  const [newUserEntityId, setNewUserEntityId] = useState("");

  // Edit user entity access modal state
  const [editingAccessUser, setEditingAccessUser] = useState<AdminUser | null>(null);
  const [editUserGlobal, setEditUserGlobal] = useState(false);
  const [editUserEntityIds, setEditUserEntityIds] = useState<string[]>([]);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // New entity form state
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntitySlug, setNewEntitySlug] = useState("");
  const [newEntityColor, setNewEntityColor] = useState("#023542");
  const [newEntityParent, setNewEntityParent] = useState("");

  // Activity filter state
  const [selectedEventType, setSelectedEventType] = useState<string>("all");

  const handleRoleChange = async (userId: string, newRole: any) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    await updateUserRole(userId, newRole);
  };

  const handleResetPassword = async (user: AdminUser) => {
    const res = await resetUserPassword(user.id);
    if (res.success && res.tempPassword) {
      setTempPasswordModal({ user: user.name, pass: res.tempPassword });
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const updatedStatus = !user.isActive;
    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: updatedStatus } : u))
    );
    await toggleUserStatus(user.id, updatedStatus);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const entityIds = newUserEntityId ? [newUserEntityId] : [];
    const res = await createUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      hasGlobalAccess: newUserGlobal,
      entityIds,
    });

    if (res.success && res.user) {
      const assigned = entitiesList
        .filter((ent) => entityIds.includes(ent.id))
        .map((ent) => ({
          id: ent.id,
          name: ent.name,
          brandPrimaryColor: ent.brandPrimaryColor,
        }));

      setUsersList((prev) => [
        {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as any,
          hasGlobalAccess: res.user.hasGlobalAccess,
          assignedEntities: assigned,
          isActive: res.user.isActive,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTempPasswordModal({ user: res.user.name, pass: res.tempPassword || "Duston123!" });
      setIsNewUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("contributor");
      setNewUserGlobal(false);
      setNewUserEntityId("");
    }
  };

  const handleOpenEditAccess = (user: AdminUser) => {
    setEditingAccessUser(user);
    setEditUserGlobal(user.hasGlobalAccess);
    setEditUserEntityIds((user.assignedEntities || []).map((e) => e.id));
  };

  const handleSaveUserAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccessUser) return;
    setIsSavingAccess(true);
    try {
      const res = await updateUserEntityAccess({
        userId: editingAccessUser.id,
        hasGlobalAccess: editUserGlobal,
        entityIds: editUserEntityIds,
      });

      if (res.success) {
        const assigned = entitiesList
          .filter((ent) => editUserEntityIds.includes(ent.id))
          .map((ent) => ({
            id: ent.id,
            name: ent.name,
            brandPrimaryColor: ent.brandPrimaryColor,
          }));

        setUsersList((prev) =>
          prev.map((u) =>
            u.id === editingAccessUser.id
              ? {
                  ...u,
                  hasGlobalAccess: editUserGlobal,
                  assignedEntities: assigned,
                }
              : u
          )
        );
        setEditingAccessUser(null);
      }
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createEntity({
      name: newEntityName.trim(),
      slug: newEntitySlug.trim().toLowerCase(),
      brandPrimaryColor: newEntityColor,
      parentEntityId: newEntityParent || undefined,
    });

    if (res.success && res.entity) {
      setEntitiesList((prev) => [
        {
          id: res.entity.id,
          name: res.entity.name,
          slug: res.entity.slug,
          parentEntityId: res.entity.parentEntityId,
          brandPrimaryColor: res.entity.brandPrimaryColor,
          isActive: res.entity.isActive,
        },
        ...prev,
      ]);
      setIsNewEntityModalOpen(false);
      setNewEntityName("");
      setNewEntitySlug("");
    }
  };

  const handleClearNotifications = async () => {
    if (!window.confirm("Are you sure you want to clear all system notifications? This action cannot be undone.")) {
      return;
    }
    setMaintenanceLoading("notifications");
    setMaintenanceMessage(null);
    try {
      const res = await clearAllNotifications();
      if (res.success) {
        setStats((prev) => ({ ...prev, notifications: 0 }));
        setMaintenanceMessage("All system notifications have been cleared successfully.");
      } else {
        alert("Failed to clear notifications: " + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMaintenanceLoading(null);
    }
  };

  const handleClearActivityLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all activity audit logs? This action cannot be undone.")) {
      return;
    }
    setMaintenanceLoading("activity");
    setMaintenanceMessage(null);
    try {
      const res = await clearAllActivityLogs();
      if (res.success) {
        setStats((prev) => ({ ...prev, activityLogs: 0 }));
        setActivitiesList([]);
        setMaintenanceMessage("All activity audit logs have been cleared successfully.");
      } else {
        alert("Failed to clear activity logs: " + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMaintenanceLoading(null);
    }
  };

  const filteredActivities = activitiesList.filter((a) =>
    selectedEventType === "all" ? true : a.eventType === selectedEventType
  );

  const filteredActionItems = (actionItemsList || []).filter((it) => {
    if (actionItemSearch.trim()) {
      const q = actionItemSearch.toLowerCase();
      const matchTitle = it.title.toLowerCase().includes(q);
      const matchAssignee = it.assigneeName.toLowerCase().includes(q);
      const matchProject = it.projectName.toLowerCase().includes(q);
      const matchEntity = it.entityName.toLowerCase().includes(q);
      const matchCoOwners = it.secondaryAssigneeNames?.some((name) =>
        name.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchAssignee && !matchProject && !matchEntity && !matchCoOwners) {
        return false;
      }
    }

    if (actionItemStatusFilter !== "all") {
      if (actionItemStatusFilter === "overdue") {
        if (!isDeadlineOverdue(it.deadline, it.status)) return false;
      } else if (it.status !== actionItemStatusFilter) {
        return false;
      }
    }

    if (actionItemEntityFilter !== "all") {
      if (it.entityId !== actionItemEntityFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#023542] text-white">
            System Administration
          </span>
        </div>
        <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
          Admin Console
        </h1>
        <p className="text-xs text-duston-muted mt-1">
          Manage user accounts, corporate subsidiaries, and system-wide audit activity
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-duston-border flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
              activeTab === "users"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <Users size={14} strokeWidth={1.5} />
            <span>Users ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("entities")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
              activeTab === "entities"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <Building2 size={14} strokeWidth={1.5} />
            <span>Subsidiaries ({entitiesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("action-items")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
              activeTab === "action-items"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <ClipboardList size={14} strokeWidth={1.5} />
            <span>Action Items ({actionItemsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
              activeTab === "activity"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <Activity size={14} strokeWidth={1.5} />
            <span>Activity log</span>
          </button>

          <button
            onClick={() => setActiveTab("maintenance")}
            className={cn(
              "pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors",
              activeTab === "maintenance"
                ? "border-[#023542] text-[#023542]"
                : "border-transparent text-duston-muted hover:text-duston-dark"
            )}
          >
            <Database size={14} strokeWidth={1.5} />
            <span>Data & Maintenance</span>
          </button>
        </div>

        {activeTab === "users" && (
          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors mb-2"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>New user</span>
          </button>
        )}

        {activeTab === "entities" && (
          <button
            onClick={() => setIsNewEntityModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors mb-2"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>New entity</span>
          </button>
        )}
      </div>

      {/* 1. Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Subsidiary & Access</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-duston-border">
              {usersList.map((user) => (
                <tr key={user.id} className="hover:bg-duston-bg/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-duston-dark">{user.name}</td>
                  <td className="py-3 px-4 text-duston-muted">{user.email}</td>
                  <td className="py-3 px-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="bg-white border border-duston-border rounded px-2 py-1 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                    >
                      <option value="admin">Admin</option>
                      <option value="ceo">CEO</option>
                      <option value="ea">EA</option>
                      <option value="md">MD</option>
                      <option value="hod">HOD</option>
                      <option value="contributor">Contributor</option>
                      <option value="external">External</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {user.hasGlobalAccess ? (
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1BCECE]/15 text-[#023542] inline-flex items-center gap-1">
                          <Globe size={11} className="text-[#1BCECE]" />
                          <span>All subsidiaries (Global)</span>
                        </span>
                        {user.assignedEntities && user.assignedEntities.length > 0 && (
                          <div className="text-[10px] text-duston-muted">
                            Home: {user.assignedEntities.map((e) => e.name).join(", ")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {user.assignedEntities && user.assignedEntities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedEntities.map((e) => (
                              <span
                                key={e.id}
                                className="px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border shadow-2xs"
                                style={{
                                  backgroundColor: `${e.brandPrimaryColor || "#023542"}15`,
                                  color: e.brandPrimaryColor || "#023542",
                                  borderColor: `${e.brandPrimaryColor || "#023542"}30`,
                                }}
                              >
                                <Lock size={10} />
                                <span>{e.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Lock size={10} />
                            <span>Restricted (No subsidiary assigned)</span>
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium",
                        user.isActive
                          ? "bg-[#39B54A]/10 text-[#39B54A]"
                          : "bg-duston-orange/10 text-duston-orange"
                      )}
                    >
                      {user.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditAccess(user)}
                        className="p-1 rounded hover:bg-duston-bg text-duston-muted hover:text-[#023542]"
                        title="Manage subsidiary access & restrictions"
                      >
                        <Shield size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-1 rounded hover:bg-duston-bg text-duston-muted hover:text-duston-dark"
                        title="Reset password"
                      >
                        <KeyRound size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className="p-1 rounded hover:bg-duston-bg text-duston-muted hover:text-duston-orange"
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        {user.isActive ? <UserX size={15} strokeWidth={1.5} /> : <UserCheck size={15} strokeWidth={1.5} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Subsidiaries Tab */}
      {activeTab === "entities" && (
        <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Parent subsidiary</th>
                <th className="py-3 px-4">Brand color</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-duston-border">
              {entitiesList.map((ent) => (
                <tr key={ent.id} className="hover:bg-duston-bg/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-duston-dark">{ent.name}</td>
                  <td className="py-3 px-4 text-duston-muted">
                    {ent.parentName || "— (Top Level)"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-duston-border"
                        style={{ backgroundColor: ent.brandPrimaryColor }}
                      />
                      <span className="font-mono text-[11px]">{ent.brandPrimaryColor}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-duston-muted">
                    {ent.slug}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium",
                        ent.isActive
                          ? "bg-[#39B54A]/10 text-[#39B54A]"
                          : "bg-duston-orange/10 text-duston-orange"
                      )}
                    >
                      {ent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Action Items Tab */}
      {activeTab === "action-items" && (
        <div className="space-y-4">
          {/* Controls: Search, Status, Entity, Count */}
          <div className="bg-white border border-duston-border rounded-xl p-3 sm:p-4 shadow-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-duston-muted"
              />
              <input
                type="text"
                value={actionItemSearch}
                onChange={(e) => setActionItemSearch(e.target.value)}
                placeholder="Search action items, assignees, projects, subsidiaries..."
                className="w-full pl-9 pr-8 py-1.5 bg-duston-bg/50 border border-duston-border rounded-lg text-xs outline-none focus:border-[#1BCECE] focus:bg-white text-duston-dark placeholder:text-duston-muted"
              />
              {actionItemSearch && (
                <button
                  type="button"
                  onClick={() => setActionItemSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-duston-muted hover:text-duston-dark cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={actionItemStatusFilter}
                onChange={(e) => setActionItemStatusFilter(e.target.value)}
                className="bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue Only</option>
              </select>

              <select
                value={actionItemEntityFilter}
                onChange={(e) => setActionItemEntityFilter(e.target.value)}
                className="bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] cursor-pointer"
              >
                <option value="all">All Subsidiaries</option>
                {entitiesList.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>

              <span className="text-[11px] text-duston-muted ml-auto sm:ml-0 font-medium whitespace-nowrap">
                Showing {filteredActionItems.length} of {actionItemsList.length} items
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                    <th className="py-3 px-4">Subsidiary</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Action Item</th>
                    <th className="py-3 px-4">Responsible Party</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-duston-border">
                  {filteredActionItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-duston-muted">
                        No action items match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredActionItems.map((item) => {
                      const isOverdue = isDeadlineOverdue(item.deadline, item.status);
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-duston-bg/50 transition-colors group cursor-pointer"
                          onClick={() => openActionItem(item.id)}
                        >
                          <td className="py-3 px-4">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap"
                              style={{
                                backgroundColor: `${item.entityBrandColor}15`,
                                color: item.entityBrandColor,
                                borderColor: `${item.entityBrandColor}30`,
                              }}
                            >
                              {item.entityName}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-duston-dark whitespace-nowrap max-w-[160px] truncate">
                            {item.projectName}
                          </td>
                          <td className="py-3 px-4 font-medium text-duston-dark hover:text-[#1BCECE] transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="line-clamp-1">{item.title}</span>
                              {Boolean(item.commentCount && item.commentCount > 0) && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-[#023542] font-semibold bg-[#1BCECE]/15 px-1.5 py-0.2 rounded border border-[#1BCECE]/30 shrink-0"
                                  title={`${item.commentCount} update${item.commentCount === 1 ? "" : "s"}`}
                                >
                                  <MessageSquare size={10} className="text-[#1BCECE]" />
                                  <span>{item.commentCount}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-duston-dark whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{item.assigneeName}</span>
                              {Boolean(item.secondaryAssigneeNames && item.secondaryAssigneeNames.length > 0) && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-duston-bg border border-duston-border text-duston-dark shrink-0 cursor-help"
                                  title={`Co-owners: ${item.secondaryAssigneeNames?.join(", ")}`}
                                >
                                  +{item.secondaryAssigneeNames?.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "capitalize px-2.5 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1.5 border",
                                item.status === "done"
                                  ? "bg-[#39B54A]/10 text-[#39B54A] border-[#39B54A]/20"
                                  : item.status === "in_progress"
                                  ? "bg-[#1BCECE]/10 text-[#023542] border-[#1BCECE]/30"
                                  : "bg-duston-bg text-duston-muted border-duston-border"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  item.status === "done"
                                    ? "bg-[#39B54A]"
                                    : item.status === "in_progress"
                                    ? "bg-[#1BCECE]"
                                    : "bg-duston-muted"
                                )}
                              />
                              <span>{item.status.replace("_", " ")}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1",
                                isOverdue
                                  ? "bg-duston-orange/10 text-duston-orange border border-duston-orange/20"
                                  : "text-duston-muted"
                              )}
                            >
                              <Clock size={11} />
                              <span>{formatDate(item.deadline)}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <PriorityFlag priority={item.priority} />
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openActionItem(item.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#023542] hover:bg-[#1BCECE] text-white inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Edit action item"
                            >
                              <Edit2 size={11} />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Activity Log Tab */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="bg-white border border-duston-border rounded-xl p-3 shadow-subtle flex items-center gap-3 text-xs">
            <span className="text-duston-muted font-medium">Event filter:</span>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-white border border-duston-border rounded-lg px-2.5 py-1 text-duston-text outline-none focus:border-[#1BCECE]"
            >
              <option value="all">All events</option>
              <option value="created">Created</option>
              <option value="status_change">Status change</option>
              <option value="reassign">Reassign</option>
              <option value="comment_added">Comment added</option>
            </select>
          </div>

          <div className="bg-white border border-duston-border rounded-xl shadow-subtle overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Action item</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-duston-bg/40 transition-colors">
                    <td className="py-3 px-4 text-duston-muted whitespace-nowrap">
                      {formatDate(act.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-duston-dark">
                      {act.actorName}
                    </td>
                    <td className="py-3 px-4 text-duston-muted">
                      {act.entityName}
                    </td>
                    <td className="py-3 px-4 text-duston-dark max-w-xs truncate">
                      {act.actionItemTitle}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded bg-duston-bg border border-duston-border text-[10px] text-duston-muted">
                        {act.eventType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-duston-muted max-w-sm truncate">
                      {act.note || `Changed from ${act.fromValue || "none"} to ${act.toValue || "none"}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Data & Maintenance */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          {maintenanceMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span>{maintenanceMessage}</span>
            </div>
          )}

          {/* System Records Live Overview */}
          <div>
            <h2 className="text-xs font-semibold text-duston-dark uppercase tracking-wider mb-3">
              Database Records Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Team Members", value: stats.users, desc: "Users in directory" },
                { label: "Subsidiaries", value: stats.entities, desc: "Active business units" },
                { label: "Projects", value: stats.projects, desc: "Strategic projects" },
                { label: "Action Items", value: stats.actionItems, desc: "Action items in database" },
                { label: "Notifications", value: stats.notifications, desc: "Notification records" },
                { label: "Activity Logs", value: stats.activityLogs, desc: "Audit log records" },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white border border-duston-border rounded-2xl p-4 shadow-subtle space-y-1"
                >
                  <span className="text-[11px] font-medium text-duston-muted block">{card.label}</span>
                  <div className="text-2xl font-bold text-duston-dark">{card.value}</div>
                  <span className="text-[10px] text-duston-muted block">{card.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Actions */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-duston-dark uppercase tracking-wider">
              Data Cleaning & Maintenance Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Notifications Card */}
              <div className="bg-white border border-duston-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-duston-dark flex items-center gap-2">
                      <Database size={16} className="text-[#023542]" />
                      System Notifications
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-duston-bg border border-duston-border text-duston-dark">
                      {stats.notifications} record(s)
                    </span>
                  </div>
                  <p className="text-xs text-duston-muted leading-relaxed">
                    Purge all system notifications. This resets the notification bell dropdown and clears all unread alerts for all team members across the organization.
                  </p>
                </div>

                <div className="pt-3 border-t border-duston-border flex items-center justify-between">
                  <span className="text-[11px] text-duston-muted">Irreversible action</span>
                  <button
                    type="button"
                    disabled={maintenanceLoading === "notifications"}
                    onClick={handleClearNotifications}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>{maintenanceLoading === "notifications" ? "Clearing..." : "Clear all notifications"}</span>
                  </button>
                </div>
              </div>

              {/* Activity Audit Logs Card */}
              <div className="bg-white border border-duston-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-duston-dark flex items-center gap-2">
                      <Activity size={16} className="text-[#023542]" />
                      Activity Audit Logs
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-duston-bg border border-duston-border text-duston-dark">
                      {stats.activityLogs} event(s)
                    </span>
                  </div>
                  <p className="text-xs text-duston-muted leading-relaxed">
                    Purge all past audit entries from the activity log history. Keeps the system clean when transitioning from testing to production.
                  </p>
                </div>

                <div className="pt-3 border-t border-duston-border flex items-center justify-between">
                  <span className="text-[11px] text-duston-muted">Irreversible action</span>
                  <button
                    type="button"
                    disabled={maintenanceLoading === "activity"}
                    onClick={handleClearActivityLogs}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>{maintenanceLoading === "activity" ? "Clearing..." : "Clear activity logs"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Modal */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-duston-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-duston-dark text-sm">Temporary Password</h3>
              <button
                onClick={() => setTempPasswordModal(null)}
                className="p-1 rounded text-duston-muted hover:text-duston-dark"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-duston-muted">
              Temporary password generated for <strong className="text-duston-dark">{tempPasswordModal.user}</strong>. Please share this with the user securely:
            </p>
            <div className="p-3 bg-duston-bg border border-duston-border rounded-xl font-mono text-center text-sm font-semibold text-[#023542] select-all">
              {tempPasswordModal.pass}
            </div>
            <button
              onClick={() => setTempPasswordModal(null)}
              className="w-full py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto">
            <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
              <h3 className="font-medium text-duston-dark text-sm">Create New User</h3>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-1 rounded text-duston-muted hover:text-duston-dark cursor-pointer"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs overscroll-contain">
                <div>
                  <label className="block text-duston-muted mb-1">Full name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwesi Mensah"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                  />
                </div>

                <div>
                  <label className="block text-duston-muted mb-1">Email address *</label>
                  <input
                    type="email"
                    required
                    placeholder="kwesi@duston.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                  />
                </div>

                <div>
                  <label className="block text-duston-muted mb-1">Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setNewUserRole(r);
                      if (r === "admin" || r === "ceo" || r === "ea") {
                        setNewUserGlobal(true);
                      } else {
                        setNewUserGlobal(false);
                      }
                    }}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                  >
                    <option value="contributor">Contributor</option>
                    <option value="hod">Head of Department (HOD)</option>
                    <option value="md">Managing Director (MD)</option>
                    <option value="ea">Executive Assistant (EA)</option>
                    <option value="ceo">CEO</option>
                    <option value="admin">System Administrator (Admin)</option>
                    <option value="external">External</option>
                  </select>
                </div>

                <div>
                  <label className="block text-duston-muted mb-1 font-medium">Subsidiary / Entity *</label>
                  <select
                    required
                    value={newUserEntityId}
                    onChange={(e) => setNewUserEntityId(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                  >
                    <option value="">Select subsidiary person works with...</option>
                    {entitiesList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-duston-muted mt-1">
                    The primary entity or subsidiary this person works with.
                  </p>
                </div>

                <div>
                  <label className="block text-duston-muted mb-1.5 font-medium">Access Restriction</label>
                  <div className="space-y-2 bg-duston-bg/60 border border-duston-border rounded-xl p-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="accessScope"
                        checked={!newUserGlobal}
                        onChange={() => setNewUserGlobal(false)}
                        className="mt-0.5 text-[#023542] focus:ring-0"
                      />
                      <div>
                        <span className="font-medium text-duston-dark block">
                          Restrict to assigned subsidiary only
                        </span>
                        <span className="text-[11px] text-duston-muted block">
                          Member can only view and access projects, meetings, and action items for their assigned subsidiary.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-duston-border/60">
                      <input
                        type="radio"
                        name="accessScope"
                        checked={newUserGlobal}
                        onChange={() => setNewUserGlobal(true)}
                        className="mt-0.5 text-[#023542] focus:ring-0"
                      />
                      <div>
                        <span className="font-medium text-duston-dark block">
                          Global Group Access (All Subsidiaries)
                        </span>
                        <span className="text-[11px] text-duston-muted block">
                          Recommended for CEO, EA, and Group Directors to oversee all conglomerate operations.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 border-t border-duston-border bg-duston-bg/40 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-duston-border text-duston-muted hover:text-duston-dark hover:bg-duston-bg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#023542] hover:bg-[#1BCECE] text-white text-xs font-medium transition-colors shadow-subtle cursor-pointer"
                >
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Entity Access Modal */}
      {editingAccessUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto">
            <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[#023542]" />
                <div>
                  <h3 className="font-medium text-duston-dark text-sm">
                    Manage Subsidiary Access
                  </h3>
                  <p className="text-[11px] text-duston-muted">
                    {editingAccessUser.name} ({editingAccessUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccessUser(null)}
                className="p-1 rounded text-duston-muted hover:text-duston-dark cursor-pointer"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSaveUserAccess} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
                <div>
                  <label className="block text-duston-muted mb-1.5 font-medium">Access Mode</label>
                  <div className="space-y-2 bg-duston-bg/60 border border-duston-border rounded-xl p-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="editAccessMode"
                        checked={editUserGlobal}
                        onChange={() => setEditUserGlobal(true)}
                        className="mt-0.5 text-[#023542] focus:ring-0"
                      />
                      <div>
                        <span className="font-medium text-duston-dark block">
                          Global access (All subsidiaries)
                        </span>
                        <span className="text-[11px] text-duston-muted block">
                          Unrestricted visibility across all group subsidiaries and projects.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-duston-border/60">
                      <input
                        type="radio"
                        name="editAccessMode"
                        checked={!editUserGlobal}
                        onChange={() => setEditUserGlobal(false)}
                        className="mt-0.5 text-[#023542] focus:ring-0"
                      />
                      <div>
                        <span className="font-medium text-duston-dark block">
                          Restricted to specific subsidiaries
                        </span>
                        <span className="text-[11px] text-duston-muted block">
                          Member can only access data belonging to the checked subsidiaries below.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {!editUserGlobal && (
                  <div>
                    <label className="block text-duston-muted mb-1.5 font-medium">
                      Allowed Subsidiaries ({editUserEntityIds.length} selected)
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto border border-duston-border rounded-xl p-2.5 bg-white">
                      {entitiesList.map((ent) => {
                        const isChecked = editUserEntityIds.includes(ent.id);
                        return (
                          <label
                            key={ent.id}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-duston-bg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditUserEntityIds([...editUserEntityIds, ent.id]);
                                } else {
                                  setEditUserEntityIds(editUserEntityIds.filter((id) => id !== ent.id));
                                }
                              }}
                              className="rounded border-duston-border text-[#023542] focus:ring-0"
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ent.brandPrimaryColor }}
                            />
                            <span className="font-medium text-duston-dark flex-1">{ent.name}</span>
                            <span className="text-[10px] text-duston-muted">{ent.slug}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 sm:p-4 border-t border-duston-border bg-duston-bg/40 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingAccessUser(null)}
                  className="px-4 py-2 rounded-xl border border-duston-border text-duston-muted hover:text-duston-dark hover:bg-duston-bg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccess}
                  className="px-4 py-2 rounded-xl bg-[#023542] hover:bg-[#1BCECE] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-subtle"
                >
                  {isSavingAccess ? "Saving..." : "Save access permissions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Entity Modal */}
      {isNewEntityModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto">
            <div className="p-4 sm:p-5 border-b border-duston-border flex items-center justify-between bg-duston-bg/60 shrink-0">
              <h3 className="font-medium text-duston-dark text-sm">Add New Entity</h3>
              <button
                type="button"
                onClick={() => setIsNewEntityModalOpen(false)}
                className="p-1 rounded text-duston-muted hover:text-duston-dark cursor-pointer"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs overscroll-contain">
                <div>
                  <label className="block text-duston-muted mb-1">Entity Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Duston Telecom"
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                  />
                </div>

                <div>
                  <label className="block text-duston-muted mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. duston-telecom"
                    value={newEntitySlug}
                    onChange={(e) => setNewEntitySlug(e.target.value)}
                    className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-duston-muted mb-1">Brand Hex Color</label>
                    <input
                      type="text"
                      value={newEntityColor}
                      onChange={(e) => setNewEntityColor(e.target.value)}
                      className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 font-mono outline-none focus:border-[#1BCECE]"
                    />
                  </div>

                  <div>
                    <label className="block text-duston-muted mb-1">Parent Entity</label>
                    <select
                      value={newEntityParent}
                      onChange={(e) => setNewEntityParent(e.target.value)}
                      className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-2 outline-none focus:border-[#1BCECE]"
                    >
                      <option value="">None (Top level)</option>
                      {entitiesList.map((ent) => (
                        <option key={ent.id} value={ent.id}>{ent.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 border-t border-duston-border bg-duston-bg/40 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewEntityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-duston-border text-duston-muted hover:text-duston-dark hover:bg-duston-bg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#023542] hover:bg-[#1BCECE] text-white text-xs font-medium transition-colors shadow-subtle cursor-pointer"
                >
                  Add entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
