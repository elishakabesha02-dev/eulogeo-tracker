import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PeopleManager, type PersonRow } from "@/components/data/people-manager";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { personQuerySchema } from "@/lib/validation/schemas";
import { getBankOptions } from "@/services/banks/bank.service";
import { getCustodianList } from "@/services/people/people.service";

export const metadata: Metadata = { title: "Custodians" };

export default async function CustodiansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = personQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : personQuerySchema.parse({});

  const [{ user }, page, banks] = await Promise.all([
    getSession(),
    getCustodianList(query),
    getBankOptions(),
  ]);

  const rows: PersonRow[] = page.data.map((person) => ({
    id: person.id,
    full_name: person.full_name,
    employee_id: person.employee_id,
    phone: person.phone,
    status: person.status,
    assigned_atm_codes: person.assigned_atm_codes,
    extra: person.bank_name,
    extraValue: person.bank_id,
  }));

  return (
    <>
      <PageHeader
        title="Custodians"
        description="Staff accountable for cash at assigned terminals. Only operational contact details are held."
      />
      <PeopleManager
        kind="custodian"
        page={{ ...page, data: rows }}
        canWrite={can(user, "people:write")}
        banks={banks.map((bank) => ({ value: bank.id, label: bank.name }))}
      />
    </>
  );
}
