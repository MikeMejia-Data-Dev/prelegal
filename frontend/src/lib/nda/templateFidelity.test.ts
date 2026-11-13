/**
 * The Standard Terms must be reproduced word for word: the cover page says
 * they are "identical to those posted at commonpaper.com". These tests strip
 * the template markup independently of the parser and compare the result
 * against what the parser produced.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildNda, defaultFormData } from "./buildNda";
import { parseStandardTerms } from "./parseStandardTerms";
import type { Run } from "./types";

const TEMPLATE = readFileSync(path.resolve(__dirname, "../../../../templates/Mutual-NDA.md"), "utf8");
const COVER_TEMPLATE = readFileSync(
  path.resolve(__dirname, "../../../../templates/Mutual-NDA-coverpage.md"),
  "utf8",
);

const stripMarkup = (s: string) =>
  s
    .replace(/<span class="coverpage_link">([^<]+)<\/span>/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const text = (runs: Run[]) => runs.map((r) => r.text).join("");

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

const terms = parseStandardTerms(TEMPLATE);
const clauseLines = TEMPLATE.split(/\r?\n/).filter((l) => /^\d+\.\s/.test(l.trim()));

describe("Standard Terms fidelity", () => {
  it("parses one clause per numbered template line", () => {
    expect(terms.clauses).toHaveLength(clauseLines.length);
  });

  it.each(clauseLines.map((line, i) => [i + 1, line] as const))(
    "clause %i text matches the template exactly",
    (n, line) => {
      const clause = terms.clauses[n - 1];
      const rendered = `${clause.number}. ${clause.title}. ${text(clause.body)}`;
      expect(normalize(rendered)).toBe(normalize(stripMarkup(line.trim())));
    },
  );

  it("loses no words from the template as a whole", () => {
    const words = (s: string) => normalize(s).split(" ");
    const expected = words(stripMarkup(TEMPLATE.replace(/^# .*$/m, "")));
    const actual = words(
      [
        ...terms.clauses.map((c) => `${c.number}. ${c.title}. ${text(c.body)}`),
        text(terms.attribution),
      ].join(" "),
    );
    expect(actual).toEqual(expected);
  });

  it("keeps typographic quotes and apostrophes", () => {
    const all = terms.clauses.map((c) => text(c.body)).join("");
    expect(all).toContain("“");
    expect(all).toContain("”");
    expect(all).toContain("’");
  });

  it("only links to https URLs", () => {
    const links = [...terms.clauses.flatMap((c) => c.body), ...terms.attribution].filter((r) => r.href);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.href).toMatch(/^https:\/\//);
  });

  it("handles Windows line endings identically", () => {
    expect(parseStandardTerms(TEMPLATE.replace(/\n/g, "\r\n"))).toEqual(terms);
  });
});

describe("Cover Page fidelity", () => {
  const nda = buildNda(defaultFormData(new Date(2026, 10, 12)), terms);

  it("uses the same field labels as the Common Paper cover page template", () => {
    for (const label of ["Purpose", "Effective Date", "MNDA Term", "Term of Confidentiality", "Governing Law", "Jurisdiction", "MNDA Modifications"]) {
      expect(COVER_TEMPLATE).toContain(label);
      expect(nda.coverFields.some((f) => f.label === label)).toBe(true);
    }
  });

  it("references every Cover Page term that the Standard Terms rely on", () => {
    const referenced = new Set(terms.clauses.flatMap((c) => c.body.filter((r) => r.term).map((r) => r.text)));
    const labels = new Set(nda.coverFields.map((f) => f.label));
    for (const term of referenced) expect(labels).toContain(term);
  });

  it("matches the template's signing statement", () => {
    expect(normalize(stripMarkup(COVER_TEMPLATE))).toContain(normalize(nda.signingStatement));
  });
});
