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

  return (
    <header className="sticky top-0 z-30 bg-duston-bg/90 backdrop-blur-sm border-b border-duston-border px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
      {/* Left side: Hamburger + Entity Filter Chips */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 flex-1">
        <button
          onClick={onOpenMobileNav}
          className="p-2 rounded border border-duston-border bg-white text-duston-text lg:hidden shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>

        {/* Mobile Duston Group Logo */}
        <Link href="/" className="lg:hidden flex items-center shrink-0 mr-1" title="Duston Group — Return to Dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-duston-group.png"
            alt="Duston Group"
            className="h-7 w-auto object-contain"
          />
        </Link>

        {/* Search trigger button */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-duston-muted bg-white border border-duston-border rounded-lg hover:border-[#1BCECE] transition-colors shrink-0 mr-2"
        >
          <Search size={14} strokeWidth={1.5} />
          <span>Search (Ctrl+K)</span>
        </button>

        {/* Entity Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onSelectEntity(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0",
              selectedEntityId === null
                ? "bg-[#023542] text-white"
                : "bg-white border border-duston-border text-duston-text hover:border-[#1BCECE]"
            )}
          >
            All entities
          </button>
          {entities.map((entity) => {
            const isSelected = selectedEntityId === entity.id;
            return (
              <button
                key={entity.id}
                onClick={() => onSelectEntity(entity.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5",
                  isSelected
                    ? "bg-[#023542] text-white"
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
      </div>

      {/* Right side: Notifications + User Avatar */}
      <div className="flex items-center gap-3 shrink-0">
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
            <div className="absolute right-0 mt-2 w-80 bg-white border border-duston-border rounded-xl shadow-subtle p-4 z-50">
              <div className="flex items-center justify-between mb-3 border-b border-duston-border pb-2">
                <span className="text-sm font-medium text-duston-dark">
                  Notifications
                </span>
                <span className="text-xs text-duston-muted">
                  {unreadCount} unread
                </span>
              </div>
              <div className="space-y-2 text-xs text-duston-muted max-h-60 overflow-y-auto">
                <div className="p-2 rounded bg-duston-bg border border-duston-border">
                  <div className="font-medium text-duston-text">
                    EBID syndication term sheet overdue
                  </div>
                  <div className="text-[11px] text-duston-orange mt-0.5">
                    Action item passed deadline
                  </div>
                </div>
                <div className="p-2 rounded hover:bg-duston-bg transition-colors">
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

        {/* User Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-white border border-transparent hover:border-duston-border transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-duston-dark">
                {user.name || "User"}
              </div>
              <div className="text-[10px] text-duston-muted uppercase tracking-wider">
                {user.role || "contributor"}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#023542] text-white flex items-center justify-center text-xs font-medium">
              {getInitials(user.name)}
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-duston-border rounded-xl shadow-subtle py-1 z-50">
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
                className="block px-4 py-2 text-xs text-duston-text hover:bg-duston-bg hover:text-duston-dark"
              >
                Account settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-left block px-4 py-2 text-xs text-duston-orange hover:bg-duston-bg"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
