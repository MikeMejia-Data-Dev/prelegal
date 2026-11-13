import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import { defaultFormData } from "../buildNda";
import { PDF_CHARSET_RANGES } from "./pdfCharset";
import { breakLongTokens, unsupportedPdfCharacters, unsupportedPdfCharactersInForm } from "./pdfText";

const fontkit = createRequire(import.meta.url)("fontkit");

describe("PDF font coverage", () => {
  it("pdfCharset.ts is in sync with the bundled fonts (run scripts/generate-pdf-charset.mjs)", () => {
    const fonts = ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map((f) =>
      fontkit.create(readFileSync(path.join(__dirname, "fonts", f))),
    );
    const bold = new Set<number>(fonts[1].characterSet);
    const both = fonts[0].characterSet.filter((cp: number) => bold.has(cp));
    const fromRanges = PDF_CHARSET_RANGES.split(";").flatMap((r) => {
      const [a, b = a] = r.split(",").map(Number);
      return Array.from({ length: b - a + 1 }, (_, i) => a + i);
    });
    expect(fromRanges).toEqual([...new Set<number>(both)].sort((a, b) => a - b));
  });

  it("supports the scripts and symbols used in contracts", () => {
    const text = "Société Générale Łódź Šimkus Ærø Straße Жуков Ελένη Nguyễn “quoted” ‘x’ – — § © ® ™ € £ ¥ … •\n\t";
    expect(unsupportedPdfCharacters(text)).toEqual([]);
  });

  it("reports unsupported characters once each, in order", () => {
    expect(unsupportedPdfCharacters("山田 山 → 😀 שלום")).toEqual(["山", "田", "→", "😀", "ש", "ל", "ו", "ם"]);
  });

  it("checks every user-entered field that appears in the PDF", () => {
    const form = defaultFormData(new Date(2026, 0, 1));
    form.party2.noticeAddress = "東京";
    form.modifications = "→";
    expect(unsupportedPdfCharactersInForm(form)).toEqual(["→", "東", "京"]);
  });
});

describe("breakLongTokens", () => {
  it("leaves short text alone", () => {
    expect(breakLongTokens("Ada Lovelace, CEO", 26)).toBe("Ada Lovelace, CEO");
    expect(breakLongTokens("", 26)).toBe("");
  });

  it("breaks a long email after @ or . without adding characters", () => {
    const email = "jennifer.mcallister-thompson@lawfirm-example.com";
    const out = breakLongTokens(email, 26);
    expect(out.replace(/\n/g, "")).toBe(email);
    for (const line of out.split("\n")) expect(line.length).toBeLessThanOrEqual(26);
    expect(out.split("\n")[0]).toMatch(/[@./_-]$/);
  });

  it("hard-breaks a token with no natural break points", () => {
    const out = breakLongTokens("a".repeat(60), 26);
    expect(out.split("\n").map((l) => l.length)).toEqual([26, 26, 8]);
  });

  it("keeps spaces and existing line breaks", () => {
    const text = "123 Main St\nSuite 4567890123456789012345678901";
    const out = breakLongTokens(text, 26);
    expect(out.replace(/\n/g, "")).toBe(text.replace(/\n/g, ""));
    expect(out.startsWith("123 Main St\n")).toBe(true);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(breakLongTokens("Ł".repeat(26), 26)).toBe("Ł".repeat(26));
  });
});
