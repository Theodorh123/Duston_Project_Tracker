"use client";

import { useState, useRef, useEffect, ReactNode, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  dotColor?: string;
  count?: number;
}

interface DropdownFilterProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
  placeholder?: string;
  enableSearch?: boolean;
}

export function DropdownFilter({
  label,
  value,
  options,
  onChange,
  icon,
  align = "left",
  className,
  menuClassName,
  enableSearch = false,
}: DropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
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

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const selectedOption = options.find((opt) => opt.value === value);
  const isFiltered = Boolean(value && value !== "all" && value !== "");

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      {/* Trigger Button - Always displays clean, concise label */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center justify-between gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all border outline-none cursor-pointer shadow-2xs w-full sm:w-auto",
          isFiltered
            ? "bg-white border-[#023542] text-[#023542] ring-1 ring-[#023542]/15"
            : "bg-white border-duston-border text-duston-dark hover:border-[#1BCECE]"
        )}
        title={selectedOption ? `${label}: ${selectedOption.label}` : label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="shrink-0 text-[#023542]">{icon}</span>}
          <span className="truncate">{label}</span>
          {isFiltered && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#1BCECE] shrink-0"
              title={`Filtered: ${selectedOption?.label || value}`}
            />
          )}
        </div>
        <ChevronDown
          size={12}
          className={cn(
            "text-duston-muted transition-transform duration-150 shrink-0 ml-0.5",
            isOpen && "rotate-180 text-duston-dark"
          )}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 min-w-[180px] sm:min-w-[220px] max-w-[280px] sm:max-w-[320px] bg-white border border-duston-border rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100",
            align === "right" ? "right-0" : "left-0",
            menuClassName
          )}
          role="listbox"
        >
          {/* Optional Search Filter inside menu */}
          {(enableSearch || options.length > 7) && (
            <div className="px-2 pb-1.5 pt-0.5 border-b border-duston-border/60">
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2 text-duston-muted pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-6 pr-6 py-1 text-[11px] bg-duston-bg rounded-lg border border-duston-border text-duston-dark placeholder:text-duston-muted outline-none focus:border-[#1BCECE]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 text-duston-muted hover:text-duston-dark p-0.5"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-duston-muted text-center">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-duston-bg transition-colors cursor-pointer",
                      isSelected
                        ? "bg-[#023542]/5 font-semibold text-[#023542]"
                        : "text-duston-dark"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.dotColor && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: opt.dotColor }}
                        />
                      )}
                      <div className="truncate">
                        <span className="block truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="block text-[10px] text-duston-muted truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.count !== undefined && (
                        <span className="text-[10px] text-duston-muted px-1.5 py-0.2 rounded-full bg-duston-bg border border-duston-border">
                          {opt.count}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={13} className="text-[#023542] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
