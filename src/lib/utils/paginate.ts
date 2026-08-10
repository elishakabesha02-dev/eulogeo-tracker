import { DEFAULT_PAGE_SIZE } from "@/config/app";
import type { Paginated, PaginationParams } from "@/types/common";

const MAX_PAGE_SIZE = 200;

export function normalizePagination(
  params: Partial<PaginationParams> | undefined,
): PaginationParams {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const requested = Math.floor(params?.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { page, pageSize };
}

/** In-memory paging used by the demo data source. */
export function paginate<T>(
  rows: T[],
  params: Partial<PaginationParams> | undefined,
): Paginated<T> {
  const { page, pageSize } = normalizePagination(params);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export function emptyPage<T>(params?: Partial<PaginationParams>): Paginated<T> {
  const { page, pageSize } = normalizePagination(params);
  return { data: [], page, pageSize, total: 0, totalPages: 1 };
}
