import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClearFiltersButton, FilterSelect } from "@/components/ui/data-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime, humanizeEnum } from "@/lib/utils/format";
import { notificationQuerySchema } from "@/lib/validation/schemas";
import { getNotificationList } from "@/services/notifications/notification.service";
import type { SelectOption } from "@/types/common";
import { NOTIFICATION_TYPES, type NotificationType } from "@/types/domain";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_OPTIONS: SelectOption[] = NOTIFICATION_TYPES.map((type) => ({
  value: type,
  label: humanizeEnum(type),
}));

const TONE_BY_TYPE: Record<NotificationType, "info" | "warning" | "danger" | "success"> =
  {
    INFO: "info",
    WARNING: "warning",
    ERROR: "danger",
    SUCCESS: "success",
    EXCEPTION: "danger",
  };

/** Only relative in-app paths are followed — never an absolute URL from data. */
function safeLink(link: string | null): string | null {
  if (!link) return null;
  return link.startsWith("/") && !link.startsWith("//") ? link : null;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = notificationQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : notificationQuerySchema.parse({});

  const page = await getNotificationList({ ...query, pageSize: query.pageSize ?? 20 });
  const unread = page.data.filter((item) => item.read_at === null).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} unread on this page.`}
        notice={
          <PhaseNotice>
            <strong>Foundation only.</strong> The notification table and centre exist
            so later phases have somewhere to write to. Real-time delivery, email and
            push are not implemented.
          </PhaseNotice>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default px-5 py-3.5">
          <FilterSelect paramName="type" label="Type" options={TYPE_OPTIONS} />
          <FilterSelect
            paramName="unreadOnly"
            label="Read state"
            allLabel="All"
            options={[{ value: "true", label: "Unread only" }]}
          />
          <ClearFiltersButton params={["type", "unreadOnly"]} />
        </div>

        {page.data.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nothing to show"
            description="Operational alerts will appear here as they are raised."
          />
        ) : (
          <>
            <ul className="divide-y divide-border-default">
              {page.data.map((notification) => {
                const href = safeLink(notification.link);
                const body = (
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.read_at ? "bg-border-strong" : "bg-primary",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            notification.read_at
                              ? "text-fg-muted"
                              : "font-medium text-fg",
                          )}
                        >
                          {notification.title}
                        </p>
                        <Badge tone={TONE_BY_TYPE[notification.type]}>
                          {humanizeEnum(notification.type)}
                        </Badge>
                      </div>
                      {notification.body ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-fg-subtle">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={notification.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="block px-5 py-3.5 transition-colors hover:bg-surface-muted"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-5 py-3.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              totalPages={page.totalPages}
            />
          </>
        )}
      </Card>
    </>
  );
}
