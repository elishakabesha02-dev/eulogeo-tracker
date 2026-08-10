import { apiError, apiOk, readJson, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { personQuerySchema } from "@/lib/validation/schemas";
import { getEngineerList, registerEngineer } from "@/services/people/people.service";

export async function GET(request: Request) {
  try {
    const parsed = personQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getEngineerList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return apiOk(await registerEngineer(await readJson(request)), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
