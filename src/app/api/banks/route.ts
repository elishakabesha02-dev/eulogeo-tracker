import { apiError, apiOk, readJson, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { bankQuerySchema } from "@/lib/validation/schemas";
import { getBankList, registerBank } from "@/services/banks/bank.service";

export async function GET(request: Request) {
  try {
    const parsed = bankQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getBankList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return apiOk(await registerBank(await readJson(request)), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
