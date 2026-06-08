#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

WAIT_PID="${WAIT_PID:-}"
if [[ -n "$WAIT_PID" ]]; then
  echo "[queue2] Waiting for previous historical block PID $WAIT_PID..."
  while kill -0 "$WAIT_PID" 2>/dev/null; do
    sleep 60
  done
  echo "[queue2] Previous block finished. Continuing."
fi

run_season() {
  local season="$1"
  local season_id
  season_id=$(node -e "const y=Number(process.argv[1]); console.log(y+'-'+String((y+1)%100).padStart(2,'0'))" "$season")

  if [[ -f "artifacts/historical-db/seasons/${season_id}/manifest.json" ]]; then
    echo "[queue2] ${season_id} already has a manifest; skipping scrape and only ensuring compression/index later."
    node scripts/historical-db/compress-historical-season.mjs --season "$season_id" || true
    return 0
  fi

  echo ""
  echo "[queue2] === Scraping full historical season ${season_id} (${season}) ==="
  node scripts/historical-db/scrape-historical-season.mjs --season "$season" --timeout-ms 30000 --slow-ms 250
  echo "[queue2] Compressing ${season_id}"
  node scripts/historical-db/compress-historical-season.mjs --season "$season_id"
  echo "[queue2] Updating index/public copy after ${season_id}"
  node scripts/historical-db/build-historical-index.mjs
  node scripts/historical-db/publish-local-historical-db.mjs
}

echo "[queue2] More historical blocks started at $(date -Is)"

# Continuar hacia adelante desde 2016 y hacia atrás desde 2006, en bloques moderados.
for season in 2018 2017 2016; do
  run_season "$season"
done

for season in 2006 2005 2004; do
  run_season "$season"
done

echo "[queue2] Rebuilding final index/public copy"
node scripts/historical-db/build-historical-index.mjs
node scripts/historical-db/publish-local-historical-db.mjs

echo "[queue2] Running final production build after second queued blocks"
npm run build

echo "[queue2] More historical blocks finished at $(date -Is)"
