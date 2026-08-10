"use client";

import { Building2, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createBankAction,
  setBankStatusAction,
  updateBankAction,
} from "@/app/(app)/data/banks/actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClearFiltersButton, FilterSelect, SearchInput } from "@/components/ui/data-toolbar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { FormField, Input, Select } from "@/components/ui/field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { initialFormState } from "@/lib/auth/form-state";
import { formatDateTime } from "@/lib/utils/format";
import type { Paginated, SelectOption } from "@/types/common";
import type { Bank } from "@/types/domain";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function BankManager({
  page,
  canWrite,
}: {
  page: Paginated<Bank>;
  canWrite: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [statusTarget, setStatusTarget] = useState<Bank | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function confirmStatusChange() {
    if (!statusTarget) return;
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    startTransition(async () => {
      const result = await setBankStatusAction(statusTarget.id, next);
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
          <SearchInput placeholder="Search name or code…" />
          <FilterSelect paramName="status" label="Status" options={STATUS_OPTIONS} />
          <ClearFiltersButton params={["search", "status"]} />
          {canWrite ? (
            <Button
              className="ml-auto"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              Add bank
            </Button>
          ) : null}
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No banks match these filters"
            description="Banks group ATMs, branches and general ledger data."
          />
        ) : (
          <>
            <TableWrapper>
              <Table className="min-w-[36rem]">
                <THead>
                  <Tr>
                    <Th>Bank name</Th>
                    <Th>Bank code</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((bank) => (
                    <Tr key={bank.id}>
                      <Td className="font-medium">{bank.name}</Td>
                      <Td className="text-fg-muted tabular">{bank.code}</Td>
                      <Td>
                        <StatusBadge status={bank.status} />
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-fg-muted">
                        {formatDateTime(bank.created_at)}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end">
                          {canWrite ? (
                            <Dropdown
                              label={`Actions for ${bank.name}`}
                              trigger={
                                <span className="rounded-lg px-2 py-1 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg">
                                  ⋯
                                </span>
                              }
                            >
                              <DropdownItem
                                onSelect={() => {
                                  setEditing(bank);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil />
                                Edit
                              </DropdownItem>
                              <DropdownItem
                                onSelect={() => setStatusTarget(bank)}
                                destructive={bank.status === "ACTIVE"}
                              >
                                {bank.status === "ACTIVE" ? <PowerOff /> : <Power />}
                                {bank.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </DropdownItem>
                            </Dropdown>
                          ) : (
                            <span className="text-xs text-fg-subtle">—</span>
                          )}
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

      <BankFormModal
        open={formOpen}
        bank={editing}
        onClose={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        loading={pending}
        destructive={statusTarget?.status === "ACTIVE"}
        title={statusTarget?.status === "ACTIVE" ? "Deactivate bank" : "Activate bank"}
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.name} will be hidden from new assignments. Existing records are kept.`
            : `${statusTarget?.name} will be available for new assignments again.`
        }
      />
    </>
  );
}

function BankFormModal({
  open,
  bank,
  onClose,
}: {
  open: boolean;
  bank: Bank | null;
  onClose: () => void;
}) {
  const editing = Boolean(bank);
  const [state, formAction, pending] = useActionState(
    editing ? updateBankAction : createBankAction,
    initialFormState,
  );
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast({ tone: "success", title: state.message });
      onClose();
    }
  }, [state, toast, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={editing ? `Edit ${bank?.name}` : "Add bank"}
      description="Banks own branches, ATMs and general ledger records."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="bank-form" loading={pending}>
            {editing ? "Save changes" : "Add bank"}
          </Button>
        </>
      }
    >
      <form id="bank-form" action={formAction} className="space-y-4">
        {bank ? <input type="hidden" name="id" value={bank.id} /> : null}

        {state.status === "error" && state.message ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-xs text-fg"
          >
            {state.message}
          </div>
        ) : null}

        <FormField
          label="Bank name"
          htmlFor="name"
          required
          error={state.fieldErrors?.name}
        >
          <Input
            id="name"
            name="name"
            data-autofocus
            required
            defaultValue={bank?.name ?? ""}
            placeholder="Demo Bank A"
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
        </FormField>

        <FormField
          label="Bank code"
          htmlFor="code"
          required
          hint="Short identifier used in file names and reports."
          error={state.fieldErrors?.code}
        >
          <Input
            id="code"
            name="code"
            required
            defaultValue={bank?.code ?? ""}
            placeholder="DBA"
            aria-invalid={Boolean(state.fieldErrors?.code)}
          />
        </FormField>

        <FormField label="Status" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={bank?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
