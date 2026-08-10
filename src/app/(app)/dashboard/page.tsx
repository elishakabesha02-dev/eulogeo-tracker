import type { Metadata } from "next";

import { AIAssistantPreview } from "@/components/dashboard/ai-assistant-preview";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TodaysOperations } from "@/components/dashboard/todays-operations";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import { getAIStatus } from "@/services/ai/ai.service";
import { getRecentActivity } from "@/services/audit/audit.service";
import { getDashboardData } from "@/services/dashboard/dashboard.service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await getSession();
  const [dashboard, activity] = await Promise.all([
    getDashboardData(),
    getRecentActivity(6),
  ]);

  const aiStatus = getAIStatus();
  const firstName = user?.profile.full_name.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Good day, ${firstName}`}
        description={`Estate overview for ${formatDate(dashboard.businessDate)}.`}
      />

      <div className="space-y-5">
        <MetricCards metrics={dashboard.metrics} />

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TodaysOperations
              operations={dashboard.todaysOperations}
              businessDate={dashboard.businessDate}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <AIAssistantPreview connected={aiStatus.connected} />
            <RecentActivity items={activity} />
          </div>
        </div>
      </div>
    </>
  );
}
