import { apiError, apiOk, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { dailyOperationQuerySchema } from "@/lib/validation/schemas";
import { getDailyOperations } from "@/services/operations/operations.service";

export async function GET(request: Request) {
  try {
    const parsed = dailyOperationQuerySchema.safeParse(
      searchParamsToObject(request.url),
    );
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getDailyOperations(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}
