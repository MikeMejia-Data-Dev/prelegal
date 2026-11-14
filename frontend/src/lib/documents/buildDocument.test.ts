import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildDocument, validateDocument } from "./buildDocument";
import { emptyGenericFields, type DocumentSpec, type GenericFields } from "./catalog";
import { documentFileName } from "./fileName";
import { parseTemplate } from "./parseTemplate";

const ROOT = path.resolve(__dirname, "../../../..");
const specs: DocumentSpec[] = JSON.parse(readFileSync(path.join(ROOT, "documents.json"), "utf8")).documents;
const csa = specs.find((s) => s.id === "csa")!;
const template = parseTemplate(readFileSync(path.join(ROOT, "templates", csa.template), "utf8"));

function filled(): GenericFields {
  const fields = emptyGenericFields();
  fields.keyTerms = csa.keyTerms.filter((t) => t.required).map((t) => ({ key: t.key, value: `${t.label} value` }));
  fields.party1.company = "Acme, Inc.";
  fields.party2.company = "Globex";
  return fields;
}

describe("documents.json", () => {
  it("lists every catalog template once, with two parties", () => {
    const catalog = JSON.parse(readFileSync(path.join(ROOT, "catalog.json"), "utf8"));
    const templates = catalog.templates.map((t: { filename: string }) => t.filename.replace("templates/", ""));
    const covered = new Set([...specs.map((s) => s.template), "Mutual-NDA-coverpage.md"]);
    expect([...covered].sort()).toEqual([...templates].sort());
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
    for (const spec of specs) expect(spec.parties).toHaveLength(2);
  });
});

describe("buildDocument", () => {
  it("shows placeholders for missing required terms and 'Not specified.' for optional ones", () => {
    const doc = buildDocument(csa, emptyGenericFields(), template);
    expect(doc.coverFields.find((f) => f.label === "Governing Law")).toMatchObject({ value: "[Governing Law]", missing: true });
    expect(doc.coverFields.find((f) => f.label === "Technical Support")).toMatchObject({ value: "Not specified.", missing: false });
  });

  it("fills values, party roles and the unmodified Standard Terms", () => {
    const doc = buildDocument(csa, filled(), template);
    expect(doc.title).toBe("Cloud Service Agreement");
    expect(doc.partyLabels).toEqual(["PROVIDER", "CUSTOMER"]);
    expect(doc.coverFields.find((f) => f.label === "Fees")?.value).toBe("Fees value");
    expect(doc.partyRows.find((r) => r.label === "Company")).toMatchObject({ party1: "Acme, Inc.", party2: "Globex" });
    expect(doc.standardTerms.clauses).toBe(template.clauses);
  });
});

describe("validateDocument", () => {
  it("lists missing required terms and companies by party role", () => {
    const errors = validateDocument(csa, emptyGenericFields());
    expect(errors).toContain("Governing Law is required.");
    expect(errors).toContain("Provider company is required.");
    expect(errors).toContain("Customer company is required.");
    expect(errors).not.toContain("Technical Support is required.");
  });

  it("passes once required terms and both companies are filled", () => {
    expect(validateDocument(csa, filled())).toEqual([]);
  });

  it("treats whitespace-only values as missing", () => {
    const fields = filled();
    fields.keyTerms[0].value = "  ";
    expect(validateDocument(csa, fields)).toHaveLength(1);
  });
});

describe("documentFileName", () => {
  it("uses the document short name and both companies", () => {
    expect(documentFileName("CSA", ["Acme, Inc.", "Globex"], "pdf")).toBe("CSA-Acme-Inc-Globex.pdf");
    expect(documentFileName("BAA", ["", ""], "docx")).toBe("BAA.docx");
  });
});
