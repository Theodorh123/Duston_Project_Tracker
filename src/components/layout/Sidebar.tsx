"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FolderKanban,
  CalendarDays,
  ShieldAlert,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ userRole = "contributor", isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const isCeo = userRole === "ceo";
  const isEa = userRole === "ea";
  const isAdmin = userRole === "admin";

  const mainNav = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Meetings", href: "/meetings", icon: CalendarDays },
  ];

  const viewsNav = [
    ...(isEa ? [{ name: "EA view", href: "/ea-view", icon: ShieldAlert }] : []),
    ...(isCeo ? [{ name: "CEO view", href: "/ceo-view", icon: BarChart3 }] : []),
    { name: "Action register", href: "/action-items", icon: ClipboardList },
  ];

  const settingsNav = [
    { name: "Settings", href: "/settings", icon: Settings },
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: ShieldCheck }] : []),
  ];

  const renderNavList = (items: typeof mainNav) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <li key={item.name}>
            <Link
              href={item.href}
              prefetch={true}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-[3px]",
                isActive
                  ? "bg-[#1BCECE]/10 text-[#023542] border-[#1BCECE]"
                  : "text-duston-muted hover:text-duston-dark hover:bg-duston-bg border-transparent"
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[260px] xl:w-[280px] 2xl:w-[300px] bg-white border-r border-duston-border z-50 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Duston Logotype Header */}
        <div className="px-5 py-3.5 sm:py-4 lg:py-5 flex items-center justify-between border-b border-duston-border/50 bg-white">
          <Link
            href="/"
            className="flex items-center hover:opacity-85 transition-opacity w-full"
            title="Duston Project Tracker — Return to Dashboard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-duston-group.png"
              alt="Duston Group"
              className="h-8 sm:h-9 lg:h-9 xl:h-10 2xl:h-11 w-auto max-w-full object-contain transition-all duration-200"
            />
          </Link>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded text-duston-muted hover:text-duston-dark lg:hidden shrink-0 ml-2"
            aria-label="Close sidebar"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Nav Areas */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          {/* Main Menu */}
          <div>
            <div className="px-4 mb-2 text-xs font-medium text-duston-muted">
              Main menu
            </div>
            {renderNavList(mainNav)}
          </div>

          {/* Views */}
          {viewsNav.length > 0 && (
            <div>
              <div className="px-4 mb-2 text-xs font-medium text-duston-muted">
                Views
              </div>
              {renderNavList(viewsNav)}
            </div>
          )}
        </div>

        {/* Settings Pinned to Bottom */}
        <div className="p-2 border-t border-duston-border">
          <div className="px-4 mb-2 text-xs font-medium text-duston-muted">
            Settings
          </div>
          {renderNavList(settingsNav)}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-duston-muted hover:text-duston-orange hover:bg-duston-bg border-l-[3px] border-transparent transition-colors mt-1"
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
