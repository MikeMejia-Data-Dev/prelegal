# Prelegal frontend: Mutual NDA Creator

A Next.js app that creates a [Common Paper Mutual NDA](https://commonpaper.com/standards/mutual-nda/1.0).
The user fills in the cover page terms and both parties' details, sees a live preview of the full
agreement, and downloads it as **PDF** or **Word (.docx)**. Everything runs in the browser and no data
is sent to a server.

## Requirements

- Node.js 22 (see `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use`

## Commands

Run these from `frontend/`:

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm install`   | Install dependencies                      |
| `npm run dev`   | Dev server at http://localhost:3000       |
| `npm test`      | Unit and component tests (Vitest)         |
| `npm run test:e2e` | End-to-end tests in Chrome (Playwright) |
| `E2E_BASE_URL=http://localhost:8000 npm run test:e2e` | Same tests against the running container |
| `npm run lint`  | ESLint                                    |
| `npm run build` | Static export to `out/` (served by the backend) |

`.npmrc` sets `legacy-peer-deps=true`, because npm 10 crashes while resolving Vitest 4's optional peer
dependencies.

See [`TESTING.md`](TESTING.md) for test coverage and the manual test script.

## How it works

- `src/app/page.tsx` is a fake sign-in screen (no authentication yet) that leads to `/nda/`.
- `src/app/nda/page.tsx` is a server component. At build time it reads the Standard Terms from
  `../templates/Mutual-NDA.md`, the dataset in the repository root (see `catalog.json`). **Run the
  app from `frontend/` inside the full repository** so that this path resolves.
- `src/lib/nda/parseStandardTerms.ts` turns the template markdown into numbered clauses.
- `src/lib/nda/buildNda.ts` combines the form values and the clauses into one `NdaDocument`.
  The preview (`src/components/NdaPreview.tsx`), the PDF (`src/lib/nda/export/NdaPdf.tsx`,
  `@react-pdf/renderer`) and the Word file (`src/lib/nda/export/ndaDocx.ts`, `docx`) all render
  that same model.
- The PDF and Word libraries are loaded only when a download button is clicked.

## Known limitations

- The PDF uses the bundled Noto Sans font (`src/lib/nda/export/fonts`, SIL OFL), which covers Latin,
  Greek and Cyrillic. It has no glyphs for CJK, Arabic, Hebrew, emoji and some symbols such as `→`.
  If the form contains any of these, the PDF button is disabled with a message listing the
  characters, and the Word export still works. If you change the fonts, run
  `node scripts/generate-pdf-charset.mjs` to regenerate the supported character list.

## License

The application code is MIT licensed (see `../LICENSE`). The agreement text is the Common Paper Mutual
NDA Version 1.0, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
`../templates/LICENSE.txt`). Generated documents include this attribution and note that the Cover Page
was completed using Prelegal.
