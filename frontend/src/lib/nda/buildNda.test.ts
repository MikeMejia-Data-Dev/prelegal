import { describe, expect, it } from "vitest";

import {
  buildNda,
  defaultFormData,
  formatDate,
  ndaFileName,
  todayIso,
  validate,
} from "./buildNda";
import type { NdaFormData, StandardTerms } from "./types";

const TERMS: StandardTerms = { title: "Standard Terms", clauses: [], attribution: [] };

function completeForm(): NdaFormData {
  return {
    ...defaultFormData(new Date(2026, 10, 12)),
    governingLaw: "Delaware",
    jurisdiction: "New Castle, DE",
    party1: { company: "Acme, Inc.", name: "Ada Lovelace", title: "CEO", noticeAddress: "ada@acme.test" },
    party2: { company: "Globex", name: "Hank Scorpio", title: "CTO", noticeAddress: "hank@globex.test" },
  };
}

const coverValue = (form: NdaFormData, label: string) =>
  buildNda(form, TERMS).coverFields.find((f) => f.label === label)!;

describe("dates", () => {
  it("formats ISO dates for the agreement", () => {
    expect(formatDate("2026-11-12")).toBe("November 12, 2026");
    expect(formatDate("2026-02-30")).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("rejects partially typed years instead of mapping them to the 1900s", () => {
    expect(formatDate("0026-11-12")).toBe("");
    const form = { ...completeForm(), effectiveDate: "0026-11-12" };
    expect(validate(form)).toEqual(["Effective Date must be a valid date."]);
  });

  it("defaults the effective date to today", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(defaultFormData(new Date(2026, 0, 5)).effectiveDate).toBe("2026-01-05");
  });
});

describe("validate", () => {
  it("accepts a complete form", () => {
    expect(validate(completeForm())).toEqual([]);
  });

  it("reports every missing required field", () => {
    const errors = validate(defaultFormData());
    expect(errors).toEqual([
      "Governing Law (state) is required.",
      "Jurisdiction is required.",
      "Party 1 company is required.",
      "Party 2 company is required.",
    ]);
  });

  it("rejects invalid year counts", () => {
    const form = { ...completeForm(), mndaTerm: { kind: "expires", years: 0 } } as NdaFormData;
    expect(validate(form)).toEqual([
      "MNDA Term must be a whole number of years between 1 and 99.",
    ]);
  });
});

describe("buildNda", () => {
  it("fills cover page values", () => {
    const form = completeForm();
    expect(coverValue(form, "Effective Date").value).toBe("November 12, 2026");
    expect(coverValue(form, "Governing Law").value).toBe("Delaware");
    expect(coverValue(form, "MNDA Term").value).toBe("Expires 1 year from Effective Date.");
    expect(coverValue(form, "Term of Confidentiality").value).toMatch(/^1 year from Effective Date, but/);
    expect(coverValue(form, "MNDA Modifications").value).toBe("None.");
  });

  it("supports multi-year and open-ended terms", () => {
    const form: NdaFormData = {
      ...completeForm(),
      mndaTerm: { kind: "expires", years: 3 },
      confidentialityTerm: { kind: "perpetual" },
    };
    expect(coverValue(form, "MNDA Term").value).toBe("Expires 3 years from Effective Date.");
    expect(coverValue(form, "Term of Confidentiality").value).toBe("In perpetuity.");

    const open: NdaFormData = { ...form, mndaTerm: { kind: "untilTerminated" } };
    expect(coverValue(open, "MNDA Term").value).toMatch(/^Continues until terminated/);
  });

  it("uses bracketed placeholders for missing values", () => {
    const field = coverValue(defaultFormData(), "Governing Law");
    expect(field).toMatchObject({ value: "[Governing Law]", missing: true });
  });

  it("fills the party table and leaves signature and date blank", () => {
    const rows = buildNda(completeForm(), TERMS).partyRows;
    const row = (label: string) => rows.find((r) => r.label === label)!;
    expect(row("Company")).toMatchObject({ party1: "Acme, Inc.", party2: "Globex" });
    expect(row("Print Name")).toMatchObject({ party1: "Ada Lovelace", party2: "Hank Scorpio" });
    expect(row("Signature")).toMatchObject({ party1: "", party2: "", handwritten: true });
    expect(row("Date")).toMatchObject({ party1: "", party2: "", handwritten: true });
    expect(row("Company").handwritten).toBeUndefined();
  });

  it("notes in the attribution that the cover page was completed (CC BY 4.0)", () => {
    const text = buildNda(completeForm(), TERMS).coverAttribution.map((r) => r.text).join("");
    expect(text).toContain("CC BY 4.0");
    expect(text).toContain("Cover Page completed using Prelegal; Standard Terms unmodified.");
  });

  it("attaches the standard terms unchanged", () => {
    expect(buildNda(completeForm(), TERMS).standardTerms).toBe(TERMS);
  });
});

describe("ndaFileName", () => {
  it("builds a safe file name from the party companies", () => {
    expect(ndaFileName(completeForm(), "pdf")).toBe("Mutual-NDA-Acme-Inc-Globex.pdf");
    expect(ndaFileName(defaultFormData(), "docx")).toBe("Mutual-NDA.docx");
  });
});
