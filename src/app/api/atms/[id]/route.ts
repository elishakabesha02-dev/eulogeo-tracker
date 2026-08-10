import { apiError, apiOk, readJson } from "@/lib/api/response";
import { editAtm, getAtmDetail } from "@/services/atm/atm.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return apiOk(await getAtmDetail(id));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return apiOk(await editAtm(id, await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
