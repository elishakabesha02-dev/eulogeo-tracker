"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/auth/form-state";
import { ServiceError } from "@/lib/database/errors";
import {
  editCustodian,
  editEngineer,
  registerCustodian,
  registerEngineer,
  setCustodianStatus,
  setEngineerStatus,
} from "@/services/people/people.service";
import type { ActiveStatus } from "@/types/common";

/** Shared server actions for the two people modules. */

function toFormState(error: unknown, module: string): FormState {
  if (error instanceof ServiceError) {
    return { status: "error", message: error.message, fieldErrors: error.details };
  }
  console.error(`[${module}] Unhandled action error`, error);
  return { status: "error", message: "Something went wrong. Please try again." };
}

function baseInput(formData: FormData) {
  return {
    full_name: formData.get("full_name"),
    employee_id: formData.get("employee_id"),
    phone: formData.get("phone"),
    status: formData.get("status"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Custodians                                                                */
/* -------------------------------------------------------------------------- */

export async function createCustodianAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const person = await registerCustodian({
      ...baseInput(formData),
      bank_id: formData.get("bank_id"),
    });
    revalidatePath("/data/custodians");
    return { status: "success", message: `${person.full_name} was added.` };
  } catch (error) {
    return toFormState(error, "custodians");
  }
}

export async function updateCustodianAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing custodian reference." };

  try {
    const person = await editCustodian(id, {
      ...baseInput(formData),
      bank_id: formData.get("bank_id"),
    });
    revalidatePath("/data/custodians");
    return { status: "success", message: `${person.full_name} was updated.` };
  } catch (error) {
    return toFormState(error, "custodians");
  }
}

export async function setCustodianStatusAction(
  id: string,
  status: ActiveStatus,
): Promise<FormState> {
  try {
    const person = await setCustodianStatus(id, status);
    revalidatePath("/data/custodians");
    return {
      status: "success",
      message: `${person.full_name} is now ${status.toLowerCase()}.`,
    };
  } catch (error) {
    return toFormState(error, "custodians");
  }
}

/* -------------------------------------------------------------------------- */
/*  Engineers                                                                 */
/* -------------------------------------------------------------------------- */

export async function createEngineerAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const person = await registerEngineer({
      ...baseInput(formData),
      specialization: formData.get("specialization"),
    });
    revalidatePath("/data/engineers");
    return { status: "success", message: `${person.full_name} was added.` };
  } catch (error) {
    return toFormState(error, "engineers");
  }
}

export async function updateEngineerAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing engineer reference." };

  try {
    const person = await editEngineer(id, {
      ...baseInput(formData),
      specialization: formData.get("specialization"),
    });
    revalidatePath("/data/engineers");
    return { status: "success", message: `${person.full_name} was updated.` };
  } catch (error) {
    return toFormState(error, "engineers");
  }
}

export async function setEngineerStatusAction(
  id: string,
  status: ActiveStatus,
): Promise<FormState> {
  try {
    const person = await setEngineerStatus(id, status);
    revalidatePath("/data/engineers");
    return {
      status: "success",
      message: `${person.full_name} is now ${status.toLowerCase()}.`,
    };
  } catch (error) {
    return toFormState(error, "engineers");
  }
}
