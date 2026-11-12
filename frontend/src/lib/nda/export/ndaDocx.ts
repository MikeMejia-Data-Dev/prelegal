import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";

import type { NdaDocument, Run } from "../types";

const FONT = "Calibri";
const GRAY = "6B7280";
const AMBER = "B45309";

function runs(items: Run[], size?: number): ParagraphChild[] {
  return items.map((run) =>
    run.href
      ? new ExternalHyperlink({
          link: run.href,
          children: [new TextRun({ text: run.text, style: "Hyperlink", size })],
        })
      : new TextRun({ text: run.text, bold: run.bold, size }),
  );
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "9CA3AF" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function cell(children: Paragraph[], widthPct: number): TableCell {
  return new TableCell({ children, borders, width: { size: widthPct, type: WidthType.PERCENTAGE } });
}

function partyTable(nda: NdaDocument): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell([new Paragraph("")], 26),
      ...["PARTY 1", "PARTY 2"].map((label) =>
        cell(
          [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, bold: true })] })],
          37,
        ),
      ),
    ],
  });

  const rows = nda.partyRows.map(
    (row) =>
      new TableRow({
        // Height in twips (1/20 pt): 48pt for rows signed or dated by hand.
        height: { value: row.handwritten ? 960 : 480, rule: "atLeast" },
        children: [
          cell(
            [
              new Paragraph({ children: [new TextRun({ text: row.label, bold: true })] }),
              ...(row.description
                ? [new Paragraph({ children: [new TextRun({ text: row.description, size: 16, color: GRAY })] })]
                : []),
            ],
            26,
          ),
          cell([new Paragraph(row.party1)], 37),
          cell([new Paragraph(row.party2)], 37),
        ],
      }),
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] });
}

/** Build the completed NDA as a Word document. */
export async function ndaToDocxBlob(nda: NdaDocument): Promise<Blob> {
  const coverPage: (Paragraph | Table)[] = [
    new Paragraph({ text: nda.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: "USING THIS MUTUAL NON-DISCLOSURE AGREEMENT", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ children: runs(nda.intro), spacing: { after: 160 } }),
    ...nda.coverFields.flatMap((field) => [
      new Paragraph({ text: field.label, heading: HeadingLevel.HEADING_3, keepNext: true }),
      ...(field.description
        ? [new Paragraph({ keepNext: true, children: [new TextRun({ text: field.description, size: 18, color: GRAY })] })]
        : []),
      new Paragraph({
        children: [new TextRun({ text: field.value, color: field.missing ? AMBER : undefined })],
        spacing: { after: 120 },
      }),
    ]),
    new Paragraph({ text: nda.signingStatement, spacing: { before: 160, after: 160 } }),
    partyTable(nda),
    new Paragraph({ children: runs(nda.coverAttribution, 16), spacing: { before: 200 } }),
  ];

  const standardTerms: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ text: nda.standardTerms.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    ...nda.standardTerms.clauses.map(
      (clause) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 160 },
          children: [
            new TextRun({ text: `${clause.number}. ${clause.title}. `, bold: true }),
            ...runs(clause.body),
          ],
        }),
    ),
    new Paragraph({ children: runs(nda.standardTerms.attribution, 16), spacing: { before: 200 } }),
  ];

  const doc = new Document({
    title: nda.title,
    creator: "Prelegal",
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{ children: [...coverPage, ...standardTerms] }],
  });

  return Packer.toBlob(doc);
}
