"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, FolderKanban, Calendar, ArrowRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { NewProjectDrawer } from "./NewProjectDrawer";
import { useAppShell } from "../layout/AppShell";

export interface ProjectListItem {
  id: string;
  name: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  category: string;
  ownerId: string;
  ownerName: string;
  status: string;
  priority: string;
  targetDate: string;
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
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [isNewDrawerOpen, setIsNewDrawerOpen] = useState(false);

  // Status badge styling using exact Duston palette
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#39B54A]/10 text-[#39B54A]">Done</span>;
      case "in_progress":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1BCECE]/15 text-[#023542]">In progress</span>;
      case "blocked":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F15A24]/10 text-[#F15A24]">Blocked</span>;
      case "on_hold":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FBB03B]/10 text-[#FBB03B]">On hold</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-duston-bg border border-duston-border text-duston-muted">Not started</span>;
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedEntityId && p.entityId !== selectedEntityId) return false;
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && p.status !== selectedStatus) return false;
      if (selectedOwner !== "all" && p.ownerId !== selectedOwner) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.entityName.toLowerCase().includes(q) ||
          p.ownerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, selectedEntityId, selectedCategory, selectedStatus, selectedOwner, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedOwner("all");
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

      {/* Filter Strip */}
      <div className="bg-white border border-duston-border rounded-xl p-4 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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
              <option value="blocked">Blocked</option>
              <option value="on_hold">On hold</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Responsible Party Filter */}
          <div>
            <label className="block text-duston-muted mb-1 font-medium">Responsible Party</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-duston-text outline-none focus:border-[#1BCECE]"
            >
              <option value="all">All responsible parties</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
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

      {/* Projects List: Desktop Table & Mobile Cards */}
      {filteredProjects.length === 0 ? (
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
            className="mt-4 px-4 py-2 bg-duston-bg hover:bg-duston-border/60 border border-duston-border text-duston-dark rounded-xl text-xs font-medium transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block bg-white border border-duston-border rounded-xl shadow-subtle overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-3 px-4">Project name</th>
                  <th className="py-3 px-4">Subsidiary</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Responsible Party</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target date</th>
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
                    <td className="py-3 px-4 text-duston-dark">
                      {project.ownerName}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="py-3 px-4 text-duston-muted">
                      {formatDate(project.targetDate)}
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
                  <span>Owner: {project.ownerName}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] border-t border-duston-border pt-2 text-duston-muted">
                  <span>Target: {formatDate(project.targetDate)}</span>
                </div>
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
    </div>
  );
}
