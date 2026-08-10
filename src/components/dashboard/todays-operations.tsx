import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import type { DailyOperationWithRelations } from "@/types/domain";

export function TodaysOperations({
  operations,
  businessDate,
}: {
  operations: DailyOperationWithRelations[];
  businessDate: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Today's operations"
        description={`Business date ${formatDate(businessDate)}`}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/operations/daily">
              View all
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      {operations.length === 0 ? (
        <EmptyState
          title="No operations recorded for today"
          description="Daily operation records appear here once terminals report for the current business date."
        />
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <Tr>
                <Th>ATM ID</Th>
                <Th>Bank</Th>
                {/* Location is the first thing to go when space is tight —
                    it is available on the ATM detail page. */}
                <Th className="hidden 2xl:table-cell">Location</Th>
                <Th>Status</Th>
                <Th>Reconciliation</Th>
                <Th className="hidden lg:table-cell">Last update</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </THead>
            <TBody>
              {operations.map((operation) => (
                <Tr key={operation.id}>
                  <Td className="font-medium whitespace-nowrap tabular">
                    {operation.atm_code ?? "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-fg-muted">
                    {operation.bank_name ?? "—"}
                  </Td>
                  <Td className="hidden max-w-56 truncate text-fg-muted 2xl:table-cell">
                    {operation.location ?? "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={operation.operational_status} />
                  </Td>
                  <Td>
                    <StatusBadge status={operation.reconciliation_status} />
                  </Td>
                  <Td className="hidden text-xs whitespace-nowrap text-fg-muted lg:table-cell">
                    {formatRelativeTime(operation.updated_at)}
                  </Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/operations/atms/${operation.atm_id}`}>View</Link>
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}
    </Card>
  );
}
