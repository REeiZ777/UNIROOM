"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const uiStrings = {
  title: "UNIROOM",
  subtitle: "Gestion des reservations",
  connectCta: "Se connecter",
  connectAria: "Se connecter a l'espace administrateur",
  disconnectCta: "Se deconnecter",
} as const;

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/reservations", label: "Planning des salles" },
  { href: "/reservations/history", label: "Historique" },
  { href: "/rooms", label: "Salles" },
] as const;

export function Topbar() {
  const { status } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex w-full flex-col sm:w-auto sm:min-w-[160px]">
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            {uiStrings.title}
          </span>
          <span className="text-xs text-muted-foreground sm:hidden">
            {uiStrings.subtitle}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:block">
            {uiStrings.subtitle}
          </span>
        </div>

        <nav
          aria-label="Navigation principale"
          className="order-3 flex w-full items-center justify-center overflow-x-auto rounded-full bg-muted/40 px-2 py-1 text-sm font-medium shadow-inner sm:order-2 sm:w-auto sm:max-w-xl sm:px-3"
        >
          <ul className="flex w-full items-center justify-center gap-2 whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-3 py-1.5 transition-colors sm:px-3.5",
                      isActive
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="order-2 flex w-full items-center justify-end gap-2 sm:order-3 sm:w-auto sm:min-w-[160px]">
          <ThemeToggle />
          {status === "authenticated" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="whitespace-nowrap"
            >
              {uiStrings.disconnectCta}
            </Button>
          ) : (
            <Button asChild aria-label={uiStrings.connectAria} size="sm" className="whitespace-nowrap">
              <Link href="/login">{uiStrings.connectCta}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
