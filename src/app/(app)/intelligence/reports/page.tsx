import { Download, FileBarChart, Plus } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClearFiltersButton, FilterSelect, SearchInput } from "@/components/ui/data-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { formatDateTime, humanizeEnum } from "@/lib/utils/format";
import { reportQuerySchema } from "@/lib/validation/schemas";
import { getReportList } from "@/services/reports/report.service";
import type { SelectOption } from "@/types/common";
import { REPORT_TYPES } from "@/types/domain";

export const metadata: Metadata = { title: "Reports" };

const TYPE_OPTIONS: SelectOption[] = REPORT_TYPES.map((type) => ({
  value: type,
  label: humanizeEnum(type),
}));

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = reportQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : reportQuerySchema.parse({});

  const page = await getReportList(query);

  return (
    <>
      <PageHeader
        title="Report centre"
        description="Generated operational and reconciliation reports."
        actions={
          <Button disabled>
            <Plus />
            New report
          </Button>
        }
        notice={
          <PhaseNotice>
            <strong>Placeholder module.</strong> Report generation and downloads are
            not implemented. The controls are disabled rather than returning an empty
            file — PDF and Excel rendering arrive in a later phase as a background job.
          </PhaseNotice>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search report name…" />
          <FilterSelect paramName="type" label="Type" options={TYPE_OPTIONS} />
          <ClearFiltersButton params={["search", "type"]} />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="No reports yet"
            description="Generated reports will be listed here with their period and status."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>Report name</Th>
                    <Th>Type</Th>
                    <Th>Format</Th>
                    <Th>Date</Th>
                    <Th>Created by</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((report) => (
                    <Tr key={report.id}>
                      <Td className="max-w-72 truncate font-medium">{report.name}</Td>
                      <Td>
                        <Badge tone="neutral">{humanizeEnum(report.type)}</Badge>
                      </Td>
                      <Td className="text-fg-muted">{report.format}</Td>
                      <Td className="text-xs whitespace-nowrap text-fg-muted">
                        {formatDateTime(report.created_at)}
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {report.created_by_name ?? "—"}
                      </Td>
                      <Td>
                        <StatusBadge status={report.status} />
                      </Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" disabled>
                          <Download />
                          Download
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
