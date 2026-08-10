import { apiError, apiOk, readJson, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { atmQuerySchema } from "@/lib/validation/schemas";
import { getAtmList, registerAtm } from "@/services/atm/atm.service";

export async function GET(request: Request) {
  try {
    const parsed = atmQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getAtmList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const atm = await registerAtm(await readJson(request));
    return apiOk(atm, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
