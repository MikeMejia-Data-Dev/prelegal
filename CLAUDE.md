# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates directory. The user can carry an AI chat in order to stablish what document they want and how to fill in the fields. The available documents are covered in catalog.json in the project root, included here:

@catalog.json

Current state: V1 is complete. Users sign up or sign in, draft any of the 11 agreements in the catalog (12 templates; the NDA has two) through the AI chat, download them as PDF or Word, and find them again under My documents. See Implementation Status below.

# Development Procecss

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira.
2. Develop the feature - do not skip any step from the freature-dev 7 step process.
3. Thoroughly test the feature with unit tests and integration tests and fix any issues.
4. Submit a PR using your github tools.

# AI Desing

When writing code to make calls to LLMs, use your openai-inference skill to call an OpenAI model directly through LiteLLM with the OpenAI API key. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENAI_API_KEY in the .env file in the project root.

# Technical Desing

The entire project should be packaged into a Docker Container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/.  
The database should use SQLLIte and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically built (Next.js `output: "export"`) and served by FastAPI.  
There should  be scripts in scripts/ for:  

```
# Mac
scripts/start-mac.sh # Start
scripts/stop-mac.sh # Stop

# Linux
scripts/start-linux.sh 
scripts/stop-linux.sh

# Windows
scripts/start-windows.sh
scripts/stop-windows.sh
```
 Backend available at http://localhost:8000

 # Color Schema

 - Accent Amber: #F59E0B
 - Indigo Primary: #4F46E5
 - Teal Secondary: #0F766E (submit buttons)
 - Deep Ink: #1E1B4B (Headings)
 - Slate Text: #475569

# Implementation Status

All tickets (PL-1 to PL-6) are merged to `main` and marked Done in Jira. No tickets are open. The Jira workflow has only To Do, In Progress and Done.

- **PL-1** (done): template dataset. Common Paper templates in `templates/` (copied unmodified) and `catalog.json`.
- **PL-2** (done, PR #3 and #4): Mutual NDA creator. A live preview and PDF/Word download, generated client-side in `frontend/`. The original form was replaced by the chat in PL-4.
- **PL-3** (done, PR #5): V1 foundation.
  - `backend/src/backend/`: `main.py` (FastAPI, `/api/health`, mounts the static frontend at `/`) and `db.py` (SQLite database recreated on startup).
  - The multi-stage `Dockerfile` (Node build, then Python/uv runtime) runs on port 8000. The `scripts/*-{mac,linux,windows}.sh` wrappers call the shared `scripts/start.sh` / `stop.sh`.
  - Tests: `cd backend && uv run pytest`; `cd frontend && npm test`, `npm run test:e2e`. Set `E2E_BASE_URL=http://localhost:8000` to run the e2e tests against the container.
- **PL-4** (done, PR #6): AI chat for the Mutual NDA.
  - `backend/src/backend/chat.py`: stateless `POST /api/chat` (request and response shape extended in PL-5). LiteLLM calls `openai/gpt-4.1-mini` with Structured Outputs. Pydantic models mirror `NdaFormData` in `frontend/src/lib/nda/types.ts`, so keep the two in sync.
  - Frontend: the chat replaced the form. The AI returns the complete fields every turn, and the preview follows them. `next dev` proxies `/api` to `:8000`.
  - Tests mock the LLM. The live tests are `cd backend && uv run pytest -k live` (needs `OPENAI_API_KEY`) and `E2E_LIVE=1 E2E_BASE_URL=http://localhost:8000 npx playwright test live-chat` against the running container.
- **PL-5** (done, PR #7): all catalog documents.
  - `documents.json` (repo root) lists each agreement's id, party roles and Cover Page key terms. Both the backend prompt (`backend/src/backend/catalog.py`) and the frontend read it, and the Dockerfile copies it into both stages.
  - `/api/chat` takes and returns `{documentId, fields}`. `fields` is `NdaFields` for `mutual-nda` and `GenericFields` (`keyTerms` list plus parties) for the rest. The AI returns a separate `question` that the backend appends to `reply`, so every turn ends with a follow-up. Unsupported requests get the closest supported document offered, and nothing is selected until the user agrees; a declined alternative is not offered again. A blank NDA `effectiveDate` from the AI defaults to today.
  - Frontend: `/create/` page lists the agreements until one is chosen. `lib/documents/` holds `parseTemplate`, `buildDocument`, `coverPage` (shared signature table and attribution), `draft` (`fitFields` keeps the parties when the document switches) and `loadCatalog`. The renderers in `lib/export/` take any `LegalDocument`. After each reply, focus returns to the message box.
  - Adding a document: add a template to `templates/` and `catalog.json`, plus an entry in `documents.json`. If the template uses the same Common Paper markdown format (nested numbered items, `*_link` spans), no code changes are needed.
- **PL-6** (done, PR #8): multiple users and polish.
  - Backend: `auth.py` (sign up/in, salted scrypt password hashes, PyJWT HS256 bearer tokens signed with a random secret per start, so sessions end on restart like the DB; `CurrentUser` dependency) and `documents.py` (`/api/documents` save/list/get, scoped to the user). `/api/chat` requires sign-in. Tables: `users`, `documents` (fields stored as JSON).
  - Saving rejects fields that don't match the document type (NDA fields only for `mutual-nda`). A duplicate email returns 409 via the UNIQUE constraint.
  - Frontend: `lib/auth.ts` (session in localStorage, `apiFetch` adds the Bearer header and sends a 401 back to sign in). `AppShell` reads the email from the stored session; a stale session is caught by the first API call. Routes: `/` sign in, `/signup/`, and in the `(app)` group under `AppShell`: `/create/`, `/documents/`, `/document/?id=`. Downloading on `/create/` saves the draft state (`documentId` plus fields) to My documents, skipping unchanged re-downloads. Saved documents are rebuilt with the same builders and are view-only.
  - `DRAFT_DISCLAIMER` (`lib/documents/coverPage.ts`) is shown in the UI and on every PDF and Word cover page.
  - Shared UI pieces live in `components/ui.tsx` (button styles, page title, `ErrorBanner`, `Loading`). `lib/documents/buildCatalog.ts` parses the catalog for both `loadCatalog` (build time) and tests (`src/test/catalog.ts`).
  - Tests: `e2e/accounts.spec.ts` uses the real backend with only `/api/chat` mocked (`E2E_BASE_URL` required).

Known limits and possible follow-ups:
- The database and sessions reset on every restart by design. Persisting them would need a mounted volume and a fixed JWT secret (`auth.SECRET`). The per-start secret also assumes a single uvicorn worker.
- The manual test script (M1–M19 in `frontend/TESTING.md`) has not been run by hand since PL-5. The automated tests cover most of it.
