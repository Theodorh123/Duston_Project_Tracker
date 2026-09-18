"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  cn,
  formatDate,
  formatShortDate,
  isDeadlineOverdue,
  isTbaDeadline,
  TBA_DEADLINE,
} from "@/lib/utils";
import { PriorityFlag } from "@/components/ui/PriorityFlag";
import { ActionItemSummary } from "./DashboardClient";

interface DashboardPlannerViewProps {
  items: ActionItemSummary[];
  onOpenItem: (id: string) => void;
  onOpenQuickAddForDate: (dateStr: string) => void;
  onDropDate: (itemId: string, newDateStr: string) => Promise<void>;
  draggingItemId: string | null;
  setDraggingItemId: (id: string | null) => void;
  dragOverPlannerDate: string | null;
  setDragOverPlannerDate: (dateStr: string | null) => void;
}

export function DashboardPlannerView({
  items,
  onOpenItem,
  onOpenQuickAddForDate,
  onDropDate,
  draggingItemId,
  setDraggingItemId,
  dragOverPlannerDate,
  setDragOverPlannerDate,
}: DashboardPlannerViewProps) {
  // Calendar Anchor Date (defaults to today)
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [viewSpan, setViewSpan] = useState<"7" | "14" | "month">("7");
  const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(false);
  const miniCalRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Close mini calendar on click outside or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (miniCalRef.current && !miniCalRef.current.contains(event.target as Node)) {
        setIsMiniCalendarOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMiniCalendarOpen(false);
      }
    }

    if (isMiniCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMiniCalendarOpen]);

  // Navigate Periods
  const handlePrev = () => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (viewSpan === "7") {
        next.setDate(next.getDate() - 7);
      } else if (viewSpan === "14") {
        next.setDate(next.getDate() - 14);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (viewSpan === "7") {
        next.setDate(next.getDate() + 7);
      } else if (viewSpan === "14") {
        next.setDate(next.getDate() + 14);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    setAnchorDate(new Date());
  };

  // Compute Days for Week / 2-Week View (Starting from Monday)
  const linearDays = useMemo(() => {
    const totalDays = viewSpan === "14" ? 14 : 7;
    const start = new Date(anchorDate);
    const day = start.getDay();
    // Monday as start of week:
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    return Array.from({ length: totalDays }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const dStr = d.toISOString().split("T")[0];
      return {
        date: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        isToday: dStr === todayStr,
      };
    });
  }, [anchorDate, viewSpan, todayStr]);

  // Compute Days for Month Grid View
  const monthGridDays = useMemo(() => {
    if (viewSpan !== "month") return [];
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Start from Monday

    const startGridDate = new Date(year, month, 1 + startOffset);

    // 42 days (6 weeks) for complete grid
    return Array.from({ length: 42 }).map((_, idx) => {
      const d = new Date(startGridDate);
      d.setDate(startGridDate.getDate() + idx);
      const dStr = d.toISOString().split("T")[0];
      const isCurrentMonth = d.getMonth() === month;
      return {
        date: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        isCurrentMonth,
        isToday: dStr === todayStr,
      };
    });
  }, [anchorDate, viewSpan, todayStr]);

  // Date Range Display String
  const rangeDisplay = useMemo(() => {
    if (viewSpan === "month") {
      return anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (linearDays.length === 0) return "";
    const first = linearDays[0].date;
    const last = linearDays[linearDays.length - 1].date;

    const firstStr = first.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const lastStr = last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${firstStr} – ${lastStr}`;
  }, [linearDays, viewSpan, anchorDate]);

  // Unscheduled / TBA Items
  const tbaItems = useMemo(() => {
    return items.filter((i) => !i.deadline || isTbaDeadline(i.deadline));
  }, [items]);

  // Mini-Calendar month navigation
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(anchorDate);
  useEffect(() => {
    setMiniCalMonth(anchorDate);
  }, [anchorDate]);

  const miniCalDays = useMemo(() => {
    const year = miniCalMonth.getFullYear();
    const month = miniCalMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const start = new Date(year, month, 1 + startOffset);
    return Array.from({ length: 42 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const dStr = d.toISOString().split("T")[0];
      return {
        date: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === month,
        isToday: dStr === todayStr,
        hasTasks: items.some((it) => it.deadline === dStr),
      };
    });
  }, [miniCalMonth, todayStr, items]);

  return (
    <div className="bg-white border border-duston-border rounded-2xl p-3.5 sm:p-5 shadow-subtle space-y-4">
      {/* Planner Top Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-duston-border/60 pb-3.5">
        {/* Left: Title & Subtitle */}
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[#023542] flex items-center gap-2">
            <CalendarIcon size={16} className="text-[#1BCECE]" />
            <span>Deliverables Planner & Calendar</span>
          </h3>
          <p className="text-[11px] text-duston-muted mt-0.5">
            Navigate dates, drag tasks across columns to reschedule deadlines, or click + to add tasks to any date
          </p>
        </div>

        {/* Center / Right: Calendar Navigation & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation Controls: Prev, Range Dropdown, Next, Today */}
          <div className="flex items-center gap-1 bg-duston-bg p-1 rounded-xl border border-duston-border">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-white text-duston-dark transition-colors cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Interactive Date Range Button with Popover Mini Calendar */}
            <div className="relative" ref={miniCalRef}>
              <button
                type="button"
                onClick={() => setIsMiniCalendarOpen(!isMiniCalendarOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-duston-dark hover:bg-white rounded-lg transition-colors cursor-pointer select-none"
                title="Click to jump to any date"
              >
                <CalendarIcon size={12} className="text-[#023542]" />
                <span>{rangeDisplay}</span>
                <ChevronDown size={11} className="text-duston-muted" />
              </button>

              {/* Mini Calendar Popover */}
              {isMiniCalendarOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 max-w-[calc(100vw-2rem)] bg-white border border-duston-border rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-duston-border/60 pb-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMiniCalMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-duston-bg text-duston-dark cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-semibold text-duston-dark">
                      {miniCalMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMiniCalMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-duston-bg text-duston-dark cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Days of week header */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-duston-muted">
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                    <span>Su</span>
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {miniCalDays.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAnchorDate(d.date);
                          setIsMiniCalendarOpen(false);
                        }}
                        className={cn(
                          "h-8 rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer",
                          d.isToday && "border border-[#1BCECE] font-bold text-[#023542]",
                          !d.isCurrentMonth && "text-duston-muted/40",
                          d.isCurrentMonth && "text-duston-dark hover:bg-duston-bg"
                        )}
                      >
                        <span className="text-[11px]">{d.dayNum}</span>
                        {d.hasTasks && (
                          <span className="w-1 h-1 rounded-full bg-[#1BCECE] absolute bottom-1" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Quick Jump Buttons */}
                  <div className="pt-2 border-t border-duston-border/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setAnchorDate(new Date());
                        setIsMiniCalendarOpen(false);
                      }}
                      className="text-[11px] text-[#023542] hover:underline font-semibold cursor-pointer"
                    >
                      Jump to Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMiniCalendarOpen(false)}
                      className="text-[11px] text-duston-muted hover:text-duston-dark cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-white text-duston-dark transition-colors cursor-pointer"
              title="Next period"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Today Jump Button */}
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1.5 bg-duston-bg hover:bg-duston-border/60 border border-duston-border rounded-xl text-xs font-semibold text-duston-dark transition-colors cursor-pointer shadow-2xs"
            title="Reset to current week"
          >
            Today
          </button>

          {/* View Span Toggle (7 Days, 14 Days, Month) */}
          <div className="flex items-center bg-duston-bg p-1 rounded-xl border border-duston-border text-xs">
            <button
              type="button"
              onClick={() => setViewSpan("7")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                viewSpan === "7"
                  ? "bg-white text-[#023542] shadow-2xs font-semibold"
                  : "text-duston-muted hover:text-duston-dark"
              )}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setViewSpan("14")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                viewSpan === "14"
                  ? "bg-white text-[#023542] shadow-2xs font-semibold"
                  : "text-duston-muted hover:text-duston-dark"
              )}
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => setViewSpan("month")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                viewSpan === "month"
                  ? "bg-white text-[#023542] shadow-2xs font-semibold"
                  : "text-duston-muted hover:text-duston-dark"
              )}
            >
              Month Grid
            </button>
          </div>
        </div>
      </div>

      {/* Main Planner Grid */}
      {viewSpan !== "month" ? (
        /* Linear Day Columns (7 or 14 days) */
        <div className="overflow-x-auto pb-2 no-scrollbar">
          <div
            className="grid gap-2 text-center text-xs"
            style={{
              gridTemplateColumns: `repeat(${linearDays.length}, minmax(${
                viewSpan === "14" ? "140px" : "150px"
              }, 1fr))`,
              minWidth: viewSpan === "14" ? "1200px" : "750px",
            }}
          >
            {linearDays.map((dayObj) => {
              const dStr = dayObj.dateStr;
              const dayItems = items.filter((i) => i.deadline === dStr);
              const isCurToday = dayObj.isToday;
              const isOverDay = dragOverPlannerDate === dStr;

              return (
                <div
                  key={dStr}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverPlannerDate !== dStr) setDragOverPlannerDate(dStr);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOverPlannerDate(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId = e.dataTransfer.getData("text/plain");
                    if (droppedId) {
                      onDropDate(droppedId, dStr);
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-2xl border min-h-[220px] flex flex-col transition-all duration-150 relative group/day",
                    isOverDay
                      ? "border-2 border-dashed border-[#1BCECE] bg-[#1BCECE]/10 shadow-md scale-[1.01]"
                      : isCurToday
                      ? "border-[#1BCECE] bg-[#1BCECE]/5 ring-1 ring-[#1BCECE]/20"
                      : "border-duston-border bg-duston-bg/30 hover:border-duston-border/80"
                  )}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-duston-border/50">
                    <div className="text-left">
                      <span className="text-[10px] text-duston-muted uppercase font-bold tracking-wider block">
                        {dayObj.dayName}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            isCurToday ? "text-[#023542]" : "text-duston-dark"
                          )}
                        >
                          {dayObj.dayNum}
                        </span>
                        {dayObj.dayNum === 1 && (
                          <span className="text-[10px] text-duston-muted font-medium">
                            {dayObj.monthName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCurToday && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1BCECE] text-white">
                          Today
                        </span>
                      )}
                      {/* Add Task for this date */}
                      <button
                        type="button"
                        onClick={() => onOpenQuickAddForDate(dStr)}
                        className="w-5 h-5 rounded-md bg-white border border-duston-border hover:bg-[#023542] hover:text-white text-duston-muted flex items-center justify-center transition-colors cursor-pointer shadow-2xs opacity-80 group-hover/day:opacity-100"
                        title={`Add task for ${dayObj.dayName}, ${dayObj.monthName} ${dayObj.dayNum}`}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Tasks List inside Day */}
                  <div className="flex-1 space-y-1.5 mt-2">
                    {dayItems.length === 0 ? (
                      <div
                        onClick={() => onOpenQuickAddForDate(dStr)}
                        className="h-full min-h-[100px] border border-dashed border-duston-border/60 hover:border-[#1BCECE] rounded-xl flex flex-col items-center justify-center text-[10px] text-duston-muted hover:text-[#023542] hover:bg-white/60 transition-all cursor-pointer p-2 space-y-1"
                        title={`Click to add task for this date`}
                      >
                        <Plus size={14} className="opacity-60" />
                        <span className="text-[9px]">Drop or + Add</span>
                      </div>
                    ) : (
                      dayItems.map((it) => {
                        const isBeingDragged = draggingItemId === it.id;
                        return (
                          <div
                            key={it.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", it.id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingItemId(it.id);
                            }}
                            onDragEnd={() => {
                              setDraggingItemId(null);
                              setDragOverPlannerDate(null);
                            }}
                            onClick={() => onOpenItem(it.id)}
                            className={cn(
                              "p-2 rounded-xl bg-white border text-[11px] text-left cursor-grab active:cursor-grabbing transition-all select-none shadow-2xs space-y-1 hover:border-[#1BCECE] hover:shadow-subtle group",
                              isBeingDragged &&
                                "opacity-40 border-dashed border-[#1BCECE] scale-[0.98]",
                              it.status === "done" && "opacity-75 bg-duston-bg/40"
                            )}
                            title={`${it.title} (${it.entityName})`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div
                                className={cn(
                                  "font-semibold text-duston-dark line-clamp-2 leading-tight group-hover:text-[#023542]",
                                  it.status === "done" && "line-through text-duston-muted"
                                )}
                              >
                                {it.title}
                              </div>
                              <PriorityFlag priority={it.priority} size={9} showLabel={false} />
                            </div>

                            {/* Subsidiary Badge & Assignee info */}
                            <div className="flex items-center justify-between gap-1 text-[9px] text-duston-muted pt-0.5 border-t border-duston-border/40">
                              <span
                                className="px-1.5 py-0.2 rounded font-semibold truncate max-w-[80px]"
                                style={{
                                  backgroundColor: `${it.entityBrandColor}15`,
                                  color: it.entityBrandColor,
                                }}
                              >
                                {it.entityName}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                {Boolean(
                                  it.secondaryAssigneeNames &&
                                    it.secondaryAssigneeNames.length > 0
                                ) && (
                                  <span
                                    className="px-1 py-0.2 rounded text-[8px] font-semibold bg-duston-bg border border-duston-border text-duston-dark"
                                    title={`Co-owners: ${it.secondaryAssigneeNames?.join(", ")}`}
                                  >
                                    +{it.secondaryAssigneeNames?.length}
                                  </span>
                                )}
                                {Boolean(it.commentCount && it.commentCount > 0) && (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[8px] text-[#023542] font-semibold bg-[#1BCECE]/15 px-1 py-0.2 rounded border border-[#1BCECE]/30"
                                    title={`${it.commentCount} updates`}
                                  >
                                    <MessageSquare size={8} className="text-[#1BCECE]" />
                                    <span>{it.commentCount}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Month Calendar Grid View (42 cells) */
        <div className="space-y-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-duston-muted border-b border-duston-border/60 pb-2">
            <span><span className="hidden sm:inline">Monday</span><span className="sm:hidden">Mo</span></span>
            <span><span className="hidden sm:inline">Tuesday</span><span className="sm:hidden">Tu</span></span>
            <span><span className="hidden sm:inline">Wednesday</span><span className="sm:hidden">We</span></span>
            <span><span className="hidden sm:inline">Thursday</span><span className="sm:hidden">Th</span></span>
            <span><span className="hidden sm:inline">Friday</span><span className="sm:hidden">Fr</span></span>
            <span><span className="hidden sm:inline">Saturday</span><span className="sm:hidden">Sa</span></span>
            <span><span className="hidden sm:inline">Sunday</span><span className="sm:hidden">Su</span></span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {monthGridDays.map((dayObj) => {
              const dStr = dayObj.dateStr;
              const dayItems = items.filter((i) => i.deadline === dStr);
              const isCurToday = dayObj.isToday;
              const isOverDay = dragOverPlannerDate === dStr;

              return (
                <div
                  key={dStr}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverPlannerDate !== dStr) setDragOverPlannerDate(dStr);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOverPlannerDate(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId = e.dataTransfer.getData("text/plain");
                    if (droppedId) {
                      onDropDate(droppedId, dStr);
                    }
                  }}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-xl border min-h-[90px] sm:min-h-[110px] flex flex-col justify-between transition-all duration-150 group/monthday",
                    isOverDay
                      ? "border-2 border-dashed border-[#1BCECE] bg-[#1BCECE]/10 shadow-sm"
                      : isCurToday
                      ? "border-[#1BCECE] bg-[#1BCECE]/5"
                      : dayObj.isCurrentMonth
                      ? "border-duston-border bg-white hover:border-[#1BCECE]"
                      : "border-duston-border/50 bg-duston-bg/40 opacity-60"
                  )}
                >
                  {/* Top Bar of Day */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                        isCurToday
                          ? "bg-[#023542] text-white"
                          : dayObj.isCurrentMonth
                          ? "text-duston-dark"
                          : "text-duston-muted"
                      )}
                    >
                      {dayObj.dayNum}
                      {dayObj.dayNum === 1 && (
                        <span className="text-[10px] ml-1 font-normal opacity-80">
                          {dayObj.monthName}
                        </span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenQuickAddForDate(dStr)}
                      className="w-4 h-4 rounded hover:bg-[#023542] hover:text-white text-duston-muted flex items-center justify-center transition-colors opacity-0 group-hover/monthday:opacity-100 cursor-pointer"
                      title={`Add task for ${dStr}`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Month Cell Tasks */}
                  <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[65px] no-scrollbar">
                    {dayItems.slice(0, 2).map((it) => (
                      <div
                        key={it.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", it.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingItemId(it.id);
                        }}
                        onDragEnd={() => {
                          setDraggingItemId(null);
                          setDragOverPlannerDate(null);
                        }}
                        onClick={() => onOpenItem(it.id)}
                        className="px-1.5 py-0.5 rounded bg-duston-bg border border-duston-border hover:border-[#1BCECE] text-[10px] truncate font-medium text-duston-dark cursor-grab active:cursor-grabbing flex items-center gap-1"
                        title={it.title}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: it.entityBrandColor }}
                        />
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] font-semibold text-[#023542] block text-center">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled / "To Be Actioned" Drag & Drop Tray */}
      <div className="border border-duston-border rounded-xl p-3 bg-duston-bg/40">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsUnscheduledOpen(!isUnscheduledOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-duston-dark hover:text-[#023542] transition-colors cursor-pointer"
          >
            <Clock size={13} className="text-amber-600" />
            <span>Unscheduled Tasks (To Be Actioned)</span>
            <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {tbaItems.length}
            </span>
            {isUnscheduledOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <span className="text-[10px] text-duston-muted hidden sm:inline">
            Drag items into any date column above to schedule deadlines
          </span>
        </div>

        {isUnscheduledOpen && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverPlannerDate !== TBA_DEADLINE) setDragOverPlannerDate(TBA_DEADLINE);
            }}
            onDragLeave={() => setDragOverPlannerDate(null)}
            onDrop={(e) => {
              e.preventDefault();
              const droppedId = e.dataTransfer.getData("text/plain");
              if (droppedId) {
                onDropDate(droppedId, TBA_DEADLINE);
              }
            }}
            className={cn(
              "mt-3 pt-3 border-t border-duston-border/60 flex flex-wrap gap-2 transition-colors min-h-[60px] p-2 rounded-xl",
              dragOverPlannerDate === TBA_DEADLINE
                ? "bg-amber-100/50 border-2 border-dashed border-amber-400"
                : "bg-white/70"
            )}
          >
            {tbaItems.length === 0 ? (
              <div className="text-xs text-duston-muted italic py-2 px-3">
                No unscheduled tasks. All deliverables have active target deadlines.
              </div>
            ) : (
              tbaItems.map((it) => (
                <div
                  key={it.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", it.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingItemId(it.id);
                  }}
                  onDragEnd={() => {
                    setDraggingItemId(null);
                    setDragOverPlannerDate(null);
                  }}
                  onClick={() => onOpenItem(it.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-duston-border hover:border-[#1BCECE] shadow-2xs text-xs font-medium text-duston-dark cursor-grab active:cursor-grabbing flex items-center gap-2 max-w-xs transition-all select-none"
                  title={`Drag onto any date to set deadline: ${it.title}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: it.entityBrandColor }}
                  />
                  <span className="truncate">{it.title}</span>
                  <PriorityFlag priority={it.priority} size={9} showLabel={false} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
