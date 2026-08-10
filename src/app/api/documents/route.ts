import { apiError, apiOk, readJson, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { documentQuerySchema } from "@/lib/validation/schemas";
import {
  confirmUpload,
  getDocumentList,
} from "@/services/documents/document.service";

export async function GET(request: Request) {
  try {
    const parsed = documentQuerySchema.safeParse(searchParamsToObject(request.url));
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getDocumentList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Step 2 of the upload flow: record metadata once the transfer to storage has
 * completed. See `POST /api/documents/uploads` for step 1.
 */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as Record<string, unknown>;

    const document = await confirmUpload({
      storagePath: String(body.storagePath ?? ""),
      fileName: String(body.fileName ?? ""),
      mimeType: String(body.mimeType ?? ""),
      sizeBytes: Number(body.sizeBytes ?? 0),
      documentType: String(body.documentType ?? "OTHER"),
      atmId: (body.atmId as string | null) ?? null,
      bankId: (body.bankId as string | null) ?? null,
    });

    return apiOk(document, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
