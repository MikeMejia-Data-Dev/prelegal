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

/**
 * One numbered item of the Standard Terms, e.g. label "1.1", title "Access and Use.".
 * `depth` is the nesting level (0 for top-level sections).
 */
export interface Clause {
  label: string;
  title: string;
  body: Run[];
  depth: number;
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

/** A complete, filled-in agreement, consumed by the preview, PDF and DOCX renderers. */
export interface LegalDocument {
  title: string;
  introHeading: string;
  intro: Run[];
  coverFields: CoverField[];
  signingStatement: string;
  /** Column headings of the signature table, e.g. ["PARTY 1", "PARTY 2"] or ["PROVIDER", "CUSTOMER"]. */
  partyLabels: [string, string];
  partyRows: PartyRow[];
  coverAttribution: Run[];
  standardTerms: StandardTerms;
}
