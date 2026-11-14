# Build the frontend as static files.
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci
COPY templates /app/templates
COPY frontend ./
RUN npm run build

# Run the FastAPI backend, serving the API and the static frontend.
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend ./
RUN uv sync --frozen --no-dev
COPY --from=frontend /app/frontend/out /app/static
ENV PRELEGAL_STATIC_DIR=/app/static PRELEGAL_DB_PATH=/app/data/prelegal.db
EXPOSE 8000
CMD ["uv", "run", "--no-dev", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
