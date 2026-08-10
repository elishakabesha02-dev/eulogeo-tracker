import { ArrowUpRight, Bot, FileBarChart, Scale, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const QUICK_ACTIONS = [
  {
    label: "View variances",
    icon: TriangleAlert,
    href: "/operations/exceptions",
  },
  {
    label: "Reconcile ATMs",
    icon: Scale,
    href: "/operations/reconciliation",
  },
  {
    label: "Generate report",
    icon: FileBarChart,
    href: "/intelligence/reports",
  },
];

/**
 * Dashboard preview of the AI Command Center.
 *
 * The buttons link to the real modules rather than pretending to run an agent —
 * no provider is connected, and a button that mimics one would be misleading.
 */
export function AIAssistantPreview({ connected }: { connected: boolean }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border-default bg-primary-subtle/40 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <Bot className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">EBB AI Assistant</h2>
            <Badge tone={connected ? "success" : "neutral"} dot>
              {connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">How can I help you today?</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2.5 rounded-lg border border-border-default px-3.5 py-2.5 text-sm font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-muted"
            >
              <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span className="flex-1">{action.label}</span>
              <ArrowUpRight
                className="size-3.5 shrink-0 text-fg-subtle"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-border-default px-5 py-3">
        <Link
          href="/intelligence/ai"
          className="text-xs font-medium text-primary hover:underline"
        >
          Open AI Command Center
        </Link>
      </div>
    </Card>
  );
}
