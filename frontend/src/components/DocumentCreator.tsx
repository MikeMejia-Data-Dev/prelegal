"use client";

import { useMemo, useState } from "react";

import type { DocumentSpec } from "@/lib/documents/catalog";
import type { DraftState } from "@/lib/documents/chatApi";
import { draftDocument, fitFields, type Catalog, type Draft } from "@/lib/documents/draft";
import { downloadDocument, type DownloadFormat } from "@/lib/export/download";
import { unsupportedPdfCharactersInDocument } from "@/lib/export/pdfText";

import { DocumentChat } from "./DocumentChat";
import { DocumentPreview } from "./DocumentPreview";

const FORMATS: { format: DownloadFormat; label: string }[] = [
  { format: "pdf", label: "Download PDF" },
  { format: "docx", label: "Download Word" },
];

/** AI chat + live preview + download for any supported agreement. */
export function DocumentCreator({ catalog }: { catalog: Catalog }) {
  const [draftState, setDraftState] = useState<DraftState>({ documentId: null, fields: null });
  const draft = useMemo(() => draftDocument(catalog, draftState), [catalog, draftState]);
  const updateDraft = (next: DraftState) => setDraftState({ documentId: next.documentId, fields: fitFields(next) });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <DocumentChat draft={draftState} onDraftChange={updateDraft} />

      <div className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pb-6">
        {draft ? <DraftView key={draft.spec.id} draft={draft} /> : <DocumentList specs={catalog.specs} />}
      </div>
    </div>
  );
}

/** The documents the assistant can draft, shown until one is chosen. */
function DocumentList({ specs }: { specs: DocumentSpec[] }) {
  return (
    <section aria-label="Supported documents" className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-indigo-950">Agreements Prelegal can draft</h2>
      <p className="mt-1 text-sm text-slate-600">Tell the assistant what you need; your draft will appear here.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {specs.map((spec) => (
          <li key={spec.id} className="rounded-md border border-slate-200 p-3">
            <p className="text-sm font-semibold text-indigo-950">{spec.name}</p>
            <p className="mt-1 text-xs text-slate-600">{spec.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Download toolbar and live preview of the chosen document. */
function DraftView({ draft }: { draft: Draft }) {
  const [busy, setBusy] = useState<DownloadFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { doc, errors } = draft;

  const canDownload = errors.length === 0 && busy === null;
  // The PDF font cannot draw every script (e.g. CJK, Arabic, emoji); rather
  // than produce a garbled agreement, block the PDF and point to Word.
  const pdfUnsupported = useMemo(() => unsupportedPdfCharactersInDocument(doc), [doc]);
  const isEnabled = (format: DownloadFormat) => canDownload && !(format === "pdf" && pdfUnsupported.length > 0);

  async function handleDownload(format: DownloadFormat) {
    setBusy(format);
    setDownloadError(null);
    try {
      await downloadDocument(doc, format, draft.fileName(format));
    } catch (error) {
      console.error(error);
      setDownloadError("Something went wrong while generating the document. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {FORMATS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            onClick={() => handleDownload(format)}
            disabled={!isEnabled(format)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy === format ? "Preparing…" : label}
          </button>
        ))}
        {errors.length > 0 && (
          <div className="w-full text-sm text-amber-700" role="status">
            <p className="font-medium">Complete these fields to download:</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {pdfUnsupported.length > 0 && (
          <p className="w-full text-sm text-amber-700" role="note">
            The PDF can&apos;t display these characters: {pdfUnsupported.join(" ")}. Download the Word document
            instead, or replace them.
          </p>
        )}
        {downloadError && (
          <p className="w-full text-sm text-rose-600" role="alert">
            {downloadError}
          </p>
        )}
      </div>

      <DocumentPreview doc={doc} />
    </>
  );
}
