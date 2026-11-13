# prelegal

Prelegal is a platform for drafting common legal agreements. Instead of starting from a blank page or
paying a lawyer to fill in a standard form, you answer a few questions about your deal and Prelegal
produces a complete, ready-to-sign agreement that you can download as a PDF or Word document.

The agreements are based on [Common Paper](https://commonpaper.com) standard agreements: free,
widely used contracts written by a committee of lawyers. Each one has two parts:

- **Standard Terms**: the legal text, which stays the same for every deal.
- **Cover Page**: the deal-specific details (parties, dates, terms, governing law) that the user fills in.

Prelegal guides the user through the Cover Page and combines it with the unchanged Standard Terms.

## Status

This project is currently in progress and is expected to be completed within one week (by November 18,
2026).

| Agreement | State |
| --- | --- |
| Mutual Non-Disclosure Agreement (NDA) | Working prototype |
| Cloud Service, Service Level, Data Processing, Design Partner, Professional Services, Partnership, Business Associate, Software License, Pilot, AI Addendum | Templates collected, creators not yet built |

## What the Mutual NDA creator does

- A form for the Cover Page: purpose, effective date, NDA term, confidentiality term, governing law,
  jurisdiction, modifications, and each party's signer and notice address.
- A live preview of the full agreement that updates as you type, with missing required fields highlighted.
- Download as PDF or Word (.docx). Both files contain the Standard Terms word for word.
- Everything runs in the browser. Nothing you enter is sent to a server.

## Repository layout

| Path | Contents |
| --- | --- |
| `templates/` | The Common Paper agreement templates, in Markdown, copied unmodified |
| `catalog.json` | A list of the templates with a short description of each |
| `frontend/` | The web app (Next.js, React, TypeScript, Tailwind) |

## Getting started

Requires Node.js 22. Run the app from inside the full repository, because it reads the templates
from `templates/`.

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Other commands, run from `frontend/`:

| Command | What it does |
| --- | --- |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | End-to-end tests in Chrome (Playwright) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

See [`frontend/README.md`](frontend/README.md) for how the app works and
[`frontend/TESTING.md`](frontend/TESTING.md) for the test coverage and manual test script.

## Disclaimer

Prelegal is not a law firm and does not give legal advice. The agreements it produces are standard
forms; have a lawyer review them before relying on them for an important deal.

## License

The application code is MIT licensed (see [`LICENSE`](LICENSE)). The agreement templates are by
Common Paper and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
[`templates/LICENSE.txt`](templates/LICENSE.txt)).
