/**
 * Checks what is actually inside the generated PDF and Word files, not just
 * that they are valid containers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import { buildNda, defaultFormData } from "../buildNda";
import { parseStandardTerms } from "../parseStandardTerms";
import type { NdaDocument, NdaFormData } from "../types";
import { NdaPdf } from "./NdaPdf";
import { ndaToDocxBlob } from "./ndaDocx";

const terms = parseStandardTerms(
  readFileSync(path.resolve(__dirname, "../../../../../templates/Mutual-NDA.md"), "utf8"),
);

function makeNda(overrides: Partial<NdaFormData> = {}): NdaDocument {
  return buildNda(
    {
      ...defaultFormData(new Date(2026, 10, 12)),
      governingLaw: "Delaware",
      jurisdiction: "New Castle, DE",
      party1: { company: "Acme, Inc.", name: "Ada Lovelace", title: "CEO", noticeAddress: "ada@acme.test" },
      party2: { company: "Globex", name: "Hank Scorpio", title: "CTO", noticeAddress: "hank@globex.test" },
      ...overrides,
    },
    terms,
  );
}

const squash = (s: string) => s.replace(/\s+/g, "");

/** Visible text of a DOCX, with <w:br/> and paragraph ends shown as "\n". */
async function docxText(nda: NdaDocument): Promise<string> {
  const zip = await JSZip.loadAsync(await (await ndaToDocxBlob(nda)).arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  return xml
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function docxXml(nda: NdaDocument, file = "word/document.xml"): Promise<string> {
  const zip = await JSZip.loadAsync(await (await ndaToDocxBlob(nda)).arrayBuffer());
  return zip.file(file)!.async("string");
}

/** Text of each PDF page, as extracted by pdf.js. */
async function pdfPages(nda: NdaDocument): Promise<string[]> {
  const blob = await pdf(<NdaPdf nda={nda} />).toBlob();
  const doc = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false })
    .promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages;
}

const nda = makeNda();

describe("DOCX content", () => {
  it("contains every cover field label and value", async () => {
    const text = squash(await docxText(nda));
    for (const field of nda.coverFields) {
      expect(text).toContain(squash(field.label));
      expect(text).toContain(squash(field.value));
    }
  });

  it("contains the party table values", async () => {
    const text = await docxText(nda);
    for (const value of ["Acme, Inc.", "Ada Lovelace", "CEO", "ada@acme.test", "Globex", "Hank Scorpio", "hank@globex.test"]) {
      expect(text).toContain(value);
    }
  });

  it("contains all 11 Standard Terms clauses in full", async () => {
    const text = squash(await docxText(nda));
    for (const clause of terms.clauses) {
      expect(text).toContain(squash(`${clause.number}. ${clause.title}. ${clause.body.map((r) => r.text).join("")}`));
    }
  });

  it("keeps hyperlinks to Common Paper and the CC BY 4.0 license", async () => {
    const rels = await docxXml(nda, "word/_rels/document.xml.rels");
    expect(rels).toContain("https://commonpaper.com/standards/mutual-nda/1.0");
    expect(rels).toContain("https://creativecommons.org/licenses/by/4.0/");
  });

  it("escapes markup-like user input instead of injecting XML", async () => {
    const evil = '</w:t><w:t>INJECTED & "quoted" <b>';
    const text = await docxText(makeNda({ purpose: evil }));
    expect(text).toContain(evil);
  });

  it("keeps non-Latin characters", async () => {
    const text = await docxText(
      makeNda({ party2: { company: "Łódź Sp. z o.o.", name: "Šimkus Жуков 山田", title: "", noticeAddress: "" } }),
    );
    expect(text).toContain("Łódź Sp. z o.o.");
    expect(text).toContain("Šimkus Жуков 山田");
  });

  // Reviewer finding: multi-line Purpose / Modifications are joined onto one
  // line in Word. Marked `fails` to document the bug; flip to `it` once fixed.
  // Word renders a raw "\n" inside <w:t> as a space, so a real break must be
  // a <w:br/> between two text runs.
  it.fails("keeps line breaks in multi-line Modifications [known bug]", async () => {
    const xml = await docxXml(makeNda({ modifications: "1. Section 3(d) deleted.\n2. Term extended." }));
    expect(xml).not.toMatch(/<w:t[^>]*>[^<]*\n[^<]*<\/w:t>/);
    expect(xml).toMatch(/1\. Section 3\(d\) deleted\.<\/w:t>[\s\S]*?<w:br\/>[\s\S]*?2\. Term extended\./);
  });
});

describe("PDF content", () => {
  it("puts the cover page on page 1 and the Standard Terms after it", async () => {
    const pages = await pdfPages(nda);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(squash(pages[0])).toContain(squash("Mutual Non-Disclosure Agreement"));
    expect(squash(pages[0])).not.toContain(squash("1. Introduction."));
    expect(squash(pages.slice(1).join(" "))).toContain(squash("Standard Terms"));
  });

  it("contains every cover field value and party value", async () => {
    const text = squash((await pdfPages(nda)).join(" "));
    for (const field of nda.coverFields) expect(text).toContain(squash(field.value));
    for (const value of ["Acme, Inc.", "Ada Lovelace", "ada@acme.test", "Globex", "Hank Scorpio"]) {
      expect(text).toContain(squash(value));
    }
  });

  it("contains every Standard Terms clause heading", async () => {
    const text = squash((await pdfPages(nda)).join(" "));
    for (const clause of terms.clauses) expect(text).toContain(squash(`${clause.number}. ${clause.title}.`));
  });

  // Found by this test: react-pdf inserts a hyphen where a line breaks between
  // a bold run and the following text, e.g. "Confidential Information-”)".
  // Legal text must be verbatim. Flip to `it` once fixed.
  it.fails("contains all 11 Standard Terms clauses verbatim [known bug: stray hyphen]", async () => {
    const text = squash((await pdfPages(nda)).join(" "));
    for (const clause of terms.clauses) {
      expect(text).toContain(squash(`${clause.title}. ${clause.body.map((r) => r.text).join("")}`));
    }
  });

  it("keeps accented Latin-1 characters", async () => {
    const text = (await pdfPages(makeNda({ party2: { company: "Société Générale", name: "Zoë", title: "", noticeAddress: "" } }))).join(" ");
    expect(text).toContain("Société Générale");
  });

  // Reviewer finding: the built-in Helvetica font only covers WinAnsi, so
  // characters outside Latin-1 are lost in the PDF. Flip to `it` once fixed.
  it.fails("keeps non-Latin-1 characters in party names [known bug]", async () => {
    const text = (await pdfPages(makeNda({ party2: { company: "Łódź Sp. z o.o.", name: "Жуков", title: "", noticeAddress: "" } }))).join(" ");
    expect(text).toContain("Łódź Sp. z o.o.");
    expect(text).toContain("Жуков");
  });

  // Found by this test (reviewer suspected it): cover fields use wrap={false},
  // so a field taller than a page is clipped and the rest is silently lost
  // (output stops at "Modification 86"). Flip to `it` once fixed.
  it.fails("keeps all of a very long Modifications section [known bug]", async () => {
    const long = Array.from({ length: 200 }, (_, i) => `Modification ${i + 1}: the parties agree to an additional term.`).join(" ");
    const pages = await pdfPages(makeNda({ modifications: long }));
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(squash(pages.join(" "))).toContain(squash("Modification 200:"));
  }, 30_000);
});
