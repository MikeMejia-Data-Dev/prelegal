// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { todayIso } from "@/lib/nda/buildNda";
import { parseStandardTerms } from "@/lib/nda/parseStandardTerms";

const downloadNda = vi.fn();
vi.mock("@/lib/nda/export/download", () => ({ downloadNda: (...args: unknown[]) => downloadNda(...args) }));

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

/** The party sections are fieldsets with a legend, which RTL exposes as groups. */
const party = (n: 1 | 2) => within(screen.getByRole("group", { name: `Party ${n}` }));

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: /^Governing Law/ }), "Delaware");
  await user.type(screen.getByRole("textbox", { name: /^Jurisdiction/ }), "New Castle, DE");
  await user.type(party(1).getByRole("textbox", { name: /^Company/ }), "Acme, Inc.");
  await user.type(party(2).getByRole("textbox", { name: /^Company/ }), "Globex");
}

beforeEach(() => {
  downloadNda.mockReset();
  downloadNda.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("NdaCreator", () => {
  it("sets the effective date to today after mount", async () => {
    render(<NdaCreator standardTerms={terms} />);
    await waitFor(() => expect(screen.getByLabelText(/^Effective Date/)).toHaveValue(todayIso()));
  });

  it("starts with downloads disabled and lists the missing fields", async () => {
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

  it("updates the preview live as the user types", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await user.type(screen.getByRole("textbox", { name: /^Governing Law/ }), "Delaware");
    expect(coverValue("Governing Law")).toHaveTextContent(/^Delaware$/);
    await user.type(party(1).getByRole("textbox", { name: /^Signer name/ }), "Ada Lovelace");
    expect(within(preview()).getByRole("row", { name: /Print Name/ })).toHaveTextContent("Ada Lovelace");
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

  it("disables downloads again when a required field is cleared", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await fillRequired(user);
    await user.clear(screen.getByRole("textbox", { name: /^Jurisdiction/ }));
    expect(pdfButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Jurisdiction is required.");
  });

  it("switches MNDA Term between years and until-terminated, remembering the year count", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    const years = screen.getByRole("spinbutton", { name: "MNDA Term in years" });
    await user.clear(years);
    await user.type(years, "3");
    expect(coverValue("MNDA Term")).toHaveTextContent("Expires 3 years from Effective Date.");

    await user.click(screen.getByRole("radio", { name: /Continues until terminated/ }));
    expect(years).toBeDisabled();
    expect(coverValue("MNDA Term")).toHaveTextContent(/^Continues until terminated/);

    const radios = within(screen.getByRole("radiogroup", { name: "MNDA Term" })).getAllByRole("radio");
    await user.click(radios[0]);
    expect(years).toHaveValue(3);
    expect(coverValue("MNDA Term")).toHaveTextContent("Expires 3 years from Effective Date.");
  });

  it("supports perpetual confidentiality", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await user.click(screen.getByRole("radio", { name: "In perpetuity" }));
    expect(coverValue("Term of Confidentiality")).toHaveTextContent("In perpetuity.");
  });

  it("flags an emptied year count instead of crashing", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await user.clear(screen.getByRole("spinbutton", { name: "Term of Confidentiality in years" }));
    expect(coverValue("Term of Confidentiality")).toHaveTextContent("[Term of Confidentiality]");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Term of Confidentiality must be a whole number of years between 1 and 99.",
    );
  });

  it("renders user input as text, never as HTML", async () => {
    const user = userEvent.setup();
    const { container } = render(<NdaCreator standardTerms={terms} />);
    const purpose = screen.getByRole("textbox", { name: /^Purpose/ });
    await user.clear(purpose);
    await user.type(purpose, "<img src=x onerror=alert(1)>");
    expect(coverValue("Purpose")).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
  });

  // Found in manual testing: the preview <dd> has no `white-space: pre-line`,
  // so multi-line Modifications show on one line (the PDF keeps the breaks).
  // Flip to `it` once fixed.
  it.fails("preserves line breaks in Modifications in the preview [known bug]", async () => {
    const user = userEvent.setup();
    render(<NdaCreator standardTerms={terms} />);
    await user.type(screen.getByRole("textbox", { name: /^MNDA Modifications/ }), "1. A.{Enter}2. B.");
    const dd = coverValue("MNDA Modifications");
    expect(dd.textContent).toBe("1. A.\n2. B.");
    expect(dd.className).toMatch(/whitespace-pre-(line|wrap)/);
  });

  it("renders all 11 Standard Terms clauses in the preview", () => {
    render(<NdaCreator standardTerms={terms} />);
    const items = within(screen.getByRole("region", { name: "Standard Terms" })).getAllByRole("listitem");
    expect(items).toHaveLength(11);
    expect(items[0]).toHaveTextContent(/^1\. Introduction\./);
  });

  it("gives every form control an accessible name", () => {
    render(<NdaCreator standardTerms={terms} />);
    const form = document.querySelector("form")!;
    for (const control of form.querySelectorAll("input, textarea")) {
      expect(control).toHaveAccessibleName();
    }
  });
});
