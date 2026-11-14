# Testing the Agreement Creator

## Automated tests

| Command | What it runs |
| --- | --- |
| `npm test` | Vitest unit and component tests (node + jsdom), ~2s |
| `npm run test:e2e` | Playwright end-to-end tests against `next dev` in the locally installed Google Chrome (desktop and Pixel 7 viewports) |
| `E2E_LIVE=1 E2E_BASE_URL=http://localhost:8000 npx playwright test live-chat` | Real AI conversations (NDA, Cloud Service Agreement, unsupported request) against the running container |
| `npx tsc --noEmit` / `npm run lint` | Type check and lint |

### Coverage at a glance

- **`buildNda.test.ts`, `buildNda.edge.test.ts`**: date parsing (leap years, bounds, malformed input), validation of every field, year-count limits, trimming, placeholders, field order, file-name slugging (path separators, reserved characters, non-ASCII).
- **`parseStandardTerms.test.ts`, `templateFidelity.test.ts`**: every clause of `templates/Mutual-NDA.md` is reproduced word for word; no words lost; typographic quotes kept; CRLF input; Cover Page labels and signing statement match `Mutual-NDA-coverpage.md`.
- **`export/export.test.tsx`, `export/exportContent.test.tsx`**: opens the generated DOCX (`word/document.xml`) and extracts PDF text with pdf.js to check the cover values, party table, all clauses, hyperlinks and XML escaping are actually in the files.
- **`export/download.test.tsx`**: blob MIME types, download file name, temporary link cleanup, object URL revocation.
- **`lib/documents/*.test.ts`**: every template parses into nested clauses with no markup left; `documents.json` covers the whole catalog; generic cover page, placeholders, validation and file names.
- **`components/DocumentCreator.test.tsx`**: chat with a mocked `/api/chat` (draft sent each turn, reply shown, focus returns to the message box, waiting state, error handling), document list before a choice, NDA and Cloud Service Agreement previews, switching documents, required-field gating of downloads, busy state, HTML escaping.
- **`e2e/nda.spec.ts`, `e2e/documents.spec.ts`**: real page load with no console errors (hydration), chat driven through a mocked `/api/chat`, real PDF and Word downloads for the NDA and a Cloud Service Agreement, responsive layout, keyboard use and focus.
- **`components/accounts.test.tsx`**: auth library (session storage, token header, 401 handling), sign in and sign up forms, the app shell's sign-in guard and sign out, My documents and the saved document view.
- **`e2e/login.spec.ts`**: sign up, wrong password, sign-in guard, sign out (API mocked).
- **`e2e/accounts.spec.ts`** (needs `E2E_BASE_URL`, real backend, AI mocked): sign up, download to save, find the document again after signing back in, users can't see each other's documents, duplicate email.
- **`e2e/live-chat.spec.ts`**: opt-in conversations with the real AI.
- **`backend/tests/test_auth.py`, `test_documents.py`**: password hashing, sign up/in, JWT validation and expiry, accounts reset on restart, saving/listing/opening documents, per-user isolation.
- **`backend/tests/test_chat.py`**: catalog prompt, Structured Outputs call (NDA and generic fields), the appended follow-up question, `/api/chat` validation, and live OpenAI tests (skipped without `OPENAI_API_KEY`).

### Regression tests for fixed bugs

These bugs were found by the review and the tests below, and are now fixed. Each has a test that would fail if it came back:

1. DOCX: line breaks in multi-line Purpose/Modifications were lost. Now written as `<w:br/>`.
2. PDF: characters outside Latin-1 (e.g. `Łódź`, Cyrillic) were garbled by the built-in Helvetica font. Now uses the bundled Noto Sans (`src/lib/export/fonts`, SIL OFL). For characters Noto Sans lacks (CJK, Arabic, Hebrew, emoji, some symbols such as `→`), the PDF button is disabled with an explanation and Word stays available. After changing fonts, run `node scripts/generate-pdf-charset.mjs` (a test fails if you forget).
3. PDF: a stray hyphen was inserted where a line broke after a bold run ("Confidential Information-"). Hyphenation points are now disabled.
4. PDF: a cover field taller than a page was clipped and the rest dropped. Fields now flow across pages.
5. Preview: multi-line Modifications were shown on one line.
6. Preview and PDF: a long unbroken notice address stretched the preview table and overflowed the PDF cell. The preview table is fixed-layout; the PDF wraps long tokens after `@ . / _ -`.
7. Download file names mangled accented company names (`Société` → `Soci-t`). Accents are now transliterated (`Łódź` → `Lodz`).
8. No favicon (404 on every page load).

## Manual test script

Start the container and open http://localhost:8000, then create an account. Repeat the downloads in at least one of Word / LibreOffice and one PDF viewer (Acrobat, Preview, Chrome).

| # | Steps | Expected |
| --- | --- | --- |
| M1 | Load the page | Chat greeting; list of the 11 supported agreements; no download buttons |
| M2 | Ask for an NDA between two companies under Delaware law, courts in Wilmington | NDA preview with today's date; AI confirms and ends with a question; buttons enable; no amber highlights |
| M3 | Ask the chat to make the MNDA continue until terminated, then go back to 2 years | Preview MNDA Term follows each change |
| M4 | Ask the chat to change something it already recorded (e.g. the jurisdiction) | Only that value changes in the preview |
| M5 | Download PDF | File `Mutual-NDA-<Party1>-<Party2>.pdf`; cover page on page 1; Standard Terms on following pages; links clickable; no hyphenation in legal text |
| M6 | Download Word | Opens without repair prompt; headings, party table and links intact |
| M7 | Ask for two numbered Modifications | Both lines on separate lines in preview, PDF and Word |
| M8 | Give accented and non-Latin names (`Société Générale`, `Łódź`, `Жуков`, `山田`) | Rendered correctly in preview, PDF and Word |
| M9 | Enter a long unbroken notice address (60+ chars) | Wraps inside its cell in preview, PDF and Word; table columns keep their proportions |
| M10 | Paste ~200 lines into Modifications | Nothing is cut off in the PDF |
| M11 | Resize to phone width (390px) | No horizontal scroll; chat above preview |
| M12 | Keyboard only: type a message, press Enter, then Tab to a download button and press Enter | Focus returns to the message box after each reply; all controls reachable; focus visible |
| M13 | Start over and ask for a cloud service agreement with a provider, customer and fees | Cloud Service Agreement preview with PROVIDER/CUSTOMER columns and nested clauses (1.1, …); AI asks for the remaining key terms; PDF and Word download once complete |
| M14 | Ask for a residential lease | AI says it can't generate it, offers the closest supported agreement and asks a question; the agreement list stays |
| M15 | Decline the offered alternative | AI doesn't offer it again and asks what you want to achieve |
| M16 | Download a document, then open My documents | It is listed with its title and date; opening it shows the preview and downloads work |
| M17 | Sign out, sign back in | My documents still lists it; a second account does not see it |
| M18 | Restart the container | Signed out; the old account and its documents are gone |
| M19 | Check the preview, PDF and Word file | Each shows the "draft, subject to legal review" disclaimer |

### Manual test results

The results recorded on 2026-11-13 were for the PL-2 form UI, which the chat has replaced. This script
has not yet been re-run by hand since PL-5. The automated e2e and live AI tests above cover M1, M2,
M5, M6, M8, M9, M11–M14, M16, M17 and M19.
