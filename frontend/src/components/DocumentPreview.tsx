import { DRAFT_DISCLAIMER } from "@/lib/documents/coverPage";
import type { LegalDocument, Run } from "@/lib/documents/types";

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    if (run.href) {
      return (
        <a key={i} href={run.href} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
          {run.text}
        </a>
      );
    }
    if (run.term) {
      return (
        <span key={i} className="font-medium text-indigo-800" title="Defined on the Cover Page">
          {run.text}
        </span>
      );
    }
    return run.bold ? <strong key={i}>{run.text}</strong> : <span key={i}>{run.text}</span>;
  });
}

/** Paper-style rendering of the completed agreement. */
export function DocumentPreview({ doc }: { doc: LegalDocument }) {
  return (
    <article className="mx-auto max-w-[8.5in] space-y-10 bg-white px-6 py-10 font-serif text-[15px] leading-relaxed text-slate-900 shadow-lg ring-1 ring-slate-200 sm:px-14">
      <section aria-label="Cover Page" className="space-y-4">
        <h2 className="text-center text-2xl font-bold">{doc.title}</h2>
        {/* Mirrors the PDF and Word cover; the on-screen Disclaimer already announces it. */}
        <p aria-hidden="true" className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 font-sans text-xs text-amber-900">
          {DRAFT_DISCLAIMER}
        </p>
        <h3 className="pt-2 text-sm font-bold uppercase tracking-wide">{doc.introHeading}</h3>
        <p className="text-justify">
          <Runs runs={doc.intro} />
        </p>

        <dl className="space-y-4">
          {doc.coverFields.map((field) => (
            <div key={field.label}>
              <dt className="font-bold">{field.label}</dt>
              {field.description && <dd className="font-sans text-xs text-slate-500">{field.description}</dd>}
              <dd className={`whitespace-pre-line ${field.missing ? "rounded bg-amber-50 px-1 text-amber-700" : ""}`}>
                {field.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="pt-2">{doc.signingStatement}</p>

        <div className="overflow-x-auto">
          {/* Fixed layout so a long unbroken value (e.g. an email) wraps instead of stretching its column. */}
          <table className="w-full table-fixed border-collapse border border-slate-400 text-sm">
            <thead>
              <tr>
                <th className="w-1/4 border border-slate-400 p-2" />
                {doc.partyLabels.map((label) => (
                  <th key={label} className="border border-slate-400 p-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.partyRows.map((row) => (
                <tr key={row.label} className={row.handwritten ? "h-16" : "h-11"}>
                  <th scope="row" className="border border-slate-400 p-2 text-left align-top">
                    {row.label}
                    {row.description && (
                      <span className="block font-sans text-xs font-normal text-slate-500">{row.description}</span>
                    )}
                  </th>
                  <td className="border border-slate-400 p-2 align-top whitespace-pre-line [overflow-wrap:anywhere]">{row.party1}</td>
                  <td className="border border-slate-400 p-2 align-top whitespace-pre-line [overflow-wrap:anywhere]">{row.party2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="font-sans text-xs text-slate-500">
          <Runs runs={doc.coverAttribution} />
        </p>
      </section>

      <hr className="border-dashed border-slate-300" />

      <section aria-label="Standard Terms" className="space-y-4">
        <h2 className="text-center text-2xl font-bold">{doc.standardTerms.title}</h2>
        <ol className="space-y-3">
          {doc.standardTerms.clauses.map((clause, i) => (
            <li key={i} className="text-justify" style={{ marginLeft: `${clause.depth * 1.5}rem` }}>
              <strong>
                {clause.label} {clause.title}
              </strong>{" "}
              <Runs runs={clause.body} />
            </li>
          ))}
        </ol>
        <p className="font-sans text-xs text-slate-500">
          <Runs runs={doc.standardTerms.attribution} />
        </p>
      </section>
    </article>
  );
}
