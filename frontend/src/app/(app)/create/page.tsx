import type { Metadata } from "next";

import { DocumentCreator } from "@/components/DocumentCreator";
import { pageTitleClass } from "@/components/ui";
import { loadCatalog } from "@/lib/documents/loadCatalog";

export const metadata: Metadata = { title: "New document | Prelegal" };

export default function CreatePage() {
  // Read documents.json and templates/ at build time.
  const catalog = loadCatalog();

  return (
    <>
      <header className="mb-6 max-w-3xl">
        <h1 className={pageTitleClass}>New document</h1>
        <p className="mt-2 text-slate-600">
          Tell the assistant about your deal. It picks the right Common Paper agreement and fills it in as you talk.
        </p>
      </header>
      <DocumentCreator catalog={catalog} />
    </>
  );
}
