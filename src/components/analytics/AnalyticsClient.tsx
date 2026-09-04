"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Search,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn, formatDate, isDeadlineOverdue } from "@/lib/utils";
import { useAppShell } from "../layout/AppShell";
import { PriorityFlag } from "@/components/ui/PriorityFlag";

export interface AnalyticsItem {
  id: string;
  title: string;
  description?: string | null;
  deadline: string;
  status: "not_started" | "in_progress" | "done" | "postponed";
  priority: "low" | "medium" | "high" | "critical";
  tag?: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string | null;
  projectId: string;
  projectName: string;
  entityId: string;
  entityName: string;
  entityBrandColor: string;
  createdAt: string;
  createdBy?: string | null;
}

interface AnalyticsClientProps {
  items: AnalyticsItem[];
  entities: Array<{
    id: string;
    name: string;
    slug: string;
    brandPrimaryColor: string;
  }>;
  currentUserRole?: string;
}

export function AnalyticsClient({
  items,
  entities,
  currentUserRole,
}: AnalyticsClientProps) {
  const { openActionItem, selectedEntityId, setSelectedEntityId } = useAppShell();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<"all_pending" | "overdue" | "critical" | "not_started">("all_pending");

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedEntityId && item.entityId !== selectedEntityId) {
        return false;
      }
      return true;
    });
  }, [items, selectedEntityId]);

  // Aggregate Metrics
  const totalCount = filteredItems.length;
  const completedItems = filteredItems.filter((i) => i.status === "done");
  const inProgressItems = filteredItems.filter((i) => i.status === "in_progress");
  const notStartedItems = filteredItems.filter((i) => i.status === "not_started");
  const overdueItems = filteredItems.filter(
    (i) => isDeadlineOverdue(i.deadline, i.status)
  );

  const completedRate = totalCount > 0 ? Math.round((completedItems.length / totalCount) * 100) : 0;
  const inProgressRate = totalCount > 0 ? Math.round((inProgressItems.length / totalCount) * 100) : 0;
  const notStartedRate = totalCount > 0 ? Math.round((notStartedItems.length / totalCount) * 100) : 0;
  const overdueRate = totalCount > 0 ? Math.round((overdueItems.length / totalCount) * 100) : 0;

  // Priority Distribution
  const priorityStats = useMemo(() => {
    const critical = filteredItems.filter((i) => i.priority === "critical");
    const high = filteredItems.filter((i) => i.priority === "high");
    const medium = filteredItems.filter((i) => i.priority === "medium");
    const low = filteredItems.filter((i) => i.priority === "low");

    return {
      critical: {
        total: critical.length,
        done: critical.filter((i) => i.status === "done").length,
        pending: critical.filter((i) => i.status !== "done").length,
      },
      high: {
        total: high.length,
        done: high.filter((i) => i.status === "done").length,
        pending: high.filter((i) => i.status !== "done").length,
      },
      medium: {
        total: medium.length,
        done: medium.filter((i) => i.status === "done").length,
        pending: medium.filter((i) => i.status !== "done").length,
      },
      low: {
        total: low.length,
        done: low.filter((i) => i.status === "done").length,
        pending: low.filter((i) => i.status !== "done").length,
      },
    };
  }, [filteredItems]);

  // Counts for table filter tabs
  const tabCounts = useMemo(() => {
    const pendingList = filteredItems.filter((i) => i.status !== "done");
    return {
      all_pending: pendingList.length,
      overdue: pendingList.filter((i) => isDeadlineOverdue(i.deadline, i.status)).length,
      critical: pendingList.filter((i) => i.priority === "critical" || i.priority === "high").length,
      not_started: pendingList.filter((i) => i.status === "not_started").length,
    };
  }, [filteredItems]);

  // Critical & Pending Workstreams for the table
  const pendingWorkstreams = useMemo(() => {
    let list = filteredItems.filter((i) => i.status !== "done");

    if (tableFilter === "overdue") {
      list = list.filter((i) => isDeadlineOverdue(i.deadline, i.status));
    } else if (tableFilter === "critical") {
      list = list.filter((i) => i.priority === "critical" || i.priority === "high");
    } else if (tableFilter === "not_started") {
      list = list.filter((i) => i.status === "not_started");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.projectName && i.projectName.toLowerCase().includes(q)) ||
          (i.entityName && i.entityName.toLowerCase().includes(q)) ||
          (i.assigneeName && i.assigneeName.toLowerCase().includes(q)) ||
          (i.tag && i.tag.toLowerCase().includes(q))
      );
    }

    // Sort by priority (critical first) then deadline
    return list.sort((a, b) => {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (pOrder[a.priority] !== pOrder[b.priority]) {
        return pOrder[a.priority] - pOrder[b.priority];
      }
      const timeA = a.deadline ? new Date(a.deadline).getTime() : 0;
      const timeB = b.deadline ? new Date(b.deadline).getTime() : 0;
      return timeA - timeB;
    });
  }, [filteredItems, tableFilter, searchQuery]);

  // Helpers for concentric SVG donut rings
  const circumferenceOuter = 2 * Math.PI * 46;
  const circumferenceMiddle = 2 * Math.PI * 34;
  const circumferenceInner = 2 * Math.PI * 22;

  const strokeDashoffsetOuter = circumferenceOuter - (circumferenceOuter * completedRate) / 100;
  const strokeDashoffsetMiddle = circumferenceMiddle - (circumferenceMiddle * inProgressRate) / 100;
  const strokeDashoffsetInner = circumferenceInner - (circumferenceInner * notStartedRate) / 100;

  return (
    <div className="space-y-6">
      {/* Top Header & Context Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#023542] tracking-tight">
            Analytics
          </h1>
        </div>

        {/* Global Subsidiary Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-duston-border rounded-xl shadow-subtle text-xs text-duston-dark">
            <Building2 size={14} className="text-duston-muted shrink-0" />
            <select
              value={selectedEntityId || "all"}
              onChange={(e) => setSelectedEntityId(e.target.value === "all" ? null : e.target.value)}
              className="bg-transparent text-xs font-medium text-duston-dark outline-none cursor-pointer pr-1"
            >
              <option value="all">All Subsidiaries ({entities.length})</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Deliverable Progress Column Bar Chart */}
        <div className="bg-white border border-duston-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-duston-dark">Deliverable Progress</h3>
          </div>

          <div className="flex items-end justify-between gap-3 pt-4 pb-2">
            {/* 3 Status Vertical Columns */}
            <div className="flex-1 flex items-end justify-around gap-3 h-44 border-b border-duston-border pb-2">
              {[
                {
                  label: "Not started",
                  count: notStartedItems.length,
                  pct: notStartedRate,
                  color: "bg-[#023542]",
                },
                {
                  label: "In progress",
                  count: inProgressItems.length,
                  pct: inProgressRate,
                  color: "bg-[#1BCECE]",
                },
                {
                  label: "Done",
                  count: completedItems.length,
                  pct: completedRate,
                  color: "bg-emerald-500",
                },
              ].map((col, idx) => {
                const heightPct =
                  col.count === 0 || totalCount === 0
                    ? 0
                    : Math.max(8, Math.round((col.count / totalCount) * 100));
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                    <span className="text-[11px] font-bold text-duston-dark group-hover:scale-110 transition-transform">
                      {col.count}
                    </span>
                    <span className="text-[9px] text-duston-muted font-medium">
                      ({col.pct}%)
                    </span>
                    <div
                      className={cn("w-full max-w-[34px] rounded-t-lg transition-all duration-500", col.color)}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] text-duston-muted text-center font-medium truncate max-w-[65px]" title={col.label}>
                      {col.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right Summary Callout */}
            <div className="w-24 pl-3 flex flex-col justify-center items-center text-center space-y-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#1BCECE]/20 text-[#023542]">
                Active
              </span>
              <div className="text-3xl font-extrabold text-[#023542]">
                {inProgressItems.length}
              </div>
              <span className="text-[10px] text-duston-muted font-medium">
                In Progress
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Concentric Ring Donut Chart ("Project Completed") */}
        <div className="bg-white border border-duston-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-duston-dark">Completion Status</h3>
            <span className="text-[10px] font-medium text-duston-muted">
              {totalCount} Total
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 py-2">
            {/* Legend Left */}
            <div className="space-y-3 text-xs flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-duston-dark font-medium text-[11px]">Completed</span>
                </div>
                <span className="font-bold text-duston-dark text-xs">
                  {completedItems.length} ({completedRate}%)
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1BCECE] shrink-0" />
                  <span className="text-duston-dark font-medium text-[11px]">In Progress</span>
                </div>
                <span className="font-bold text-duston-dark text-xs">
                  {inProgressItems.length} ({inProgressRate}%)
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#023542] shrink-0" />
                  <span className="text-duston-dark font-medium text-[11px]">Not Started</span>
                </div>
                <span className="font-bold text-duston-dark text-xs">
                  {notStartedItems.length} ({notStartedRate}%)
                </span>
              </div>

              {overdueItems.length > 0 && (
                <div className="pt-2 border-t border-duston-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F15A24] shrink-0" />
                    <span className="text-[#F15A24] font-medium text-[11px]">Overdue</span>
                  </div>
                  <span className="font-bold text-[#F15A24] text-xs">
                    {overdueItems.length} ({overdueRate}%)
                  </span>
                </div>
              )}
            </div>

            {/* Concentric Circular SVG Rings Right */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Track Rings (Background) */}
                <circle cx="60" cy="60" r="46" fill="none" stroke="#E8E6E0" strokeWidth="8" />
                <circle cx="60" cy="60" r="34" fill="none" stroke="#E8E6E0" strokeWidth="8" />
                <circle cx="60" cy="60" r="22" fill="none" stroke="#E8E6E0" strokeWidth="8" />

                {/* Outer Ring: Completed (Emerald) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeLinecap={completedRate > 0 ? "round" : "butt"}
                  strokeOpacity={completedRate > 0 ? 1 : 0}
                  strokeDasharray={circumferenceOuter}
                  strokeDashoffset={strokeDashoffsetOuter}
                  className="transition-all duration-700 ease-out"
                />

                {/* Middle Ring: In Progress (Duston Cyan) */}
                <circle
                  cx="60"
                  cy="60"
                  r="34"
                  fill="none"
                  stroke="#1BCECE"
                  strokeWidth="8"
                  strokeLinecap={inProgressRate > 0 ? "round" : "butt"}
                  strokeOpacity={inProgressRate > 0 ? 1 : 0}
                  strokeDasharray={circumferenceMiddle}
                  strokeDashoffset={strokeDashoffsetMiddle}
                  className="transition-all duration-700 ease-out"
                />

                {/* Inner Ring: Not Started (Duston Dark Teal) */}
                <circle
                  cx="60"
                  cy="60"
                  r="22"
                  fill="none"
                  stroke="#023542"
                  strokeWidth="8"
                  strokeLinecap={notStartedRate > 0 ? "round" : "butt"}
                  strokeOpacity={notStartedRate > 0 ? 1 : 0}
                  strokeDasharray={circumferenceInner}
                  strokeDashoffset={strokeDashoffsetInner}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-duston-dark">{completedRate}%</span>
                <span className="text-[8px] text-duston-muted">Done</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Priority & Workstream Breakdown */}
        <div className="bg-white border border-duston-border rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-duston-dark">Priority Distribution</h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium text-duston-dark">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Done
              </span>
              <span className="flex items-center gap-1.5 font-medium text-duston-muted">
                <span className="w-2 h-2 rounded-full bg-duston-dark/30 shrink-0" /> Pending
              </span>
            </div>
          </div>

          <div className="space-y-3 py-1">
            {[
              {
                tier: "Critical Priority",
                stats: priorityStats.critical,
                barColor: "bg-[#F15A24]",
              },
              {
                tier: "High Priority",
                stats: priorityStats.high,
                barColor: "bg-[#FBB03B]",
              },
              {
                tier: "Medium Priority",
                stats: priorityStats.medium,
                barColor: "bg-[#1BCECE]",
              },
              {
                tier: "Low Priority",
                stats: priorityStats.low,
                barColor: "bg-slate-400",
              },
            ].map((p, idx) => {
              const tierTotal = p.stats.total;
              const donePct = tierTotal > 0 ? (p.stats.done / tierTotal) * 100 : 0;
              const pendingPct = tierTotal > 0 ? (p.stats.pending / tierTotal) * 100 : 0;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", p.barColor)} />
                      <span className="font-semibold text-duston-dark">{p.tier}</span>
                      <span className="text-[10px] text-duston-muted">({tierTotal})</span>
                    </div>
                    <span className="text-[11px] text-duston-muted">
                      <span className="font-semibold text-emerald-600">{p.stats.done} done</span>
                      <span className="mx-1">/</span>
                      <span className="font-semibold text-duston-dark">{p.stats.pending} pending</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-duston-bg border border-duston-border/60 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${donePct}%` }}
                      title={`${p.stats.done} of ${tierTotal} completed (${tierTotal > 0 ? Math.round(donePct) : 0}%)`}
                    />
                    <div
                      className={cn("h-full transition-all duration-500", p.barColor)}
                      style={{ width: `${pendingPct}%` }}
                      title={`${p.stats.pending} of ${tierTotal} pending (${tierTotal > 0 ? Math.round(pendingPct) : 0}%)`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2.5 border-t border-duston-border flex items-center justify-between text-[10px] text-duston-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F15A24] shrink-0" /> Critical:
              <span className="font-bold text-duston-dark">{priorityStats.critical.total}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FBB03B] shrink-0" /> High:
              <span className="font-bold text-duston-dark">{priorityStats.high.total}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1BCECE] shrink-0" /> Medium:
              <span className="font-bold text-duston-dark">{priorityStats.medium.total}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" /> Low:
              <span className="font-bold text-duston-dark">{priorityStats.low.total}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Full-Width Table: Critical & Pending Workstreams */}
      <div className="bg-white border border-duston-border rounded-2xl shadow-subtle overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-duston-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <h2 className="text-sm font-semibold text-duston-dark">
            Critical & Pending Workstreams
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center bg-duston-bg p-0.5 rounded-xl border border-duston-border text-[11px]">
              {[
                { id: "all_pending", label: "All Pending", count: tabCounts.all_pending },
                { id: "overdue", label: "Overdue Only", count: tabCounts.overdue },
                { id: "critical", label: "Critical / High", count: tabCounts.critical },
                { id: "not_started", label: "Not Started", count: tabCounts.not_started },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTableFilter(tab.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5",
                    tableFilter === tab.id
                      ? "bg-white text-duston-dark shadow-xs"
                      : "text-duston-muted hover:text-duston-dark"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 text-[9px] font-bold rounded-full",
                      tableFilter === tab.id
                        ? "bg-duston-bg text-duston-dark border border-duston-border"
                        : "bg-duston-border/50 text-duston-muted"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-duston-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workstreams..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-duston-border rounded-xl text-duston-text outline-none focus:border-[#1BCECE] focus:ring-1 focus:ring-[#1BCECE] w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        {pendingWorkstreams.length === 0 ? (
          <div className="py-12 text-center text-xs text-duston-muted space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-duston-dark">No pending workstreams</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-duston-border bg-duston-bg/60 text-duston-muted font-medium">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Action Item</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Subsidiary</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Responsible</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-duston-border">
                {pendingWorkstreams.map((item, index) => {
                  const overdue = isDeadlineOverdue(item.deadline, item.status);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openActionItem(item.id)}
                      className="hover:bg-duston-bg/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center text-duston-muted font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-duston-dark group-hover:text-[#1BCECE] transition-colors max-w-sm">
                          {item.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-duston-muted truncate max-w-[140px]">
                        {item.projectName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-duston-dark">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.entityBrandColor }}
                          />
                          {item.entityName}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[11px] font-medium",
                            overdue ? "text-rose-600 font-bold" : "text-duston-dark"
                          )}>
                            {formatDate(item.deadline)}
                          </span>
                          {overdue && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityFlag priority={item.priority} showLabel />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-duston-muted">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#023542] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            {item.assigneeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-medium text-duston-dark truncate max-w-[100px]">
                            {item.assigneeName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap capitalize">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-medium border",
                            item.status === "in_progress" && "bg-cyan-50 text-cyan-900 border-cyan-200",
                            item.status === "not_started" && "bg-slate-100 text-slate-700 border-slate-200",
                            item.status === "done" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            item.status === "postponed" && "bg-amber-50 text-amber-800 border-amber-200"
                          )}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openActionItem(item.id);
                          }}
                          className="p-1 rounded-lg text-duston-muted hover:text-[#023542] hover:bg-white border border-transparent hover:border-duston-border transition-colors cursor-pointer"
                          title="View Action Item"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Summary */}
        <div className="p-3 bg-duston-bg/40 border-t border-duston-border flex items-center justify-between text-[11px] text-duston-muted">
          <span>
            Showing {pendingWorkstreams.length} pending workstream{pendingWorkstreams.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
