"use client";

import { Banknote, Pencil, Plus, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setAtmStatusAction } from "@/app/(app)/operations/atms/actions";
import { AtmFormModal } from "@/components/atm/atm-form-modal";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClearFiltersButton,
  FilterSelect,
  SearchInput,
} from "@/components/ui/data-toolbar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
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
import { useToast } from "@/components/ui/toast";
import { formatDateTime, humanizeEnum } from "@/lib/utils/format";
import type { Paginated, SelectOption } from "@/types/common";
import { ATM_STATUSES, type AtmWithRelations } from "@/types/domain";

export interface AtmManagerProps {
  page: Paginated<AtmWithRelations>;
  banks: SelectOption[];
  custodians: SelectOption[];
  engineers: SelectOption[];
  canWrite: boolean;
}

const STATUS_OPTIONS: SelectOption[] = ATM_STATUSES.map((status) => ({
  value: status,
  label: humanizeEnum(status),
}));

export function AtmManager({
  page,
  banks,
  custodians,
  engineers,
  canWrite,
}: AtmManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AtmWithRelations | null>(null);
  const [statusTarget, setStatusTarget] = useState<AtmWithRelations | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(atm: AtmWithRelations) {
    setEditing(atm);
    setFormOpen(true);
  }

  function confirmStatusChange() {
    if (!statusTarget) return;
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    startTransition(async () => {
      const result = await setAtmStatusAction(statusTarget.id, next);
      toast({
        tone: result.status === "success" ? "success" : "error",
        title: result.message ?? "Done",
      });
      setStatusTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <SearchInput placeholder="Search ATM, location, bank…" />
          <FilterSelect paramName="status" label="Status" options={STATUS_OPTIONS} />
          <FilterSelect paramName="bankId" label="Bank" options={banks} />
          <ClearFiltersButton params={["search", "status", "bankId"]} />

          {canWrite ? (
            <Button className="ml-auto" onClick={openCreate}>
              <Plus />
              Add ATM
            </Button>
          ) : null}
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No ATMs match these filters"
            description="Adjust the search or filters, or register a new terminal."
            action={
              canWrite ? (
                <Button variant="secondary" size="sm" onClick={openCreate}>
                  <Plus />
                  Add ATM
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>ATM ID</Th>
                    <Th>Bank</Th>
                    {/* Secondary columns drop out as the viewport narrows so the
                        action menu stays reachable without a sideways scroll. */}
                    <Th className="hidden 2xl:table-cell">Branch</Th>
                    <Th>Location</Th>
                    <Th>Status</Th>
                    <Th className="hidden lg:table-cell">Custodian</Th>
                    <Th className="hidden xl:table-cell">Engineer</Th>
                    <Th className="hidden 2xl:table-cell">Updated</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((atm) => (
                    <Tr key={atm.id}>
                      <Td className="font-medium whitespace-nowrap tabular">
                        <Link
                          href={`/operations/atms/${atm.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {atm.atm_code}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-fg-muted">
                        {atm.bank_name ?? "—"}
                      </Td>
                      <Td className="hidden whitespace-nowrap text-fg-muted 2xl:table-cell">
                        {atm.branch_name ?? "—"}
                      </Td>
                      <Td className="max-w-56 truncate text-fg-muted">{atm.location}</Td>
                      <Td>
                        <StatusBadge status={atm.status} />
                      </Td>
                      <Td className="hidden whitespace-nowrap text-fg-muted lg:table-cell">
                        {atm.custodian_name ?? "—"}
                      </Td>
                      <Td className="hidden whitespace-nowrap text-fg-muted xl:table-cell">
                        {atm.engineer_name ?? "—"}
                      </Td>
                      <Td className="hidden text-xs whitespace-nowrap text-fg-muted 2xl:table-cell">
                        {formatDateTime(atm.updated_at)}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end">
                          <Dropdown
                            label={`Actions for ${atm.atm_code}`}
                            trigger={
                              <span className="rounded-lg px-2 py-1 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg">
                                ⋯
                              </span>
                            }
                          >
                            <DropdownItem href={`/operations/atms/${atm.id}`}>
                              <Banknote />
                              View details
                            </DropdownItem>
                            {canWrite ? (
                              <>
                                <DropdownItem onSelect={() => openEdit(atm)}>
                                  <Pencil />
                                  Edit
                                </DropdownItem>
                                <DropdownItem
                                  onSelect={() => setStatusTarget(atm)}
                                  destructive={atm.status === "ACTIVE"}
                                >
                                  {atm.status === "ACTIVE" ? <PowerOff /> : <Power />}
                                  {atm.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                </DropdownItem>
                              </>
                            ) : null}
                          </Dropdown>
                        </div>
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

      <AtmFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          router.refresh();
        }}
        atm={editing}
        banks={banks}
        custodians={custodians}
        engineers={engineers}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        loading={pending}
        destructive={statusTarget?.status === "ACTIVE"}
        title={
          statusTarget?.status === "ACTIVE" ? "Deactivate ATM" : "Activate ATM"
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.atm_code} will be marked inactive and excluded from daily operations. This is recorded in the audit log.`
            : `${statusTarget?.atm_code} will be returned to service and included in daily operations.`
        }
      />
    </>
  );
}
