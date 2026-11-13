import { readFileSync } from "node:fs";
import path from "node:path";
import { pdf } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { buildNda, defaultFormData } from "../buildNda";
import { parseStandardTerms } from "../parseStandardTerms";
import { NdaPdf } from "./NdaPdf";
import { ndaToDocxBlob } from "./ndaDocx";

const terms = parseStandardTerms(
  readFileSync(path.resolve(__dirname, "../../../../../templates/Mutual-NDA.md"), "utf8"),
);

const nda = buildNda(
  {
    ...defaultFormData(new Date(2026, 10, 12)),
    governingLaw: "Delaware",
    jurisdiction: "New Castle, DE",
    party1: { company: "Acme, Inc.", name: "Ada Lovelace", title: "CEO", noticeAddress: "ada@acme.test" },
    party2: { company: "Globex", name: "Hank Scorpio", title: "CTO", noticeAddress: "hank@globex.test" },
  },
  terms,
);

const header = async (blob: Blob, length: number) =>
  Buffer.from(await blob.slice(0, length).arrayBuffer()).toString("latin1");

describe("document exports", () => {
  it("renders a multi-page PDF", async () => {
    const blob = await pdf(<NdaPdf nda={nda} />).toBlob();
    expect(await header(blob, 5)).toBe("%PDF-");
    const pages = Buffer.from(await blob.arrayBuffer()).toString("latin1").match(/\/Type \/Page\b/g) ?? [];
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a DOCX (zip) document", async () => {
    const blob = await ndaToDocxBlob(nda);
    expect(await header(blob, 2)).toBe("PK");
    expect(blob.size).toBeGreaterThan(5000);
  });
});
