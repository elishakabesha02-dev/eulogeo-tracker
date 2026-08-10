"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { ServiceError } from "@/lib/database/errors";
import { editBank, registerBank, setBankStatus } from "@/services/banks/bank.service";
import type { ActiveStatus } from "@/types/common";

function toFormState(error: unknown): FormState {
  if (error instanceof ServiceError) {
    return { status: "error", message: error.message, fieldErrors: error.details };
  }
  console.error("[banks] Unhandled action error", error);
  return { status: "error", message: "Something went wrong. Please try again." };
}

function toInput(formData: FormData) {
  return {
    name: formData.get("name"),
    code: formData.get("code"),
    status: formData.get("status"),
  };
}

export async function createBankAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const bank = await registerBank(toInput(formData));
    revalidatePath("/data/banks");
    return { status: "success", message: `${bank.name} was added.` };
  } catch (error) {
    return toFormState(error);
  }
}

export async function updateBankAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing bank reference." };

  try {
    const bank = await editBank(id, toInput(formData));
    revalidatePath("/data/banks");
    return { status: "success", message: `${bank.name} was updated.` };
  } catch (error) {
    return toFormState(error);
  }
}

export async function setBankStatusAction(
  id: string,
  status: ActiveStatus,
): Promise<FormState> {
  try {
    const bank = await setBankStatus(id, status);
    revalidatePath("/data/banks");
    return {
      status: "success",
      message: `${bank.name} is now ${status.toLowerCase()}.`,
    };
  } catch (error) {
    return toFormState(error);
  }
}
