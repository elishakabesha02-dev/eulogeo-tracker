"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import type { SelectOption } from "@/types/common";

/**
 * Filter controls that write to the URL rather than to component state.
 *
 * Keeping list state in the query string means every table is server-rendered
 * from a single source of truth, and a filtered view is shareable and
 * back-button friendly.
 */
function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }

      // Any filter change invalidates the current page offset.
      if (!("page" in updates)) params.delete("page");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
}

export interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  className?: string;
}

export function SearchInput({
  placeholder = "Search…",
  paramName = "search",
  className,
}: SearchInputProps) {
  const searchParams = useSearchParams();
  const update = useQueryUpdater();
  const initial = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the field in step when the URL changes from elsewhere (a cleared
  // filter, a back navigation).
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ [paramName]: next || null }), 300);
  }

  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pr-8 pl-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            update({ [paramName]: null });
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-fg-subtle hover:text-fg"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export interface FilterSelectProps {
  paramName: string;
  label: string;
  options: SelectOption[];
  allLabel?: string;
  className?: string;
}

export function FilterSelect({
  paramName,
  label,
  options,
  allLabel = "All",
  className,
}: FilterSelectProps) {
  const searchParams = useSearchParams();
  const update = useQueryUpdater();
  const value = searchParams.get(paramName) ?? "";

  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => update({ [paramName]: event.target.value || null })}
      className={cn("w-full sm:w-44", className)}
    >
      <option value="">{`${label}: ${allLabel}`}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export interface DatePickerProps {
  paramName?: string;
  label?: string;
  className?: string;
}

/**
 * Date filter. A native `<input type="date">` rather than a custom calendar —
 * it is accessible, localised and keyboard-friendly with no extra dependency.
 */
export function DatePicker({
  paramName = "date",
  label = "Business date",
  className,
}: DatePickerProps) {
  const searchParams = useSearchParams();
  const update = useQueryUpdater();
  const value = searchParams.get(paramName) ?? "";

  return (
    <Input
      type="date"
      aria-label={label}
      value={value}
      onChange={(event) => update({ [paramName]: event.target.value || null })}
      className={cn("w-full sm:w-44", className)}
    />
  );
}

export function ClearFiltersButton({ params }: { params: string[] }) {
  const searchParams = useSearchParams();
  const update = useQueryUpdater();
  const hasFilters = params.some((param) => searchParams.get(param));

  if (!hasFilters) return null;

  return (
    <button
      type="button"
      onClick={() => update(Object.fromEntries(params.map((param) => [param, null])))}
      className="text-xs font-medium text-primary hover:underline"
    >
      Clear filters
    </button>
  );
}
