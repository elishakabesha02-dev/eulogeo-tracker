import "server-only";

import { requirePermission } from "@/lib/auth/session";
import {
  countOpenExceptions,
  getException,
  listExceptions,
  type ExceptionQuery,
} from "@/lib/database/repositories/exceptions";
import type { Paginated } from "@/types/common";
import type { OpsExceptionWithRelations } from "@/types/domain";

export async function getExceptionList(
  query: ExceptionQuery,
): Promise<Paginated<OpsExceptionWithRelations>> {
  await requirePermission("exception:read");
  return listExceptions(query);
}

export async function getExceptionDetail(
  id: string,
): Promise<OpsExceptionWithRelations> {
  await requirePermission("exception:read");
  return getException(id);
}

export async function getOpenExceptionCount(): Promise<number> {
  await requirePermission("exception:read");
  return countOpenExceptions();
}
