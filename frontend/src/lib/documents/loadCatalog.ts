import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseStandardTerms } from "@/lib/nda/parseStandardTerms";

import { NDA_ID, type DocumentSpec } from "./catalog";
import type { Catalog } from "./draft";
import { parseTemplate } from "./parseTemplate";

/** The repository root; Next.js runs with `frontend/` as the working directory. */
const ROOT = path.join(process.cwd(), "..");

/** Read documents.json and every template (server-side only, at build time). */
export async function loadCatalog(): Promise<Catalog> {
  const read = (file: string) => readFile(path.join(ROOT, file), "utf8");
  const specs: DocumentSpec[] = JSON.parse(await read("documents.json")).documents;
  const others = specs.filter((s) => s.id !== NDA_ID);
  const templates = await Promise.all(
    others.map(async (s) => parseTemplate(await read(`templates/${s.template}`))),
  );
  return {
    specs,
    ndaTerms: parseStandardTerms(await read("templates/Mutual-NDA.md")),
    templates: Object.fromEntries(others.map((s, i) => [s.id, templates[i]])),
  };
}
