import type { Metadata } from "next";

import { SavedDocuments } from "@/components/SavedDocuments";
import { loadCatalog } from "@/lib/documents/loadCatalog";

export const metadata: Metadata = { title: "My documents | Prelegal" };

export default function DocumentsPage() {
  const { specs } = loadCatalog();
  return <SavedDocuments names={Object.fromEntries(specs.map((s) => [s.id, s.name]))} />;
}
