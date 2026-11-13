"use client";

import { useEffect, useMemo, useState } from "react";

import { buildNda, defaultFormData, ndaFileName, todayIso, validate } from "@/lib/nda/buildNda";
import { downloadNda, type DownloadFormat } from "@/lib/nda/export/download";
import { unsupportedPdfCharactersInForm } from "@/lib/nda/export/pdfText";
import type { NdaFormData, StandardTerms } from "@/lib/nda/types";

import { NdaForm } from "./NdaForm";
import { NdaPreview } from "./NdaPreview";

const FORMATS: { format: DownloadFormat; label: string }[] = [
  { format: "pdf", label: "Download PDF" },
  { format: "docx", label: "Download Word" },
];

/** Form + live preview + download for the Mutual NDA. */
export function NdaCreator({ standardTerms }: { standardTerms: StandardTerms }) {
  // The page is pre-rendered, so the effective date starts empty and is set
  // to the visitor's local "today" after mount to avoid a hydration mismatch.
  const [form, setForm] = useState<NdaFormData>(() => ({ ...defaultFormData(), effectiveDate: "" }));
  const [busy, setBusy] = useState<DownloadFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setForm((f) => (f.effectiveDate ? f : { ...f, effectiveDate: todayIso() }));
  }, []);

  const nda = useMemo(() => buildNda(form, standardTerms), [form, standardTerms]);
  const errors = useMemo(() => validate(form), [form]);
  const canDownload = errors.length === 0 && busy === null;
  // The PDF font cannot draw every script (e.g. CJK, Arabic, emoji); rather
  // than produce a garbled agreement, block the PDF and point to Word.
  const pdfUnsupported = useMemo(() => unsupportedPdfCharactersInForm(form), [form]);
  const isEnabled = (format: DownloadFormat) =>
    canDownload && !(format === "pdf" && pdfUnsupported.length > 0);

  async function handleDownload(format: DownloadFormat) {
    setBusy(format);
    setDownloadError(null);
    try {
      await downloadNda(nda, format, ndaFileName(form, format));
    } catch (error) {
      console.error(error);
      setDownloadError("Something went wrong while generating the document. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <NdaForm value={form} onChange={setForm} />

      <div className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pb-6">
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
              The PDF can&apos;t display these characters: {pdfUnsupported.join(" ")}. Download the Word
              document instead, or replace them.
            </p>
          )}
          {downloadError && (
            <p className="w-full text-sm text-rose-600" role="alert">
              {downloadError}
            </p>
          )}
        </div>

        <NdaPreview nda={nda} />
      </div>
    </div>
  );
}
