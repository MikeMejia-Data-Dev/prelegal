import type { NdaFormData } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  reply: string;
  fields: NdaFormData;
}

/** Send the conversation and current fields to the backend AI; returns its reply and updated fields. */
export async function sendChat(messages: ChatMessage[], fields: NdaFormData): Promise<ChatReply> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields }),
  });
  if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
  return response.json();
}
