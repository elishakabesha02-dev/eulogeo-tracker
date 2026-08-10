import { apiError, apiOk, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { reconciliationQuerySchema } from "@/lib/validation/schemas";
import { getReconciliationList } from "@/services/reconciliation/reconciliation.service";

export async function GET(request: Request) {
  try {
    const parsed = reconciliationQuerySchema.safeParse(
      searchParamsToObject(request.url),
    );
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getReconciliationList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}
