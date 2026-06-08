#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

WAIT_PID="${WAIT_PID:-}"
if [[ -n "$WAIT_PID" ]]; then
  echo "[queue] Waiting for existing scrape process PID $WAIT_PID before starting next blocks..."
  while kill -0 "$WAIT_PID" 2>/dev/null; do
    sleep 60
  done
  echo "[queue] Previous process PID $WAIT_PID is no longer running. Continuing."
fi

run_season() {
  local season="$1"
  local season_id
  season_id=$(node -e "const y=Number(process.argv[1]); console.log(y+'-'+String((y+1)%100).padStart(2,'0'))" "$season")

  echo ""
  echo "[queue] === Scraping full historical season ${season_id} (${season}) ==="
  node scripts/historical-db/scrape-historical-season.mjs --season "$season" --timeout-ms 30000 --slow-ms 250

  echo "[queue] Compressing ${season_id}"
  node scripts/historical-db/compress-historical-season.mjs --season "$season_id"

  echo "[queue] Updating index/public copy after ${season_id}"
  node scripts/historical-db/build-historical-index.mjs
  node scripts/historical-db/publish-local-historical-db.mjs
}

echo "[queue] Historical blocks started at $(date -Is)"

# Bloque moderno alrededor del piloto.
for season in 2015 2014 2013; do
  run_season "$season"
done

# Bloque antiguo inmediato para ampliar hacia atrás desde 2010/11.
for season in 2009 2008 2007; do
  run_season "$season"
done

echo "[queue] Running final production build after queued blocks"
npm run build

echo "[queue] Historical blocks finished at $(date -Is)"
