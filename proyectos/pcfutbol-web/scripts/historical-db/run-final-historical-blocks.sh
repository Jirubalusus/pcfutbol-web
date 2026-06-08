#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

WAIT_PID="${WAIT_PID:-}"
if [[ -n "$WAIT_PID" ]]; then
  echo "[queue3] Waiting for previous historical block PID $WAIT_PID..."
  while kill -0 "$WAIT_PID" 2>/dev/null; do
    sleep 60
  done
  echo "[queue3] Previous block finished. Continuing."
fi

run_season() {
  local season="$1"
  local season_id
  season_id=$(node -e "const y=Number(process.argv[1]); console.log(y+'-'+String((y+1)%100).padStart(2,'0'))" "$season")

  if [[ -f "artifacts/historical-db/seasons/${season_id}/manifest.json" ]]; then
    echo "[queue3] ${season_id} already has a manifest; skipping scrape and ensuring compression."
    node scripts/historical-db/compress-historical-season.mjs --season "$season_id" || true
    return 0
  fi

  echo ""
  echo "[queue3] === Scraping full historical season ${season_id} (${season}) ==="
  node scripts/historical-db/scrape-historical-season.mjs --season "$season" --timeout-ms 30000 --slow-ms 250
  echo "[queue3] Compressing ${season_id}"
  node scripts/historical-db/compress-historical-season.mjs --season "$season_id"
  echo "[queue3] Updating index/public copy after ${season_id}"
  node scripts/historical-db/build-historical-index.mjs
  node scripts/historical-db/publish-local-historical-db.mjs
}

echo "[queue3] Final historical blocks started at $(date -Is)"

# Restantes para cubrir 2000→2026 completos. Las temporadas futuras/actuales 2026-27, 2025-26, etc.
# ya fueron auditadas; se scrapean al final para evitar bloquear el núcleo histórico si alguna proyección moderna cambia.
for season in 2026 2025 2024 2023 2022 2021 2020 2019; do
  run_season "$season"
done

for season in 2003 2002 2001 2000; do
  run_season "$season"
done

echo "[queue3] Rebuilding final index/public copy"
node scripts/historical-db/build-historical-index.mjs
node scripts/historical-db/publish-local-historical-db.mjs

echo "[queue3] Running final production build after all queued historical seasons"
npm run build

echo "[queue3] Final historical blocks finished at $(date -Is)"
