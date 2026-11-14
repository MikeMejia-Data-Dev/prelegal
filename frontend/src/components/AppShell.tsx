"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getSession, signOut } from "@/lib/auth";
import { LICENSE_URL } from "@/lib/documents/coverPage";

import { Logo } from "./Logo";

const NAV = [
  { href: "/create/", label: "New document" },
  { href: "/documents/", label: "My documents" },
];

/** A saved document (/document/) belongs to the My documents section. */
const isCurrent = (pathname: string, href: string) =>
  pathname === href || (href === "/documents/" && pathname.startsWith("/document/"));

/** Header, navigation and footer for signed-in pages; sends signed-out visitors to sign in. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  // An expired session is caught by the first API call (401), which signs out.
  useEffect(() => {
    const session = getSession();
    if (session) setEmail(session.email);
    else router.replace("/");
  }, [router]);

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  if (!email) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/create/" aria-label="Prelegal home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(pathname, href) ? "page" : undefined}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 aria-[current=page]:bg-indigo-50 aria-[current=page]:text-indigo-700"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-500 sm:px-6">
          Agreement text: Common Paper standard agreements, licensed under{" "}
          <a className="underline" href={LICENSE_URL} target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          . Prelegal is not a law firm and does not provide legal advice. Generated documents are drafts and are
          subject to legal review.
        </p>
      </footer>
    </div>
  );
}
