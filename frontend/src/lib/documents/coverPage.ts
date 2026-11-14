import type { Party, PartyRow, Run } from "./types";

export const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

export const emptyParty = (): Party => ({ company: "", name: "", title: "", noticeAddress: "" });

/** The signature table rows shared by every Cover Page. */
export function partyRows(party1: Party, party2: Party): PartyRow[] {
  return [
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
  ];
}

/** "Common Paper <name> free to use under CC BY 4.0<suffix>". */
export function attribution(name: string, suffix: string): Run[] {
  return [
    { text: `Common Paper ${name} free to use under ` },
    { text: "CC BY 4.0", href: LICENSE_URL },
    { text: suffix },
  ];
}

// CC BY 4.0 requires indicating that the licensed material was modified.
export const COVER_PAGE_NOTICE = ". Cover Page completed using Prelegal; Standard Terms unmodified.";
