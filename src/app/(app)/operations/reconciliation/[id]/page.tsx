import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ServiceError } from "@/lib/database/errors";
import { formatDate, formatDateTime, formatMoney, formatVariance } from "@/lib/utils/format";
import { getReconciliationDetail } from "@/services/reconciliation/reconciliation.service";

export const metadata: Metadata = { title: "Reconciliation detail" };

export default async function ReconciliationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const record = await getReconciliationDetail(id).catch((error) => {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const figures = [
    {
      label: "Expected",
      value: formatMoney(record.expected_minor, record.currency),
      emphasis: false,
    },
    {
      label: "Actual",
      value: formatMoney(record.actual_minor, record.currency),
      emphasis: false,
    },
    {
      label: "Variance",
      value: formatVariance(record.variance_minor, record.currency),
      emphasis: Boolean(record.variance_minor),
    },
  ];

  return (
    <>
      <PageHeader
        title={`${record.atm_code ?? "ATM"} reconciliation`}
        description={`Business date ${formatDate(record.reconciliation_date)} · ${record.bank_name ?? "Unknown bank"}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/operations/reconciliation">
              <ArrowLeft />
              Back
            </Link>
          </Button>
        }
        notice={
          <PhaseNotice>
            <strong>Placeholder detail page.</strong> Values shown are stored sample
            data. Starting a reconciliation is disabled until the engine is
            implemented — the button below deliberately does nothing rather than
            simulating a run.
          </PhaseNotice>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Reconciliation summary"
            action={<StatusBadge status={record.status} />}
          />
          <CardBody className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              {figures.map((figure) => (
                <div
                  key={figure.label}
                  className="rounded-lg border border-border-default bg-surface-muted px-4 py-3"
                >
                  <dt className="text-[0.6875rem] font-semibold tracking-wider text-fg-subtle uppercase">
                    {figure.label}
                  </dt>
                  <dd
                    className={`mt-1 text-lg font-semibold tabular ${
                      figure.emphasis ? "text-warning" : "text-fg"
                    }`}
                  >
                    {figure.value}
                  </dd>
                </div>
              ))}
            </dl>

            <dl className="grid gap-x-6 gap-y-4 border-t border-border-default pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  Currency
                </dt>
                <dd className="mt-0.5 text-sm text-fg">{record.currency}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  Performed by
                </dt>
                <dd className="mt-0.5 text-sm text-fg">
                  {record.performed_by_name ?? "Not started"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  Completed at
                </dt>
                <dd className="mt-0.5 text-sm text-fg">
                  {formatDateTime(record.completed_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                  Last updated
                </dt>
                <dd className="mt-0.5 text-sm text-fg">
                  {formatDateTime(record.updated_at)}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Actions" />
          <CardBody className="space-y-3">
            <Button className="w-full" disabled>
              Start reconciliation
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href={`/operations/atms/${record.atm_id}`}>View terminal</Link>
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/operations/exceptions">View exceptions</Link>
            </Button>

            <div className="border-t border-border-default pt-3">
              <p className="text-xs leading-relaxed text-fg-subtle">
                Later phases will add GL import, journal processing and denomination
                counting behind this action. Each will be deterministic and fully
                audited, with escalation kept under human control.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
