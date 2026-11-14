"use client";

import { useMemo, useState } from "react";

import type { DocumentSpec } from "@/lib/documents/catalog";
import type { DraftState } from "@/lib/documents/chatApi";
import { draftDocument, fitFields, type Catalog } from "@/lib/documents/draft";

import { DocumentChat } from "./DocumentChat";
import { DraftView } from "./DraftView";

/** AI chat + live preview + download for any supported agreement. */
export function DocumentCreator({ catalog }: { catalog: Catalog }) {
  const [draftState, setDraftState] = useState<DraftState>({ documentId: null, fields: null });
  const draft = useMemo(() => draftDocument(catalog, draftState), [catalog, draftState]);
  const updateDraft = (next: DraftState) => setDraftState({ documentId: next.documentId, fields: fitFields(next) });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <DocumentChat draft={draftState} onDraftChange={updateDraft} />

      <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-6">
        {draft ? <DraftView key={draft.spec.id} draft={draft} saveToHistory /> : <DocumentList specs={catalog.specs} />}
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
