import type { Metadata } from "next";
import { Suspense } from "react";

import { SavedDocumentView } from "@/components/SavedDocumentView";
import { loadCatalog } from "@/lib/documents/loadCatalog";

export const metadata: Metadata = { title: "Document | Prelegal" };

/** A saved document, opened from "My documents" as /document/?id=<id>. */
export default function DocumentPage() {
  const catalog = loadCatalog();
  return (
    <Suspense>
      <SavedDocumentView catalog={catalog} />
    </Suspense>
  );
}
