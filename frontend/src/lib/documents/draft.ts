import { buildNda, defaultFormData, ndaFileName, validate } from "@/lib/nda/buildNda";

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
 * Build the chosen document from the AI's fields. Fields of the wrong shape
 * (e.g. right after switching documents) fall back to that document's defaults.
 */
export function draftDocument(catalog: Catalog, { documentId, fields }: DraftState): Draft | null {
  const spec = catalog.specs.find((s) => s.id === documentId);
  if (!spec) return null;

  if (spec.id === NDA_ID) {
    const form = fields && "purpose" in fields ? fields : defaultFormData();
    return { spec, doc: buildNda(form, catalog.ndaTerms), errors: validate(form), fileName: (ext) => ndaFileName(form, ext) };
  }

  const generic = fields && "keyTerms" in fields ? fields : emptyGenericFields();
  return {
    spec,
    doc: buildDocument(spec, generic, catalog.templates[spec.id]),
    errors: validateDocument(spec, generic),
    fileName: (ext) => documentFileName(spec.shortName, [generic.party1.company, generic.party2.company], ext),
  };
}
