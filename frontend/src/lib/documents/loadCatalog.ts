import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { buildCatalog } from "./buildCatalog";
import type { Catalog } from "./draft";

/** The repository root; Next.js runs with `frontend/` as the working directory. */
const ROOT = path.join(process.cwd(), "..");

/** Read documents.json and every template (server-side only, at build time). */
export function loadCatalog(): Catalog {
  return buildCatalog((file) => readFileSync(path.join(ROOT, file), "utf8"));
}
