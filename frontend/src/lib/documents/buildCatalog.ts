import { parseStandardTerms } from "@/lib/nda/parseStandardTerms";

import { NDA_ID, type DocumentSpec } from "./catalog";
import type { Catalog } from "./draft";
import { parseTemplate } from "./parseTemplate";

/** Parse documents.json and every template; `read` returns a file's text by repository-relative path. */
export function buildCatalog(read: (file: string) => string): Catalog {
  const specs: DocumentSpec[] = JSON.parse(read("documents.json")).documents;
  const others = specs.filter((s) => s.id !== NDA_ID);
  return {
    specs,
    ndaTerms: parseStandardTerms(read("templates/Mutual-NDA.md")),
    templates: Object.fromEntries(others.map((s) => [s.id, parseTemplate(read(`templates/${s.template}`))])),
  };
}
