# PC Gaffer cost optimization block — preprod candidate

Date: 2026-06-06
Scope: production-bound cost reduction, deployed to preprod first. This block is intentionally based on clean `origin/main` and does **not** include the ongoing Mundial Draft visual/card work.

## Hosting storage audit

Clean build result:

- `dist/`: ~31.8 MB / 125 files.
- Largest groups:
  - `data/`: ~12.0 MB.
  - `audio/`: ~11.1 MB.
  - `assets/`: ~6.1 MB.
  - `icons/`: ~1.4 MB.
- Largest files:
  - `data/all-teams.json`: ~6.4 MB.
  - `audio/synthwave-calm.mp3`: ~6.0 MB.
  - `audio/energetic.ogg`: ~2.0 MB.
  - `assets/three-*.js`: ~1.9 MB.
  - `assets/index-*.js`: ~1.3–1.4 MB.

Conclusion: a clean production candidate is not 700+ MB. The earlier 32 GB Firebase Hosting storage usage is likely caused by accumulated Hosting versions/releases and/or previous dirty deploy artifacts that included bulky folders such as `historical-db`, raw Transfermarkt data, screenshots, or temp files. Deploy from a clean `dist` only.

Manual follow-up for Firebase Console/CLI:

1. Review Hosting release/version history for production and preprod.
2. Delete/expire old preview channels/releases where possible.
3. Before any production deploy, run `npm run audit:hosting-costs` and confirm there are no deploy blockers.

## Historical DB deployment guardrail

Historical season data can be deployed in compressed form under `dist/historical-db` because the app loader/manifests use `.json.gz`. The raw per-season `.json` siblings are redundant in Hosting and can inflate deploy size dramatically.

The production build now runs:

```bash
vite build && node scripts/prune-historical-raw-json.mjs
```

The pruning script walks only `dist/historical-db`, removes only non-metadata `.json` files that have an exact sibling `.json.gz`, and preserves:

- `manifest.json`
- `index.json`
- any `.json` whose file name includes `manifest`, `index`, or `metadata`
- all `.json.gz`, images, crest files, and other non-JSON assets

The Hosting audit is also a production gate:

- `dist/raw`, `dist/transfermarkt`, `dist/screenshots`, and `dist/tmp` remain forbidden deploy blockers.
- Redundant raw historical `.json` files beside `.json.gz` are hard deploy blockers.
- Total size and large-file findings remain warnings, so large compressed historical data is visible but does not fail the audit by itself.

## Firestore read hotspots

Static audit after this block:

- `onSnapshot`: 6 call sites.
  - `rankedService`: player/queue/match/ready realtime gameplay.
  - `draftService`: queue/match realtime gameplay.
  - Kept intentionally; removing them would risk multiplayer correctness.
- `getDocs`: 27 call sites.
- `getDoc`: 33 call sites.
- `getCountFromServer`: 3 call sites, now only fallback when Contrarreloj aggregate is missing.

## Implemented cost reductions

### 1. Cached aggregate leaderboard reads

New read path:

- `leaderboard_aggregates/contrarreloj_top`
- `leaderboard_aggregates/ranked_top`

The app reads a single aggregate document first, cached in memory + localStorage. If the aggregate doc does not exist or cannot be read, it falls back to the existing legacy queries so UX keeps working.

Security decision:

- Firestore rules expose aggregate docs as public read-only.
- Browser clients do not maintain aggregate docs; this avoids leaderboard vandalism and avoids extra failed writes.
- Trusted Admin SDK job/script should rebuild aggregate docs.

### 2. Rebuild script for aggregates

Added:

```bash
npm run rebuild:leaderboard-aggregates
```

Requires trusted Admin SDK credentials, for example:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json \
FIREBASE_PROJECT_ID=pcfutbol-web \
npm run rebuild:leaderboard-aggregates
```

Writes:

- `leaderboard_aggregates/contrarreloj_top`
- `leaderboard_aggregates/ranked_top`

### 3. Persisted cache for public teams/leagues

`teamsService` now keeps public/static-ish `leagues_v2` and per-league `teams_v2` results in memory + localStorage for 24h. This reduces repeated reads for repeated visits/reloads without changing data shape.

### 4. Cost audit scripts

Added:

```bash
npm run audit:hosting-costs
npm run audit:firestore-costs
npm run audit:chunks
npm run prune:hosting-data
```

These should be part of the pre-production/prod release checklist.

## Lazy/chunk audit

Current heavy chunks after build:

- `three-*.js`: ~1.89 MB.
- main `index-*.js`: ~1.34 MB.
- `WorldCup-*.js`: ~553 KB.
- `firebase-*.js`: ~552 KB.
- `react-three-*.js`: ~485 KB.

`three`/`react-three` remain isolated chunks. Next deeper optimization, if needed, is reducing main bundle and only loading Firebase-heavy code when online/ranked/ranking screens are opened. This block reports and guards; it avoids risky app rewrites before production.

## Verification commands

Passed locally in this worktree:

```bash
npm run audit:hosting-costs
npm run audit:firestore-costs
NODE_OPTIONS='--max-old-space-size=4096' npm run build
npm run audit:chunks
git diff --check
```

## Explicitly out of scope

- No Mundial Draft visual/card redesign.
- No production deploy before Pablo approves after preprod QA.
- No removal of ranked/draft realtime listeners needed for live gameplay.

