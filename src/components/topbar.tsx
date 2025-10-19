"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const uiStrings = {
  title: "UNIROOM",
  subtitle: "Gestion des r\u00E9servations",
  connectCta: "Se connecter",
  connectAria: "Se connecter \u00E0 l\u0027espace administrateur",
  disconnectCta: "Se d\u00E9connecter",
} as const;

type TopbarProps = {
  startSlot?: React.ReactNode;
};

export function Topbar({ startSlot }: TopbarProps) {
  const { status } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3">
        {startSlot}
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            {uiStrings.title}
          </span>
          <span className="text-xs text-muted-foreground sm:text-sm">
            {uiStrings.subtitle}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {status === "authenticated" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            {uiStrings.disconnectCta}
          </Button>
        ) : (
          <Button asChild aria-label={uiStrings.connectAria}>
            <Link href="/login">{uiStrings.connectCta}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
