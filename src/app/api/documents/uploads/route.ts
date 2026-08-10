import { apiError, apiOk, readJson } from "@/lib/api/response";
import { prepareUpload } from "@/services/documents/document.service";

/**
 * Step 1 of the upload flow: validate the file metadata and mint a short-lived
 * signed upload URL. The browser uploads directly to storage, so file bytes
 * never pass through the application server.
 */
export async function POST(request: Request) {
  try {
    return apiOk(await prepareUpload(await readJson(request)));
  } catch (error) {
    return apiError(error);
  }
}
