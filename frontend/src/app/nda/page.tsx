import type { Metadata } from "next";
import Link from "next/link";

import { NdaCreator } from "@/components/NdaCreator";
import { LICENSE_URL } from "@/lib/nda/buildNda";
import { loadStandardTerms } from "@/lib/nda/loadStandardTerms";

export const metadata: Metadata = { title: "Mutual NDA Creator | Prelegal" };

export default async function NdaPage() {
  // Read from templates/Mutual-NDA.md at build time.
  const standardTerms = await loadStandardTerms();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Prelegal</p>
          <Link href="/" className="text-sm text-slate-600 underline hover:text-indigo-600">
            Sign out
          </Link>
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-indigo-950">Mutual NDA Creator</h1>
        <p className="mt-2 text-slate-600">
          Chat with the AI assistant about your deal. It fills in the Common Paper Mutual Non-Disclosure
          Agreement as you talk, and you can download the completed agreement as a PDF or Word document.
        </p>
      </header>

      <NdaCreator standardTerms={standardTerms} />

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
        Agreement text: Common Paper Mutual NDA Version 1.0, licensed under{" "}
        <a className="underline" href={LICENSE_URL} target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Prelegal is not a law firm and this tool does not provide legal advice.
      </footer>
    </main>
  );
}
