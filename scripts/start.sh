#!/usr/bin/env bash
# Build the Prelegal image and run it at http://localhost:8000.
set -euo pipefail
cd "$(dirname "$0")/.."
touch .env
docker build -t prelegal .
docker rm -f prelegal >/dev/null 2>&1 || true
docker run -d --rm --name prelegal -p 8000:8000 --env-file .env prelegal
echo "Prelegal running at http://localhost:8000"
