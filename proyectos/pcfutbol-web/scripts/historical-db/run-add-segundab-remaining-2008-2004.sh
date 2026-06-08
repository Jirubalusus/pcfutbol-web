#!/usr/bin/env bash
set -euo pipefail

SEASONS=(2008 2007 2006 2005 2004)
LEAGUES="primeraRfefG1,primeraRfefG2,primeraRfefG3,primeraRfefG4"

for season in "${SEASONS[@]}"; do
  label="$season-$(printf '%02d' $(((season + 1) % 100)))"
  echo "\n===== Adding Segunda B / Primera RFEF equivalent to $label ====="
  node scripts/historical-db/scrape-historical-season.mjs \
    --season "$season" \
    --leagues "$LEAGUES" \
    --merge-existing-raw \
    --skip-stats \
    --timeout-ms 45000 \
    --slow-ms 120
  node scripts/historical-db/compress-historical-season.mjs --season "$label"
done

node scripts/historical-db/build-historical-index.mjs
node scripts/historical-db/publish-local-historical-db.mjs
npm run build

echo "SEGUNDAB_REMAINING_2008_2004_DONE"
