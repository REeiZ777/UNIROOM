"use client";

import { useState, type ReactNode } from "react";
import { ChevronsLeftIcon, ChevronsRightIcon, MenuIcon, XIcon } from "lucide-react";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";

type ProtectedLayoutShellProps = {
  children: ReactNode;
};

export function ProtectedLayoutShell({ children }: ProtectedLayoutShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const toggleCollapsed = () => setIsCollapsed((value) => !value);
  const closeMobileNav = () => setIsMobileNavOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 lg:flex-row">
      <Sidebar collapsed={isCollapsed} />

      <div className="flex flex-1 flex-col">
        <Topbar
          startSlot={
            <>
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setIsMobileNavOpen(true)}
                className="inline-flex items-center justify-center rounded-md border px-2.5 py-2 text-sm shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              >
                <MenuIcon className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                onClick={toggleCollapsed}
                className="group hidden items-center justify-center rounded-full bg-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
              >
                <span
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition-all duration-300 group-hover:border-border group-hover:text-foreground",
                  )}
                >
                  <ChevronsLeftIcon
                    aria-hidden
                    className={cn(
                      "absolute size-4 transition-all duration-300",
                      isCollapsed ? "-translate-x-2 opacity-0" : "translate-x-0 opacity-100",
                    )}
                  />
                  <ChevronsRightIcon
                    aria-hidden
                    className={cn(
                      "absolute size-4 transition-all duration-300",
                      isCollapsed ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
                    )}
                  />
                </span>
              </button>
            </>
          }
        />

        <main className="flex-1 overflow-y-auto bg-muted/30 pb-8 pt-6">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8">{children}</div>
        </main>
      </div>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="relative h-full w-64 overflow-y-auto bg-sidebar shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={closeMobileNav}
              className="absolute right-3 top-3 inline-flex items-center justify-center rounded-md border px-2.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <XIcon className="size-5" aria-hidden />
            </button>
            <Sidebar mobile onNavigate={closeMobileNav} />
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={closeMobileNav}
          />
        </div>
      ) : null}
    </div>
  );
}
