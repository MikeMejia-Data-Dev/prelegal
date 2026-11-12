import type { NdaDocument, Run } from "@/lib/nda/types";

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

/** Paper-style rendering of the completed NDA. */
export function NdaPreview({ nda }: { nda: NdaDocument }) {
  return (
    <article className="mx-auto max-w-[8.5in] space-y-10 bg-white px-6 py-10 font-serif text-[15px] leading-relaxed text-slate-900 shadow-lg ring-1 ring-slate-200 sm:px-14">
      <section aria-label="Cover Page" className="space-y-4">
        <h2 className="text-center text-2xl font-bold">{nda.title}</h2>
        <h3 className="pt-2 text-sm font-bold uppercase tracking-wide">Using this Mutual Non-Disclosure Agreement</h3>
        <p className="text-justify">
          <Runs runs={nda.intro} />
        </p>

        <dl className="space-y-4">
          {nda.coverFields.map((field) => (
            <div key={field.label}>
              <dt className="font-bold">{field.label}</dt>
              {field.description && <dd className="font-sans text-xs text-slate-500">{field.description}</dd>}
              <dd className={field.missing ? "rounded bg-amber-50 px-1 text-amber-700" : undefined}>{field.value}</dd>
            </div>
          ))}
        </dl>

        <p className="pt-2">{nda.signingStatement}</p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400 text-sm">
            <thead>
              <tr>
                <th className="w-1/4 border border-slate-400 p-2" />
                <th className="border border-slate-400 p-2">PARTY 1</th>
                <th className="border border-slate-400 p-2">PARTY 2</th>
              </tr>
            </thead>
            <tbody>
              {nda.partyRows.map((row) => (
                <tr key={row.label} className={row.handwritten ? "h-16" : "h-11"}>
                  <th scope="row" className="border border-slate-400 p-2 text-left align-top">
                    {row.label}
                    {row.description && (
                      <span className="block font-sans text-xs font-normal text-slate-500">{row.description}</span>
                    )}
                  </th>
                  <td className="border border-slate-400 p-2 align-top break-words">{row.party1}</td>
                  <td className="border border-slate-400 p-2 align-top break-words">{row.party2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="font-sans text-xs text-slate-500">
          <Runs runs={nda.coverAttribution} />
        </p>
      </section>

      <hr className="border-dashed border-slate-300" />

      <section aria-label="Standard Terms" className="space-y-4">
        <h2 className="text-center text-2xl font-bold">{nda.standardTerms.title}</h2>
        <ol className="space-y-3">
          {nda.standardTerms.clauses.map((clause) => (
            <li key={clause.number} className="text-justify">
              <strong>
                {clause.number}. {clause.title}.
              </strong>{" "}
              <Runs runs={clause.body} />
            </li>
          ))}
        </ol>
        <p className="font-sans text-xs text-slate-500">
          <Runs runs={nda.standardTerms.attribution} />
        </p>
      </section>
    </article>
  );
}
