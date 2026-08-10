import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PeopleManager, type PersonRow } from "@/components/data/people-manager";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { personQuerySchema } from "@/lib/validation/schemas";
import { getEngineerList } from "@/services/people/people.service";

export const metadata: Metadata = { title: "Engineers" };

export default async function EngineersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = personQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : personQuerySchema.parse({});

  const [{ user }, page] = await Promise.all([getSession(), getEngineerList(query)]);

  const rows: PersonRow[] = page.data.map((person) => ({
    id: person.id,
    full_name: person.full_name,
    employee_id: person.employee_id,
    phone: person.phone,
    status: person.status,
    assigned_atm_codes: person.assigned_atm_codes,
    extra: person.specialization,
    extraValue: person.specialization,
  }));

  return (
    <>
      <PageHeader
        title="Engineers"
        description="Field engineers responsible for terminal hardware and fault resolution."
      />
      <PeopleManager
        kind="engineer"
        page={{ ...page, data: rows }}
        canWrite={can(user, "people:write")}
      />
    </>
  );
}
