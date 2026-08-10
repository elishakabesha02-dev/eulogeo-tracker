import type { ReactNode } from "react";

import { APP_SHORT_NAME, APP_TAGLINE } from "@/config/app";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-subtle">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center gap-2.5 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-fg">
              {APP_SHORT_NAME}
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-fg">
                {APP_SHORT_NAME} {APP_TAGLINE}
              </h1>
              <p className="mt-0.5 text-xs text-fg-muted">
                Sign in to continue to the operations console.
              </p>
            </div>
          </div>
          {children}
        </div>
      </div>

      <footer className="px-4 pb-6 text-center text-xs text-fg-subtle">
        Authorised use only. All activity is recorded in the audit log.
      </footer>
    </div>
  );
}
