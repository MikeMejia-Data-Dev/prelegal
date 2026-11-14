import { apiFetch } from "@/lib/auth";
import type { NdaFormData } from "@/lib/nda/types";

import type { GenericFields } from "./catalog";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** The document being drafted: which one, and the values filled in so far. */
export interface DraftState {
  documentId: string | null;
  fields: NdaFormData | GenericFields | null;
}

export interface ChatReply extends DraftState {
  reply: string;
}

/** Send the conversation and current draft to the backend AI; returns its reply and the updated draft. */
export async function sendChat(messages: ChatMessage[], draft: DraftState): Promise<ChatReply> {
  const response = await apiFetch("/api/chat", { method: "POST", body: JSON.stringify({ messages, ...draft }) });
  if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
  return response.json();
}
