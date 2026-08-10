import "server-only";

import { demoNotifications } from "@/lib/database/demo/dataset";
import { nowIso, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type { Notification, NotificationType } from "@/types/domain";

const TABLE = "notifications";

export interface NotificationQuery extends ListQuery {
  type?: NotificationType;
  unreadOnly?: boolean;
}

const demoRows: Notification[] = [...demoNotifications];

export async function listNotifications(
  query: NotificationQuery = {},
): Promise<Paginated<Notification>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoRows
      .filter((row) => (query.type ? row.type === query.type : true))
      .filter((row) => (query.unreadOnly ? row.read_at === null : true));
    return pageOf(sortRows(rows, (r) => r.created_at, "desc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 20);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (query.type) builder = builder.eq("type", query.type);
  if (query.unreadOnly) builder = builder.is("read_at", null);

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing notifications");

  const total = count ?? 0;
  return {
    data: (data ?? []) as Notification[],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function countUnreadNotifications(): Promise<number> {
  const supabase = await getServerSupabase();
  if (!supabase) return demoRows.filter((row) => row.read_at === null).length;

  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw fromDatabaseError(error, "Counting notifications");
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const supabase = await getServerSupabase();
  const readAt = nowIso();

  if (!supabase) {
    const index = demoRows.findIndex((row) => row.id === id);
    if (index === -1) throw notFound("Notification");
    const updated: Notification = {
      ...(demoRows[index] as Notification),
      read_at: readAt,
      updated_at: readAt,
    };
    demoRows[index] = updated;
    return updated;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ read_at: readAt, updated_at: readAt })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Updating notification");
  if (!data) throw notFound("Notification");
  return data as Notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const supabase = await getServerSupabase();
  const readAt = nowIso();

  if (!supabase) {
    let changed = 0;
    demoRows.forEach((row, index) => {
      if (row.read_at === null) {
        demoRows[index] = { ...row, read_at: readAt, updated_at: readAt };
        changed += 1;
      }
    });
    return changed;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ read_at: readAt, updated_at: readAt })
    .is("read_at", null)
    .select("id");

  if (error) throw fromDatabaseError(error, "Updating notifications");
  return (data ?? []).length;
}
