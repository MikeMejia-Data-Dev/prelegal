# Prelegal frontend: Agreement Creator

A Next.js app that drafts any of the [Common Paper](https://commonpaper.com/standards) agreements in
`../documents.json`. The user chats with an AI assistant, which picks the agreement and fills in its
cover page terms and both parties' details.
A live preview of the full agreement updates as the chat goes, and the user downloads it as **PDF** or
**Word (.docx)**. Chat messages go to the backend (`/api/chat`); documents are generated in the browser.

## Requirements

- Node.js 22 (see `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use`

## Commands

Run these from `frontend/`:

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm install`   | Install dependencies                      |
| `npm run dev`   | Dev server at http://localhost:3000 (proxies `/api` to the backend on :8000) |
| `npm test`      | Unit and component tests (Vitest)         |
| `npm run test:e2e` | End-to-end tests in Chrome (Playwright) |
| `E2E_BASE_URL=http://localhost:8000 npm run test:e2e` | Same tests against the running container |
| `npm run lint`  | ESLint                                    |
| `npm run build` | Static export to `out/` (served by the backend) |

`.npmrc` sets `legacy-peer-deps=true`, because npm 10 crashes while resolving Vitest 4's optional peer
dependencies.

See [`TESTING.md`](TESTING.md) for test coverage and the manual test script.

## How it works

- `src/app/page.tsx` is a fake sign-in screen (no authentication yet) that leads to `/create/`.
- `src/app/create/page.tsx` is a server component. At build time `src/lib/documents/loadCatalog.ts`
  reads `../documents.json` and every template in `../templates/`. **Run the app from `frontend/`
  inside the full repository** so that these paths resolve.
- `src/components/DocumentChat.tsx` sends the conversation and the current draft (`documentId` and
  fields) to `/api/chat` (`src/lib/documents/chatApi.ts`) and takes the AI's updated draft.
- `src/lib/documents/draft.ts` turns the draft into a `LegalDocument`: the Mutual NDA keeps its typed
  fields and builder (`src/lib/nda/`); every other agreement uses `buildDocument.ts` with the key
  terms from `documents.json` and the nested clauses parsed by `parseTemplate.ts`.
- The preview (`src/components/DocumentPreview.tsx`), the PDF (`src/lib/export/DocumentPdf.tsx`,
  `@react-pdf/renderer`) and the Word file (`src/lib/export/documentDocx.ts`, `docx`) all render
  that same model.
- The PDF and Word libraries are loaded only when a download button is clicked.

## Known limitations

- The PDF uses the bundled Noto Sans font (`src/lib/export/fonts`, SIL OFL), which covers Latin,
  Greek and Cyrillic. It has no glyphs for CJK, Arabic, Hebrew, emoji and some symbols such as `→`.
  If the fields contain any of these, the PDF button is disabled with a message listing the
  characters, and the Word export still works. If you change the fonts, run
  `node scripts/generate-pdf-charset.mjs` to regenerate the supported character list.

## License

The application code is MIT licensed (see `../LICENSE`). The agreement text is from the Common Paper
standard agreements, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
`../templates/LICENSE.txt`). Generated documents include this attribution and note that the Cover Page
was completed using Prelegal.
