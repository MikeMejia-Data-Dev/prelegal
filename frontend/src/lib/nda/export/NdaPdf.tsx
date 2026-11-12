import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { NdaDocument, Run } from "../types";

// Legal text should never be auto-hyphenated (react-pdf hyphenates by default).
Font.registerHyphenationCallback((word) => [word]);

// Uses the built-in Helvetica family, so no font files need to be fetched.
const styles = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 60, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.35 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 17, textAlign: "center", marginBottom: 6 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 6, marginBottom: 4 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  fieldLabel: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginTop: 4 },
  fieldDescription: { fontSize: 8.5, color: "#6b7280", marginBottom: 1 },
  fieldValue: { marginBottom: 2 },
  missing: { color: "#b45309" },
  bold: { fontFamily: "Helvetica-Bold" },
  link: { color: "#1d4ed8", textDecoration: "none" },
  table: { borderWidth: 1, borderColor: "#9ca3af", marginTop: 4, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9ca3af", minHeight: 22 },
  lastRow: { flexDirection: "row", minHeight: 22 },
  handwrittenRow: { minHeight: 44 },
  labelCell: { width: "26%", padding: 5, borderRightWidth: 1, borderRightColor: "#9ca3af" },
  partyCell: { width: "37%", padding: 5 },
  partyCellDivider: { borderRightWidth: 1, borderRightColor: "#9ca3af" },
  headCell: { fontFamily: "Helvetica-Bold", textAlign: "center" },
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
        <Text style={styles.title}>{nda.title}</Text>
        <Text style={styles.heading}>USING THIS MUTUAL NON-DISCLOSURE AGREEMENT</Text>
        <Text style={styles.paragraph}>
          <Runs runs={nda.intro} />
        </Text>

        {nda.coverFields.map((field) => (
          <View key={field.label} wrap={false}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            {field.description && <Text style={styles.fieldDescription}>{field.description}</Text>}
            <Text style={[styles.fieldValue, field.missing ? styles.missing : {}]}>{field.value}</Text>
          </View>
        ))}

        {/* Keep the signing statement together with the signature table. */}
        <View wrap={false}>
          <Text style={[styles.paragraph, { marginTop: 6 }]}>{nda.signingStatement}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.labelCell} />
              <Text style={[styles.partyCell, styles.partyCellDivider, styles.headCell]}>PARTY 1</Text>
              <Text style={[styles.partyCell, styles.headCell]}>PARTY 2</Text>
            </View>
            {nda.partyRows.map((row, i) => (
              <View
                key={row.label}
                style={[i === lastRow ? styles.lastRow : styles.row, row.handwritten ? styles.handwrittenRow : {}]}
              >
                <View style={styles.labelCell}>
                  <Text style={styles.bold}>{row.label}</Text>
                  {row.description && <Text style={styles.fieldDescription}>{row.description}</Text>}
                </View>
                <Text style={[styles.partyCell, styles.partyCellDivider]}>{row.party1}</Text>
                <Text style={styles.partyCell}>{row.party2}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          <Runs runs={nda.coverAttribution} />
        </Text>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{nda.standardTerms.title}</Text>
        {nda.standardTerms.clauses.map((clause) => (
          <Text key={clause.number} style={styles.paragraph}>
            <Text style={styles.bold}>
              {clause.number}. {clause.title}.
            </Text>{" "}
            <Runs runs={clause.body} />
          </Text>
        ))}
        <Text style={styles.footer}>
          <Runs runs={nda.standardTerms.attribution} />
        </Text>
      </Page>
    </Document>
  );
}
