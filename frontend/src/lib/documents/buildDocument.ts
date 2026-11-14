import { LICENSE_URL } from "@/lib/nda/buildNda";

import { keyTermValue, type DocumentSpec, type GenericFields } from "./catalog";
import type { Template } from "./parseTemplate";
import type { CoverField, LegalDocument, Run } from "./types";

const STANDARDS_URL = "https://commonpaper.com/standards";

function coverField(spec: DocumentSpec["keyTerms"][number], fields: GenericFields): CoverField {
  const value = keyTermValue(fields, spec.key);
  if (value) return { label: spec.label, description: spec.description, value, missing: false };
  if (spec.required) return { label: spec.label, description: spec.description, value: `[${spec.label}]`, missing: true };
  return { label: spec.label, description: spec.description, value: "Not specified.", missing: false };
}

function attribution(spec: DocumentSpec, suffix: string): Run[] {
  return [
    { text: `Common Paper ${spec.name} free to use under ` },
    { text: "CC BY 4.0", href: LICENSE_URL },
    { text: suffix },
  ];
}

/**
 * Fill a Key Terms cover page for any Common Paper agreement in documents.json
 * and attach its unmodified Standard Terms.
 */
export function buildDocument(spec: DocumentSpec, fields: GenericFields, template: Template): LegalDocument {
  const { party1, party2 } = fields;
  return {
    title: spec.name,
    introHeading: `Using this ${spec.name}`,
    intro: [
      { text: `This ${spec.name} consists of: (1) this Cover Page (“` },
      { text: "Cover Page", bold: true },
      { text: `”) and (2) the Common Paper ${template.title} Standard Terms (“` },
      { text: "Standard Terms", bold: true },
      { text: "”) identical to those posted at " },
      { text: "commonpaper.com/standards", href: STANDARDS_URL },
      {
        text: ". Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.",
      },
    ],
    coverFields: spec.keyTerms.map((term) => coverField(term, fields)),
    signingStatement: `By signing this Cover Page, each party agrees to enter into this ${spec.name}.`,
    partyLabels: [spec.parties[0].toUpperCase(), spec.parties[1].toUpperCase()],
    partyRows: [
      { label: "Signature", party1: "", party2: "", handwritten: true },
      { label: "Print Name", party1: party1.name.trim(), party2: party2.name.trim() },
      { label: "Title", party1: party1.title.trim(), party2: party2.title.trim() },
      { label: "Company", party1: party1.company.trim(), party2: party2.company.trim() },
      {
        label: "Notice Address",
        description: "Use either email or postal address",
        party1: party1.noticeAddress.trim(),
        party2: party2.noticeAddress.trim(),
      },
      { label: "Date", party1: "", party2: "", handwritten: true },
    ],
    coverAttribution: attribution(spec, ". Cover Page completed using Prelegal; Standard Terms unmodified."),
    standardTerms: { title: "Standard Terms", clauses: template.clauses, attribution: attribution(spec, ".") },
  };
}

/** Human-readable problems that block download; empty when the document is complete. */
export function validateDocument(spec: DocumentSpec, fields: GenericFields): string[] {
  const errors = spec.keyTerms
    .filter((term) => term.required && !keyTermValue(fields, term.key))
    .map((term) => `${term.label} is required.`);
  [fields.party1, fields.party2].forEach((party, i) => {
    if (!party.company.trim()) errors.push(`${spec.parties[i]} company is required.`);
  });
  return errors;
}
