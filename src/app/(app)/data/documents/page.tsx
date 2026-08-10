import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { DocumentUploader } from "@/components/documents/document-uploader";
import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClearFiltersButton, FilterSelect, SearchInput } from "@/components/ui/data-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { formatBytes, formatDateTime, humanizeEnum } from "@/lib/utils/format";
import { documentQuerySchema } from "@/lib/validation/schemas";
import { getDocumentList } from "@/services/documents/document.service";
import type { SelectOption } from "@/types/common";
import { DOCUMENT_TYPES } from "@/types/domain";

export const metadata: Metadata = { title: "Documents" };

const TYPE_OPTIONS: SelectOption[] = DOCUMENT_TYPES.map((type) => ({
  value: type,
  label: humanizeEnum(type),
}));

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = documentQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : documentQuerySchema.parse({});

  const [{ user, isDemo }, page] = await Promise.all([
    getSession(),
    getDocumentList(query),
  ]);

  const canUpload = can(user, "document:write");

  return (
    <>
      <PageHeader
        title="Documents"
        description="General ledger extracts, terminal journals, cash count sheets and incident photos."
        actions={<DocumentUploader canUpload={canUpload && !isDemo} />}
        notice={
          <PhaseNotice>
            <strong>Storage architecture only.</strong> Files upload to a private
            Supabase bucket via short-lived signed URLs and are listed here. OCR and
            AI extraction are not implemented.
            {isDemo
              ? " Uploads are disabled in demo mode because no storage bucket is configured."
              : null}
          </PhaseNotice>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search file name…" />
          <FilterSelect paramName="documentType" label="Type" options={TYPE_OPTIONS} />
          <ClearFiltersButton params={["search", "documentType"]} />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Uploaded files appear here with their type, size and processing status."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>File name</Th>
                    <Th>Type</Th>
                    <Th>ATM</Th>
                    <Th className="text-right">Size</Th>
                    <Th>Uploaded by</Th>
                    <Th>Upload date</Th>
                    <Th>Status</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((document) => (
                    <Tr key={document.id}>
                      <Td className="max-w-64 truncate font-medium">
                        {document.file_name}
                      </Td>
                      <Td>
                        <Badge tone="neutral">
                          {humanizeEnum(document.document_type)}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted tabular">
                        {document.atm_code ?? "—"}
                      </Td>
                      <Td className="text-right whitespace-nowrap text-fg-muted tabular">
                        {formatBytes(document.size_bytes)}
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {document.uploaded_by_name ?? "—"}
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-fg-muted">
                        {formatDateTime(document.created_at)}
                      </Td>
                      <Td>
                        <StatusBadge status={document.status} />
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
