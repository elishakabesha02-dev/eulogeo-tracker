import {
  Activity,
  Banknote,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  FileBarChart,
  FileText,
  LayoutDashboard,
  ScrollText,
  Scale,
  Settings,
  TriangleAlert,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/types/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see the entry. Absent means "any signed-in user". */
  permission?: Permission;
  /** Marks modules that are structure-only in this phase. */
  placeholder?: boolean;
}

export interface NavSection {
  /** Undefined for top-level items rendered without a group heading. */
  title?: string;
  items: NavItem[];
}

/**
 * Single source of truth for the sidebar, the mobile drawer and breadcrumbs.
 * Routes are added here first, then implemented — never the other way round.
 */
export const NAVIGATION: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "ATMs", href: "/operations/atms", icon: Banknote, permission: "atm:read" },
      {
        label: "Daily Operations",
        href: "/operations/daily",
        icon: CalendarClock,
        permission: "operations:read",
      },
      {
        label: "Reconciliation",
        href: "/operations/reconciliation",
        icon: Scale,
        permission: "reconciliation:read",
        placeholder: true,
      },
      {
        label: "Exceptions",
        href: "/operations/exceptions",
        icon: TriangleAlert,
        permission: "exception:read",
        placeholder: true,
      },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "Banks", href: "/data/banks", icon: Building2, permission: "bank:read" },
      { label: "Custodians", href: "/data/custodians", icon: Users, permission: "people:read" },
      { label: "Engineers", href: "/data/engineers", icon: UserCog, permission: "people:read" },
      {
        label: "Documents",
        href: "/data/documents",
        icon: FileText,
        permission: "document:read",
        placeholder: true,
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        label: "AI Command Center",
        href: "/intelligence/ai",
        icon: Bot,
        permission: "ai:use",
        placeholder: true,
      },
      {
        label: "Reports",
        href: "/intelligence/reports",
        icon: FileBarChart,
        permission: "report:read",
        placeholder: true,
      },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Notifications", href: "/system/notifications", icon: Bell, permission: "notification:read" },
      { label: "Audit Logs", href: "/system/audit-logs", icon: ScrollText, permission: "audit:read" },
      { label: "Settings", href: "/system/settings", icon: Settings, permission: "settings:read" },
    ],
  },
];

/** Flat lookup used for page titles and breadcrumbs. */
export const NAV_INDEX: Record<string, NavItem> = Object.fromEntries(
  NAVIGATION.flatMap((section) => section.items).map((item) => [item.href, item]),
);

export const ACTIVITY_ICON = Activity;
