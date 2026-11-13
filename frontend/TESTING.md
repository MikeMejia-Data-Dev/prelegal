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

### Regression tests for fixed bugs

These bugs were found by the review and the tests below, and are now fixed. Each has a test that would fail if it came back:

1. DOCX: line breaks in multi-line Purpose/Modifications were lost. Now written as `<w:br/>`.
2. PDF: characters outside Latin-1 (e.g. `Łódź`, Cyrillic) were garbled by the built-in Helvetica font. Now uses the bundled Noto Sans (`src/lib/nda/export/fonts`, SIL OFL). For characters Noto Sans lacks (CJK, Arabic, Hebrew, emoji, some symbols such as `→`), the PDF button is disabled with an explanation and Word stays available. After changing fonts, run `node scripts/generate-pdf-charset.mjs` (a test fails if you forget).
3. PDF: a stray hyphen was inserted where a line broke after a bold run ("Confidential Information-"). Hyphenation points are now disabled.
4. PDF: a cover field taller than a page was clipped and the rest dropped. Fields now flow across pages.
5. Preview: multi-line Modifications were shown on one line.
6. Preview and PDF: a long unbroken notice address stretched the preview table and overflowed the PDF cell. The preview table is fixed-layout; the PDF wraps long tokens after `@ . / _ -`.
7. Download file names mangled accented company names (`Société` → `Soci-t`). Accents are now transliterated (`Łódź` → `Lodz`).
8. No favicon (404 on every page load).

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

### Manual test results

**Initial run (2026-11-13, before fixes):** M1–M4, M6, M11, M12 passed. M5 (stray hyphen), M7 (preview and Word), M8 (PDF), M9 (preview and PDF) and M10 (PDF stopped at about line 86) failed. `/favicon.ico` returned 404.

**After fixes (2026-11-13, production build via `next start`, Chrome on Linux, LibreOffice for DOCX):**

| # | Result |
| --- | --- |
| M1–M12 | Pass |
| M8 | Latin Extended, Greek and Cyrillic render in the PDF. CJK and emoji disable the PDF with a message listing the characters; Word renders them |
| M5 | Typical cover page (up to about 3 Modification lines) fits on page 1 with the signature table and attribution kept together; longer cover pages move the signature block to page 2 intact |
