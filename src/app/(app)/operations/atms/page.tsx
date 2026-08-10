import type { Metadata } from "next";

import { AtmManager } from "@/components/atm/atm-manager";
import { PageHeader } from "@/components/layout/page-header";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { atmQuerySchema } from "@/lib/validation/schemas";
import { getAtmList } from "@/services/atm/atm.service";
import { getBankOptions } from "@/services/banks/bank.service";
import {
  getCustodianOptions,
  getEngineerOptions,
} from "@/services/people/people.service";

export const metadata: Metadata = { title: "ATMs" };

export default async function AtmsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Unparseable filters fall back to defaults rather than erroring the page —
  // a hand-edited query string should not break the module.
  const parsed = atmQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : atmQuerySchema.parse({});

  const [{ user }, page, banks, custodians, engineers] = await Promise.all([
    getSession(),
    getAtmList(query),
    getBankOptions(),
    getCustodianOptions(),
    getEngineerOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="ATM management"
        description="Register terminals, assign custodians and engineers, and control which machines are in service."
      />

      <AtmManager
        page={page}
        canWrite={can(user, "atm:write")}
        banks={banks.map((bank) => ({ value: bank.id, label: bank.name }))}
        custodians={custodians.map((person) => ({
          value: person.id,
          label: person.full_name,
        }))}
        engineers={engineers.map((person) => ({
          value: person.id,
          label: person.full_name,
        }))}
      />
    </>
  );
}
