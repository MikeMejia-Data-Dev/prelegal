import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ComponentProps, ReactNode } from "react";

import type { NdaDocument, Run } from "../types";
import { breakLongTokens } from "./pdfText";

/**
 * Resolve a bundled font file. Next.js emits `new URL(..., import.meta.url)`
 * assets and returns an http(s) URL; under Node (tests) it is a file: URL,
 * which react-pdf reads from disk when given a plain path.
 */
const fontSrc = (url: URL) => (url.protocol === "file:" ? decodeURIComponent(url.pathname) : url.href);

// Noto Sans (SIL OFL 1.1, see fonts/OFL.txt) covers Latin, Latin Extended,
// Greek, Cyrillic and Vietnamese. The built-in Helvetica only covers
// WinAnsi, so names like "Łódź" or "Жуков" came out garbled.
const FONT = "NotoSans";
Font.register({
  family: FONT,
  fonts: [
    { src: fontSrc(new URL("./fonts/NotoSans-Regular.ttf", import.meta.url)), fontWeight: "normal" },
    { src: fontSrc(new URL("./fonts/NotoSans-Bold.ttf", import.meta.url)), fontWeight: "bold" },
  ],
});

// Legal text should never be auto-hyphenated (react-pdf hyphenates by default).
Font.registerHyphenationCallback((word) => [word]);

/**
 * react-pdf also treats the boundary between two styled runs inside one word
 * (e.g. bold "Information" followed by "”).") as a hyphenation point and
 * inserts "-" if it breaks the line there. A penalty equal to the line
 * breaker's infinity (10000) makes those points ineligible.
 */
// `hyphenationPenalty` is supported by the layout engine but missing from the typings.
const NO_HYPHENATION = { hyphenationPenalty: 10000 } as object;

type PProps = {
  style?: ComponentProps<typeof View>["style"];
  minPresenceAhead?: number;
  children?: ReactNode;
};

/** A block of text that is never hyphenated. */
function P({ children, ...props }: PProps) {
  return (
    <Text {...NO_HYPHENATION} {...props}>
      {children}
    </Text>
  );
}

/** Characters per line that safely fit a party cell (37% of the text width at 10pt). */
const PARTY_CELL_CHARS = 26;

const styles = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 60, fontFamily: FONT, fontSize: 10, lineHeight: 1.3 },
  title: { fontWeight: "bold", fontSize: 17, textAlign: "center", marginBottom: 6 },
  heading: { fontWeight: "bold", fontSize: 11, marginTop: 6, marginBottom: 4 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  fieldLabel: { fontWeight: "bold", fontSize: 10.5, marginTop: 4 },
  fieldDescription: { fontSize: 8.5, color: "#6b7280", marginBottom: 1 },
  fieldValue: { marginBottom: 2 },
  missing: { color: "#b45309" },
  bold: { fontWeight: "bold" },
  link: { color: "#1d4ed8", textDecoration: "none" },
  table: { borderWidth: 1, borderColor: "#9ca3af", marginTop: 4, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9ca3af", minHeight: 22 },
  lastRow: { flexDirection: "row", minHeight: 22 },
  handwrittenRow: { minHeight: 44 },
  labelCell: { width: "26%", padding: 5, borderRightWidth: 1, borderRightColor: "#9ca3af" },
  partyCell: { width: "37%", padding: 5 },
  partyCellDivider: { borderRightWidth: 1, borderRightColor: "#9ca3af" },
  headCell: { fontWeight: "bold", textAlign: "center" },
  footer: { fontSize: 8, color: "#6b7280", marginTop: 4 },
});

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    if (run.href) {
      return (
        <Link key={i} src={run.href} style={styles.link}>
          {run.text}
        </Link>
      );
    }
    return (
      <Text key={i} style={run.bold ? styles.bold : undefined}>
        {run.text}
      </Text>
    );
  });
}

export function NdaPdf({ nda }: { nda: NdaDocument }) {
  const lastRow = nda.partyRows.length - 1;

  return (
    <Document title={nda.title} creator="Prelegal" producer="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <P style={styles.title}>{nda.title}</P>
        <P style={styles.heading}>USING THIS MUTUAL NON-DISCLOSURE AGREEMENT</P>
        <P style={styles.paragraph}>
          <Runs runs={nda.intro} />
        </P>

        {nda.coverFields.map((field) => (
          // Not wrap={false}: a value taller than a page (e.g. long
          // Modifications) must flow onto the next page instead of being
          // clipped. minPresenceAhead keeps a label from being stranded alone
          // at the bottom of a page.
          <View key={field.label}>
            <P style={styles.fieldLabel} minPresenceAhead={36}>
              {field.label}
            </P>
            {field.description && <P style={styles.fieldDescription}>{field.description}</P>}
            <P style={[styles.fieldValue, field.missing ? styles.missing : {}]}>{field.value}</P>
          </View>
        ))}

        {/* Keep the signing statement, signature table and attribution together. */}
        <View wrap={false}>
          <P style={[styles.paragraph, { marginTop: 6 }]}>{nda.signingStatement}</P>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.labelCell} />
              <P style={[styles.partyCell, styles.partyCellDivider, styles.headCell]}>PARTY 1</P>
              <P style={[styles.partyCell, styles.headCell]}>PARTY 2</P>
            </View>
            {nda.partyRows.map((row, i) => (
              <View
                key={row.label}
                style={[i === lastRow ? styles.lastRow : styles.row, row.handwritten ? styles.handwrittenRow : {}]}
              >
                <View style={styles.labelCell}>
                  <P style={styles.bold}>{row.label}</P>
                  {row.description && <P style={styles.fieldDescription}>{row.description}</P>}
                </View>
                <P style={[styles.partyCell, styles.partyCellDivider]}>
                  {breakLongTokens(row.party1, PARTY_CELL_CHARS)}
                </P>
                <P style={styles.partyCell}>{breakLongTokens(row.party2, PARTY_CELL_CHARS)}</P>
              </View>
            ))}
          </View>
          <P style={styles.footer}>
            <Runs runs={nda.coverAttribution} />
          </P>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <P style={styles.title}>{nda.standardTerms.title}</P>
        {nda.standardTerms.clauses.map((clause) => (
          <P key={clause.number} style={styles.paragraph}>
            <Text style={styles.bold}>
              {clause.number}. {clause.title}.
            </Text>{" "}
            <Runs runs={clause.body} />
          </P>
        ))}
        <P style={styles.footer}>
          <Runs runs={nda.standardTerms.attribution} />
        </P>
      </Page>
    </Document>
  );
}
