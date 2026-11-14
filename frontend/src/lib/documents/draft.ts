import { buildNda, defaultFormData, ndaFileName, validateNda } from "@/lib/nda/buildNda";

import { buildDocument, validateDocument } from "./buildDocument";
import { emptyGenericFields, NDA_ID, type DocumentSpec } from "./catalog";
import type { DraftState } from "./chatApi";
import { documentFileName } from "./fileName";
import type { Template } from "./parseTemplate";
import type { LegalDocument, StandardTerms } from "./types";

/** Everything the creator needs to render any supported document, loaded at build time. */
export interface Catalog {
  specs: DocumentSpec[];
  ndaTerms: StandardTerms;
  templates: Record<string, Template>;
}

/** A filled-in document ready to preview and download. */
export interface Draft {
  spec: DocumentSpec;
  doc: LegalDocument;
  errors: string[];
  fileName: (extension: "pdf" | "docx") => string;
}

/**
 * Give the AI's fields the shape the chosen document needs. Right after a
 * switch they may still have the old document's shape: start from the new
 * document's defaults, keeping the party details.
 */
export function fitFields({ documentId, fields }: DraftState): DraftState["fields"] {
  if (!documentId) return null;
  const parties = fields ? { party1: fields.party1, party2: fields.party2 } : {};
  if (documentId === NDA_ID) return fields && "purpose" in fields ? fields : { ...defaultFormData(), ...parties };
  return fields && "keyTerms" in fields ? fields : { ...emptyGenericFields(), ...parties };
}

/** Build the chosen document from its fields, or null while no document is chosen. */
export function draftDocument(catalog: Catalog, state: DraftState): Draft | null {
  const spec = catalog.specs.find((s) => s.id === state.documentId);
  const fields = fitFields(state);
  if (!spec || !fields) return null;

  if ("purpose" in fields) {
    return { spec, doc: buildNda(fields, catalog.ndaTerms), errors: validateNda(fields), fileName: (ext) => ndaFileName(fields, ext) };
  }

  return {
    spec,
    doc: buildDocument(spec, fields, catalog.templates[spec.id]),
    errors: validateDocument(spec, fields),
    fileName: (ext) => documentFileName(spec.shortName, [fields.party1.company, fields.party2.company], ext),
  };
}
