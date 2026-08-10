import type { Metadata } from "next";

import { BankManager } from "@/components/data/bank-manager";
import { PageHeader } from "@/components/layout/page-header";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { bankQuerySchema } from "@/lib/validation/schemas";
import { getBankList } from "@/services/banks/bank.service";

export const metadata: Metadata = { title: "Banks" };

export default async function BanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = bankQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : bankQuerySchema.parse({});

  const [{ user }, page] = await Promise.all([getSession(), getBankList(query)]);

  return (
    <>
      <PageHeader
        title="Bank management"
        description="Institutions whose terminals and ledgers this system reconciles."
      />
      <BankManager page={page} canWrite={can(user, "bank:write")} />
    </>
  );
}
