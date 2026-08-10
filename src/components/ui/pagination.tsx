"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils/format";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** URL-driven pager. Hidden entirely when there is only one page of results. */
export function Pagination({ page, pageSize, total, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-5 py-3">
      <p className="text-xs text-fg-muted tabular">
        Showing <span className="font-medium text-fg">{formatNumber(first)}</span>–
        <span className="font-medium text-fg">{formatNumber(last)}</span> of{" "}
        <span className="font-medium text-fg">{formatNumber(total)}</span>
      </p>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft />
            Previous
          </Button>
          <span className="text-xs text-fg-muted tabular">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
