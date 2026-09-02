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
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  updateUserRole,
  resetUserPassword,
  toggleUserStatus,
  createUser,
  createEntity,
  updateEntity,
} from "@/lib/actions/admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ceo" | "ea" | "md" | "hod" | "contributor" | "external";
  hasGlobalAccess: boolean;
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

interface AdminClientProps {
  initialUsers: AdminUser[];
  initialEntities: AdminEntity[];
  initialActivities: AdminActivityLog[];
}

export function AdminClient({
  initialUsers,
  initialEntities,
  initialActivities,
}: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<"users" | "entities" | "activity">("users");
  const [usersList, setUsersList] = useState(initialUsers);
  const [entitiesList, setEntitiesList] = useState(initialEntities);
  const [activitiesList, setActivitiesList] = useState(initialActivities);

  // Modals & alerts
  const [tempPasswordModal, setTempPasswordModal] = useState<{ user: string; pass: string } | null>(null);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isNewEntityModalOpen, setIsNewEntityModalOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<any>("contributor");
  const [newUserGlobal, setNewUserGlobal] = useState(true);

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
    const res = await createUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      hasGlobalAccess: newUserGlobal,
    });

    if (res.success && res.user) {
      setUsersList((prev) => [
        {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as any,
          hasGlobalAccess: res.user.hasGlobalAccess,
          isActive: res.user.isActive,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTempPasswordModal({ user: res.user.name, pass: res.tempPassword || "Duston123!" });
      setIsNewUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
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

  const filteredActivities = activitiesList.filter((a) =>
    selectedEventType === "all" ? true : a.eventType === selectedEventType
  );

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
                <th className="py-3 px-4">Global access</th>
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
                      <option value="ceo">CEO</option>
                      <option value="ea">EA</option>
                      <option value="md">MD</option>
                      <option value="hod">HOD</option>
                      <option value="contributor">Contributor</option>
                      <option value="external">External</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium",
                        user.hasGlobalAccess
                          ? "bg-[#1BCECE]/10 text-[#023542]"
                          : "bg-duston-bg text-duston-muted border border-duston-border"
                      )}
                    >
                      {user.hasGlobalAccess ? "All entities" : "Scoped"}
                    </span>
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

      {/* 3. Activity Log Tab */}
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-duston-dark text-sm">Create New User</h3>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-1 rounded text-duston-muted hover:text-duston-dark"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
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
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 outline-none focus:border-[#1BCECE]"
                >
                  <option value="contributor">Contributor</option>
                  <option value="hod">Head of Department (HOD)</option>
                  <option value="md">Managing Director (MD)</option>
                  <option value="ea">Executive Assistant (EA)</option>
                  <option value="ceo">CEO</option>
                  <option value="external">External</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="globalAccess"
                  checked={newUserGlobal}
                  onChange={(e) => setNewUserGlobal(e.target.checked)}
                  className="rounded border-duston-border text-[#023542] focus:ring-0"
                />
                <label htmlFor="globalAccess" className="text-duston-dark">
                  Grant cross-entity global visibility
                </label>
              </div>

              <div className="pt-3 border-t border-duston-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-duston-border text-duston-text hover:bg-duston-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#023542] hover:bg-[#1BCECE] text-white font-medium transition-colors"
                >
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Entity Modal */}
      {isNewEntityModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-duston-border rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-duston-dark text-sm">Add New Entity</h3>
              <button
                onClick={() => setIsNewEntityModalOpen(false)}
                className="p-1 rounded text-duston-muted hover:text-duston-dark"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="space-y-3">
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

              <div className="pt-3 border-t border-duston-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewEntityModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-duston-border text-duston-text hover:bg-duston-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#023542] hover:bg-[#1BCECE] text-white font-medium transition-colors"
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
