"use client";

import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export interface EntityFilter {
  id: string;
  name: string;
  slug: string;
  brandPrimaryColor: string;
}

interface TopBarProps {
  entities: EntityFilter[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
  };
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
}

export function TopBar({
  entities,
  selectedEntityId,
  onSelectEntity,
  user,
  onOpenMobileNav,
  onOpenSearch,
  unreadCount = 0,
}: TopBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getInitials = (name?: string | null) => {
    if (!name) return "DU";
    const parts = name.split(" ");
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  };

  const renderEntityChips = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => onSelectEntity(null)}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 whitespace-nowrap",
          selectedEntityId === null
            ? "bg-[#023542] text-white shadow-xs"
            : "bg-white border border-duston-border text-duston-text hover:border-[#1BCECE]"
        )}
      >
        All subsidiaries
      </button>
      {entities.map((entity) => {
        const isSelected = selectedEntityId === entity.id;
        return (
          <button
            key={entity.id}
            onClick={() => onSelectEntity(entity.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap",
              isSelected
                ? "bg-[#023542] text-white shadow-xs"
                : "bg-white border border-duston-border text-duston-text hover:border-[#1BCECE]"
            )}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entity.brandPrimaryColor }}
            />
            <span>{entity.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 bg-duston-bg/95 backdrop-blur-md border-b border-duston-border">
      {/* Main Top Navigation Row */}
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left Side: Mobile Menu Button + Responsive Duston Group Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenMobileNav}
            className="p-2 rounded-xl border border-duston-border bg-white text-duston-text hover:bg-duston-bg lg:hidden shrink-0 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>

          {/* Clickable Responsive Duston Group Logo on Mobile & Tablet */}
          <Link
            href="/"
            className="lg:hidden flex items-center hover:opacity-85 transition-opacity py-0.5"
            title="Duston Project Tracker — Return to Dashboard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-duston-group.png"
              alt="Duston Group"
              className="h-8 sm:h-9 md:h-10 w-auto object-contain max-w-[160px] sm:max-w-[200px]"
            />
          </Link>
        </div>

        {/* Desktop Inline Entity Filter Chips */}
        <div className="hidden lg:flex items-center overflow-x-auto no-scrollbar py-1 flex-1 mx-4">
          {renderEntityChips()}
        </div>

        {/* Right Side: Global Search, Notification Bell, User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* Global Search Shortcut */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-duston-muted bg-white border border-duston-border rounded-xl hover:border-[#1BCECE] hover:text-duston-dark transition-all shrink-0"
            title="Search projects, actions, meetings (Ctrl+K)"
          >
            <Search size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search (Ctrl+K)</span>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-white border border-transparent hover:border-duston-border text-duston-muted hover:text-duston-dark transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F15A24]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-duston-border rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between mb-3 border-b border-duston-border pb-2">
                  <span className="text-sm font-medium text-duston-dark">
                    Notifications
                  </span>
                  <span className="text-xs text-duston-muted">
                    {unreadCount} unread
                  </span>
                </div>
                <div className="space-y-2 text-xs text-duston-muted max-h-60 overflow-y-auto">
                  <div className="p-2.5 rounded-xl bg-duston-bg border border-duston-border">
                    <div className="font-medium text-duston-text">
                      EBID syndication term sheet overdue
                    </div>
                    <div className="text-[11px] text-duston-orange mt-0.5">
                      Action item passed deadline
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-duston-bg transition-colors">
                    <div className="font-medium text-duston-text">
                      Upcoming meeting: MOSL Committee Review
                    </div>
                    <div className="text-[11px] text-duston-muted mt-0.5">
                      Tomorrow at 10:00 AM
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 sm:pl-2 rounded-full hover:bg-white border border-transparent hover:border-duston-border transition-colors"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-duston-dark truncate max-w-[120px]">
                  {user.name || "User"}
                </div>
                <div className="text-[10px] text-duston-muted uppercase tracking-wider">
                  {user.role || "contributor"}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#023542] text-white flex items-center justify-center text-xs font-medium shrink-0">
                {getInitials(user.name)}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-duston-border rounded-2xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-duston-border sm:hidden">
                  <div className="text-xs font-medium text-duston-dark">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-duston-muted uppercase">
                    {user.role}
                  </div>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="block px-4 py-2 text-xs text-duston-text hover:bg-duston-bg hover:text-duston-dark transition-colors"
                >
                  Account settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left block px-4 py-2 text-xs text-duston-orange hover:bg-duston-bg transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Dedicated Entity Filter Strip */}
      <div className="lg:hidden px-4 py-2 border-t border-duston-border/60 bg-duston-bg/80 flex items-center overflow-x-auto no-scrollbar">
        {renderEntityChips()}
      </div>
    </header>
  );
}
