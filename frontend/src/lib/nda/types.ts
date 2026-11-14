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
