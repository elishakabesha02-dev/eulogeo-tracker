/**
 * Shared shape for `useActionState` forms.
 *
 * Kept out of `actions.ts` because a `"use server"` module may only export
 * async functions — a constant there is a build error.
 */
export interface AuthFormState {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
}

export const initialAuthState: AuthFormState = { error: null };

/** Generic form state for the resource dialogs (ATM, bank, custodian, engineer). */
export interface FormState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Record<string, string[]>;
}

export const initialFormState: FormState = { status: "idle", message: null };
