import { parseInline } from "./parseInline";
import type { Clause, Run } from "./types";

const ITEM = /^( *)(\d+|[a-z]+)\.\s+(.*)$/;
const HEADER = /^<span class="header_[23]"[^>]*>([^<]*)<\/span>\s*(.*)$/;
// Definitions are wrapped in an anchor span, e.g. <span id="4.1">**"SLA"**</span>.
const ANCHOR = /<span id="[^"]*">(.*?)<\/span>/g;

/** A Common Paper standard agreement: its title and nested numbered clauses. */
export interface Template {
  title: string;
  clauses: Clause[];
}

/** Label a list item: "1." at the top level, "1.2" one level down, the marker itself ("a.", "iv.") below. */
function label(depth: number, marker: string, section: string): string {
  if (depth === 0) return `${marker}.`;
  if (depth === 1) return `${section}.${marker}`;
  return `${marker}.`;
}

/**
 * Parse a Common Paper template (e.g. `templates/CSA.md`): a `# Title` line
 * followed by numbered list items indented four spaces per level.
 */
export function parseTemplate(markdown: string): Template {
  let title = "";
  let section = "";
  const clauses: Clause[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    const item = line.match(ITEM);
    if (!item) continue;

    const depth = Math.floor(item[1].length / 4);
    if (depth === 0) section = item[2];
    const header = item[3].match(HEADER);
    const body: Run[] = parseInline((header ? header[2] : item[3]).replace(ANCHOR, "$1").trim());
    clauses.push({ label: label(depth, item[2], section), title: header ? header[1].trim() : "", body, depth });
  }

  if (!title || clauses.length === 0) throw new Error("Template could not be parsed");
  return { title, clauses };
}
