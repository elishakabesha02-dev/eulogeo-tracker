"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

export type ToastTone = "info" | "success" | "warning" | "error";

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
} as const;

const TONE_CLASSES: Record<ToastTone, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
};

const DISMISS_AFTER_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...input, id }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Assertive would interrupt a screen reader mid-sentence; these are
        // confirmations, not alarms.
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((entry) => {
          const Icon = ICONS[entry.tone];
          return (
            <div
              key={entry.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border-default bg-surface px-4 py-3 elevated-lg"
            >
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", TONE_CLASSES[entry.tone])}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{entry.title}</p>
                {entry.description ? (
                  <p className="mt-0.5 text-xs break-words text-fg-muted">
                    {entry.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(entry.id)}
                aria-label="Dismiss"
                className="rounded p-0.5 text-fg-subtle hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }
  return context;
}
