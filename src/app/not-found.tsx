import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold tracking-wider text-fg-subtle uppercase">
        404
      </p>
      <h1 className="text-xl font-semibold text-fg">Page not found</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        The page you are looking for does not exist, or you do not have access to it.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
