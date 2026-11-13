import type {
  CoverField,
  NdaDocument,
  NdaFormData,
  Party,
  StandardTerms,
} from "./types";

export const STANDARD_TERMS_URL = "https://commonpaper.com/standards/mutual-nda/1.0";
export const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

const emptyParty = (): Party => ({ company: "", name: "", title: "", noticeAddress: "" });

/** Today's date as yyyy-mm-dd in the user's local time zone. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Initial form values, matching the defaults in the Common Paper cover page. */
export function defaultFormData(now: Date = new Date()): NdaFormData {
  return {
    purpose: DEFAULT_PURPOSE,
    effectiveDate: todayIso(now),
    mndaTerm: { kind: "expires", years: 1 },
    confidentialityTerm: { kind: "years", years: 1 },
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    party1: emptyParty(),
    party2: emptyParty(),
  };
}

// Rejects partially typed years such as "0026" from the browser date input.
const MIN_YEAR = 1900;

/** "2026-11-12" -> "November 12, 2026". Returns "" for an invalid date. */
export function formatDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, y, m, d] = match.map(Number);
  if (y < MIN_YEAR) return "";
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const isValidYears = (years: number) => Number.isInteger(years) && years >= 1 && years <= 99;

const pluralYears = (years: number) => `${years} year${years === 1 ? "" : "s"}`;

/** Human-readable list of problems that prevent the NDA from being completed. */
export function validate(form: NdaFormData): string[] {
  const errors: string[] = [];
  if (!form.purpose.trim()) errors.push("Purpose is required.");
  if (!formatDate(form.effectiveDate)) errors.push("Effective Date must be a valid date.");
  if (form.mndaTerm.kind === "expires" && !isValidYears(form.mndaTerm.years)) {
    errors.push("MNDA Term must be a whole number of years between 1 and 99.");
  }
  if (form.confidentialityTerm.kind === "years" && !isValidYears(form.confidentialityTerm.years)) {
    errors.push("Term of Confidentiality must be a whole number of years between 1 and 99.");
  }
  if (!form.governingLaw.trim()) errors.push("Governing Law (state) is required.");
  if (!form.jurisdiction.trim()) errors.push("Jurisdiction is required.");
  if (!form.party1.company.trim()) errors.push("Party 1 company is required.");
  if (!form.party2.company.trim()) errors.push("Party 2 company is required.");
  return errors;
}

function coverField(label: string, value: string, description?: string): CoverField {
  const trimmed = value.trim();
  return {
    label,
    description,
    value: trimmed || `[${label}]`,
    missing: !trimmed,
  };
}

function mndaTermText(form: NdaFormData): string {
  if (form.mndaTerm.kind === "untilTerminated") {
    return "Continues until terminated in accordance with the terms of the MNDA.";
  }
  return isValidYears(form.mndaTerm.years)
    ? `Expires ${pluralYears(form.mndaTerm.years)} from Effective Date.`
    : "";
}

function confidentialityTermText(form: NdaFormData): string {
  if (form.confidentialityTerm.kind === "perpetual") return "In perpetuity.";
  return isValidYears(form.confidentialityTerm.years)
    ? `${pluralYears(form.confidentialityTerm.years)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : "";
}

/**
 * Fill the Common Paper Mutual NDA cover page with the user's values and
 * attach the Standard Terms. Missing required values become bracketed
 * placeholders so the preview always renders.
 */
export function buildNda(form: NdaFormData, standardTerms: StandardTerms): NdaDocument {
  const { party1, party2 } = form;

  return {
    title: "Mutual Non-Disclosure Agreement",
    intro: [
      { text: "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“" },
      { text: "Cover Page", bold: true },
      { text: "”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“" },
      { text: "Standard Terms", bold: true },
      { text: "”) identical to those posted at " },
      { text: "commonpaper.com/standards/mutual-nda/1.0", href: STANDARD_TERMS_URL },
      {
        text: ". Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.",
      },
    ],
    coverFields: [
      coverField("Purpose", form.purpose, "How Confidential Information may be used"),
      coverField("Effective Date", formatDate(form.effectiveDate)),
      coverField("MNDA Term", mndaTermText(form), "The length of this MNDA"),
      coverField(
        "Term of Confidentiality",
        confidentialityTermText(form),
        "How long Confidential Information is protected",
      ),
      coverField("Governing Law", form.governingLaw),
      coverField("Jurisdiction", form.jurisdiction),
      {
        label: "MNDA Modifications",
        value: form.modifications.trim() || "None.",
        missing: false,
      },
    ],
    signingStatement:
      "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.",
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
    coverAttribution: [
      { text: "Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under " },
      { text: "CC BY 4.0", href: LICENSE_URL },
      // CC BY 4.0 requires indicating that the licensed material was modified.
      { text: ". Cover Page completed using Prelegal; Standard Terms unmodified." },
    ],
    standardTerms,
  };
}

// Letters that Unicode normalization does not reduce to ASCII.
const TRANSLITERATE: Record<string, string> = {
  Ł: "L", ł: "l", Ø: "O", ø: "o", Đ: "D", đ: "d", Æ: "AE", æ: "ae", Œ: "OE", œ: "oe", ß: "ss", Þ: "Th", þ: "th",
};

/** Download file name, e.g. "Mutual-NDA-Acme-Inc-Globex.pdf"; accents are dropped ("Łódź" -> "Lodz"). */
export function ndaFileName(form: NdaFormData, extension: "pdf" | "docx"): string {
  const slug = (s: string) =>
    s
      .trim()
      .replace(/[ŁłØøĐđÆæŒœßÞþ]/g, (c) => TRANSLITERATE[c])
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const parts = ["Mutual-NDA", slug(form.party1.company), slug(form.party2.company)].filter(Boolean);
  return `${parts.join("-")}.${extension}`;
}
