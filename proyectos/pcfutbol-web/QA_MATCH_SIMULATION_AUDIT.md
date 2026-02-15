# QA Audit: Match Simulation System — PC GAFFER
**Date:** 2026-02-15 | **Branch:** feature/ranked-1v1

## Bug Report

### BUG-1 — CRITICAL: Form data completely lost in V2 match engine
**Files:** `leagueEngine.js:97-110`, `matchSimulationV2.js:156-163`
**Description:** `leagueEngine.simulateMatch()` generates AI form data and passes it as `context.homeForm` and `context.awayForm`. However, `simulateMatchV2()` destructures `playerTeamForm` (which doesn't exist in the passed context), defaulting to `{}`. It then creates new homeForm/awayForm that are empty for both teams. **All form data (excellent/good/low/terrible modifiers) is silently ignored in every match across all game modes.**
**Impact:** Form system has zero effect on match outcomes despite complex UI showing form states.
**Fix:** In `simulateMatchV2`, read `homeForm`/`awayForm` from context directly instead of reconstructing from `playerTeamForm`.

### BUG-2 — MEDIUM: Yellow/red cards inconsistent between events and stats
**File:** `matchSimulationV2.js:350-380 (events)`, `395-430 (stats)`
**Description:** `generateMatchEvents()` generates yellow and red card events independently. `generateMatchStats()` generates completely separate yellow/red card counts. The events array may show 3 yellows for home team while stats say 2. Red cards especially are generated independently (~18% each), so events could have 0 reds while stats show 1.
**Impact:** UI showing stats and event feed are contradictory. Cards dispatched to player team come from events (correct), but stats display is independent.
**Fix:** Pass event-derived card counts to stats generation, or derive stats from events.

### BUG-3 — MEDIUM: Injured/suspended players can score goals and receive cards
**File:** `matchSimulationV2.js:310-330 (selectScorer)`, `335-340 (selectRandomPlayer)`
**Description:** `selectScorer()` picks from attackers without filtering `p.injured || p.suspended`. `selectRandomPlayer()` picks from all team.players. An injured player on the roster could be attributed a goal or card.
**Impact:** Match events may reference players who should be unavailable.
**Fix:** Filter out injured/suspended players in `selectScorer` and `selectRandomPlayer`.

### BUG-4 — MEDIUM: cupSystem.js doesn't use V2 knockout mode
**File:** `cupSystem.js:194-220`
**Description:** `simulateCupRound()` calls `simulateMatch()` without `knockout: true` in context. When matches end in a draw, it does a simple coin flip for penalties instead of using V2's extra time + penalty simulation. The V2 engine has proper extra time (30% scoring chance) and penalty shootout with realistic 4-6 goals, but cup never uses it.
**Impact:** Cup knockout results are less realistic — no extra time goals, crude 50/50 penalties.
**Fix:** Pass `knockout: true` in the context and use V2's penalty result.

### BUG-5 — LOW: Default reputation fallback is 3 instead of ~70
**File:** `matchSimulationV2.js:114`
**Description:** `const reputation = team.reputation || 3;` — the `getTeamProfile()` function uses 0-100 scale (e.g., 90+ = elite), but the fallback of 3 maps to `TEAM_PROFILES.low`. Should default to 70.
**Impact:** Teams without explicit reputation are treated as very weak.
**Fix:** Change to `team.reputation || 70`.

### BUG-6 — LOW: Hardcoded Spanish strings in simulation code
**Files:** `matchSimulationV2.js` (Desconocido), `leagueEngine.js` (Desconocido, Roja directa, Segunda amarilla), `cupSystem.js` (Jugador, getCupRoundName returns Spanish)
**Description:** Multiple hardcoded Spanish strings that won't be translated.
**Impact:** Cosmetic — non-Spanish users see Spanish in match events and cup round names.

### BUG-7 — LOW: rankedSimulation.js simulateCup doesn't track round names accurately  
**File:** `rankedSimulation.js:218-260`
**Description:** Round names array `['R1', 'R2', 'R3', 'QF', 'SF', 'Final']` has fixed length. For leagues with many teams (e.g., 30 teams → 5+ rounds), later rounds use wrong names via `Math.min(roundNum - 1, roundNames.length - 1)`.
**Impact:** Cup round tracking may show "Final" for rounds that aren't the final.

---

## Positive Findings (No bugs)

1. **League table update** — `updateTable()` in leagueEngine correctly handles points (3W/1D), GD, GF, GA, form, morale, streak.
2. **Injury healing** — ADVANCE_WEEK correctly decrements `injuryWeeksLeft` and clears injury flags.
3. **Suspension handling** — SERVE_SUSPENSIONS decrements correctly. Yellow card accumulation (5 = 1 match ban) works.
4. **Medical prevention** — `medicalPrevention` is correctly passed through to V2 match engine and reduces injury chance.
5. **Grass condition** — Home advantage is correctly modulated by grass quality.
6. **postInjuryBonus** — Performance medical spec correctly gives +2 OVR for 4 weeks after recovery.
7. **Player season stats** — Goals, assists, clean sheets, cards correctly attributed from events.
8. **ADVANCE_WEEKS_BATCH** — Correctly loops ADVANCE_WEEK and auto-resolves pending cup/European matches.
9. **selectBestLineup** — Correctly filters injured/suspended players.
10. **Ranked H2H tracking** — Correctly captures head-to-head results.
