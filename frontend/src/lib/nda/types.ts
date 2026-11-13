/** Values the user enters in the Mutual NDA form. */
export interface Party {
  company: string;
  name: string;
  title: string;
  noticeAddress: string;
}

export type MndaTerm =
  | { kind: "expires"; years: number }
  | { kind: "untilTerminated" };

export type ConfidentialityTerm =
  | { kind: "years"; years: number }
  | { kind: "perpetual" };

export interface NdaFormData {
  purpose: string;
  /** ISO date string, yyyy-mm-dd. */
  effectiveDate: string;
  mndaTerm: MndaTerm;
  confidentialityTerm: ConfidentialityTerm;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
}

/**
 * A piece of inline text. `bold` marks a defined term or heading,
 * `term` marks a reference to a Cover Page term (e.g. "Purpose"),
 * `href` marks a link.
 */
export interface Run {
  text: string;
  bold?: boolean;
  term?: boolean;
  href?: string;
}

/** One numbered clause of the Standard Terms. */
export interface Clause {
  number: number;
  title: string;
  body: Run[];
}

export interface StandardTerms {
  title: string;
  clauses: Clause[];
  attribution: Run[];
}

/** A labelled field on the Cover Page, with the user's value filled in. */
export interface CoverField {
  label: string;
  description?: string;
  /** The filled-in value, or a bracketed placeholder when `missing`. */
  value: string;
  missing: boolean;
}

export interface PartyRow {
  label: string;
  description?: string;
  party1: string;
  party2: string;
  /** Left blank to be completed by hand (signature, date), so rendered taller. */
  handwritten?: boolean;
}

/** The complete, filled-in NDA, consumed by the preview, PDF and DOCX renderers. */
export interface NdaDocument {
  title: string;
  intro: Run[];
  coverFields: CoverField[];
  signingStatement: string;
  partyRows: PartyRow[];
  coverAttribution: Run[];
  standardTerms: StandardTerms;
}
