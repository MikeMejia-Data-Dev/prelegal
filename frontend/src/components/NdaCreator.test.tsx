// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatDate, todayIso } from "@/lib/nda/buildNda";
import type { ChatMessage } from "@/lib/nda/chatApi";
import { parseStandardTerms } from "@/lib/nda/parseStandardTerms";
import type { NdaFormData } from "@/lib/nda/types";

const downloadNda = vi.fn();
vi.mock("@/lib/nda/export/download", () => ({ downloadNda: (...args: unknown[]) => downloadNda(...args) }));
const sendChat = vi.fn();
vi.mock("@/lib/nda/chatApi", () => ({ sendChat: (...args: unknown[]) => sendChat(...args) }));

import { NdaCreator } from "./NdaCreator";

const terms = parseStandardTerms(
  readFileSync(path.resolve(__dirname, "../../../templates/Mutual-NDA.md"), "utf8"),
);

const preview = () => screen.getByRole("region", { name: "Cover Page" });
const coverValue = (label: string) => {
  const dt = within(preview()).getByText(label, { selector: "dt" });
  const dds = dt.parentElement!.querySelectorAll("dd");
  return dds[dds.length - 1];
};
const pdfButton = () => screen.getByRole("button", { name: /Download PDF|Preparing/ });
const wordButton = () => screen.getByRole("button", { name: /Download Word|Preparing/ });

type User = ReturnType<typeof userEvent.setup>;
let replyCount = 0;

/** Send a chat message; the mocked AI applies `update` to the current fields. */
async function say(user: User, text: string, update: (f: NdaFormData) => NdaFormData) {
  const reply = `Reply ${++replyCount}`;
  sendChat.mockImplementationOnce(async (_m: ChatMessage[], f: NdaFormData) => ({ reply, fields: update(f) }));
  await user.type(screen.getByRole("textbox", { name: "Message" }), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText(reply);
}

const fillRequired = (user: User) =>
  say(user, "Acme and Globex, Delaware law", (f) => ({
    ...f,
    governingLaw: "Delaware",
    jurisdiction: "New Castle, DE",
    party1: { ...f.party1, company: "Acme, Inc." },
    party2: { ...f.party2, company: "Globex" },
  }));

beforeEach(() => {
  downloadNda.mockReset();
  downloadNda.mockResolvedValue(undefined);
  sendChat.mockReset();
});
afterEach(cleanup);

describe("NdaCreator", () => {
  it("sets the effective date to today after mount", async () => {
    render(<NdaCreator standardTerms={terms} />);
    await waitFor(() => expect(coverValue("Effective Date")).toHaveTextContent(formatDate(todayIso())));
  });

  it("opens the chat with a greeting from the assistant", () => {
    render(<NdaCreator standardTerms={terms} />);
    const conversation = screen.getByRole("log", { name: "Conversation" });
    expect(conversation).toHaveTextContent(/draft a Mutual NDA/);
  });

  it("starts with downloads disabled and lists the missing fields", () => {
    render(<NdaCreator standardTerms={terms} />);
    expect(pdfButton()).toBeDisabled();
    expect(wordButton()).toBeDisabled();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Governing Law (state) is required.");
    expect(status).toHaveTextContent("Jurisdiction is required.");
    expect(status).toHaveTextContent("Party 1 company is required.");
    expect(status).toHaveTextContent("Party 2 company is required.");
  });

  it("shows bracketed placeholders in the preview for missing values", () => {
    render(<NdaCreator standardTerms={terms} />);
    expect(coverValue("Governing Law")).toHaveTextContent("[Governing Law]");
    expect(coverValue("Jurisdiction")).toHaveTextContent("[Jurisdiction]");
  });

  it("sends the history and current fields, then shows the reply and updates the preview", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await waitFor(() => expect(coverValue("Effective Date")).toHaveTextContent(formatDate(todayIso())));
    await say(user, "Delaware law, signer Ada Lovelace", (f) => ({
      ...f,
      governingLaw: "Delaware",
      party1: { ...f.party1, name: "Ada Lovelace" },
    }));

    const [messages, fields] = sendChat.mock.calls[0];
    expect(messages.map((m: ChatMessage) => m.role)).toEqual(["assistant", "user"]);
    expect(messages[1].content).toBe("Delaware law, signer Ada Lovelace");
    expect(fields.effectiveDate).toBe(todayIso());

    expect(screen.getByRole("log", { name: "Conversation" })).toHaveTextContent("Delaware law, signer Ada Lovelace");
    expect(coverValue("Governing Law")).toHaveTextContent(/^Delaware$/);
    expect(within(preview()).getByRole("row", { name: /Print Name/ })).toHaveTextContent("Ada Lovelace");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
  });

  it("sends the fields from the previous turn on the next turn", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await say(user, "Perpetual confidentiality", (f) => ({ ...f, confidentialityTerm: { kind: "perpetual" } }));
    const [messages, fields] = sendChat.mock.calls[1];
    expect(messages).toHaveLength(4);
    expect(fields.governingLaw).toBe("Delaware");
    expect(coverValue("Term of Confidentiality")).toHaveTextContent("In perpetuity.");
  });

  it("disables Send while waiting and for empty messages", async () => {
    let answer!: (r: unknown) => void;
    sendChat.mockReturnValue(new Promise((r) => (answer = r)));
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Message" }), "hello");
    await user.click(sendButton);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Message" }), "again");
    expect(sendButton).toBeDisabled();
    answer({ reply: "Hi there", fields: sendChat.mock.calls[0][1] });
    expect(await screen.findByText("Hi there")).toBeInTheDocument();
    expect(sendChat).toHaveBeenCalledTimes(1);
  });

  it("shows an error and keeps the fields if the assistant fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    sendChat.mockRejectedValueOnce(new Error("down"));
    await user.type(screen.getByRole("textbox", { name: "Message" }), "change it");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The assistant couldn't respond");
    expect(coverValue("Governing Law")).toHaveTextContent(/^Delaware$/);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("enables downloads once all required fields are filled", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await waitFor(() => expect(pdfButton()).toBeEnabled());
    expect(wordButton()).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("downloads the PDF with the filled NDA and a safe file name", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await user.click(pdfButton());
    expect(downloadNda).toHaveBeenCalledTimes(1);
    const [nda, format, fileName] = downloadNda.mock.calls[0];
    expect(format).toBe("pdf");
    expect(fileName).toBe("Mutual-NDA-Acme-Inc-Globex.pdf");
    expect(nda.coverFields.find((f: { label: string }) => f.label === "Governing Law").value).toBe("Delaware");
    expect(nda.standardTerms).toBe(terms);
  });

  it("downloads Word with a .docx name", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await user.click(wordButton());
    expect(downloadNda.mock.calls[0].slice(1)).toEqual(["docx", "Mutual-NDA-Acme-Inc-Globex.docx"]);
  });

  it("shows a busy state and blocks double downloads while generating", async () => {
    let finish!: () => void;
    downloadNda.mockReturnValue(new Promise<void>((r) => (finish = r)));
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await user.click(pdfButton());
    expect(screen.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download Word" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled());
    expect(downloadNda).toHaveBeenCalledTimes(1);
  });

  it("shows an error and re-enables downloads if generation fails", async () => {
    downloadNda.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await user.click(wordButton());
    expect(await screen.findByText(/Something went wrong while generating the document/)).toBeInTheDocument();
    expect(wordButton()).toBeEnabled();
  });

  it("disables downloads again when the AI clears a required field", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await say(user, "Remove the jurisdiction", (f) => ({ ...f, jurisdiction: "" }));
    expect(pdfButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Jurisdiction is required.");
  });

  it("renders user and AI text as text, never as HTML", async () => {
    const user = userEvent.setup();
    const { container } = render(<NdaCreator standardTerms={terms} />);
    await say(user, "<img src=x onerror=alert(1)>", (f) => ({ ...f, purpose: "<img src=y onerror=alert(2)>" }));
    expect(coverValue("Purpose")).toHaveTextContent("<img src=y onerror=alert(2)>");
    expect(container.querySelector("img")).toBeNull();
  });

  // Regression (found in manual testing): multi-line Modifications showed on one line.
  it("preserves line breaks in Modifications in the preview", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await say(user, "Two modifications", (f) => ({ ...f, modifications: "1. A.\n2. B." }));
    const dd = coverValue("MNDA Modifications");
    expect(dd.textContent).toBe("1. A.\n2. B.");
    expect(dd.className).toMatch(/whitespace-pre-(line|wrap)/);
  });

  it("blocks the PDF, but not Word, when names use characters the PDF font lacks", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await say(user, "Signer 山田", (f) => ({ ...f, party2: { ...f.party2, name: "山田 → ok" } }));
    expect(pdfButton()).toBeDisabled();
    expect(wordButton()).toBeEnabled();
    expect(screen.getByRole("note")).toHaveTextContent("The PDF can't display these characters: 山 田 →");

    await say(user, "Fix the name", (f) => ({ ...f, party2: { ...f.party2, name: "Łódź Жуков Ελένη Nguyễn" } }));
    expect(pdfButton()).toBeEnabled();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("renders all 11 Standard Terms clauses in the preview", () => {
    render(<NdaCreator standardTerms={terms} />);
    const items = within(screen.getByRole("region", { name: "Standard Terms" })).getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items[0]).toHaveTextContent(/^1\. Introduction\./);
  });
});
