import { apiError, apiOk, readJson } from "@/lib/api/response";
import { editBank, getBankDetail } from "@/services/banks/bank.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return apiOk(await getBankDetail(id));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return apiOk(await editBank(id, await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
