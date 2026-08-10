import "server-only";

import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/repositories/audit";
import {
  createBank,
  getBank,
  listActiveBanks,
  listBanks,
  updateBank,
  type BankListQuery,
} from "@/lib/database/repositories/banks";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { bankSchema } from "@/lib/validation/schemas";
import type { ActiveStatus, Paginated } from "@/types/common";
import type { Bank } from "@/types/domain";

export async function getBankList(query: BankListQuery): Promise<Paginated<Bank>> {
  await requirePermission("bank:read");
  return listBanks(query);
}

export async function getBankOptions(): Promise<Bank[]> {
  await requirePermission("bank:read");
  return listActiveBanks();
}

export async function getBankDetail(id: string): Promise<Bank> {
  await requirePermission("bank:read");
  return getBank(id);
}

export async function registerBank(input: unknown): Promise<Bank> {
  const user = await requirePermission("bank:write");

  const parsed = bankSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the bank details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const bank = await createBank(parsed.data);

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "BANK_CREATED",
    entity: "bank",
    entity_id: bank.id,
    metadata: { name: bank.name, code: bank.code },
  });

  return bank;
}

export async function editBank(id: string, input: unknown): Promise<Bank> {
  const user = await requirePermission("bank:write");

  const parsed = bankSchema.partial().safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "Check the bank details.", {
      details: fieldErrors(parsed.error),
    });
  }

  const bank = await updateBank(id, parsed.data);

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "BANK_UPDATED",
    entity: "bank",
    entity_id: bank.id,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return bank;
}

export async function setBankStatus(id: string, status: ActiveStatus): Promise<Bank> {
  const user = await requirePermission("bank:write");
  const bank = await updateBank(id, { status });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "BANK_UPDATED",
    entity: "bank",
    entity_id: bank.id,
    metadata: { status },
  });

  return bank;
}
