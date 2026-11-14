import type { Metadata } from "next";
import Link from "next/link";

import { DocumentCreator } from "@/components/DocumentCreator";
import { loadCatalog } from "@/lib/documents/loadCatalog";
import { LICENSE_URL } from "@/lib/nda/buildNda";

export const metadata: Metadata = { title: "Agreement Creator | Prelegal" };

export default async function CreatePage() {
  // Read documents.json and templates/ at build time.
  const catalog = await loadCatalog();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Prelegal</p>
          <Link href="/" className="text-sm text-slate-600 underline hover:text-indigo-600">
            Sign out
          </Link>
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-indigo-950">Agreement Creator</h1>
        <p className="mt-2 text-slate-600">
          Chat with the AI assistant about your deal. It picks the right Common Paper agreement, fills it
          in as you talk, and you can download the completed agreement as a PDF or Word document.
        </p>
      </header>

      <DocumentCreator catalog={catalog} />

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
        Agreement text: Common Paper standard agreements, licensed under{" "}
        <a className="underline" href={LICENSE_URL} target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Prelegal is not a law firm and this tool does not provide legal advice.
      </footer>
    </main>
  );
}
