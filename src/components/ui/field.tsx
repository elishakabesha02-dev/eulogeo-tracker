import { cn } from "@/lib/utils/cn";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const CONTROL_BASE =
  "w-full rounded-lg border border-border-default bg-surface px-3 text-sm text-fg " +
  "placeholder:text-fg-subtle transition-colors " +
  "hover:border-border-strong " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 " +
  "aria-[invalid=true]:border-danger";

export function Label({
  className,
  children,
  required,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("text-sm font-medium text-fg", className)} {...props}>
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_BASE, "h-9.5", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(CONTROL_BASE, "min-h-20 py-2", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        CONTROL_BASE,
        "h-9.5 cursor-pointer appearance-none bg-no-repeat pr-9",
        // Inline chevron keeps the control a native <select> — full keyboard
        // and mobile behaviour for free.
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m4 6 4 4 4-4%22/%3E%3C/svg%3E')]",
        "bg-[position:right_0.65rem_center]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string | string[];
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, wired for screen readers. */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">
          {message}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
