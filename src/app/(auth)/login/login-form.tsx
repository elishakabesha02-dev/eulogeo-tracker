"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";
import { signInAction } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/form-state";

export function LoginForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <div
          role="alert"
          className="flex gap-2.5 rounded-lg border border-danger/25 bg-danger-subtle px-3.5 py-3"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-danger"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-fg">{state.error}</p>
        </div>
      ) : null}

      <FormField
        label="Email address"
        htmlFor="email"
        required
        error={state.fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={disabled || pending}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        required
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={disabled || pending}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          placeholder="••••••••"
        />
      </FormField>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={pending}
        disabled={disabled}
      >
        Sign in
      </Button>
    </form>
  );
}
