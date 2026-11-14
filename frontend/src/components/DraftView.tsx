"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { documentTitle, type Draft } from "@/lib/documents/draft";
import { saveDocument } from "@/lib/documents/savedApi";
import { downloadDocument, type DownloadFormat } from "@/lib/export/download";
import { unsupportedPdfCharactersInDocument } from "@/lib/export/pdfText";

import { Disclaimer } from "./Disclaimer";
import { DocumentPreview } from "./DocumentPreview";

const FORMATS: { format: DownloadFormat; label: string }[] = [
  { format: "pdf", label: "Download PDF" },
  { format: "docx", label: "Download Word" },
];

/**
 * Download toolbar, disclaimer and live preview of a document. With
 * `saveToHistory`, each download also saves the document to "My documents"
 * (unless it is unchanged since the last save).
 */
export function DraftView({ draft, saveToHistory = false }: { draft: Draft; saveToHistory?: boolean }) {
  const [busy, setBusy] = useState<DownloadFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saved" | "failed" | null>(null);
  const lastSaved = useRef<string | null>(null);
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
      setBusy(null);
      return;
    }
    if (saveToHistory) await save();
    setBusy(null);
  }

  async function save() {
    const snapshot = JSON.stringify(draft.fields);
    if (snapshot === lastSaved.current) return;
    try {
      await saveDocument(draft.spec.id, documentTitle(draft), draft.fields);
      lastSaved.current = snapshot;
      setSaved("saved");
    } catch (error) {
      console.error(error);
      setSaved("failed");
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
        {saved === "saved" && (
          <p className="w-full text-sm text-teal-700" role="status">
            Saved to{" "}
            <Link href="/documents/" className="font-semibold underline">
              My documents
            </Link>
            .
          </p>
        )}
        {saved === "failed" && (
          <p className="w-full text-sm text-rose-600" role="alert">
            Downloaded, but it couldn&apos;t be saved to My documents.
          </p>
        )}
      </div>

      <Disclaimer />
      <DocumentPreview doc={doc} />
    </>
  );
}
