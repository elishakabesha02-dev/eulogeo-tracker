import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClearFiltersButton,
  FilterSelect,
  SearchInput,
} from "@/components/ui/data-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { formatDateTime, formatMoney, humanizeEnum } from "@/lib/utils/format";
import { exceptionQuerySchema } from "@/lib/validation/schemas";
import { getExceptionList } from "@/services/exceptions/exception.service";
import type { SelectOption } from "@/types/common";
import { EXCEPTION_STATUSES, EXCEPTION_TYPES, PRIORITIES } from "@/types/domain";

export const metadata: Metadata = { title: "Exceptions" };

const toOptions = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: humanizeEnum(value) }));

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = exceptionQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : exceptionQuerySchema.parse({});

  const page = await getExceptionList(query);

  return (
    <>
      <PageHeader
        title="Exceptions"
        description="Discrepancies raised against reconciliation records, ordered by urgency."
        notice={
          <PhaseNotice>
            <strong>Placeholder module.</strong> Exception records are read-only in
            this phase — investigation, assignment and resolution workflows arrive
            with the reconciliation engine.
          </PhaseNotice>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search reference, ATM…" />
          <FilterSelect
            paramName="status"
            label="Status"
            options={toOptions(EXCEPTION_STATUSES)}
          />
          <FilterSelect
            paramName="type"
            label="Type"
            options={toOptions(EXCEPTION_TYPES)}
          />
          <FilterSelect
            paramName="priority"
            label="Priority"
            options={toOptions(PRIORITIES)}
          />
          <ClearFiltersButton params={["search", "status", "type", "priority"]} />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={TriangleAlert}
            title="No exceptions match these filters"
            description="A clear queue means every reconciliation balanced, or nothing has been raised yet."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>Exception ID</Th>
                    <Th>ATM</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>Status</Th>
                    <Th>Priority</Th>
                    <Th>Created</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((exception) => (
                    <Tr key={exception.id}>
                      <Td className="font-medium whitespace-nowrap tabular">
                        {exception.reference}
                      </Td>
                      <Td className="whitespace-nowrap tabular">
                        {exception.atm_id ? (
                          <Link
                            href={`/operations/atms/${exception.atm_id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {exception.atm_code ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <Badge tone="neutral">{humanizeEnum(exception.type)}</Badge>
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular">
                        {formatMoney(exception.amount_minor, exception.currency)}
                      </Td>
                      <Td>
                        <StatusBadge status={exception.status} />
                      </Td>
                      <Td>
                        <StatusBadge status={exception.priority} />
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-fg-muted">
                        {formatDateTime(exception.created_at)}
                      </Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" disabled>
                          Investigate
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>

            <Pagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              totalPages={page.totalPages}
            />
          </>
        )}
      </Card>
    </>
  );
}
