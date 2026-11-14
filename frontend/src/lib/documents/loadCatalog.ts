import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadStandardTerms } from "@/lib/nda/loadStandardTerms";

import { NDA_ID, type DocumentSpec } from "./catalog";
import type { Catalog } from "./draft";
import { parseTemplate } from "./parseTemplate";

/** The repository root; Next.js runs with `frontend/` as the working directory. */
const ROOT = path.join(process.cwd(), "..");

/** Read documents.json and every template (server-side only, at build time). */
export async function loadCatalog(): Promise<Catalog> {
  const specs: DocumentSpec[] = JSON.parse(await readFile(path.join(ROOT, "documents.json"), "utf8")).documents;
  const others = specs.filter((s) => s.id !== NDA_ID);
  const templates = await Promise.all(
    others.map(async (s) => parseTemplate(await readFile(path.join(ROOT, "templates", s.template), "utf8"))),
  );
  return {
    specs,
    ndaTerms: await loadStandardTerms(),
    templates: Object.fromEntries(others.map((s, i) => [s.id, templates[i]])),
  };
}
