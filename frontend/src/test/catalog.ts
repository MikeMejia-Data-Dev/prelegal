import { readFileSync } from "node:fs";
import path from "node:path";

import { buildCatalog } from "@/lib/documents/buildCatalog";

/** The repository root, for tests that read documents.json or templates/. */
export const ROOT = path.resolve(__dirname, "../../..");

export const readRepoFile = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

/** The real catalog, parsed the same way the app does at build time. */
export const testCatalog = buildCatalog(readRepoFile);
