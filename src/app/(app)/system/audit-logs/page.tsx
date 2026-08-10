import { ScrollText } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClearFiltersButton, FilterSelect, SearchInput } from "@/components/ui/data-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { formatDateTime, humanizeEnum } from "@/lib/utils/format";
import { auditQuerySchema } from "@/lib/validation/schemas";
import { getAuditLogList } from "@/services/audit/audit.service";
import type { SelectOption } from "@/types/common";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditAction,
  type AuditEntity,
} from "@/types/domain";

export const metadata: Metadata = { title: "Audit Logs" };

const ACTION_OPTIONS: SelectOption[] = AUDIT_ACTIONS.map((action) => ({
  value: action,
  label: humanizeEnum(action),
}));

const ENTITY_OPTIONS: SelectOption[] = AUDIT_ENTITIES.map((entity) => ({
  value: entity,
  label: humanizeEnum(entity),
}));

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = auditQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : auditQuerySchema.parse({});

  const page = await getAuditLogList({
    ...query,
    pageSize: query.pageSize ?? 25,
    action: query.action as AuditAction | undefined,
    entity: query.entity as AuditEntity | undefined,
  });

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Append-only record of who did what, and when. Entries are written with elevated privileges so they cannot be forged or removed by an end user."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search actor or entity…" />
          <FilterSelect paramName="action" label="Action" options={ACTION_OPTIONS} />
          <FilterSelect paramName="entity" label="Entity" options={ENTITY_OPTIONS} />
          <ClearFiltersButton params={["search", "action", "entity"]} />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries match these filters"
            description="Actions such as sign-in, ATM changes and document uploads are recorded here."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>Timestamp</Th>
                    <Th>User</Th>
                    <Th>Action</Th>
                    <Th>Entity</Th>
                    <Th>Entity ID</Th>
                    <Th>Metadata</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((log) => (
                    <Tr key={log.id}>
                      <Td className="text-xs whitespace-nowrap text-fg-muted tabular">
                        {formatDateTime(log.created_at)}
                      </Td>
                      <Td className="whitespace-nowrap">{log.actor_email ?? "System"}</Td>
                      <Td>
                        <Badge tone="neutral">{humanizeEnum(log.action)}</Badge>
                      </Td>
                      <Td className="text-fg-muted">{humanizeEnum(log.entity)}</Td>
                      <Td className="max-w-40 truncate font-mono text-xs text-fg-subtle">
                        {log.entity_id ?? "—"}
                      </Td>
                      <Td className="max-w-72 truncate font-mono text-xs text-fg-subtle">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
