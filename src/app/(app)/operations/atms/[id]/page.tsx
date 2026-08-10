import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import {
  TBody,
  THead,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";
import { ServiceError } from "@/lib/database/errors";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { getAtmDetail } from "@/services/atm/atm.service";
import { getDailyOperations } from "@/services/operations/operations.service";

export const metadata: Metadata = { title: "ATM detail" };

export default async function AtmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const atm = await getAtmDetail(id).catch((error) => {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const operations = await getDailyOperations({ page: 1, pageSize: 10 });
  const forThisAtm = operations.data.filter(
    (operation) => operation.atm_id === atm.id,
  );

  const details: Array<{ label: string; value: string }> = [
    { label: "Bank", value: atm.bank_name ?? "—" },
    { label: "Branch", value: atm.branch_name ?? "—" },
    { label: "Location", value: atm.location },
    { label: "Model", value: atm.model ?? "—" },
    { label: "Assigned custodian", value: atm.custodian_name ?? "Unassigned" },
    { label: "Assigned engineer", value: atm.engineer_name ?? "Unassigned" },
    { label: "Created", value: formatDateTime(atm.created_at) },
    { label: "Last updated", value: formatDateTime(atm.updated_at) },
  ];

  return (
    <>
      <PageHeader
        title={atm.atm_code}
        description={atm.location}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/operations/atms">
              <ArrowLeft />
              Back to ATMs
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Terminal details"
            action={<StatusBadge status={atm.status} />}
          />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {details.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-fg">{item.value}</dd>
                </div>
              ))}
            </dl>

            {atm.notes ? (
              <div className="mt-5 border-t border-border-default pt-4">
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  Notes
                </dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap text-fg-muted">
                  {atm.notes}
                </dd>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Reconciliation"
            description="Figures appear once the engine is implemented"
          />
          <CardBody className="space-y-3">
            {(["Expected", "Actual", "Variance"] as const).map((label) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border-default pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm text-fg-muted">{label}</span>
                <span className="text-sm font-medium text-fg-subtle tabular">—</span>
              </div>
            ))}
            <Button className="w-full" disabled>
              Start reconciliation
            </Button>
            <p className="text-xs leading-relaxed text-fg-subtle">
              The reconciliation engine is not implemented in this phase. No figures
              are calculated or displayed.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Recent daily operations"
          description="The most recent operation records for this terminal"
        />
        {forThisAtm.length === 0 ? (
          <EmptyState
            title="No recent operations"
            description="Operation records for this terminal will appear here."
          />
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Custodian</Th>
                  <Th>Operational status</Th>
                  <Th>Reconciliation status</Th>
                  <Th>Last updated</Th>
                </Tr>
              </THead>
              <TBody>
                {forThisAtm.map((operation) => (
                  <Tr key={operation.id}>
                    <Td className="whitespace-nowrap tabular">
                      {formatDate(operation.operation_date)}
                    </Td>
                    <Td className="text-fg-muted">
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
        )}
      </Card>
    </>
  );
}
