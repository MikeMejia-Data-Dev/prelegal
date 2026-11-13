import { describe, expect, it } from "vitest";

import { buildNda, defaultFormData, formatDate, ndaFileName, todayIso, validate } from "./buildNda";
import type { NdaFormData, StandardTerms } from "./types";

const TERMS: StandardTerms = { title: "Standard Terms", clauses: [], attribution: [] };

function completeForm(overrides: Partial<NdaFormData> = {}): NdaFormData {
  return {
    ...defaultFormData(new Date(2026, 10, 12)),
    governingLaw: "Delaware",
    jurisdiction: "New Castle, DE",
    party1: { company: "Acme, Inc.", name: "Ada Lovelace", title: "CEO", noticeAddress: "ada@acme.test" },
    party2: { company: "Globex", name: "Hank Scorpio", title: "CTO", noticeAddress: "hank@globex.test" },
    ...overrides,
  };
}

const field = (form: NdaFormData, label: string) =>
  buildNda(form, TERMS).coverFields.find((f) => f.label === label)!;

describe("formatDate edge cases", () => {
  it.each([
    ["2024-02-29", "February 29, 2024"], // leap day
    ["2000-02-29", "February 29, 2000"], // divisible-by-400 leap year
    ["1900-01-01", "January 1, 1900"], // lower bound
    ["2026-12-31", "December 31, 2026"],
    ["2099-01-01", "January 1, 2099"],
  ])("formats %s", (iso, expected) => {
    expect(formatDate(iso)).toBe(expected);
  });

  it.each([
    "2023-02-29", // not a leap year
    "1900-02-29", // century, not a leap year
    "2026-13-01",
    "2026-00-10",
    "2026-04-31",
    "2026-01-00",
    "1899-12-31", // below MIN_YEAR
    "2026-1-5", // not zero padded
    "26-11-12",
    "2026/11/12",
    " 2026-11-12",
    "2026-11-12T00:00",
    "November 12, 2026",
    "abcd-ef-gh",
  ])("rejects %j", (iso) => {
    expect(formatDate(iso)).toBe("");
  });

  it("does not shift the date across time zones", () => {
    // Date-only strings parsed as UTC would render as the previous day west of UTC.
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("pads single-digit months and days in todayIso", () => {
    expect(todayIso(new Date(2026, 8, 9))).toBe("2026-09-09");
    expect(todayIso(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("validate edge cases", () => {
  it("treats whitespace-only text as missing", () => {
    const form = completeForm({
      purpose: "   ",
      governingLaw: "\t",
      jurisdiction: "\n",
      party1: { company: "  ", name: "", title: "", noticeAddress: "" },
      party2: { company: " ", name: "", title: "", noticeAddress: "" },
    });
    expect(validate(form)).toEqual([
      "Purpose is required.",
      "Governing Law (state) is required.",
      "Jurisdiction is required.",
      "Party 1 company is required.",
      "Party 2 company is required.",
    ]);
  });

  it("reports an empty effective date (the pre-hydration state)", () => {
    expect(validate(completeForm({ effectiveDate: "" }))).toEqual(["Effective Date must be a valid date."]);
  });

  it.each([1, 2, 50, 99])("accepts %i years for both terms", (years) => {
    const form = completeForm({
      mndaTerm: { kind: "expires", years },
      confidentialityTerm: { kind: "years", years },
    });
    expect(validate(form)).toEqual([]);
  });

  it.each([0, -1, 100, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects %d years", (years) => {
    const form = completeForm({
      mndaTerm: { kind: "expires", years },
      confidentialityTerm: { kind: "years", years },
    });
    expect(validate(form)).toEqual([
      "MNDA Term must be a whole number of years between 1 and 99.",
      "Term of Confidentiality must be a whole number of years between 1 and 99.",
    ]);
  });

  it("ignores the year count when the open-ended option is selected", () => {
    const form = completeForm({ mndaTerm: { kind: "untilTerminated" }, confidentialityTerm: { kind: "perpetual" } });
    expect(validate(form)).toEqual([]);
  });

  it("does not require optional fields (signers, notice addresses, modifications)", () => {
    const form = completeForm({
      modifications: "",
      party1: { company: "Acme", name: "", title: "", noticeAddress: "" },
      party2: { company: "Globex", name: "", title: "", noticeAddress: "" },
    });
    expect(validate(form)).toEqual([]);
  });

  it("does not mutate its input", () => {
    const form = completeForm();
    const snapshot = structuredClone(form);
    validate(form);
    buildNda(form, TERMS);
    expect(form).toEqual(snapshot);
  });
});

describe("buildNda edge cases", () => {
  it("trims user values on the cover page and in the party table", () => {
    const form = completeForm({
      purpose: "  Evaluate a deal.  ",
      governingLaw: " Delaware ",
      party1: { company: " Acme ", name: " Ada ", title: " CEO ", noticeAddress: " a@acme.test " },
    });
    const nda = buildNda(form, TERMS);
    expect(field(form, "Purpose").value).toBe("Evaluate a deal.");
    expect(field(form, "Governing Law").value).toBe("Delaware");
    const company = nda.partyRows.find((r) => r.label === "Company")!;
    expect(company.party1).toBe("Acme");
    expect(nda.partyRows.find((r) => r.label === "Notice Address")!.party1).toBe("a@acme.test");
  });

  it("uses placeholders for invalid dates and year counts", () => {
    const form = completeForm({
      effectiveDate: "2026-02-30",
      mndaTerm: { kind: "expires", years: Number.NaN },
      confidentialityTerm: { kind: "years", years: 0 },
    });
    expect(field(form, "Effective Date")).toMatchObject({ value: "[Effective Date]", missing: true });
    expect(field(form, "MNDA Term")).toMatchObject({ value: "[MNDA Term]", missing: true });
    expect(field(form, "Term of Confidentiality")).toMatchObject({
      value: "[Term of Confidentiality]",
      missing: true,
    });
  });

  it("marks every required cover field missing for an empty form, but never Modifications", () => {
    const form = { ...defaultFormData(new Date(2026, 0, 1)), purpose: "", effectiveDate: "" };
    const missing = buildNda(form, TERMS)
      .coverFields.filter((f) => f.missing)
      .map((f) => f.label);
    expect(missing).toEqual(["Purpose", "Effective Date", "Governing Law", "Jurisdiction"]);
    expect(field(form, "MNDA Modifications")).toMatchObject({ value: "None.", missing: false });
  });

  it("includes user modifications verbatim (trimmed), preserving line breaks", () => {
    const form = completeForm({ modifications: "\nSection 5 is deleted.\nSection 9 venue is Austin, TX.\n" });
    expect(field(form, "MNDA Modifications").value).toBe("Section 5 is deleted.\nSection 9 venue is Austin, TX.");
  });

  it("passes markup-like user input through as plain text (rendered escaped downstream)", () => {
    const evil = '<script>alert(1)</script> **bold** [x](javascript:alert(1))';
    const form = completeForm({ purpose: evil, party1: { ...completeForm().party1, company: evil } });
    const nda = buildNda(form, TERMS);
    expect(field(form, "Purpose").value).toBe(evil);
    // User input must never become a link target.
    const hrefs = [...nda.intro, ...nda.coverAttribution].map((r) => r.href).filter(Boolean);
    expect(hrefs.every((h) => h!.startsWith("https://"))).toBe(true);
  });

  it("keeps cover fields in the Common Paper order", () => {
    expect(buildNda(completeForm(), TERMS).coverFields.map((f) => f.label)).toEqual([
      "Purpose",
      "Effective Date",
      "MNDA Term",
      "Term of Confidentiality",
      "Governing Law",
      "Jurisdiction",
      "MNDA Modifications",
    ]);
  });

  it("keeps party rows in the Common Paper order", () => {
    expect(buildNda(completeForm(), TERMS).partyRows.map((r) => r.label)).toEqual([
      "Signature",
      "Print Name",
      "Title",
      "Company",
      "Notice Address",
      "Date",
    ]);
  });

  it("uses singular and plural years correctly", () => {
    const one = completeForm({ confidentialityTerm: { kind: "years", years: 1 } });
    const many = completeForm({ mndaTerm: { kind: "expires", years: 99 }, confidentialityTerm: { kind: "years", years: 2 } });
    expect(field(one, "Term of Confidentiality").value).toMatch(/^1 year from/);
    expect(field(many, "MNDA Term").value).toBe("Expires 99 years from Effective Date.");
    expect(field(many, "Term of Confidentiality").value).toMatch(/^2 years from/);
  });

  it("supports non-ASCII party names", () => {
    const form = completeForm({ party2: { company: "Société Générale", name: "Zoë Ångström", title: "", noticeAddress: "" } });
    const rows = buildNda(form, TERMS).partyRows;
    expect(rows.find((r) => r.label === "Company")!.party2).toBe("Société Générale");
    expect(rows.find((r) => r.label === "Print Name")!.party2).toBe("Zoë Ångström");
  });
});

describe("ndaFileName edge cases", () => {
  const withCompanies = (c1: string, c2: string) =>
    completeForm({
      party1: { ...completeForm().party1, company: c1 },
      party2: { ...completeForm().party2, company: c2 },
    });

  it.each([
    ["  Acme  ", "Globex", "Mutual-NDA-Acme-Globex.docx"],
    ["../../etc/passwd", "Globex", "Mutual-NDA-etc-passwd-Globex.docx"],
    ['A/B\\C:D*E?"F<G>H|I', "X", "Mutual-NDA-A-B-C-D-E-F-G-H-I-X.docx"],
    ["!!!", "Globex", "Mutual-NDA-Globex.docx"],
    ["Acme", "", "Mutual-NDA-Acme.docx"],
    ["Société Générale", "Globex", "Mutual-NDA-Societe-Generale-Globex.docx"],
    ["Łódź Sp. z o.o.", "Ærø Straße", "Mutual-NDA-Lodz-Sp-z-o-o-AEro-Strasse.docx"],
    ["山田株式会社", "Globex", "Mutual-NDA-Globex.docx"],
  ])("slugs %j + %j", (c1, c2, expected) => {
    expect(ndaFileName(withCompanies(c1, c2), "docx")).toBe(expected);
  });

  it("only ever produces filesystem-safe names", () => {
    const name = ndaFileName(withCompanies("<>:\"/\\|?* \u0000\n", "..."), "pdf");
    expect(name).toBe("Mutual-NDA.pdf");
    expect(name).toMatch(/^[A-Za-z0-9-]+\.(pdf|docx)$/);
  });
});
