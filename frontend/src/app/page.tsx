"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

const input =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

/** Fake sign-in: no authentication yet, any input enters the platform. */
export default function LoginPage() {
  const router = useRouter();

  function signIn(event: FormEvent) {
    event.preventDefault();
    router.push("/nda/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Prelegal</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-indigo-950">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Draft common legal agreements in minutes.</p>
        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-600">
            Email
            <input type="email" name="email" autoComplete="email" className={input} />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Password
            <input type="password" name="password" autoComplete="current-password" className={input} />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
