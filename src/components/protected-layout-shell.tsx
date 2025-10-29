"use client";

import type { ReactNode } from "react";

import { Topbar } from "@/components/topbar";

type ProtectedLayoutShellProps = {
  children: ReactNode;
};

export function ProtectedLayoutShell({ children }: ProtectedLayoutShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <Topbar />
      <main className="flex-1 bg-background pt-4 sm:pt-6">
        <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col gap-6 overflow-x-hidden px-4 pb-6 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
