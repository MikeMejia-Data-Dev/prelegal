"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

import type { NdaFormData, Party } from "@/lib/nda/types";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400";

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-rose-600" aria-hidden>*</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Choice between "N years" and an open-ended alternative.
 * `years` is null when the alternative is selected. An empty number input is
 * reported as NaN so validation can flag it.
 */
function TermChoice({
  name,
  legend,
  hint,
  before,
  after,
  otherLabel,
  years,
  onChange,
}: {
  name: string;
  legend: string;
  hint: string;
  before: string;
  after: string;
  otherLabel: string;
  years: number | null;
  onChange: (years: number | null) => void;
}) {
  // Remember the last year count so switching options back and forth keeps it.
  const [lastYears, setLastYears] = useState(years ?? 1);
  const yearsSelected = years !== null;

  function changeYears(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value === "" ? NaN : Number(e.target.value);
    setLastYears(value);
    onChange(value);
  }

  return (
    <div role="radiogroup" aria-label={legend}>
      <span className="text-sm font-medium text-slate-800">{legend}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      <div className="mt-2 space-y-2 text-sm text-slate-800">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={yearsSelected}
            onChange={() => onChange(lastYears)}
            className="accent-indigo-600"
          />
          {before && <span>{before}</span>}
          <input
            type="number"
            min={1}
            max={99}
            aria-label={`${legend} in years`}
            disabled={!yearsSelected}
            value={yearsSelected && !Number.isNaN(years) ? years : ""}
            onChange={changeYears}
            className={`${inputClass} w-20`}
          />
          <span>{after}</span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name={name}
            checked={!yearsSelected}
            onChange={() => onChange(null)}
            className="mt-0.5 accent-indigo-600"
          />
          <span>{otherLabel}</span>
        </label>
      </div>
    </div>
  );
}

function PartyFields({ label, party, onChange }: { label: string; party: Party; onChange: (party: Party) => void }) {
  const set = (key: keyof Party) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...party, [key]: e.target.value });

  return (
    <Section title={label}>
      <Field label="Company" required>
        <input className={inputClass} value={party.company} onChange={set("company")} placeholder="Acme, Inc." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Signer name">
          <input className={inputClass} value={party.name} onChange={set("name")} placeholder="Jane Doe" />
        </Field>
        <Field label="Signer title">
          <input className={inputClass} value={party.title} onChange={set("title")} placeholder="CEO" />
        </Field>
      </div>
      <Field label="Notice address" hint="Email or postal address for legal notices">
        <input
          className={inputClass}
          value={party.noticeAddress}
          onChange={set("noticeAddress")}
          placeholder="legal@acme.com"
        />
      </Field>
    </Section>
  );
}

/** Form for the Mutual NDA cover page fields and both parties. */
export function NdaForm({ value, onChange }: { value: NdaFormData; onChange: (value: NdaFormData) => void }) {
  const set = <K extends keyof NdaFormData>(key: K, v: NdaFormData[K]) => onChange({ ...value, [key]: v });
  const { mndaTerm, confidentialityTerm } = value;

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
      <Section title="Agreement terms">
        <Field label="Purpose" hint="How Confidential Information may be used" required>
          <textarea
            className={`${inputClass} min-h-20`}
            value={value.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </Field>

        <Field label="Effective Date" required>
          <input
            type="date"
            className={inputClass}
            value={value.effectiveDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </Field>

        <TermChoice
          name="mnda-term"
          legend="MNDA Term"
          hint="The length of this MNDA"
          before="Expires"
          after="year(s) from Effective Date"
          otherLabel="Continues until terminated in accordance with the terms of the MNDA"
          years={mndaTerm.kind === "expires" ? mndaTerm.years : null}
          onChange={(years) =>
            set("mndaTerm", years === null ? { kind: "untilTerminated" } : { kind: "expires", years })
          }
        />

        <TermChoice
          name="confidentiality-term"
          legend="Term of Confidentiality"
          hint="How long Confidential Information is protected (trade secrets stay protected while they remain trade secrets)"
          before=""
          after="year(s) from Effective Date"
          otherLabel="In perpetuity"
          years={confidentialityTerm.kind === "years" ? confidentialityTerm.years : null}
          onChange={(years) =>
            set("confidentialityTerm", years === null ? { kind: "perpetual" } : { kind: "years", years })
          }
        />
      </Section>

      <Section title="Governing law & jurisdiction">
        <Field label="Governing Law" hint="US state whose laws govern the MNDA" required>
          <input
            className={inputClass}
            value={value.governingLaw}
            onChange={(e) => set("governingLaw", e.target.value)}
            placeholder="Delaware"
          />
        </Field>
        <Field
          label="Jurisdiction"
          hint="City or county and state. The agreement reads “the federal or state courts located in …”"
          required
        >
          <input
            className={inputClass}
            value={value.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
            placeholder="New Castle, DE"
          />
        </Field>
        <Field label="MNDA Modifications" hint="Optional changes to the Standard Terms">
          <textarea
            className={`${inputClass} min-h-16`}
            value={value.modifications}
            onChange={(e) => set("modifications", e.target.value)}
            placeholder="None"
          />
        </Field>
      </Section>

      <PartyFields label="Party 1" party={value.party1} onChange={(p) => set("party1", p)} />
      <PartyFields label="Party 2" party={value.party2} onChange={(p) => set("party2", p)} />
    </form>
  );
}
