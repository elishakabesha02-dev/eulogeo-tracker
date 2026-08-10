"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/config/env";
import { recordAudit } from "@/lib/database/repositories/audit";
import { getServerSupabase } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/common";
import { loginSchema } from "@/lib/validation/schemas";
import type { AuthFormState } from "@/lib/auth/form-state";

// A "use server" module may only export async functions, so the state type and
// its initial value live in `form-state.ts`.

/**
 * Password sign-in. Errors are returned to the form rather than thrown, and the
 * message is deliberately identical for "no such user" and "wrong password" so
 * the form cannot be used to enumerate accounts.
 */
export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Check the details below and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase is not configured, so sign-in is unavailable. The app is running in demo mode — see the README for setup steps.",
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return { error: "Authentication is unavailable right now." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Those credentials did not match an active account." };
  }

  await recordAudit({
    user_id: data.user?.id ?? null,
    actor_email: data.user?.email ?? parsed.data.email,
    action: "LOGIN",
    entity: "auth",
    entity_id: data.user?.id ?? null,
    metadata: { method: "password" },
  });

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabase();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.auth.signOut();

    if (user) {
      await recordAudit({
        user_id: user.id,
        actor_email: user.email ?? null,
        action: "LOGOUT",
        entity: "auth",
        entity_id: user.id,
      });
    }
  }

  redirect("/login");
}
