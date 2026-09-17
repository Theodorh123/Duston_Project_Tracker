"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, X, Clock, Check } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface TargetDeadlinePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  className?: string;
  align?: "left" | "right";
  placeholder?: string;
}

export function TargetDeadlinePicker({
  value,
  onChange,
  label = "Target Deadline",
  className,
  align = "left",
  placeholder = "Target Deadline",
}: TargetDeadlinePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Shortcut helpers
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split("T")[0];

  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split("T")[0];

  const in14Days = new Date(today);
  in14Days.setDate(today.getDate() + 14);
  const in14DaysStr = in14Days.toISOString().split("T")[0];

  const handleSelectDate = (dateVal: string) => {
    onChange(dateVal);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  const isSet = Boolean(value && value.trim() !== "");

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      {/* Trigger Button */}
      {!isSet ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white border border-duston-border text-duston-dark hover:border-[#1BCECE] transition-all shadow-2xs cursor-pointer select-none whitespace-nowrap"
          title="Choose Target Deadline"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <Calendar size={12} className="text-[#023542] shrink-0" />
          <span>{placeholder}</span>
        </button>
      ) : (
        <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white border border-[#023542] text-[#023542] ring-1 ring-[#023542]/15 shadow-2xs whitespace-nowrap select-none shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[#1BCECE] transition-colors"
            title="Change Target Deadline"
          >
            <Calendar size={12} className="text-[#023542] shrink-0" />
            <span>{formatDate(value)}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-duston-bg rounded text-duston-muted hover:text-duston-dark cursor-pointer ml-0.5"
            title="Clear deadline (Set to: To Be Actioned)"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-64 rounded-2xl bg-white border border-duston-border shadow-xl p-3 animate-in fade-in zoom-in-95 duration-100 space-y-2.5",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-duston-border/60 pb-2">
            <span className="text-[11px] font-semibold text-duston-dark flex items-center gap-1.5">
              <Calendar size={12} className="text-[#1BCECE]" />
              <span>Choose Target Date</span>
            </span>
            {isSet && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectDate(todayStr)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between",
                value === todayStr
                  ? "bg-[#023542] text-white border-[#023542]"
                  : "bg-duston-bg/60 border-duston-border/60 text-duston-dark hover:bg-duston-bg hover:border-[#1BCECE]"
              )}
            >
              <span>Today</span>
              {value === todayStr && <Check size={11} />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(tomorrowStr)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between",
                value === tomorrowStr
                  ? "bg-[#023542] text-white border-[#023542]"
                  : "bg-duston-bg/60 border-duston-border/60 text-duston-dark hover:bg-duston-bg hover:border-[#1BCECE]"
              )}
            >
              <span>Tomorrow</span>
              {value === tomorrowStr && <Check size={11} />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(in3DaysStr)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between",
                value === in3DaysStr
                  ? "bg-[#023542] text-white border-[#023542]"
                  : "bg-duston-bg/60 border-duston-border/60 text-duston-dark hover:bg-duston-bg hover:border-[#1BCECE]"
              )}
            >
              <span>In 3 Days</span>
              {value === in3DaysStr && <Check size={11} />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(in7DaysStr)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between",
                value === in7DaysStr
                  ? "bg-[#023542] text-white border-[#023542]"
                  : "bg-duston-bg/60 border-duston-border/60 text-duston-dark hover:bg-duston-bg hover:border-[#1BCECE]"
              )}
            >
              <span>In 1 Week</span>
              {value === in7DaysStr && <Check size={11} />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate(in14DaysStr)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between",
                value === in14DaysStr
                  ? "bg-[#023542] text-white border-[#023542]"
                  : "bg-duston-bg/60 border-duston-border/60 text-duston-dark hover:bg-duston-bg hover:border-[#1BCECE]"
              )}
            >
              <span>In 2 Weeks</span>
              {value === in14DaysStr && <Check size={11} />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectDate("")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between",
                !value
                  ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                  : "bg-duston-bg/60 border-duston-border/60 text-duston-muted hover:bg-duston-bg hover:border-amber-300 hover:text-amber-800"
              )}
              title="Save as To Be Actioned"
            >
              <span>To Be Actioned</span>
              {!value && <Check size={11} />}
            </button>
          </div>

          {/* Custom Date Picker Input */}
          <div className="pt-2 border-t border-duston-border/60 space-y-1">
            <label className="block text-[10px] font-semibold text-duston-muted uppercase tracking-wider">
              Specific Date
            </label>
            <input
              ref={dateInputRef}
              type="date"
              value={value || ""}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-duston-border focus:outline-none focus:border-[#1BCECE] bg-white text-duston-dark shadow-2xs font-medium cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
