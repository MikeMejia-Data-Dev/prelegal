#!/usr/bin/env bash
# Stop the running Prelegal container.
set -euo pipefail
docker stop prelegal
echo "Prelegal stopped"
