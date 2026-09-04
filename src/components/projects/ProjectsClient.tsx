"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, FolderKanban, Calendar, ArrowRight, MessageSquare, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { NewProjectDrawer } from "./NewProjectDrawer";
import { useAppShell } from "../layout/AppShell";
import { updateProject } from "@/lib/actions/projects";

export interface ProjectListItem {
  id: string;
  name: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  category: string;
  ownerId?: string | null;
  ownerName?: string | null;
  status: string;
  priority: string;
  targetDate: string;
  comments?: string | null;
  openItemsCount?: number;
}

interface ProjectsClientProps {
  projects: ProjectListItem[];
  entities: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

export function ProjectsClient({
  projects,
  entities,
  users,
  currentUserId,
}: ProjectsClientProps) {
  const router = useRouter();
  const { selectedEntityId } = useAppShell();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false);
  const [projectsList, setProjectsList] = useState<ProjectListItem[]>(projects);
  const [commentModalProject, setCommentModalProject] = useState<ProjectListItem | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Sync projectsList when projects prop changes
  useMemo(() => {
    setProjectsList(projects);
  }, [projects]);

  const handleOpenCommentModal = (p: ProjectListItem) => {
    setCommentModalProject(p);
    setCommentText(p.comments || "");
  };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentModalProject) return;
    setIsSavingComment(true);
    try {
      const updatedVal = commentText.trim() || undefined;
      await updateProject(commentModalProject.id, { description: updatedVal });
      setProjectsList((prev) =>
        prev.map((pr) =>
          pr.id === commentModalProject.id ? { ...pr, comments: updatedVal || null } : pr
        )
      );
      setCommentModalProject(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to update project comment:", err);
    } finally {
      setIsSavingComment(false);
    }
  };

  // Status badge styling using exact Duston palette
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#39B54A]/10 text-[#39B54A]">Done</span>;
      case "in_progress":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1BCECE]/15 text-[#023542]">In progress</span>;
      case "on_hold":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FBB03B]/10 text-[#FBB03B]">On hold</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-duston-bg border border-duston-border text-duston-muted">Not started</span>;
    }
  };

  const filteredProjects = useMemo(() => {
    return projectsList.filter((p) => {
      if (selectedEntityId && p.entityId !== selectedEntityId) return false;
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && p.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.entityName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projectsList, selectedEntityId, selectedCategory, selectedStatus, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-[#023542] tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-duston-muted mt-1">
            Browse and manage enterprise initiatives across group subsidiaries
          </p>
        </div>
        <button
          onClick={() => setIsNewDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-subtle self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={1.5} />
          <span>New project</span>
        </button>
      </div>

      {/* Filter Strip - only show if there are projects */}
      {projectsList.length > 0 && (
        <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Category Filter */}
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
              >
                <option value="all">All categories</option>
                <option value="capex">CAPEX</option>
                <option value="financing">Financing</option>
                <option value="regulatory">Regulatory</option>
                <option value="commercial">Commercial</option>
                <option value="operations">Operations</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
              >
                <option value="all">All statuses</option>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="on_hold">On hold</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Search Box */}
            <div>
              <label className="block text-duston-muted mb-1 font-medium">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-lg pl-8 pr-3 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
                />
                <Search
                  size={14}
                  strokeWidth={1.5}
                  className="absolute left-2.5 top-2.5 text-duston-muted"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects List: Desktop Table & Mobile Cards */}
      {projectsList.length === 0 ? (
        <div className="bg-white border border-duston-border rounded-2xl p-12 text-center shadow-subtle flanelines-bg space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#023542]/5 text-[#023542] flex items-center justify-center mx-auto mb-2">
            <FolderKanban size={28} strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-duston-dark">
            No projects yet
          </h3>
          <p className="text-xs text-duston-muted max-w-sm mx-auto">
            Get started by creating your first strategic project or initiative for a subsidiary.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsNewDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#023542] hover:bg-[#023542]/90 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={15} strokeWidth={2} />
              <span>Create first project</span>
            </button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-duston-border rounded-xl p-12 text-center shadow-subtle flanelines-bg">
          <FolderKanban size={32} strokeWidth={1.5} className="mx-auto text-duston-muted mb-3" />
          <h3 className="text-sm font-medium text-duston-dark">
            No projects match these filters
          </h3>
          <p className="text-xs text-duston-muted mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or clear the filters to view all projects.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 px-4 py-2 bg-duston-bg hover:bg-duston-border/60 border border-duston-border text-duston-dark rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-3 px-4">Project name</th>
                  <th className="py-3 px-4">Subsidiary</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target date</th>
                  <th className="py-3 px-4">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="hover:bg-duston-bg cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-duston-dark">
                      {project.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${project.entityBrandColor}15`,
                          color: project.entityBrandColor,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: project.entityBrandColor }}
                        />
                        <span>{project.entityName}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-duston-muted uppercase tracking-wider text-[10px]">
                      {project.category}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="py-3 px-4 text-duston-muted">
                      {formatDate(project.targetDate)}
                    </td>
                    <td className="py-3 px-4 max-w-[220px]" onClick={(e) => e.stopPropagation()}>
                      {project.comments ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCommentModal(project)}
                          className="flex items-center gap-1.5 text-left hover:bg-duston-bg/80 p-1.5 -m-1.5 rounded-lg cursor-pointer group transition-colors w-full"
                          title="Comments"
                        >
                          <MessageSquare size={13} className="text-[#1BCECE] shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="truncate text-xs text-duston-dark group-hover:text-[#023542]">{project.comments}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCommentModal(project)}
                          className="text-[11px] text-duston-muted hover:text-[#023542] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span>+ Add comment</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (<768px) */}
          <div className="md:hidden space-y-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="p-4 bg-white border border-duston-border rounded-xl shadow-subtle active:bg-duston-bg transition-colors space-y-2.5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-duston-dark text-xs">
                    {project.name}
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                <div className="flex items-center justify-between text-[11px] text-duston-muted">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: `${project.entityBrandColor}15`,
                      color: project.entityBrandColor,
                    }}
                  >
                    {project.entityName}
                  </span>
                  <span className="capitalize">{project.category}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] border-t border-duston-border pt-2 text-duston-muted">
                  <span>Target: {formatDate(project.targetDate)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCommentModal(project);
                    }}
                    className="flex items-center gap-1 text-[#023542] hover:text-[#1BCECE] font-medium cursor-pointer"
                  >
                    <MessageSquare size={12} className="text-[#1BCECE]" />
                    <span>{project.comments ? "Edit comment" : "+ Comment"}</span>
                  </button>
                </div>

                {project.comments && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCommentModal(project);
                    }}
                    className="text-[11px] text-duston-text bg-duston-bg/60 p-2.5 rounded-xl border border-duston-border/60 line-clamp-2 cursor-pointer hover:border-[#1BCECE] transition-colors"
                    title="Comments"
                  >
                    {project.comments}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* New Project Slide-in Drawer */}
      <NewProjectDrawer
        isOpen={isNewDrawerOpen}
        onClose={() => setIsNewDrawerOpen(false)}
        entities={entities}
        users={users}
        currentUserId={currentUserId}
      />

      {/* Project Comment / Remarks Modal */}
      {commentModalProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] shadow-2xl border border-duston-border overflow-hidden flex flex-col my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-duston-border bg-duston-bg/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#023542] text-white flex items-center justify-center">
                  <MessageSquare size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-duston-dark">Project Remarks & Comments</h3>
                  <p className="text-[11px] text-duston-muted truncate max-w-xs sm:max-w-sm">
                    {commentModalProject.name} • {commentModalProject.entityName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommentModalProject(null)}
                className="p-1 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveComment} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
                <div>
                  <label className="block text-duston-muted font-medium mb-1.5">
                    Comment / Executive Note
                  </label>
                  <textarea
                    rows={4}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add project status updates, operational remarks, or executive notes..."
                    className="w-full bg-white border border-duston-border rounded-xl p-3 text-xs text-duston-dark outline-none focus:border-[#1BCECE] leading-relaxed resize-none font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-3.5 sm:p-4 border-t border-duston-border bg-duston-bg/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setCommentModalProject(null)}
                  className="px-3.5 py-2 text-xs font-medium text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingComment}
                  className="px-4 py-2 text-xs font-medium bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl transition-colors shadow-subtle disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingComment ? "Saving..." : "Save comment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
