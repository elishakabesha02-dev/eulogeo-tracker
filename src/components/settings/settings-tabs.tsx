"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/field";
import { TBody, THead, Table, TableWrapper, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { APP_NAME, DEFAULT_CURRENCY, MAX_UPLOAD_BYTES } from "@/config/app";
import { formatBytes } from "@/lib/utils/format";
import { ROLE_LABELS, type Role } from "@/types/auth";
import type { ReactNode } from "react";

interface CurrentUser {
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  phone: string | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

interface RoleRow {
  role: Role;
  label: string;
  description: string;
  permissionCount: number;
}

interface SystemInfo {
  supabaseConfigured: boolean;
  isDemo: boolean;
  storageBucket: string;
  aiProvider: string;
  aiConnected: boolean;
}

export interface SettingsTabsProps {
  currentUser: CurrentUser | null;
  users: UserRow[];
  roles: RoleRow[];
  system: SystemInfo;
}

export function SettingsTabs({
  currentUser,
  users,
  roles,
  system,
}: SettingsTabsProps) {
  return (
    <Tabs
      tabs={[
        {
          id: "organization",
          label: "Organisation",
          content: <OrganizationTab currentUser={currentUser} />,
        },
        { id: "users", label: "Users", content: <UsersTab users={users} /> },
        { id: "roles", label: "Roles", content: <RolesTab roles={roles} /> },
        { id: "banks", label: "Banks", content: <BanksTab /> },
        { id: "atm", label: "ATM configuration", content: <AtmConfigTab /> },
        {
          id: "notifications",
          label: "Notifications",
          content: <NotificationsTab />,
        },
        {
          id: "ai",
          label: "AI configuration",
          content: <AiTab system={system} />,
        },
        { id: "system", label: "System", content: <SystemTab system={system} /> },
      ]}
    />
  );
}

/* -------------------------------------------------------------------------- */

function ReadOnlyNote({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-fg-subtle">{children}</p>;
}

function DefinitionList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OrganizationTab({ currentUser }: { currentUser: CurrentUser | null }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Organisation" description="Applies to the whole workspace" />
        <CardBody className="space-y-4">
          <FormField label="Organisation name" htmlFor="org-name">
            <Input id="org-name" defaultValue={APP_NAME} disabled />
          </FormField>
          <FormField
            label="Reporting currency"
            htmlFor="org-currency"
            hint="Used when a record does not carry its own currency."
          >
            <Input id="org-currency" defaultValue={DEFAULT_CURRENCY} disabled />
          </FormField>
          <ReadOnlyNote>
            Organisation settings are read-only in this phase.
          </ReadOnlyNote>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your profile" description="Signed-in account" />
        <CardBody>
          {currentUser ? (
            <DefinitionList
              items={[
                { label: "Name", value: currentUser.name },
                { label: "Email", value: currentUser.email },
                {
                  label: "Role",
                  value: <Badge tone="primary">{ROLE_LABELS[currentUser.role]}</Badge>,
                },
                { label: "Job title", value: currentUser.jobTitle ?? "—" },
                { label: "Phone", value: currentUser.phone ?? "—" },
              ]}
            />
          ) : (
            <ReadOnlyNote>No profile loaded.</ReadOnlyNote>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function UsersTab({ users }: { users: UserRow[] }) {
  return (
    <Card>
      <CardHeader
        title="Users"
        description="Accounts with access to this workspace"
      />
      <TableWrapper>
        <Table className="min-w-[36rem]">
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </Tr>
          </THead>
          <TBody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td className="font-medium">{user.name}</Td>
                <Td className="text-fg-muted">{user.email}</Td>
                <Td>
                  <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>
                </Td>
                <Td>
                  <Badge tone={user.isActive ? "success" : "neutral"} dot>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableWrapper>
      <CardBody className="border-t border-border-default">
        <ReadOnlyNote>
          Invitations and role changes are handled in Supabase for this phase. User
          management lands with the administration module.
        </ReadOnlyNote>
      </CardBody>
    </Card>
  );
}

function RolesTab({ roles }: { roles: RoleRow[] }) {
  return (
    <Card>
      <CardHeader
        title="Roles"
        description="Static role-to-permission matrix defined in lib/auth/permissions.ts"
      />
      <CardBody className="space-y-4">
        {roles.map((role) => (
          <div
            key={role.role}
            className="border-b border-border-default pb-4 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-fg">{role.label}</h3>
              <Badge tone="neutral">{role.permissionCount} permissions</Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">
              {role.description}
            </p>
          </div>
        ))}
        <ReadOnlyNote>
          Per-bank and per-region scoping will replace this matrix without changing
          how callers ask for a permission.
        </ReadOnlyNote>
      </CardBody>
    </Card>
  );
}

function BanksTab() {
  return (
    <Card>
      <CardHeader title="Banks" description="Institution records" />
      <CardBody className="space-y-3">
        <ReadOnlyNote>
          Banks are managed in their own module, under Data → Banks. Bank-level
          reconciliation rules (GL account mapping, cut-off times, tolerance
          thresholds) will be configured here once the reconciliation engine exists.
        </ReadOnlyNote>
      </CardBody>
    </Card>
  );
}

function AtmConfigTab() {
  return (
    <Card>
      <CardHeader title="ATM configuration" description="Estate-wide defaults" />
      <CardBody className="space-y-4">
        <DefinitionList
          items={[
            { label: "Default cassette count", value: "Not configured" },
            { label: "Denomination set", value: "Not configured" },
            { label: "Variance tolerance", value: "Not configured" },
            { label: "Business day cut-off", value: "Not configured" },
          ]}
        />
        <ReadOnlyNote>
          These settings are placeholders. They take effect when cash counting and
          the reconciliation engine are implemented.
        </ReadOnlyNote>
      </CardBody>
    </Card>
  );
}

function NotificationsTab() {
  return (
    <Card>
      <CardHeader title="Notifications" description="Delivery channels" />
      <CardBody className="space-y-4">
        <DefinitionList
          items={[
            { label: "In-app", value: <Badge tone="success">Enabled</Badge> },
            { label: "Email", value: <Badge tone="neutral">Not implemented</Badge> },
            { label: "Push", value: <Badge tone="neutral">Not implemented</Badge> },
            {
              label: "Realtime",
              value: <Badge tone="neutral">Not implemented</Badge>,
            },
          ]}
        />
        <ReadOnlyNote>
          Notifications are written to the database and read in the notification
          centre. No external delivery channel is wired up.
        </ReadOnlyNote>
      </CardBody>
    </Card>
  );
}

function AiTab({ system }: { system: SystemInfo }) {
  return (
    <Card>
      <CardHeader title="AI configuration" description="Provider and safeguards" />
      <CardBody className="space-y-4">
        <DefinitionList
          items={[
            { label: "Provider", value: system.aiProvider },
            {
              label: "Status",
              value: (
                <Badge tone={system.aiConnected ? "success" : "warning"} dot>
                  {system.aiConnected ? "Connected" : "Not connected"}
                </Badge>
              ),
            },
            { label: "API key", value: "Server-side only, never displayed" },
            { label: "Tool execution", value: "Server-side only" },
          ]}
        />
        <div className="rounded-lg border border-border-default bg-surface-muted px-4 py-3">
          <p className="text-xs leading-relaxed text-fg-muted">
            Two rules are built into the architecture rather than configured here:
            financial figures always come from the deterministic reconciliation
            service, and any tool that changes data requires explicit human approval.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function SystemTab({ system }: { system: SystemInfo }) {
  return (
    <Card>
      <CardHeader title="System" description="Runtime configuration" />
      <CardBody className="space-y-4">
        <DefinitionList
          items={[
            {
              label: "Data source",
              value: (
                <Badge tone={system.supabaseConfigured ? "success" : "warning"} dot>
                  {system.supabaseConfigured ? "Supabase" : "In-memory demo data"}
                </Badge>
              ),
            },
            { label: "Storage bucket", value: system.storageBucket },
            { label: "Max upload size", value: formatBytes(MAX_UPLOAD_BYTES) },
            {
              label: "Audit logging",
              value: <Badge tone="success">Enabled</Badge>,
            },
          ]}
        />
        {system.isDemo ? (
          <div className="rounded-lg border border-warning/25 bg-warning-subtle px-4 py-3">
            <p className="text-xs leading-relaxed text-fg">
              No Supabase project is configured, so the application is serving
              synthetic demo data. Writes are held in the server process and are lost
              on restart. Add your credentials to <code>.env.local</code> to switch to
              a real database.
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
