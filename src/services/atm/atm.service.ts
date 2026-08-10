import "server-only";

import { requirePermission } from "@/lib/auth/session";
import {
  createAtm,
  getAtm,
  listAtms,
  updateAtm,
  type AtmListQuery,
} from "@/lib/database/repositories/atms";
import { recordAudit } from "@/lib/database/repositories/audit";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { atmSchema } from "@/lib/validation/schemas";
import type { Paginated } from "@/types/common";
import type { Atm, AtmStatus, AtmWithRelations } from "@/types/domain";

/**
 * ATM service.
 *
 * Every mutating entry point follows the same order: authorize, validate,
 * write, audit. Route handlers and server actions call these functions and
 * never touch a repository directly.
 */

export async function getAtmList(
  query: AtmListQuery,
): Promise<Paginated<AtmWithRelations>> {
  await requirePermission("atm:read");
  return listAtms(query);
}

export async function getAtmDetail(id: string): Promise<AtmWithRelations> {
  await requirePermission("atm:read");
  return getAtm(id);
}

export async function registerAtm(input: unknown): Promise<Atm> {
  const user = await requirePermission("atm:write");

  const parsed = atmSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the ATM details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const atm = await createAtm({
    atm_code: parsed.data.atm_code,
    bank_id: parsed.data.bank_id,
    branch_id: parsed.data.branch_id ?? null,
    location: parsed.data.location,
    status: parsed.data.status,
    custodian_id: parsed.data.custodian_id ?? null,
    engineer_id: parsed.data.engineer_id ?? null,
    model: parsed.data.model ?? null,
    notes: parsed.data.notes ?? null,
  });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "ATM_CREATED",
    entity: "atm",
    entity_id: atm.id,
    metadata: { atm_code: atm.atm_code, bank_id: atm.bank_id },
  });

  return atm;
}

export async function editAtm(id: string, input: unknown): Promise<Atm> {
  const user = await requirePermission("atm:write");

  const parsed = atmSchema.partial().safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the ATM details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const atm = await updateAtm(id, parsed.data);

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "ATM_UPDATED",
    entity: "atm",
    entity_id: atm.id,
    // Field names only — values may be operationally sensitive.
    metadata: { atm_code: atm.atm_code, fields: Object.keys(parsed.data) },
  });

  return atm;
}

/**
 * Status changes are their own operation rather than a generic update, because
 * they carry a distinct audit action and, later, distinct approval rules.
 */
export async function setAtmStatus(id: string, status: AtmStatus): Promise<Atm> {
  const user = await requirePermission("atm:write");

  const atm = await updateAtm(id, { status });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: status === "ACTIVE" ? "ATM_ACTIVATED" : "ATM_DEACTIVATED",
    entity: "atm",
    entity_id: atm.id,
    metadata: { atm_code: atm.atm_code, status },
  });

  return atm;
}
