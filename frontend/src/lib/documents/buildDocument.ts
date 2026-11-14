import { keyTermValue, type DocumentSpec, type GenericFields, type KeyTermSpec } from "./catalog";
import { attribution, COVER_PAGE_NOTICE, partyRows } from "./coverPage";
import type { Template } from "./parseTemplate";
import type { CoverField, LegalDocument } from "./types";

const STANDARDS_URL = "https://commonpaper.com/standards";

function keyTermField(term: KeyTermSpec, fields: GenericFields): CoverField {
  const value = keyTermValue(fields, term.key);
  const placeholder = term.required ? `[${term.label}]` : "Not specified.";
  return { label: term.label, description: term.description, value: value || placeholder, missing: !value && term.required };
}

/**
 * Fill a Key Terms cover page for any Common Paper agreement in documents.json
 * and attach its unmodified Standard Terms.
 */
export function buildDocument(spec: DocumentSpec, fields: GenericFields, template: Template): LegalDocument {
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
    coverFields: spec.keyTerms.map((term) => keyTermField(term, fields)),
    signingStatement: `By signing this Cover Page, each party agrees to enter into this ${spec.name}.`,
    partyLabels: [spec.parties[0].toUpperCase(), spec.parties[1].toUpperCase()],
    partyRows: partyRows(fields.party1, fields.party2),
    coverAttribution: attribution(spec.name, COVER_PAGE_NOTICE),
    standardTerms: { title: "Standard Terms", clauses: template.clauses, attribution: attribution(spec.name, ".") },
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
