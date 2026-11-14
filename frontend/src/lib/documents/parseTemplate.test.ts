import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseTemplate } from "./parseTemplate";

const TEMPLATES = path.resolve(__dirname, "../../../../templates");
const read = (name: string) => readFileSync(path.join(TEMPLATES, name), "utf8");
const text = (runs: { text: string }[]) => runs.map((r) => r.text).join("");

const files = readdirSync(TEMPLATES).filter((f) => f.endsWith(".md") && !f.startsWith("Mutual-NDA"));

describe("parseTemplate", () => {
  it("parses nested sections with hierarchical labels", () => {
    const sla = parseTemplate(read("sla.md"));
    expect(sla.title).toBe("Service Level Agreement");
    expect(sla.clauses[0]).toMatchObject({ label: "1.", title: "Uptime", depth: 0, body: [] });
    expect(sla.clauses[1]).toMatchObject({ label: "1.1", title: "Target Uptime.", depth: 1 });
    const credit = sla.clauses.find((c) => c.depth === 2)!;
    expect(credit.label).toBe("a.");
    expect(text(credit.body)).toMatch(/^For Uptime Credit, Customer must include/);
  });

  it("marks variables as terms and keeps definitions bold", () => {
    const sla = parseTemplate(read("sla.md"));
    const definition = sla.clauses.find((c) => c.label === "4.1")!;
    expect(definition.body[0]).toEqual({ text: '"Available Minutes"', bold: true });
    expect(definition.body.filter((r) => r.term).map((r) => r.text)).toContain("Scheduled Downtime");
  });

  it("parses term references inside bold sentences", () => {
    const cap = parseTemplate(read("CSA.md")).clauses.find((c) => c.title === "Liability Cap.")!;
    expect(cap.body).toContainEqual({ text: "General Cap Amount", term: true, bold: true });
  });

  it("reads roman numeral sub-items", () => {
    const all = files.flatMap((f) => parseTemplate(read(f)).clauses);
    expect(all.some((c) => c.label === "iv." && c.depth === 3)).toBe(true);
  });

  it.each(files)("%s: parses every numbered line and leaves no markup behind", (file) => {
    const markdown = read(file);
    const { title, clauses } = parseTemplate(markdown);
    expect(title).toBeTruthy();
    expect(clauses).toHaveLength(markdown.split("\n").filter((l) => /^ *(\d+|[a-z]+)\.\s/.test(l)).length);
    const all = clauses.map((c) => c.title + text(c.body)).join("\n");
    expect(all.match(/.{0,30}(<\/?span|\*\*|\]\().{0,30}/)?.[0]).toBeUndefined();
  });

  it("throws on input without a title", () => {
    expect(() => parseTemplate("1. Hello")).toThrow();
  });
});
