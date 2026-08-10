import "server-only";

import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/repositories/audit";
import {
  createCustodian,
  createEngineer,
  listActiveCustodians,
  listActiveEngineers,
  listCustodians,
  listEngineers,
  updateCustodian,
  updateEngineer,
  type CustodianRow,
  type EngineerRow,
  type PersonListQuery,
} from "@/lib/database/repositories/people";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { custodianSchema, engineerSchema } from "@/lib/validation/schemas";
import type { ActiveStatus, Paginated } from "@/types/common";
import type { Custodian, Engineer } from "@/types/domain";

/* -------------------------------------------------------------------------- */
/*  Custodians                                                                */
/* -------------------------------------------------------------------------- */

export async function getCustodianList(
  query: PersonListQuery,
): Promise<Paginated<CustodianRow>> {
  await requirePermission("people:read");
  return listCustodians(query);
}

export async function getCustodianOptions(): Promise<Custodian[]> {
  await requirePermission("people:read");
  return listActiveCustodians();
}

export async function registerCustodian(input: unknown): Promise<Custodian> {
  const user = await requirePermission("people:write");

  const parsed = custodianSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the custodian details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const custodian = await createCustodian({
    full_name: parsed.data.full_name,
    employee_id: parsed.data.employee_id,
    phone: parsed.data.phone ?? null,
    status: parsed.data.status,
    bank_id: parsed.data.bank_id ?? null,
  });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "CUSTODIAN_CREATED",
    entity: "custodian",
    entity_id: custodian.id,
    // Employee ID only — the audit trail does not need the person's contact data.
    metadata: { employee_id: custodian.employee_id },
  });

  return custodian;
}

export async function editCustodian(id: string, input: unknown): Promise<Custodian> {
  const user = await requirePermission("people:write");

  const parsed = custodianSchema.partial().safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the custodian details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const custodian = await updateCustodian(id, parsed.data);

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "CUSTODIAN_UPDATED",
    entity: "custodian",
    entity_id: custodian.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return custodian;
}

export async function setCustodianStatus(
  id: string,
  status: ActiveStatus,
): Promise<Custodian> {
  const user = await requirePermission("people:write");
  const custodian = await updateCustodian(id, { status });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "CUSTODIAN_UPDATED",
    entity: "custodian",
    entity_id: custodian.id,
    metadata: { status },
  });

  return custodian;
}

/* -------------------------------------------------------------------------- */
/*  Engineers                                                                 */
/* -------------------------------------------------------------------------- */

export async function getEngineerList(
  query: PersonListQuery,
): Promise<Paginated<EngineerRow>> {
  await requirePermission("people:read");
  return listEngineers(query);
}

export async function getEngineerOptions(): Promise<Engineer[]> {
  await requirePermission("people:read");
  return listActiveEngineers();
}

export async function registerEngineer(input: unknown): Promise<Engineer> {
  const user = await requirePermission("people:write");

  const parsed = engineerSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the engineer details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const engineer = await createEngineer({
    full_name: parsed.data.full_name,
    employee_id: parsed.data.employee_id,
    phone: parsed.data.phone ?? null,
    status: parsed.data.status,
    specialization: parsed.data.specialization ?? null,
  });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "ENGINEER_CREATED",
    entity: "engineer",
    entity_id: engineer.id,
    metadata: { employee_id: engineer.employee_id },
  });

  return engineer;
}

export async function editEngineer(id: string, input: unknown): Promise<Engineer> {
  const user = await requirePermission("people:write");

  const parsed = engineerSchema.partial().safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the engineer details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const engineer = await updateEngineer(id, parsed.data);

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "ENGINEER_UPDATED",
    entity: "engineer",
    entity_id: engineer.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return engineer;
}

export async function setEngineerStatus(
  id: string,
  status: ActiveStatus,
): Promise<Engineer> {
  const user = await requirePermission("people:write");
  const engineer = await updateEngineer(id, { status });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "ENGINEER_UPDATED",
    entity: "engineer",
    entity_id: engineer.id,
    metadata: { status },
  });

  return engineer;
}
