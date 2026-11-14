"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { sendChat, type ChatMessage, type DraftState } from "@/lib/documents/chatApi";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you draft a legal agreement, like an NDA, a cloud service agreement or a pilot agreement. Which agreement do you need, or what are you trying to do?",
};

/** Freeform chat with the AI, which picks the document and fills it in as the conversation goes. */
export function DocumentChat({ draft, onDraftChange }: { draft: DraftState; onDraftChange: (d: DraftState) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, busy]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const { reply, documentId, fields } = await sendChat(history, draft);
      setMessages([...history, { role: "assistant", content: reply }]);
      onDraftChange({ documentId, fields });
    } catch (e) {
      console.error(e);
      setError("The assistant couldn't respond. Please try again.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section
      aria-label="Chat"
      className="flex h-[32rem] flex-col rounded-lg border border-slate-200 bg-white lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6"
    >
      <div ref={logRef} role="log" aria-label="Conversation" className="flex-1 overflow-y-auto p-4">
        <ol className="space-y-3">
          {messages.map((m, i) => (
            <li key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {m.content}
              </p>
            </li>
          ))}
          {busy && (
            <li className="text-sm text-slate-500">
              Thinking…
            </li>
          )}
        </ol>
      </div>
      {error && (
        <p className="px-4 pb-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          ref={inputRef}
          aria-label="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Send
        </button>
      </form>
    </section>
  );
}
