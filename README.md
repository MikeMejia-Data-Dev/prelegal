# prelegal

Prelegal is a platform for drafting common legal agreements. Instead of starting from a blank page or
paying a lawyer to fill in a standard form, you chat with an AI assistant about your deal and Prelegal
produces a complete, ready-to-sign agreement that you can download as a PDF or Word document.

The agreements are based on [Common Paper](https://commonpaper.com) standard agreements: free,
widely used contracts written by a committee of lawyers. Each one has two parts:

- **Standard Terms**: the legal text, which stays the same for every deal.
- **Cover Page**: the deal-specific details (parties, dates, terms, governing law) that the user fills in.

Prelegal guides the user through the Cover Page and combines it with the unchanged Standard Terms.

## Status

This project is currently in progress and is expected to be completed within one week (by November 18,
2026).

All 11 Common Paper agreements in `catalog.json` (12 templates; the NDA has two) can be drafted through the AI chat: Mutual NDA,
Cloud Service, Service Level, Data Processing, Design Partner, Professional Services, Partnership,
Business Associate, Software License and Pilot Agreements, and the AI Addendum.

## What the agreement creator does

- A freeform AI chat that finds out which agreement you need and fills in its Cover Page: key terms
  such as dates, fees and governing law, plus each party's company, signer and notice address. If you
  ask for something Prelegal can't generate (e.g. a lease), it explains and offers the closest
  supported agreement. Every reply ends with a follow-up question while information is missing.
- A live preview of the full agreement that updates as the chat goes, with missing required fields highlighted.
- Download as PDF or Word (.docx). Both files contain the Standard Terms word for word.
- Chat messages are sent to the backend, which calls OpenAI (`gpt-4.1-mini`, Structured Outputs) with
  `OPENAI_API_KEY` from `.env`. The PDF and Word files are generated in the browser.
- Accounts: sign up and sign in with email and password (JWT bearer tokens). Every document you
  download is saved to **My documents**, where you can open it again and re-download it.
- Every document is marked as a draft that is subject to legal review, on screen and in the PDF and Word files.

## Repository layout

| Path | Contents |
| --- | --- |
| `templates/` | The Common Paper agreement templates, in Markdown, copied unmodified |
| `catalog.json` | A list of the templates with a short description of each |
| `documents.json` | Each supported agreement's party roles and Cover Page key terms, used by the chat and the documents |
| `frontend/` | The web app (Next.js, React, TypeScript, Tailwind), built as static files |
| `backend/` | FastAPI app (uv project): sign up/in (`/api/auth/*`, `/api/me`), saved documents (`/api/documents`), the AI chat (`/api/chat`, signed-in users only), `/api/health`, and the static frontend |
| `scripts/` | Start and stop scripts for Mac, Linux and Windows (Git Bash) |
| `Dockerfile` | Builds the frontend and backend into one container |

## Getting started

Requires Docker. Start and stop the whole app with the script for your OS:

```bash
scripts/start-linux.sh   # or start-mac.sh / start-windows.sh -> http://localhost:8000
scripts/stop-linux.sh    # or stop-mac.sh / stop-windows.sh
```

The SQLite database (users and saved documents) is temporary: it is recreated from scratch every time
the container starts, so accounts and saved documents are reset.
Settings such as API keys go in `.env` at the repository root.

### Local development

Frontend (Node.js 22), run from inside the full repository because it reads `templates/`:

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Backend ([uv](https://docs.astral.sh/uv/)), serves `frontend/out` if it has been built:

```bash
cd backend
uv run uvicorn backend.main:app --reload   # http://localhost:8000
uv run pytest
```

Other frontend commands, run from `frontend/`:

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
