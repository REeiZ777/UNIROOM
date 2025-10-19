'use client';

import type { ElementType } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  HistoryIcon,
  HomeIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const uiStrings = {
  ariaLabel: "Navigation principale",
  productName: "UNIROOM",
  versionLabel: "MVP",
  dashboard: "Tableau de bord",
  reservations: "R\u00E9servations",
  history: "Historique",
  rooms: "Salles",
  settings: "Param\u00E8tres",
} as const;

type NavItem = {
  icon: ElementType;
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { icon: HomeIcon, href: "/dashboard", label: uiStrings.dashboard },
  {
    icon: CalendarDaysIcon,
    href: "/reservations",
    label: uiStrings.reservations,
  },
  {
    icon: HistoryIcon,
    href: "/reservations/history",
    label: uiStrings.history,
  },
  { icon: UsersIcon, href: "/rooms", label: uiStrings.rooms },
  { icon: Settings2Icon, href: "/settings", label: uiStrings.settings },
];

type SidebarProps = {
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({
  collapsed = false,
  mobile = false,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        mobile
          ? "w-64 py-6 pl-6 pr-4"
          : collapsed
            ? "hidden border-r py-6 lg:flex lg:w-20 lg:items-center lg:px-4"
            : "hidden w-64 border-r py-6 pl-6 pr-4 lg:flex",
      )}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div
        className={cn(
          "flex flex-col gap-1 pr-2",
          collapsed ? "items-center pr-0" : "pr-2",
        )}
      >
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            collapsed && "text-base",
          )}
        >
          {uiStrings.productName}
        </span>
        {!collapsed && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {uiStrings.dashboard}
            </span>
            <Badge variant="outline" className="text-xs uppercase">
              {uiStrings.versionLabel}
            </Badge>
          </div>
        )}
      </div>

      <nav
        aria-label={uiStrings.ariaLabel}
        className={cn(
          "mt-8 flex flex-col gap-1 text-sm font-medium",
          collapsed && "items-center",
        )}
      >
        {navItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </aside>
  );
}

type SidebarLinkProps = {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
};

function SidebarLink({ item, collapsed, onNavigate }: SidebarLinkProps) {
  const handleClick = onNavigate
    ? () => {
        onNavigate();
      }
    : undefined;

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
        "flex items-center gap-3 rounded-lg",
        collapsed ? "justify-center px-2 py-2" : "px-3 py-2 pr-2",
        "hover:text-sidebar-foreground focus-visible:text-sidebar-foreground",
      )}
    >
      <item.icon aria-hidden className="size-4" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

