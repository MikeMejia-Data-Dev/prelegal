import type { Run } from "./types";

// Inline markup used by the Common Paper templates: **bold**, [text](url) and
// variable references such as <span class="coverpage_link">Term</span>.
const INLINE_TOKEN = /(\*\*[^*]+\*\*|<span class="[a-z]+_link"[^>]*>[^<]+<\/span>|\[[^\]]+\]\([^)]+\))/;

/** Split a line of template markdown into styled runs. */
export function parseInline(text: string): Run[] {
  return text
    .split(INLINE_TOKEN)
    .filter((part) => part !== "")
    .flatMap((part): Run[] => {
      // Bold text may itself contain term references or links.
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return parseInline(bold[1]).map((run) => ({ ...run, bold: true }));

      const term = part.match(/^<span class="[a-z]+_link"[^>]*>([^<]+)<\/span>$/);
      if (term) return [{ text: term[1], term: true }];

      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) return [{ text: link[1], href: link[2] }];

      return [{ text: part }];
    });
}
