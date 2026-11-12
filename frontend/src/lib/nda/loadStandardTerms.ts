import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseStandardTerms } from "./parseStandardTerms";
import type { StandardTerms } from "./types";

/**
 * Location of the Standard Terms in the PL-1 templates dataset at the
 * repository root. Next.js runs with `frontend/` as the working directory.
 */
export const STANDARD_TERMS_PATH = path.join(
  process.cwd(),
  "..",
  "templates",
  "Mutual-NDA.md",
);

/** Read and parse the Mutual NDA Standard Terms (server-side only). */
export async function loadStandardTerms(): Promise<StandardTerms> {
  return parseStandardTerms(await readFile(STANDARD_TERMS_PATH, "utf8"));
}
