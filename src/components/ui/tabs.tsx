"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface TabDefinition {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabDefinition[];
  defaultTab?: string;
  className?: string;
}

/** Local-state tabs with roving arrow-key navigation. */
export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const first = tabs[0]?.id ?? "";
  const [active, setActive] = useState(defaultTab ?? first);
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  function onKeyDown(event: React.KeyboardEvent) {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (index === -1) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActive((tabs[(index + 1) % tabs.length] as TabDefinition).id);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((tabs[(index - 1 + tabs.length) % tabs.length] as TabDefinition).id);
    }
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-border-default"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab ? (
        <div
          role="tabpanel"
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className="pt-5"
        >
          {activeTab.content}
        </div>
      ) : null}
    </div>
  );
}
