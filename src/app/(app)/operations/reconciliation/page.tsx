import { Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDate, formatMoney, formatVariance, humanizeEnum } from "@/lib/utils/format";
import { todayBusinessDate } from "@/lib/utils/dates";
import { reconciliationQuerySchema } from "@/lib/validation/schemas";
import {
  getReconciliationList,
  getReconciliationSummary,
} from "@/services/reconciliation/reconciliation.service";
import type { SelectOption } from "@/types/common";
import { RECONCILIATION_STATUSES } from "@/types/domain";

export const metadata: Metadata = { title: "Reconciliation" };

const STATUS_OPTIONS: SelectOption[] = RECONCILIATION_STATUSES.map((status) => ({
  value: status,
  label: humanizeEnum(status),
}));

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = reconciliationQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : reconciliationQuerySchema.parse({});

  const businessDate = query.date ?? todayBusinessDate();

  const [page, summary] = await Promise.all([
    getReconciliationList({ ...query, date: businessDate }),
    getReconciliationSummary(businessDate),
  ]);

  const tiles = [
    { label: "Records", value: summary.total, tone: "text-fg" },
    { label: "Reconciled", value: summary.reconciled, tone: "text-success" },
    { label: "Pending", value: summary.pending, tone: "text-info" },
    { label: "Variances", value: summary.variances, tone: "text-warning" },
    { label: "Escalated", value: summary.escalated, tone: "text-danger" },
  ];

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description={`Reconciliation records for ${formatDate(businessDate)}.`}
        notice={
          <PhaseNotice>
            <strong>Placeholder module.</strong> The reconciliation engine is not
            implemented in this phase. The figures below are stored sample values —
            nothing on this page is calculated. When the engine lands it will be a
            pure, deterministic module and no amount will ever be produced by a model.
          </PhaseNotice>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-card border border-border-default bg-surface p-4 elevated"
          >
            <p className="text-[0.6875rem] font-semibold tracking-wider text-fg-subtle uppercase">
              {tile.label}
            </p>
            <p className={`mt-1.5 text-2xl font-semibold tabular ${tile.tone}`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search ATM or bank…" />
          <DatePicker />
          <FilterSelect paramName="status" label="Status" options={STATUS_OPTIONS} />
          <ClearFiltersButton params={["search", "date", "status"]} />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No reconciliation records"
            description="Records appear once daily operations are opened for this business date."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>ATM</Th>
                    <Th>Bank</Th>
                    <Th className="text-right">Expected</Th>
                    <Th className="text-right">Actual</Th>
                    <Th className="text-right">Variance</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((record) => (
                    <Tr key={record.id}>
                      <Td className="font-medium whitespace-nowrap tabular">
                        {record.atm_code ?? "—"}
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {record.bank_name ?? "—"}
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular">
                        {formatMoney(record.expected_minor, record.currency)}
                      </Td>
                      <Td className="text-right whitespace-nowrap tabular">
                        {formatMoney(record.actual_minor, record.currency)}
                      </Td>
                      <Td
                        className={`text-right whitespace-nowrap tabular ${
                          record.variance_minor
                            ? "font-medium text-warning"
                            : "text-fg-muted"
                        }`}
                      >
                        {formatVariance(record.variance_minor, record.currency)}
                      </Td>
                      <Td>
                        <StatusBadge status={record.status} />
                      </Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/operations/reconciliation/${record.id}`}>
                            Open
                          </Link>
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
