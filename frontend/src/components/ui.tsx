import type { ReactNode } from "react";

/** Shared styles: indigo for primary actions, teal for form submits (see CLAUDE.md colors). */
export const buttonClass = {
  primary:
    "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300",
  submit:
    "rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300",
};

export const pageTitleClass = "text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl";

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {children}
    </p>
  );
}

export function Loading() {
  return (
    <p role="status" className="text-sm text-slate-500">
      Loading…
    </p>
  );
}
