// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildNda, defaultFormData } from "../buildNda";
import { downloadNda } from "./download";

const nda = buildNda(defaultFormData(new Date(2026, 10, 12)), { title: "Standard Terms", clauses: [], attribution: [] });

let clicked: { href: string; download: string; attached: boolean }[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  clicked = [];
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("downloadNda", () => {
  it.each([
    ["pdf", "application/pdf"],
    ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ] as const)("saves a %s blob under the given file name", async (format, mime) => {
    await downloadNda(nda, format, `Mutual-NDA.${format}`);

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe(mime);
    expect(blob.size).toBeGreaterThan(1000);
    expect(clicked).toEqual([{ href: "blob:mock-url", download: `Mutual-NDA.${format}`, attached: true }]);
  }, 30_000);

  it("removes the temporary link and revokes the object URL afterwards", async () => {
    await downloadNda(nda, "docx", "x.docx");
    expect(document.querySelectorAll("a")).toHaveLength(0);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
