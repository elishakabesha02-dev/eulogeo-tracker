import { apiError, apiOk, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { auditQuerySchema } from "@/lib/validation/schemas";
import { getAuditLogList } from "@/services/audit/audit.service";
import type { AuditAction, AuditEntity } from "@/types/domain";

export async function GET(request: Request) {
  try {
    const parsed = auditQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }

    const { action, entity, ...rest } = parsed.data;
    return apiOk(
      await getAuditLogList({
        ...rest,
        action: action as AuditAction | undefined,
        entity: entity as AuditEntity | undefined,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
