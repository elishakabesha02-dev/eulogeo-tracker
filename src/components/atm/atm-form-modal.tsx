"use client";

import { useEffect, useActionState } from "react";

import { createAtmAction, updateAtmAction } from "@/app/(app)/operations/atms/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { initialFormState } from "@/lib/auth/form-state";
import { humanizeEnum } from "@/lib/utils/format";
import type { SelectOption } from "@/types/common";
import { ATM_STATUSES, type AtmWithRelations } from "@/types/domain";

export interface AtmFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating. */
  atm?: AtmWithRelations | null;
  banks: SelectOption[];
  custodians: SelectOption[];
  engineers: SelectOption[];
}

export function AtmFormModal({
  open,
  onClose,
  atm,
  banks,
  custodians,
  engineers,
}: AtmFormModalProps) {
  const editing = Boolean(atm);
  const [state, formAction, pending] = useActionState(
    editing ? updateAtmAction : createAtmAction,
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
      title={editing ? `Edit ${atm?.atm_code}` : "Add ATM"}
      description={
        editing
          ? "Update the terminal's registration details."
          : "Register a new terminal in the estate."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="atm-form" loading={pending}>
            {editing ? "Save changes" : "Add ATM"}
          </Button>
        </>
      }
    >
      <form id="atm-form" action={formAction} className="space-y-4">
        {atm ? <input type="hidden" name="id" value={atm.id} /> : null}

        {state.status === "error" && state.message ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-xs text-fg"
          >
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="ATM ID"
            htmlFor="atm_code"
            required
            hint="Letters, numbers and hyphens."
            error={state.fieldErrors?.atm_code}
          >
            <Input
              id="atm_code"
              name="atm_code"
              data-autofocus
              required
              defaultValue={atm?.atm_code ?? ""}
              placeholder="ATM-1001"
              aria-invalid={Boolean(state.fieldErrors?.atm_code)}
            />
          </FormField>

          <FormField
            label="Status"
            htmlFor="status"
            required
            error={state.fieldErrors?.status}
          >
            <Select id="status" name="status" defaultValue={atm?.status ?? "ACTIVE"}>
              {ATM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {humanizeEnum(status)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          label="Bank"
          htmlFor="bank_id"
          required
          error={state.fieldErrors?.bank_id}
        >
          <Select
            id="bank_id"
            name="bank_id"
            required
            defaultValue={atm?.bank_id ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.bank_id)}
          >
            <option value="">Select a bank…</option>
            {banks.map((bank) => (
              <option key={bank.value} value={bank.value}>
                {bank.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Location"
          htmlFor="location"
          required
          error={state.fieldErrors?.location}
        >
          <Input
            id="location"
            name="location"
            required
            defaultValue={atm?.location ?? ""}
            placeholder="Northgate — Main Street Lobby"
            aria-invalid={Boolean(state.fieldErrors?.location)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Assigned custodian"
            htmlFor="custodian_id"
            error={state.fieldErrors?.custodian_id}
          >
            <Select
              id="custodian_id"
              name="custodian_id"
              defaultValue={atm?.custodian_id ?? ""}
            >
              <option value="">Unassigned</option>
              {custodians.map((person) => (
                <option key={person.value} value={person.value}>
                  {person.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Assigned engineer"
            htmlFor="engineer_id"
            error={state.fieldErrors?.engineer_id}
          >
            <Select
              id="engineer_id"
              name="engineer_id"
              defaultValue={atm?.engineer_id ?? ""}
            >
              <option value="">Unassigned</option>
              {engineers.map((person) => (
                <option key={person.value} value={person.value}>
                  {person.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Model" htmlFor="model" error={state.fieldErrors?.model}>
          <Input
            id="model"
            name="model"
            defaultValue={atm?.model ?? ""}
            placeholder="NCR SelfServ 22"
          />
        </FormField>

        <FormField label="Notes" htmlFor="notes" error={state.fieldErrors?.notes}>
          <Textarea id="notes" name="notes" defaultValue={atm?.notes ?? ""} rows={3} />
        </FormField>
      </form>
    </Modal>
  );
}
