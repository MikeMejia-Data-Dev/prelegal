import type { NdaFormData } from "../types";
import { PDF_CHARSET_RANGES } from "./pdfCharset";

const RANGES: [number, number][] = PDF_CHARSET_RANGES.split(";").map((r) => {
  const [a, b = a] = r.split(",").map(Number);
  return [a, b];
});

// Line breaks and tabs are handled by the layout, not drawn as glyphs.
const CONTROL = new Set([0x09, 0x0a, 0x0d]);

function inPdfFont(cp: number): boolean {
  if (CONTROL.has(cp)) return true;
  let lo = 0;
  let hi = RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b] = RANGES[mid];
    if (cp < a) hi = mid - 1;
    else if (cp > b) lo = mid + 1;
    else return true;
  }
  return false;
}

/** Distinct characters in `text` that the PDF font cannot draw, in order of appearance. */
export function unsupportedPdfCharacters(text: string): string[] {
  const seen = new Set<string>();
  for (const ch of text) {
    if (!inPdfFont(ch.codePointAt(0)!)) seen.add(ch);
  }
  return [...seen];
}

/** Unsupported characters across every user-entered value that appears in the PDF. */
export function unsupportedPdfCharactersInForm(form: NdaFormData): string[] {
  const { party1, party2 } = form;
  return unsupportedPdfCharacters(
    [
      form.purpose,
      form.governingLaw,
      form.jurisdiction,
      form.modifications,
      ...[party1, party2].flatMap((p) => [p.company, p.name, p.title, p.noticeAddress]),
    ].join("\n"),
  );
}

const BREAK_AFTER = /[@./_-]/;

/**
 * The PDF layout only wraps at spaces, so a long unbroken token such as an
 * email address would overflow a narrow table cell. Insert line breaks into
 * tokens longer than `maxChars`, preferring to break right after `@ . / _ -`
 * so no hyphen is added and the text itself is unchanged apart from wrapping.
 */
export function breakLongTokens(text: string, maxChars: number): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .split(" ")
        .map((token) => {
          const chunks: string[] = [];
          let rest = token;
          while ([...rest].length > maxChars) {
            const head = [...rest].slice(0, maxChars);
            let cut = -1;
            for (let i = head.length - 1; i >= Math.floor(maxChars / 3); i--) {
              if (BREAK_AFTER.test(head[i])) {
                cut = i + 1;
                break;
              }
            }
            if (cut === -1) cut = maxChars;
            chunks.push(head.slice(0, cut).join(""));
            rest = [...rest].slice(cut).join("");
          }
          chunks.push(rest);
          return chunks.join("\n");
        })
        .join(" "),
    )
    .join("\n");
}
