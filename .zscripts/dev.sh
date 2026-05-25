#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# Force PostgreSQL URL (sandbox overwrites .env with SQLite)
export DATABASE_URL="postgresql://ptcquacktrack_adjm_user:B2ZcFtdA3vZCf5Qguepsc3sp7Cjxsapl@dpg-d841pm8jo89c73aeggn0-a.oregon-postgres.render.com/ptcquacktrack_adjm?sslmode=require&connection_limit=3&pool_timeout=30&connect_timeout=15"

# Also fix .env
echo "DATABASE_URL=$DATABASE_URL" > "$PROJECT_DIR/.env"

echo "[DEV] Installing dependencies..."
bun install

echo "[DEV] Generating Prisma client..."
DATABASE_URL="$DATABASE_URL" bun run db:generate 2>/dev/null || true

echo "[DEV] Starting development server..."
bun run dev &
DEV_PID=$!
echo $DEV_PID > "$SCRIPT_DIR/dev.pid"

# Wait for server to be ready
for i in $(seq 1 60); do
  if curl -s --connect-timeout 2 http://localhost:3000 > /dev/null 2>&1; then
    echo "[DEV] Server is ready!"
    break
  fi
  sleep 1
done

echo "[DEV] Development server running (PID: $DEV_PID)"
disown $DEV_PID 2>/dev/null || true
