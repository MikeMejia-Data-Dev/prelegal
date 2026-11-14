// Letters that Unicode normalization does not reduce to ASCII.
const TRANSLITERATE: Record<string, string> = {
  Ł: "L", ł: "l", Ø: "O", ø: "o", Đ: "D", đ: "d", Æ: "AE", æ: "ae", Œ: "OE", œ: "oe", ß: "ss", Þ: "Th", þ: "th",
};

const slug = (s: string) =>
  s
    .trim()
    .replace(/[ŁłØøĐđÆæŒœßÞþ]/g, (c) => TRANSLITERATE[c])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Download file name, e.g. "CSA-Acme-Inc-Globex.pdf"; accents are dropped ("Łódź" -> "Lodz"). */
export function documentFileName(shortName: string, companies: [string, string], extension: "pdf" | "docx"): string {
  const parts = [shortName, ...companies.map(slug)].filter(Boolean);
  return `${parts.join("-")}.${extension}`;
}
