"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar, EntityFilter } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { ActionItemDrawer, ActionItemDetail } from "../action-items/ActionItemDrawer";

interface AppShellContextType {
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  openActionItem: (id: string) => void;
  closeActionItem: () => void;
}

const AppShellContext = createContext<AppShellContextType>({
  selectedEntityId: null,
  setSelectedEntityId: () => {},
  openActionItem: () => {},
  closeActionItem: () => {},
});

export const useAppShell = () => useContext(AppShellContext);

interface AppShellProps {
  children: ReactNode;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    jobTitle?: string | null;
    avatarUrl?: string | null;
  };
  entities: EntityFilter[];
}

export function AppShell({ children, user, entities }: AppShellProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeActionItemId, setActiveActionItemId] = useState<string | null>(null);

  const openActionItem = (id: string) => setActiveActionItemId(id);
  const closeActionItem = () => setActiveActionItemId(null);

  return (
    <AppShellContext.Provider
      value={{
        selectedEntityId,
        setSelectedEntityId,
        openActionItem,
        closeActionItem,
      }}
    >
      <div className="min-h-screen bg-duston-bg flex">
        {/* Left Sidebar */}
        <Sidebar
          userRole={user.role || "contributor"}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px] xl:pl-[280px] 2xl:pl-[300px] transition-all duration-200">
          <TopBar
            entities={entities}
            selectedEntityId={selectedEntityId}
            onSelectEntity={setSelectedEntityId}
            user={user}
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
          />

          <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectActionItem={(id) => {
            setIsSearchOpen(false);
            openActionItem(id);
          }}
        />

        {/* Universal Action Item Drawer */}
        <ActionItemDrawer
          itemId={activeActionItemId}
          isOpen={!!activeActionItemId}
          onClose={closeActionItem}
          currentUserId={user.id}
          currentUserRole={user.role || undefined}
        />
      </div>
    </AppShellContext.Provider>
  );
}
