import { apiError, apiOk, searchParamsToObject } from "@/lib/api/response";
import { ServiceError } from "@/lib/database/errors";
import { fieldErrors } from "@/lib/validation/common";
import { notificationQuerySchema } from "@/lib/validation/schemas";
import {
  getNotificationList,
  readAllNotifications,
} from "@/services/notifications/notification.service";

export async function GET(request: Request) {
  try {
    const parsed = notificationQuerySchema.safeParse(
      searchParamsToObject(request.url),
    );
    if (!parsed.success) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid query parameters.", {
        details: fieldErrors(parsed.error),
      });
    }
    return apiOk(await getNotificationList(parsed.data));
  } catch (error) {
    return apiError(error);
  }
}

/** Marks every unread notification as read. */
export async function PATCH() {
  try {
    return apiOk({ updated: await readAllNotifications() });
  } catch (error) {
    return apiError(error);
  }
}
