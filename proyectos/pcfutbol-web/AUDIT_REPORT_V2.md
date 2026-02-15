# Second-Pass Audit Report — Match Simulation System

## CRITICAL BUGS

### BUG-C1: rankedSimulation.js — State Mutation (fixtures mutated in place)
**File:** `rankedSimulation.js`, lines ~40-55 and ~90-105
**Issue:** `simulateHalfSeason` and `simulateFullSeason` mutate fixture objects directly:
```js
fixture.homeScore = result.homeScore;
fixture.awayScore = result.awayScore;
fixture.played = true;
```
These fixtures come from `initializeLeague()` and are stored in the returned state. The `table` is also mutated in place via the local `updateTable()` which does `home.played = (home.played || 0) + 1`.

This means `halfSeasonState.table` passed to `simulateFullSeason` is the SAME array that was already mutated. If anyone holds a reference to the original, it's corrupted.

**Severity:** CRITICAL — Can cause incorrect ranked results if state is reused.
**Fix:** Clone fixtures before mutating.

### BUG-C2: rankedSimulation.js — Local updateTable/sortTable shadow leagueEngine imports
**File:** `rankedSimulation.js`
**Issue:** The file imports `initializeLeague` and `simulateMatch` from leagueEngine but does NOT import `updateTable` or `sortTable`. Instead it defines its own local versions. The local `updateTable(table, fixture)` takes different parameters than leagueEngine's `updateTable(table, homeTeamId, awayTeamId, homeScore, awayScore)`. The local version mutates in place and doesn't track form, morale, streaks, or homeForm/awayForm. This means ranked simulations have no morale evolution — teams don't gain confidence from wins or lose it from losses. All AI teams play at flat morale 70 all season.

**Severity:** CRITICAL — Ranked results are unrealistic; morale doesn't affect AI teams.

### BUG-C3: rankedSimulation.js — Non-determinism for ranked matches
**File:** `rankedSimulation.js`
**Issue:** Both `simulateHalfSeason` and `simulateFullSeason` use `Math.random()` throughout. There is no seeded PRNG. When P1 and P2 call these functions, they get completely different results. The system relies on running the simulation on a server/single source, but if run client-side independently, results diverge.

**Severity:** MEDIUM-HIGH (depends on architecture — if server-side, OK; if both clients simulate independently, CRITICAL).

## MEDIUM BUGS

### BUG-M1: simulateWeekMatches missing context for AI matches
**File:** `leagueEngine.js`, `simulateWeekMatches()`
**Issue:** AI vs AI matches only pass `homeMorale` and `awayMorale` in context. Missing:
- `homeFormation`/`awayFormation` — defaults to 4-3-3 for all AI teams
- `homeTactic`/`awayTactic` — defaults to balanced for all AI teams
- `homeSeasonMomentum`/`awaySeasonMomentum` — never passed, defaults to 0
- `attendanceFillRate` — never passed for AI matches
- `grassCondition` — never passed for AI matches

This means all AI vs AI matches use identical tactical settings and no momentum. It reduces result variance and makes league tables less realistic.

**Severity:** MEDIUM — AI games lack variety.
**Fix:** Generate random tactics/formations for AI teams.

### BUG-M2: simulateOtherLeaguesWeek — Same issue as M1
**File:** `multiLeagueEngine.js`, `simulateOtherLeaguesWeek()`
**Issue:** Same as M1 — only morale is passed, no formations/tactics/momentum.

### BUG-M3: selectScorer in matchSimulationV2 returns object with `name` property, but event records it as `player`
**File:** `matchSimulationV2.js`, `generateMatchEvents()`
**Issue:** `selectScorer()` returns `{ name: ..., position: ... }` but events store it as `player: selectScorer(...)`. So `event.player` is an object `{ name, position }` instead of a string. BUT in the knockout extra-time code (lines ~230-235), `scorer?.name` is used correctly. And in the V2 `selectScorer`, it returns objects consistently. However, the event structure is inconsistent: regular goals have `player: { name, position }` while extra-time goals have `player: scorer?.name || '?'` (a string). UI code expecting one format may break on the other.

**Severity:** MEDIUM — Can cause display bugs in match events.

### BUG-M4: calculateSquadDepth — Division by zero when exactly 11 players
**File:** `matchSimulationV2.js`, `calculateSquadDepth()`
**Issue:** When `team.players.length === 11`, the function returns 0.5 early (safe). But if `team.players.length === 12`, `Math.min(7, 12 - 11) = 1`, so bench calculation uses 1 player — not a bug per se but gives poor depth estimate. However, the real issue: if `team.players` is empty (0 players), `starters` will be NaN (0/11 = NaN? No, `slice(0,11)` on empty array gives empty, `reduce` gives 0, `0/11 = 0`). Then returns 0.5 due to `<= 11` check. OK, no crash.

Actually wait — if `team.players` is undefined/null, `team.players.length` throws. But the guard `!team.players` catches that. **Not a bug after all.**

### BUG-M5: Extra-time goal minute can exceed 120
**File:** `matchSimulationV2.js`, knockout extra-time code
**Issue:** `minute: 90 + Math.floor(Math.random() * 30) + 1` gives 91-120, which is correct for extra time. **Not a bug.**

### BUG-M6: Office.jsx doesn't pass formation/tactic for player's match
**File:** `Office.jsx`, line ~483
**Issue:** The `simulateMatch` call in Office.jsx passes a minimal context:
```js
{ attendanceFillRate, grassCondition, medicalPrevention, playerIsHome: isHome }
```
Missing: `homeFormation`, `awayFormation`, `homeTactic`, `awayTactic`, `homeLineup`, `awayLineup`. This means when Office auto-simulates the player's match (e.g., during "simulate season"), the player's formation and tactic are NOT used. All matches default to 4-3-3 balanced.

Compare with MatchDay.jsx which correctly passes all these.

**Severity:** MEDIUM — Player's tactical choices are ignored in Office auto-sim.
**Fix:** Pass formation/tactic/lineup from state.

### BUG-M7: generateMatchEvents player field inconsistency
**File:** `matchSimulationV2.js`
**Issue:** In `generateMatchEvents`, goal events store `player: selectScorer(...)` which returns `{ name, position }`. But in the knockout extra-time block, goals store `player: scorer?.name || '?'` (a string). The `selectRandomPlayer` for cards returns `{ name }`. So events have mixed types for the `player` field.

**Severity:** MEDIUM — UI rendering issues.
**Fix:** Normalize all event player fields.

## LOW BUGS

### BUG-L1: NaN propagation in simulateGoals when profile.goalsScored is undefined
**File:** `matchSimulationV2.js`, `simulateGoals()`
**Issue:** If `homeStrength.profile` or its `goalsScored` is undefined, `homeScore = Math.round(undefined * ...)` = NaN. This shouldn't happen because `getTeamProfile` always returns a valid profile, but if `calculateMatchStrength` fails somehow, it could propagate.

### BUG-L2: TACTICS object may not have `attack` or `possession` property
**File:** `matchSimulationV2.js`, `simulateGoals()` and `generateMatchStats()`  
**Issue:** Code does `homeTacticData.attack` and `homeTacticData.possession`. If TACTICS doesn't define these for all tactics, could get undefined → NaN.

### BUG-L3: Cup matches don't pass player form data
**File:** `Office.jsx`, line ~632 (cup match simulation)
**Issue:** Cup simulation in Office doesn't pass `playerTeamForm`.

## NOT BUGS (Verified OK)
- Form data flow: leagueEngine.simulateMatch correctly generates AI form and passes player form
- matchSimulationV2 correctly reads homeForm/awayForm from context
- Card stats are derived from events (fixed in first audit)
- Cup uses knockout:true (fixed in first audit)
- Reputation fallback exists
