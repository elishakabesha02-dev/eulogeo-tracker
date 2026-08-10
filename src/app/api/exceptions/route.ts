import { apiError, apiOk, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { exceptionQuerySchema } from "@/lib/validation/schemas";
import { getExceptionList } from "@/services/exceptions/exception.service";

export async function GET(request: Request) {
  try {
    const parsed = exceptionQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getExceptionList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}
