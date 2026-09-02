"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, FolderKanban, CheckSquare, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActionItem?: (actionItemId: string) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectActionItem }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by caller or state
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Mock static search results for instant response
  const sampleItems = [
    { type: "project", title: "EBID Trade Finance Facility (USD 50M)", entity: "MOSL Ltd", href: "/projects" },
    { type: "project", title: "Glencore Retail CAPEX Loan (USD 20M)", entity: "ICON Energy", href: "/projects" },
    { type: "action", title: "Submit draft term sheet to Stanbic", entity: "MOSL Ltd", id: "ai-1" },
    { type: "action", title: "Review BELA legal opinion on covenant package", entity: "MOSL Ltd", id: "ai-2" },
    { type: "meeting", title: "MOSL Board & Financing Committee Review", entity: "MOSL Ltd", href: "/meetings" },
  ];

  const filtered = sampleItems.filter((i) =>
    i.title.toLowerCase().includes(query.toLowerCase()) ||
    i.entity.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-xl bg-white rounded-2xl border border-duston-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-duston-border">
          <Search size={18} strokeWidth={1.5} className="text-duston-muted mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, action items, meetings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-duston-text outline-none placeholder:text-duston-muted"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-duston-muted hover:text-duston-dark"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-duston-muted">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const isProject = item.type === "project";
                const isMeeting = item.type === "meeting";
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onClose();
                      if (item.type === "action" && onSelectActionItem && item.id) {
                        onSelectActionItem(item.id);
                      } else if (item.href) {
                        router.push(item.href);
                      }
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-duston-bg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isProject ? (
                        <FolderKanban size={16} strokeWidth={1.5} className="text-[#023542]" />
                      ) : isMeeting ? (
                        <CalendarDays size={16} strokeWidth={1.5} className="text-[#1BCECE]" />
                      ) : (
                        <CheckSquare size={16} strokeWidth={1.5} className="text-duston-orange" />
                      )}
                      <div>
                        <div className="text-xs font-medium text-duston-dark">{item.title}</div>
                        <div className="text-[11px] text-duston-muted">{item.entity}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-duston-muted px-2 py-0.5 rounded bg-duston-bg border border-duston-border">
                      {item.type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-duston-border bg-duston-bg/50 flex items-center justify-between text-[11px] text-duston-muted">
          <span>Navigate with arrows</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
