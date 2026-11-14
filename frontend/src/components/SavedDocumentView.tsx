"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { draftDocument, type Catalog } from "@/lib/documents/draft";
import { getDocument, type SavedDocument } from "@/lib/documents/savedApi";

import { DraftView } from "./DraftView";
import { ErrorBanner, Loading, pageTitleClass } from "./ui";

/** A saved document, rebuilt from its stored fields: preview and download again. */
export function SavedDocumentView({ catalog }: { catalog: Catalog }) {
  const id = useSearchParams().get("id") ?? "";
  const [saved, setSaved] = useState<SavedDocument | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDocument(id)
      .then(setSaved)
      .catch(() => setError(true));
  }, [id]);

  const draft = saved && draftDocument(catalog, { documentId: saved.documentId, fields: saved.fields });

  return (
    <>
      <Link href="/documents/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
        ← My documents
      </Link>
      <div className="mt-6">
        {error && <ErrorBanner>This document couldn&apos;t be found.</ErrorBanner>}
        {!error && !draft && <Loading />}
      </div>
      {saved && draft && (
        <>
          <h1 className={pageTitleClass}>{saved.title}</h1>
          <div className="mx-auto mt-6 max-w-5xl space-y-4">
            <DraftView draft={draft} />
          </div>
        </>
      )}
    </>
  );
}
