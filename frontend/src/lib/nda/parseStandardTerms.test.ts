import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseInline, parseStandardTerms } from "./parseStandardTerms";

const TEMPLATE = readFileSync(
  path.resolve(__dirname, "../../../../templates/Mutual-NDA.md"),
  "utf8",
);

describe("parseInline", () => {
  it("splits bold, cover-page term references and links into runs", () => {
    expect(
      parseInline(
        'use it for the <span class="coverpage_link">Purpose</span> (“**MNDA**”), see [CC BY 4.0](https://x.test).',
      ),
    ).toEqual([
      { text: "use it for the " },
      { text: "Purpose", term: true },
      { text: " (“" },
      { text: "MNDA", bold: true },
      { text: "”), see " },
      { text: "CC BY 4.0", href: "https://x.test" },
      { text: "." },
    ]);
  });

  it("returns plain text unchanged", () => {
    expect(parseInline("plain text")).toEqual([{ text: "plain text" }]);
  });
});

describe("parseStandardTerms (templates/Mutual-NDA.md)", () => {
  const terms = parseStandardTerms(TEMPLATE);

  it("reads the title and all 11 numbered clauses in order", () => {
    expect(terms.title).toBe("Standard Terms");
    expect(terms.clauses.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(terms.clauses[0].title).toBe("Introduction");
    expect(terms.clauses[8].title).toBe("Governing Law and Jurisdiction");
  });

  it("leaves no raw markup in clause text", () => {
    const text = terms.clauses.flatMap((c) => c.body.map((r) => r.text)).join("");
    expect(text).not.toMatch(/<span|<\/span>|\*\*/);
  });

  it("keeps cover-page term references as terms", () => {
    const termNames = new Set(
      terms.clauses.flatMap((c) => c.body.filter((r) => r.term).map((r) => r.text)),
    );
    expect(termNames).toEqual(
      new Set([
        "Purpose",
        "Effective Date",
        "MNDA Term",
        "Term of Confidentiality",
        "Governing Law",
        "Jurisdiction",
      ]),
    );
  });

  it("captures the CC BY 4.0 attribution footer", () => {
    expect(terms.attribution.some((r) => r.text === "CC BY 4.0" && r.href)).toBe(true);
  });

  it("rejects text that is not a Standard Terms template", () => {
    expect(() => parseStandardTerms("hello")).toThrow();
  });
});
