"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { authenticate, getSession } from "@/lib/auth";

import { Logo } from "./Logo";
import { buttonClass, ErrorBanner } from "./ui";

const input =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-600 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

const COPY = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to draft agreements and see your documents.",
    submit: "Sign in",
    busy: "Signing in…",
    switchText: "New to Prelegal?",
    switchLink: { href: "/signup/", label: "Create an account" },
    passwordAutocomplete: "current-password",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start drafting Common Paper agreements in minutes.",
    submit: "Create account",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchLink: { href: "/", label: "Sign in" },
    passwordAutocomplete: "new-password",
  },
};

const FEATURES = [
  "Chat with an AI assistant instead of filling in forms",
  "11 Common Paper standard agreements, from NDAs to cloud service agreements",
  "Download as PDF or Word and find your documents again later",
];

/** Sign-in or sign-up screen with a brand panel. */
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const copy = COPY[mode];
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/create/");
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const message = await authenticate(mode, String(form.get("email")), String(form.get("password")));
    if (message) {
      setError(message);
      setBusy(false);
    } else {
      router.push("/create/");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 p-12 text-white lg:flex">
        <Logo inverted />
        <div>
          <h2 className="text-3xl font-bold leading-tight">Legal agreements, drafted in a conversation.</h2>
          <ul className="mt-8 space-y-4 text-indigo-100">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-indigo-200">
          Prelegal is not a law firm. Generated documents are drafts and are subject to legal review.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-950">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{copy.subtitle}</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-slate-600">
              Email
              <input type="email" name="email" required autoComplete="email" className={input} />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Password
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete={copy.passwordAutocomplete}
                className={input}
              />
            </label>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <button type="submit" disabled={busy} className={`${buttonClass.submit} w-full`}>
              {busy ? copy.busy : copy.submit}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            {copy.switchText}{" "}
            <Link href={copy.switchLink.href} className="font-semibold text-indigo-600 hover:text-indigo-500">
              {copy.switchLink.label}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
