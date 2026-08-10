/**
 * Tiny query helpers for the in-memory demo adapter. They mirror the subset of
 * behaviour the Supabase adapter provides (search, sort, page) so the two data
 * sources are interchangeable from a caller's point of view.
 */

import { paginate } from "@/lib/utils/paginate";
import type { ListQuery, Paginated } from "@/types/common";

export function matchesSearch<T>(
  row: T,
  term: string | undefined,
  fields: Array<(row: T) => string | null | undefined>,
): boolean {
  const needle = term?.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((accessor) =>
    (accessor(row) ?? "").toLowerCase().includes(needle),
  );
}

export function sortRows<T>(
  rows: T[],
  accessor: (row: T) => string | number | null | undefined,
  direction: "asc" | "desc" = "desc",
): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return left > right ? factor : -factor;
  });
}

export function pageOf<T>(rows: T[], query: ListQuery | undefined): Paginated<T> {
  return paginate(rows, query);
}

/** Shallow ISO timestamp for freshly created in-memory rows. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** RFC 4122-shaped identifier for in-memory inserts. */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}
