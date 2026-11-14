// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NDA_ID, type DocumentSpec, type GenericFields } from "@/lib/documents/catalog";
import type { ChatMessage, DraftState } from "@/lib/documents/chatApi";
import type { Catalog } from "@/lib/documents/draft";
import { parseTemplate } from "@/lib/documents/parseTemplate";
import { defaultFormData, formatDate, todayIso } from "@/lib/nda/buildNda";
import { parseStandardTerms } from "@/lib/nda/parseStandardTerms";
import type { NdaFormData } from "@/lib/nda/types";

const downloadDocument = vi.fn();
vi.mock("@/lib/export/download", () => ({ downloadDocument: (...args: unknown[]) => downloadDocument(...args) }));
const sendChat = vi.fn();
vi.mock("@/lib/documents/chatApi", () => ({ sendChat: (...args: unknown[]) => sendChat(...args) }));
const saveDocument = vi.fn();
vi.mock("@/lib/documents/savedApi", () => ({ saveDocument: (...args: unknown[]) => saveDocument(...args) }));

import { DocumentCreator } from "./DocumentCreator";

const ROOT = path.resolve(__dirname, "../../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const specs: DocumentSpec[] = JSON.parse(read("documents.json")).documents;
const catalog: Catalog = {
  specs,
  ndaTerms: parseStandardTerms(read("templates/Mutual-NDA.md")),
  templates: Object.fromEntries(
    specs.filter((s) => s.id !== NDA_ID).map((s) => [s.id, parseTemplate(read(`templates/${s.template}`))]),
  ),
};
const csa = specs.find((s) => s.id === "csa")!;

const preview = () => screen.getByRole("region", { name: "Cover Page" });
const coverValue = (label: string) => {
  const dt = within(preview()).getByText(label, { selector: "dt" });
  const dds = dt.parentElement!.querySelectorAll("dd");
  return dds[dds.length - 1];
};
const pdfButton = () => screen.getByRole("button", { name: /Download PDF|Preparing/ });
const wordButton = () => screen.getByRole("button", { name: /Download Word|Preparing/ });
const messageBox = () => screen.getByRole("textbox", { name: "Message" });

type User = ReturnType<typeof userEvent.setup>;
let replyCount = 0;

/** Send a chat message; the mocked AI answers with `next(currentDraft)`. */
async function say(user: User, text: string, next: (draft: DraftState) => DraftState) {
  const reply = `Reply ${++replyCount}`;
  sendChat.mockImplementationOnce(async (_m: ChatMessage[], draft: DraftState) => ({ reply, ...next(draft) }));
  await user.type(messageBox(), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText(reply);
}

/** The AI picks the Mutual NDA (with its defaults) and applies `update`. */
const nda =
  (update: (f: NdaFormData) => NdaFormData = (f) => f) =>
  ({ fields }: DraftState): DraftState => ({
    documentId: NDA_ID,
    fields: update(fields && "purpose" in fields ? fields : defaultFormData()),
  });

/** The AI picks the Cloud Service Agreement and returns these fields. */
const csaWith =
  (fields: GenericFields) =>
  (): DraftState => ({ documentId: "csa", fields });

const fillRequired = (user: User) =>
  say(
    user,
    "NDA between Acme and Globex, Delaware law",
    nda((f) => ({
      ...f,
      governingLaw: "Delaware",
      jurisdiction: "New Castle, DE",
      party1: { ...f.party1, company: "Acme, Inc." },
      party2: { ...f.party2, company: "Globex" },
    })),
  );

const party = (company: string) => ({ company, name: "", title: "", noticeAddress: "" });
const completeCsa: GenericFields = {
  keyTerms: csa.keyTerms.filter((t) => t.required).map((t) => ({ key: t.key, value: `${t.label} value` })),
  party1: party("Acme, Inc."),
  party2: party("Globex"),
};

beforeEach(() => {
  downloadDocument.mockReset();
  downloadDocument.mockResolvedValue(undefined);
  sendChat.mockReset();
  saveDocument.mockReset();
  saveDocument.mockResolvedValue({ id: 1 });
});
afterEach(cleanup);

describe("DocumentCreator before a document is chosen", () => {
  it("greets the user and lists every supported agreement", () => {
    render(<DocumentCreator catalog={catalog} />);
    expect(screen.getByRole("log", { name: "Conversation" })).toHaveTextContent(/Which agreement do you need/);
    const list = within(screen.getByRole("region", { name: "Supported documents" })).getAllByRole("listitem");
    expect(list).toHaveLength(11);
    expect(list.map((li) => li.querySelector("p")!.textContent)).toContain("Cloud Service Agreement");
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
  });

  it("sends no document and no fields on the first turn", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "I need an employment contract", () => ({ documentId: null, fields: null }));
    const [messages, draft] = sendChat.mock.calls[0];
    expect(messages.map((m: ChatMessage) => m.role)).toEqual(["assistant", "user"]);
    expect(draft).toEqual({ documentId: null, fields: null });
    expect(screen.getByRole("region", { name: "Supported documents" })).toBeInTheDocument();
  });
});

describe("DocumentCreator chat", () => {
  it("shows the reply, clears the box and returns focus to it", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "Delaware law", nda((f) => ({ ...f, governingLaw: "Delaware" })));
    expect(screen.getByRole("log", { name: "Conversation" })).toHaveTextContent("Delaware law");
    expect(messageBox()).toHaveValue("");
    expect(messageBox()).toHaveFocus();
  });

  it("sends the draft from the previous turn on the next turn", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await say(user, "Perpetual confidentiality", nda((f) => ({ ...f, confidentialityTerm: { kind: "perpetual" } })));
    const [messages, draft] = sendChat.mock.calls[1];
    expect(messages).toHaveLength(4);
    expect(draft.documentId).toBe(NDA_ID);
    expect(draft.fields.governingLaw).toBe("Delaware");
    expect(coverValue("Term of Confidentiality")).toHaveTextContent("In perpetuity.");
  });

  it("disables Send while waiting and for empty messages", async () => {
    let answer!: (r: unknown) => void;
    sendChat.mockReturnValue(new Promise((r) => (answer = r)));
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();
    await user.type(messageBox(), "hello");
    await user.click(sendButton);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    await user.type(messageBox(), "again");
    expect(sendButton).toBeDisabled();
    answer({ reply: "Hi there", documentId: null, fields: null });
    expect(await screen.findByText("Hi there")).toBeInTheDocument();
    expect(sendChat).toHaveBeenCalledTimes(1);
  });

  it("shows an error, keeps the draft and returns focus if the assistant fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    sendChat.mockRejectedValueOnce(new Error("down"));
    await user.type(messageBox(), "change it");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The assistant couldn't respond");
    expect(coverValue("Governing Law")).toHaveTextContent(/^Delaware$/);
    expect(messageBox()).toHaveFocus();
  });

  it("renders user and AI text as text, never as HTML", async () => {
    const user = userEvent.setup();
    const { container } = render(<DocumentCreator catalog={catalog} />);
    await say(user, "<img src=x onerror=alert(1)>", nda((f) => ({ ...f, purpose: "<img src=y onerror=alert(2)>" })));
    expect(coverValue("Purpose")).toHaveTextContent("<img src=y onerror=alert(2)>");
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("DocumentCreator with the Mutual NDA", () => {
  it("starts from the NDA defaults with downloads disabled and the missing fields listed", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "An NDA please", nda());
    expect(coverValue("Effective Date")).toHaveTextContent(formatDate(todayIso()));
    expect(coverValue("Governing Law")).toHaveTextContent("[Governing Law]");
    expect(pdfButton()).toBeDisabled();
    expect(wordButton()).toBeDisabled();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Governing Law (state) is required.");
    expect(status).toHaveTextContent("Party 2 company is required.");
  });

  it("renders all 11 Standard Terms clauses", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "An NDA please", nda());
    const items = within(screen.getByRole("region", { name: "Standard Terms" })).getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items[0]).toHaveTextContent(/^1\. Introduction\./);
  });

  it("enables downloads once all required fields are filled", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await waitFor(() => expect(pdfButton()).toBeEnabled());
    expect(wordButton()).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("downloads the PDF with the filled NDA and a safe file name", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await user.click(pdfButton());
    const [doc, format, fileName] = downloadDocument.mock.calls[0];
    expect(format).toBe("pdf");
    expect(fileName).toBe("Mutual-NDA-Acme-Inc-Globex.pdf");
    expect(doc.coverFields.find((f: { label: string }) => f.label === "Governing Law").value).toBe("Delaware");
    expect(doc.standardTerms).toBe(catalog.ndaTerms);
  });

  it("shows a busy state and blocks double downloads while generating", async () => {
    let finish!: () => void;
    downloadDocument.mockReturnValue(new Promise<void>((r) => (finish = r)));
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await user.click(pdfButton());
    expect(screen.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download Word" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled());
    expect(downloadDocument).toHaveBeenCalledTimes(1);
  });

  it("shows an error and re-enables downloads if generation fails", async () => {
    downloadDocument.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await user.click(wordButton());
    expect(await screen.findByText(/Something went wrong while generating the document/)).toBeInTheDocument();
    expect(wordButton()).toBeEnabled();
  });

  it("disables downloads again when the AI clears a required field", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await say(user, "Remove the jurisdiction", nda((f) => ({ ...f, jurisdiction: "" })));
    expect(pdfButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Jurisdiction is required.");
  });

  // Regression (found in manual testing): multi-line Modifications showed on one line.
  it("preserves line breaks in Modifications in the preview", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "Two modifications", nda((f) => ({ ...f, modifications: "1. A.\n2. B." })));
    const dd = coverValue("MNDA Modifications");
    expect(dd.textContent).toBe("1. A.\n2. B.");
    expect(dd.className).toMatch(/whitespace-pre-(line|wrap)/);
  });

  it("blocks the PDF, but not Word, when names use characters the PDF font lacks", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await say(user, "Signer 山田", nda((f) => ({ ...f, party2: { ...f.party2, name: "山田 → ok" } })));
    expect(pdfButton()).toBeDisabled();
    expect(wordButton()).toBeEnabled();
    expect(screen.getByText(/The PDF can.t display these characters/)).toHaveTextContent("山 田 →");
  });
});

describe("DocumentCreator saving to My documents", () => {
  it("shows the draft disclaimer next to the preview", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "An NDA please", nda());
    expect(screen.getByRole("note", { name: "Disclaimer" })).toHaveTextContent(/draft.*subject to review by a qualified lawyer/);
    expect(preview()).toHaveTextContent(/subject to review by a qualified lawyer/);
  });

  it("saves the document when it is downloaded, once per version", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await user.click(pdfButton());
    expect(await screen.findByText(/Saved to/)).toHaveTextContent("Saved to My documents.");
    const [documentId, title, fields] = saveDocument.mock.calls[0];
    expect([documentId, title]).toEqual([NDA_ID, "Mutual Non-Disclosure Agreement · Acme, Inc. & Globex"]);
    expect(fields.governingLaw).toBe("Delaware");

    await user.click(wordButton());
    await waitFor(() => expect(wordButton()).toBeEnabled());
    expect(saveDocument).toHaveBeenCalledTimes(1);

    await say(user, "Jurisdiction is Wilmington", nda((f) => ({ ...f, jurisdiction: "Wilmington, DE" })));
    await user.click(wordButton());
    await waitFor(() => expect(saveDocument).toHaveBeenCalledTimes(2));
  });

  it("does not save when the download fails", async () => {
    downloadDocument.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await user.click(pdfButton());
    await screen.findByText(/Something went wrong while generating/);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("says so when the download worked but saving failed", async () => {
    saveDocument.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    await user.click(pdfButton());
    expect(await screen.findByText(/couldn't be saved to My documents/)).toBeInTheDocument();
    expect(downloadDocument).toHaveBeenCalledTimes(1);
  });
});

describe("DocumentCreator with other agreements", () => {
  it("previews the chosen agreement with its party roles and missing key terms", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "A cloud service agreement", csaWith({ keyTerms: [], party1: party("Acme, Inc."), party2: party("") }));
    expect(within(preview()).getByRole("heading", { level: 2 })).toHaveTextContent("Cloud Service Agreement");
    expect(within(preview()).getByRole("columnheader", { name: "PROVIDER" })).toBeInTheDocument();
    expect(coverValue("Governing Law")).toHaveTextContent("[Governing Law]");
    expect(coverValue("Technical Support")).toHaveTextContent("Not specified.");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Fees is required.");
    expect(status).toHaveTextContent("Customer company is required.");
    expect(status).not.toHaveTextContent("Provider company is required.");
    expect(within(screen.getByRole("region", { name: "Standard Terms" })).getByText("1.1 Access and Use.")).toBeInTheDocument();
  });

  it("downloads the completed agreement with its own file name", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "A cloud service agreement", csaWith(completeCsa));
    await user.click(wordButton());
    const [doc, format, fileName] = downloadDocument.mock.calls[0];
    expect([format, fileName]).toEqual(["docx", "CSA-Acme-Inc-Globex.docx"]);
    expect(doc.coverFields.find((f: { label: string }) => f.label === "Fees").value).toBe("Fees value");
  });

  it("switches documents, keeping the parties when the AI returns the old document's fields", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await fillRequired(user);
    expect(pdfButton()).toBeEnabled();
    await say(user, "Actually, make it a cloud service agreement", (d) => ({ documentId: "csa", fields: d.fields }));
    expect(within(preview()).getByRole("heading", { level: 2 })).toHaveTextContent("Cloud Service Agreement");
    expect(within(preview()).getByRole("row", { name: /Company/ })).toHaveTextContent("Acme, Inc.");
    expect(pdfButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Fees is required.");
    expect(screen.getByRole("status")).not.toHaveTextContent("Provider company is required.");

    await say(user, "Fees are $5 a month", () => ({ documentId: "csa", fields: null }));
    const draft = sendChat.mock.calls[2][1];
    expect(draft.fields.keyTerms).toEqual([]);
    expect(draft.fields.party1.company).toBe("Acme, Inc.");
  });

  it("goes back to the document list if the AI drops the document", async () => {
    const user = userEvent.setup();
    render(<DocumentCreator catalog={catalog} />);
    await say(user, "A cloud service agreement", csaWith(completeCsa));
    await say(user, "Never mind", () => ({ documentId: null, fields: completeCsa }));
    expect(screen.getByRole("region", { name: "Supported documents" })).toBeInTheDocument();
    await say(user, "Hello again", () => ({ documentId: null, fields: null }));
    expect(sendChat.mock.calls[2][1]).toEqual({ documentId: null, fields: null });
  });
});
