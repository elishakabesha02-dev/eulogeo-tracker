import "server-only";

import { requirePermission } from "@/lib/auth/session";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationQuery,
} from "@/lib/database/repositories/notifications";
import type { Paginated } from "@/types/common";
import type { Notification } from "@/types/domain";

/**
 * Notification reads. Delivery (realtime, email, push) is a later phase; the
 * table and the centre exist now so those channels have somewhere to write to.
 */

export async function getNotificationList(
  query: NotificationQuery,
): Promise<Paginated<Notification>> {
  await requirePermission("notification:read");
  return listNotifications(query);
}

export async function getUnreadCount(): Promise<number> {
  await requirePermission("notification:read");
  return countUnreadNotifications();
}

export async function readNotification(id: string): Promise<Notification> {
  await requirePermission("notification:read");
  return markNotificationRead(id);
}

export async function readAllNotifications(): Promise<number> {
  await requirePermission("notification:read");
  return markAllNotificationsRead();
}
