import { apiError, apiOk, readJson, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { reportQuerySchema } from "@/lib/validation/schemas";
import { getReportList, requestReport } from "@/services/reports/report.service";

export async function GET(request: Request) {
  try {
    const parsed = reportQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getReportList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}

/** Returns 501 by design — report generation is not implemented in this phase. */
export async function POST(request: Request) {
  try {
    return apiOk(await requestReport(await readJson(request)), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
