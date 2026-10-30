import type { ReactNode } from "react";

export const inputClass =
  "h-9 w-full rounded-ui border border-border bg-white px-3 py-2 text-sm leading-5 text-strong placeholder:text-placeholder outline-none focus:border-primary";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-5 text-label">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs leading-4 text-error">
          {error}
        </p>
      )}
    </div>
  );
}
