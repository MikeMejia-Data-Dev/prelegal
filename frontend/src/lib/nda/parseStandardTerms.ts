import type { Clause, Run, StandardTerms } from "./types";

// Inline markup used by the Common Paper templates: **bold**,
// <span class="coverpage_link">Term</span> and [text](url).
const INLINE_TOKEN =
  /(\*\*[^*]+\*\*|<span class="coverpage_link">[^<]+<\/span>|\[[^\]]+\]\([^)]+\))/;

/** Split a line of template markdown into styled runs. */
export function parseInline(text: string): Run[] {
  return text
    .split(INLINE_TOKEN)
    .filter((part) => part !== "")
    .map((part): Run => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return { text: bold[1], bold: true };

      const term = part.match(/^<span class="coverpage_link">([^<]+)<\/span>$/);
      if (term) return { text: term[1], term: true };

      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) return { text: link[1], href: link[2] };

      return { text: part };
    });
}

const CLAUSE = /^(\d+)\.\s+\*\*([^*]+)\*\*\.\s*(.*)$/;

/**
 * Parse `templates/Mutual-NDA.md` (Common Paper Mutual NDA Standard Terms)
 * into numbered clauses. Each clause in the template is a single line of the
 * form `N. **Title**. Body…`.
 */
export function parseStandardTerms(markdown: string): StandardTerms {
  let title = "";
  const clauses: Clause[] = [];
  let attribution: Run[] = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }

    const clause = line.match(CLAUSE);
    if (clause) {
      clauses.push({
        number: Number(clause[1]),
        title: clause[2].trim(),
        body: parseInline(clause[3]),
      });
      continue;
    }

    // Any other non-empty line is the license/attribution footer.
    attribution = parseInline(line);
  }

  if (!title || clauses.length === 0) {
    throw new Error("Mutual NDA Standard Terms template could not be parsed");
  }

  return { title, clauses, attribution };
}
