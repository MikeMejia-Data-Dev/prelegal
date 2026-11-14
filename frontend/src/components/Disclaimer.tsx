import { DRAFT_DISCLAIMER } from "@/lib/documents/coverPage";

/** The "draft, subject to legal review" notice shown next to every document. */
export function Disclaimer() {
  return (
    <p role="note" aria-label="Disclaimer" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 fill-amber-500" aria-hidden="true">
        <path d="M10 2 1 18h18L10 2zm0 5 .01 0L10 13zm-1 3h2v4H9v-4zm0 5h2v2H9v-2z" />
      </svg>
      <span>{DRAFT_DISCLAIMER}</span>
    </p>
  );
}
