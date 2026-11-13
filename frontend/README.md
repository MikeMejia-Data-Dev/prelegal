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
| `npm test`      | Unit tests (Vitest)                       |
| `npm run lint`  | ESLint                                    |
| `npm run build` | Production build (static page)            |
| `npm start`     | Serve the production build                |

`.npmrc` sets `legacy-peer-deps=true`, because npm 10 crashes while resolving Vitest 4's optional peer
dependencies.

## How it works

- `src/app/page.tsx` is a server component. At build time it reads the Standard Terms from
  `../templates/Mutual-NDA.md`, the dataset in the repository root (see `catalog.json`). **Run the
  app from `frontend/` inside the full repository** so that this path resolves.
- `src/lib/nda/parseStandardTerms.ts` turns the template markdown into numbered clauses.
- `src/lib/nda/buildNda.ts` combines the form values and the clauses into one `NdaDocument`.
  The preview (`src/components/NdaPreview.tsx`), the PDF (`src/lib/nda/export/NdaPdf.tsx`,
  `@react-pdf/renderer`) and the Word file (`src/lib/nda/export/ndaDocx.ts`, `docx`) all render
  that same model.
- The PDF and Word libraries are loaded only when a download button is clicked.

## Known limitations

- The PDF uses the built-in Helvetica font, so characters outside Latin-1 (for example Cyrillic,
  CJK or "Ł") won't render in the PDF. The Word export isn't affected.

## License

The application code is MIT licensed (see `../LICENSE`). The agreement text is the Common Paper Mutual
NDA Version 1.0, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
`../templates/LICENSE.txt`). Generated documents include this attribution and note that the Cover Page
was completed using Prelegal.
