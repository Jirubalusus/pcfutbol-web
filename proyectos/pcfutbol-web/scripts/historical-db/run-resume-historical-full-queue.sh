#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

is_complete() {
  local season_id="$1"
  python3 - "$season_id" <<'PY'
import json, os, sys
sid=sys.argv[1]
base=os.path.join('artifacts','historical-db','seasons',sid)
try:
    with open(os.path.join(base,'manifest.json'), encoding='utf-8') as f:
        manifest=json.load(f)
    counts=manifest.get('counts') or {}
    ok=counts.get('leagues',0) >= 30 and counts.get('teams',0) >= 500 and counts.get('players',0) >= 15000
    ok=ok and all(os.path.exists(os.path.join(base,name+'.json')) for name in ['teams','players','squads','leagues'])
    sys.exit(0 if ok else 1)
except Exception:
    sys.exit(1)
PY
}

run_season() {
  local season="$1"
  local season_id
  season_id=$(node -e "const y=Number(process.argv[1]); console.log(y+'-'+String((y+1)%100).padStart(2,'0'))" "$season")

  if is_complete "$season_id"; then
    echo "[resume] ${season_id} ya está completo; salto scraping."
    node scripts/historical-db/compress-historical-season.mjs --season "$season_id" || true
    return 0
  fi

  echo ""
  echo "[resume] === Scraping full historical season ${season_id} (${season}) ==="
  node scripts/historical-db/scrape-historical-season.mjs --season "$season" --timeout-ms 45000 --slow-ms 250
  echo "[resume] Compressing ${season_id}"
  node scripts/historical-db/compress-historical-season.mjs --season "$season_id"
  echo "[resume] Updating index/public copy after ${season_id}"
  node scripts/historical-db/build-historical-index.mjs
  node scripts/historical-db/publish-local-historical-db.mjs
}

echo "[resume] Resumable historical full queue started at $(date -Is)"

# Núcleo restante, ordenado para cerrar primero los huecos alrededor de las temporadas ya generadas.
for season in 2008 2007 2018 2017 2016 2006 2005 2004 2026 2025 2024 2023 2022 2021 2020 2019 2003 2002 2001 2000; do
  run_season "$season"
done

echo "[resume] Rebuilding final index/public copy"
node scripts/historical-db/build-historical-index.mjs
node scripts/historical-db/publish-local-historical-db.mjs

echo "[resume] Running final production build after resumable queue"
npm run build

echo "[resume] Resumable historical full queue finished at $(date -Is)"
