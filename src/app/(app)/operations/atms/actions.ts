"use server";

import { revalidatePath } from "next/cache";

import { ServiceError } from "@/lib/database/errors";
import type { FormState } from "@/lib/auth/form-state";
import { editAtm, registerAtm, setAtmStatus } from "@/services/atm/atm.service";
import type { AtmStatus } from "@/types/domain";

/**
 * Server actions for the ATM module.
 *
 * These are thin: they read the form, hand it to the service, and translate the
 * outcome into form state. All authorization, validation and auditing happen in
 * the service, so an action can never become a way around them.
 */

function toInput(formData: FormData) {
  return {
    atm_code: formData.get("atm_code"),
    bank_id: formData.get("bank_id"),
    branch_id: formData.get("branch_id"),
    location: formData.get("location"),
    status: formData.get("status"),
    custodian_id: formData.get("custodian_id"),
    engineer_id: formData.get("engineer_id"),
    model: formData.get("model"),
    notes: formData.get("notes"),
  };
}

function toFormState(error: unknown): FormState {
  if (error instanceof ServiceError) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: error.details,
    };
  }
  console.error("[atms] Unhandled action error", error);
  return { status: "error", message: "Something went wrong. Please try again." };
}

export async function createAtmAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const atm = await registerAtm(toInput(formData));
    revalidatePath("/operations/atms");
    revalidatePath("/dashboard");
    return { status: "success", message: `${atm.atm_code} was added.` };
  } catch (error) {
    return toFormState(error);
  }
}

export async function updateAtmAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing ATM reference." };

  try {
    const atm = await editAtm(id, toInput(formData));
    revalidatePath("/operations/atms");
    revalidatePath(`/operations/atms/${id}`);
    return { status: "success", message: `${atm.atm_code} was updated.` };
  } catch (error) {
    return toFormState(error);
  }
}

export async function setAtmStatusAction(
  id: string,
  status: AtmStatus,
): Promise<FormState> {
  try {
    const atm = await setAtmStatus(id, status);
    revalidatePath("/operations/atms");
    revalidatePath(`/operations/atms/${id}`);
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: `${atm.atm_code} is now ${status.toLowerCase()}.`,
    };
  } catch (error) {
    return toFormState(error);
  }
}
