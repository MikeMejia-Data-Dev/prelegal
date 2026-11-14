import { apiFetch } from "@/lib/auth";

import type { DraftState } from "./chatApi";

/** A document the user downloaded, as listed on "My documents". */
export interface DocumentSummary {
  id: number;
  documentId: string;
  title: string;
  createdAt: string;
}

export interface SavedDocument extends DocumentSummary {
  fields: NonNullable<DraftState["fields"]>;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export async function saveDocument(documentId: string, title: string, fields: SavedDocument["fields"]) {
  return json<DocumentSummary>(
    await apiFetch("/api/documents", { method: "POST", body: JSON.stringify({ documentId, title, fields }) }),
  );
}

export async function listDocuments() {
  return json<DocumentSummary[]>(await apiFetch("/api/documents"));
}

export async function getDocument(id: string) {
  return json<SavedDocument>(await apiFetch(`/api/documents/${id}`));
}
