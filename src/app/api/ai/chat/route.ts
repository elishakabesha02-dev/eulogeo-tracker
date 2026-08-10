import { apiError, apiOk, readJson } from "@/lib/api/response";
import { sendMessage } from "@/services/ai/ai.service";

/**
 * AI chat endpoint.
 *
 * No model is connected in this phase; the mock provider answers and every
 * response carries `simulated: true` so the client can label it accurately.
 */
export async function POST(request: Request) {
  try {
    return apiOk(await sendMessage(await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
