import type { Metadata } from "next";

import { PageHeader, PhaseNotice } from "@/components/layout/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getSession } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/config/env";
import { STORAGE_BUCKET } from "@/config/app";
import { listProfiles } from "@/lib/database/repositories/profiles";
import { getAIStatus } from "@/services/ai/ai.service";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/types/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, isDemo } = await getSession();
  const aiStatus = getAIStatus();
  const profiles = await listProfiles({ page: 1, pageSize: 25 });

  const roles = ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
    permissionCount: permissionsForRole(role).length,
  }));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Organisation, access and system configuration."
        notice={
          <PhaseNotice>
            <strong>Mostly read-only in this phase.</strong> Sections show the current
            configuration so it can be verified; editing arrives alongside the modules
            each section governs.
          </PhaseNotice>
        }
      />

      <SettingsTabs
        currentUser={
          user
            ? {
                name: user.profile.full_name,
                email: user.email,
                role: user.profile.role,
                jobTitle: user.profile.job_title,
                phone: user.profile.phone,
              }
            : null
        }
        users={profiles.data.map((profile) => ({
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          role: profile.role,
          isActive: profile.is_active,
        }))}
        roles={roles}
        system={{
          supabaseConfigured: isSupabaseConfigured(),
          isDemo,
          storageBucket: STORAGE_BUCKET,
          aiProvider: aiStatus.providerName,
          aiConnected: aiStatus.connected,
        }}
      />
    </>
  );
}
