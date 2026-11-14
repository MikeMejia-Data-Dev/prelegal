# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates directory. The user can carry an AI chat in order to stablish what document they want and how to fill in the fields. The available documents are covered in catalog.json in the project root, included here:

@catalog.json

Current state: all 11 agreements in the catalog (12 templates; the NDA has two) can be drafted through the AI chat. See Implementation Status below.

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

- **PL-2** (done): Mutual NDA creator. A live preview and PDF/Word download, generated client-side in `frontend/`. The original form was replaced by the chat in PL-4.
- **PL-3** (done): V1 foundation.
  - `backend/src/backend/`: `main.py` (FastAPI, `/api/health`, mounts the static frontend at `/`) and `db.py` (SQLite `users` table recreated on startup; no sign up/sign in endpoints yet).
  - Frontend: fake sign-in at `/` (no auth) leads to the creator (now at `/create/`).
  - The multi-stage `Dockerfile` (Node build, then Python/uv runtime) runs on port 8000. The `scripts/*-{mac,linux,windows}.sh` wrappers call the shared `scripts/start.sh` / `stop.sh`.
  - Tests: `cd backend && uv run pytest`; `cd frontend && npm test`, `npm run test:e2e`. Set `E2E_BASE_URL=http://localhost:8000` to run the e2e tests against the container.
- **PL-4** (done): AI chat for the Mutual NDA.
  - `backend/src/backend/chat.py`: stateless `POST /api/chat` (request and response shape extended in PL-5). LiteLLM calls `openai/gpt-4.1-mini` with Structured Outputs. Pydantic models mirror `NdaFormData` in `frontend/src/lib/nda/types.ts`, so keep the two in sync.
  - Frontend: the chat replaced the form. The AI returns the complete fields every turn, and the preview follows them. `next dev` proxies `/api` to `:8000`.
  - Tests mock the LLM. The live tests are the backend `test_live_llm_fills_fields` (needs `OPENAI_API_KEY`) and `E2E_LIVE=1 E2E_BASE_URL=http://localhost:8000 npx playwright test live-chat`.
- **PL-5** (done): all catalog documents.
  - `documents.json` (repo root) lists each agreement's id, party roles and Cover Page key terms. Both the backend prompt (`backend/src/backend/catalog.py`) and the frontend read it, and the Dockerfile copies it into both stages.
  - `/api/chat` takes and returns `{documentId, fields}`. `fields` is `NdaFields` for `mutual-nda` and `GenericFields` (`keyTerms` list plus parties) for the rest. The AI returns a separate `question` that the backend appends to `reply`, so every turn ends with a follow-up. Unsupported requests get the closest supported document offered, and nothing is selected until the user agrees.
  - Frontend: `/create/` page; `lib/documents/` (`parseTemplate`, `buildDocument`, `draft`, `loadCatalog`); renderers in `lib/export/` take any `LegalDocument`. After each reply, focus returns to the message box.
- **Not yet built**: real authentication (sign up/sign in endpoints and UI) and storing conversations.
