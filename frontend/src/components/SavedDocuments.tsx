"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listDocuments, type DocumentSummary } from "@/lib/documents/savedApi";

import { buttonClass, ErrorBanner, Loading, pageTitleClass } from "./ui";

const formatSavedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

/** "My documents": every document the user has downloaded, newest first. */
export function SavedDocuments({ names }: { names: Record<string, string> }) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitleClass}>My documents</h1>
          <p className="mt-2 text-slate-600">Documents are saved here when you download them.</p>
        </div>
        <Link href="/create/" className={buttonClass.primary}>
          New document
        </Link>
      </header>

      {error && <ErrorBanner>Your documents couldn&apos;t be loaded. Please refresh the page.</ErrorBanner>}
      {!error && documents === null && <Loading />}
      {documents?.length === 0 && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-semibold text-indigo-950">No documents yet</h2>
          <p className="mt-1 text-sm text-slate-600">Draft an agreement with the assistant and download it to see it here.</p>
          <Link href="/create/" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            Create your first document →
          </Link>
        </section>
      )}
      {documents && documents.length > 0 && (
        <ul aria-label="Saved documents" className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/document/?id=${doc.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-slate-50"
              >
                <span>
                  <span className="block font-medium text-indigo-950">{doc.title}</span>
                  <span className="text-sm text-slate-500">{names[doc.documentId]}</span>
                </span>
                <span className="text-sm text-slate-500">{formatSavedAt(doc.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
