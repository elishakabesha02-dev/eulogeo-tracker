import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ClearFiltersButton,
  DatePicker,
  FilterSelect,
  SearchInput,
} from "@/components/ui/data-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { formatDate, formatDateTime, humanizeEnum } from "@/lib/utils/format";
import { dailyOperationQuerySchema } from "@/lib/validation/schemas";
import { getDailyOperations } from "@/services/operations/operations.service";
import type { SelectOption } from "@/types/common";
import { OPERATIONAL_STATUSES, RECONCILIATION_STATUSES } from "@/types/domain";

export const metadata: Metadata = { title: "Daily Operations" };

const OPERATIONAL_OPTIONS: SelectOption[] = OPERATIONAL_STATUSES.map((status) => ({
  value: status,
  label: humanizeEnum(status),
}));

const RECONCILIATION_OPTIONS: SelectOption[] = RECONCILIATION_STATUSES.map(
  (status) => ({ value: status, label: humanizeEnum(status) }),
);

export default async function DailyOperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = dailyOperationQuerySchema.safeParse(params);
  const query = parsed.success
    ? parsed.data
    : dailyOperationQuerySchema.parse({});

  const page = await getDailyOperations(query);

  return (
    <>
      <PageHeader
        title="Daily operations"
        description="Per-terminal activity for each business date. Reconciliation results are recorded here as they complete."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search ATM, bank, custodian…" />
          <DatePicker />
          <FilterSelect
            paramName="operationalStatus"
            label="Operational"
            options={OPERATIONAL_OPTIONS}
          />
          <FilterSelect
            paramName="reconciliationStatus"
            label="Reconciliation"
            options={RECONCILIATION_OPTIONS}
          />
          <ClearFiltersButton
            params={[
              "search",
              "date",
              "operationalStatus",
              "reconciliationStatus",
            ]}
          />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No operations found"
            description="Nothing matches these filters. Try a different business date."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>ATM ID</Th>
                    <Th>Bank</Th>
                    <Th>Custodian</Th>
                    <Th>Operational status</Th>
                    <Th>Reconciliation status</Th>
                    <Th>Last updated</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((operation) => (
                    <Tr key={operation.id}>
                      <Td className="whitespace-nowrap tabular">
                        {formatDate(operation.operation_date)}
                      </Td>
                      <Td className="font-medium whitespace-nowrap tabular">
                        <Link
                          href={`/operations/atms/${operation.atm_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {operation.atm_code ?? "—"}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {operation.bank_name ?? "—"}
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {operation.custodian_name ?? "—"}
                      </Td>
                      <Td>
                        <StatusBadge status={operation.operational_status} />
                      </Td>
                      <Td>
                        <StatusBadge status={operation.reconciliation_status} />
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-fg-muted">
                        {formatDateTime(operation.updated_at)}
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
