import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { Card, CardBody } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/config/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <Card>
      <CardBody className="space-y-5">
        {!configured ? (
          <div className="rounded-lg border border-warning/25 bg-warning-subtle px-3.5 py-3">
            <p className="text-xs leading-relaxed text-fg">
              <span className="font-semibold">Supabase is not configured.</span> The
              application is running in demo mode with synthetic data and sign-in is
              disabled. Add your Supabase credentials to{" "}
              <code className="rounded bg-surface px-1 py-0.5 font-mono text-[0.6875rem]">
                .env.local
              </code>{" "}
              to enable authentication —{" "}
              <Link href="/dashboard" className="font-medium text-primary underline">
                continue to the dashboard
              </Link>
              .
            </p>
          </div>
        ) : null}

        <LoginForm disabled={!configured} />

        <p className="text-center text-xs text-fg-subtle">
          Accounts are provisioned by an administrator. Contact your supervisor if you
          cannot sign in.
        </p>
      </CardBody>
    </Card>
  );
}
