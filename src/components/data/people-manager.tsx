"use client";

import { Pencil, Plus, Power, PowerOff, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createCustodianAction,
  createEngineerAction,
  setCustodianStatusAction,
  setEngineerStatusAction,
  updateCustodianAction,
  updateEngineerAction,
} from "@/app/(app)/data/people-actions";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
import type { ActiveStatus, Paginated, SelectOption } from "@/types/common";

/**
 * Shared manager for custodians and engineers.
 *
 * The two records differ by exactly one field, so they share one component
 * rather than two near-identical copies. `kind` selects the actions, the label
 * of that field and the table heading.
 */

export interface PersonRow {
  id: string;
  full_name: string;
  employee_id: string;
  phone: string | null;
  status: ActiveStatus;
  assigned_atm_codes: string[];
  /** Bank for a custodian, specialization for an engineer. */
  extra: string | null;
  extraValue: string | null;
}

export interface PeopleManagerProps {
  kind: "custodian" | "engineer";
  page: Paginated<PersonRow>;
  canWrite: boolean;
  /** Bank options — only used by the custodian variant. */
  banks?: SelectOption[];
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const COPY = {
  custodian: {
    singular: "custodian",
    title: "Add custodian",
    extraLabel: "Bank",
    empty: "No custodians match these filters",
    emptyHint: "Custodians are responsible for cash handling at assigned terminals.",
  },
  engineer: {
    singular: "engineer",
    title: "Add engineer",
    extraLabel: "Specialization",
    empty: "No engineers match these filters",
    emptyHint: "Engineers maintain terminal hardware and resolve faults.",
  },
} as const;

export function PeopleManager({ kind, page, canWrite, banks = [] }: PeopleManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<PersonRow | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const copy = COPY[kind];

  function confirmStatusChange() {
    if (!statusTarget) return;
    const next: ActiveStatus =
      statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const action =
      kind === "custodian" ? setCustodianStatusAction : setEngineerStatusAction;

    startTransition(async () => {
      const result = await action(statusTarget.id, next);
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
          <SearchInput placeholder="Search name or employee ID…" />
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
              {copy.title}
            </Button>
          ) : null}
        </div>

        {page.data.length === 0 ? (
          <EmptyState icon={Users} title={copy.empty} description={copy.emptyHint} />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <THead>
                  <Tr>
                    <Th>Full name</Th>
                    <Th>Employee ID</Th>
                    <Th>Phone</Th>
                    <Th>{copy.extraLabel}</Th>
                    <Th>Status</Th>
                    <Th>Assigned ATMs</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </THead>
                <TBody>
                  {page.data.map((person) => (
                    <Tr key={person.id}>
                      <Td className="font-medium whitespace-nowrap">
                        {person.full_name}
                      </Td>
                      <Td className="text-fg-muted tabular">{person.employee_id}</Td>
                      <Td className="whitespace-nowrap text-fg-muted tabular">
                        {person.phone ?? "—"}
                      </Td>
                      <Td className="text-fg-muted">{person.extra ?? "—"}</Td>
                      <Td>
                        <StatusBadge status={person.status} />
                      </Td>
                      <Td>
                        {person.assigned_atm_codes.length === 0 ? (
                          <span className="text-xs text-fg-subtle">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {person.assigned_atm_codes.slice(0, 3).map((code) => (
                              <Badge key={code} tone="neutral">
                                {code}
                              </Badge>
                            ))}
                            {person.assigned_atm_codes.length > 3 ? (
                              <Badge tone="neutral">
                                +{person.assigned_atm_codes.length - 3}
                              </Badge>
                            ) : null}
                          </div>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end">
                          {canWrite ? (
                            <Dropdown
                              label={`Actions for ${person.full_name}`}
                              trigger={
                                <span className="rounded-lg px-2 py-1 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg">
                                  ⋯
                                </span>
                              }
                            >
                              <DropdownItem
                                onSelect={() => {
                                  setEditing(person);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil />
                                Edit
                              </DropdownItem>
                              <DropdownItem
                                onSelect={() => setStatusTarget(person)}
                                destructive={person.status === "ACTIVE"}
                              >
                                {person.status === "ACTIVE" ? <PowerOff /> : <Power />}
                                {person.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

      <PersonFormModal
        kind={kind}
        open={formOpen}
        person={editing}
        banks={banks}
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
        title={
          statusTarget?.status === "ACTIVE"
            ? `Deactivate ${copy.singular}`
            : `Activate ${copy.singular}`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.full_name} will no longer be available for new assignments.`
            : `${statusTarget?.full_name} will be available for assignment again.`
        }
      />
    </>
  );
}

function PersonFormModal({
  kind,
  open,
  person,
  banks,
  onClose,
}: {
  kind: "custodian" | "engineer";
  open: boolean;
  person: PersonRow | null;
  banks: SelectOption[];
  onClose: () => void;
}) {
  const editing = Boolean(person);
  const copy = COPY[kind];

  const action =
    kind === "custodian"
      ? editing
        ? updateCustodianAction
        : createCustodianAction
      : editing
        ? updateEngineerAction
        : createEngineerAction;

  const [state, formAction, pending] = useActionState(action, initialFormState);
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
      title={editing ? `Edit ${person?.full_name}` : copy.title}
      description="Only the details needed to run daily operations are stored."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="person-form" loading={pending}>
            {editing ? "Save changes" : copy.title}
          </Button>
        </>
      }
    >
      <form id="person-form" action={formAction} className="space-y-4">
        {person ? <input type="hidden" name="id" value={person.id} /> : null}

        {state.status === "error" && state.message ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-xs text-fg"
          >
            {state.message}
          </div>
        ) : null}

        <FormField
          label="Full name"
          htmlFor="full_name"
          required
          error={state.fieldErrors?.full_name}
        >
          <Input
            id="full_name"
            name="full_name"
            data-autofocus
            required
            defaultValue={person?.full_name ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.full_name)}
          />
        </FormField>

        <FormField
          label="Employee ID"
          htmlFor="employee_id"
          required
          error={state.fieldErrors?.employee_id}
        >
          <Input
            id="employee_id"
            name="employee_id"
            required
            defaultValue={person?.employee_id ?? ""}
            placeholder={kind === "custodian" ? "CUS-1000" : "ENG-2000"}
            aria-invalid={Boolean(state.fieldErrors?.employee_id)}
          />
        </FormField>

        <FormField
          label="Phone"
          htmlFor="phone"
          hint="Work contact number only."
          error={state.fieldErrors?.phone}
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={person?.phone ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.phone)}
          />
        </FormField>

        {kind === "custodian" ? (
          <FormField
            label="Bank"
            htmlFor="bank_id"
            error={state.fieldErrors?.bank_id}
          >
            <Select
              id="bank_id"
              name="bank_id"
              defaultValue={person?.extraValue ?? ""}
            >
              <option value="">Unassigned</option>
              {banks.map((bank) => (
                <option key={bank.value} value={bank.value}>
                  {bank.label}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField
            label="Specialization"
            htmlFor="specialization"
            error={state.fieldErrors?.specialization}
          >
            <Input
              id="specialization"
              name="specialization"
              defaultValue={person?.extraValue ?? ""}
              placeholder="Cash dispenser"
            />
          </FormField>
        )}

        <FormField label="Status" htmlFor="status" required>
          <Select id="status" name="status" defaultValue={person?.status ?? "ACTIVE"}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
