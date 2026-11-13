# Testing the Mutual NDA Creator

## Automated tests

| Command | What it runs |
| --- | --- |
| `npm test` | Vitest unit and component tests (node + jsdom), ~2s |
| `npm run test:e2e` | Playwright end-to-end tests against `next dev` in the locally installed Google Chrome (desktop and Pixel 7 viewports) |
| `npx tsc --noEmit` / `npm run lint` | Type check and lint |

### Coverage at a glance

- **`buildNda.test.ts`, `buildNda.edge.test.ts`**: date parsing (leap years, bounds, malformed input), validation of every field, year-count limits, trimming, placeholders, field order, file-name slugging (path separators, reserved characters, non-ASCII).
- **`parseStandardTerms.test.ts`, `templateFidelity.test.ts`**: every clause of `templates/Mutual-NDA.md` is reproduced word for word; no words lost; typographic quotes kept; CRLF input; Cover Page labels and signing statement match `Mutual-NDA-coverpage.md`.
- **`export/export.test.tsx`, `export/exportContent.test.tsx`**: opens the generated DOCX (`word/document.xml`) and extracts PDF text with pdf.js to check the cover values, party table, all clauses, hyperlinks and XML escaping are actually in the files.
- **`export/download.test.tsx`**: blob MIME types, download file name, temporary link cleanup, object URL revocation.
- **`components/NdaCreator.test.tsx`**: live preview, required-field gating of downloads, busy state / double-click protection, error handling, term radio toggles, HTML escaping, accessible names.
- **`e2e/nda.spec.ts`**: real page load with no console errors (hydration), real PDF and Word downloads, responsive layout, keyboard focus order.

### Known bugs (tests marked `it.fails`)

These tests describe the correct behaviour and currently fail on purpose. When a bug is fixed, Vitest will report the test as unexpectedly passing; change `it.fails` to `it`.

1. DOCX: line breaks in multi-line Purpose/Modifications are lost (`ndaDocx.ts` writes `\n` inside `<w:t>`).
2. PDF: characters outside Latin-1 (e.g. `Łódź`, Cyrillic, CJK) are garbled because the built-in Helvetica font is used (`NdaPdf.tsx`).
3. PDF: a stray hyphen is inserted where a line breaks after a bold run, e.g. Clause 1 reads "Confidential Information-" / "”)".
4. PDF: a cover field taller than a page (very long Modifications) is clipped and the rest silently dropped (`wrap={false}`).
5. Preview: multi-line Modifications are shown on one line.

## Manual test script

Run `npm run dev` and open http://localhost:3000. Repeat the downloads in at least one of Word / LibreOffice and one PDF viewer (Acrobat, Preview, Chrome).

| # | Steps | Expected |
| --- | --- | --- |
| M1 | Load the page | Effective Date is today; both download buttons disabled; list of 4 missing fields shown |
| M2 | Fill Governing Law, Jurisdiction, both Company fields | Buttons enable; missing-fields list disappears; preview shows values without amber highlights |
| M3 | Toggle MNDA Term to "Continues until terminated", then back | Year input disables, then re-enables with the previous number kept |
| M4 | Clear a year input | Placeholder `[MNDA Term]` in preview; downloads disabled with a clear message |
| M5 | Download PDF | File `Mutual-NDA-<Party1>-<Party2>.pdf`; cover page on page 1; Standard Terms on following pages; links clickable; no hyphenation in legal text |
| M6 | Download Word | Opens without repair prompt; headings, party table and links intact |
| M7 | Enter a 2-line Modifications | Both lines on separate lines in preview, PDF and Word |
| M8 | Enter accented and non-Latin names (`Société Générale`, `Łódź`, `Жуков`, `山田`) | Rendered correctly in preview, PDF and Word |
| M9 | Enter a long unbroken notice address (60+ chars) | Wraps inside its cell in preview, PDF and Word; table columns keep their proportions |
| M10 | Paste ~200 lines into Modifications | Nothing is cut off in the PDF |
| M11 | Resize to phone width (390px) | No horizontal scroll; form above preview |
| M12 | Keyboard only: Tab through the form, Space on radios, Enter on download | All controls reachable and operable; focus visible |

### Manual test results (2026-11-13, Chrome on Linux, LibreOffice for DOCX)

| # | Result |
| --- | --- |
| M1–M4, M6, M11, M12 | Pass |
| M5 | **Fail**: stray hyphen in Clause 1 ("Confidential Information-"); short cover pages can leave the attribution line alone on page 2 |
| M7 | **Fail** in preview and Word (one line); pass in PDF |
| M8 | **Fail** in PDF (`Łódź` → `Aódz`, Cyrillic/CJK → garbage); pass in preview and Word |
| M9 | **Fail**: in the preview the long address stretches the Party 1 column and squeezes Party 2; in the PDF it overflows past the table border. Word wraps correctly |
| M10 | **Fail**: PDF stops at about line 86 |
| — | Minor: `/favicon.ico` returns 404 (no favicon in `src/app`) |
