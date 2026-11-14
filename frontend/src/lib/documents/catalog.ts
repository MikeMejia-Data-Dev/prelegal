import type { Party } from "./types";

/** A fill-in term on a document's cover page, from documents.json. */
export interface KeyTermSpec {
  key: string;
  label: string;
  description?: string;
  required: boolean;
}

/** One supported agreement, from documents.json at the repository root. */
export interface DocumentSpec {
  id: string;
  name: string;
  shortName: string;
  description: string;
  template: string;
  parties: [string, string];
  keyTerms: KeyTermSpec[];
}

export const NDA_ID = "mutual-nda";

/** Values the AI fills in for any document other than the Mutual NDA. */
export interface GenericFields {
  keyTerms: { key: string; value: string }[];
  party1: Party;
  party2: Party;
}

const emptyParty = (): Party => ({ company: "", name: "", title: "", noticeAddress: "" });

export function emptyGenericFields(): GenericFields {
  return { keyTerms: [], party1: emptyParty(), party2: emptyParty() };
}

/** The trimmed value of a key term, or "" if the AI has not filled it in. */
export function keyTermValue(fields: GenericFields, key: string): string {
  return fields.keyTerms.find((t) => t.key === key)?.value.trim() ?? "";
}
