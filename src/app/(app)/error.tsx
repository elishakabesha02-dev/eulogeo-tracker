"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";

/**
 * Segment-level error boundary. The raw error is logged for operators; the user
 * sees a generic message so an internal detail is never rendered.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Route error", error);
  }, [error]);

  return (
    <Card>
      <ErrorState
        title="This page could not be loaded"
        description="The request failed. Try again, and if the problem continues contact your administrator."
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </Card>
  );
}
