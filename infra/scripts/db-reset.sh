#!/usr/bin/env bash
set -euo pipefail

# Reset the development database by removing the data volume, then start services.

COMPOSE_FILE="$(cd "$(dirname "$0")/.." && pwd)/docker-compose.yml"

echo "[db-reset] Stopping and removing containers + volumes (this deletes DB data)..."
docker compose -f "$COMPOSE_FILE" down -v

echo "[db-reset] Starting db, api, web..."
docker compose -f "$COMPOSE_FILE" up -d db api web

echo "[db-reset] Done. DB was reset and containers are up."

