import { NextResponse } from "next/server";

import { ServiceError } from "@/lib/database/errors";
import type { ApiResponse } from "@/types/common";

/**
 * Uniform API envelope.
 *
 * Route handlers never construct an error body by hand — they let a
 * `ServiceError` propagate and call `apiError`, which is the only place that
 * decides what a client is allowed to see. Unknown errors become a generic 500
 * with the detail logged server-side, so an internal message can never leak.
 */
export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, init);
}

export function apiError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json<ApiResponse<never>>(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error("[api] Unhandled error", error);

  return NextResponse.json<ApiResponse<never>>(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500 },
  );
}

/** Parses a JSON body, turning malformed input into a typed validation error. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ServiceError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}

/** Query string → plain object, for feeding into a Zod schema. */
export function searchParamsToObject(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
