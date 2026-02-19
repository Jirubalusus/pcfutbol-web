# PC GAFFER — Full Audit Report

## BUG-01 (CRITICAL) — Contrarreloj bankrupt check before transfer refunds
**File:** `src/context/GameContext.jsx`, ADVANCE_WEEK case, ~line 2555-2625
**Description:** The contrarreloj bankrupt check uses `finalMoney` which is computed as `state.money + totalIncome - salaryExpenses - loanSalaryCost`. However, `moneyReturned` from rejected/expired outgoing offers is only added AFTER the bankrupt check. A player could be incorrectly declared bankrupt when pending transfer refunds would keep them solvent.
**Fix:** Move bankrupt check after moneyReturned is calculated.

## BUG-02 (HIGH) — SeasonEnd financial summary missing seasonTicketIncomeCollected
**File:** `src/components/SeasonEnd/SeasonEnd.jsx`, ~line 1465-1475
**Description:** The displayed "Final Balance" shows `accumulatedTicketIncome` but the actual `moneyChange` sent to `START_NEW_SEASON` also includes `seasonTicketIncomeCollected`. The visual total differs from the actual money applied, confusing players.
**Fix:** Include `seasonTicketIncomeCollected` in the visual total.

## BUG-03 (HIGH) — ProManagerSeasonEnd handleRenew doesn't set europeanCalendar in state
**File:** `src/components/ProManager/ProManagerSeasonEnd.jsx`, ~line 175
**Description:** `handleRenew` dispatches `SET_EUROPEAN_CALENDAR` only if `europeanCalendar` is truthy, but the calendar is built inside a try/catch and assigned to a local var. If the calendar build fails silently, the dispatch is skipped but `finalFixtures` (which were remapped) are still dispatched, causing fixture weeks to not match the calendar — cup/European weeks break.
**Fix:** Only remap fixtures if calendar build succeeds.

## BUG-04 (MEDIUM) — ContrarrelojEnd trophies use `t` variable shadowing
**File:** `src/components/ContrarrelojEnd/ContrarrelojEnd.jsx`, ~line 188
**Description:** Inside the trophies `.map()`, the callback parameter is named `t` which shadows the `useTranslation()` `t` function. Inside the map body, `t.type`, `t.name`, `t.season` work because they access the trophy object, but if any translation call were added inside this map it would break.
**Fix:** Rename the map parameter to avoid shadowing.

## BUG-05 (HIGH) — ProManagerSeasonEnd handleAcceptOffer dispatches SET_PLAYER_LEAGUE which recalculates salaries but PROMANAGER_SWITCH_TEAM already reset the team
**File:** `src/components/ProManager/ProManagerSeasonEnd.jsx`, ~line 255-260
**Description:** `handleAcceptOffer` dispatches `PROMANAGER_SWITCH_TEAM` which resets the entire state with the new team. Then it dispatches `SET_PLAYER_LEAGUE` which triggers salary recalculation via the reducer. But `PROMANAGER_SWITCH_TEAM` doesn't set `leagueTier`, so when `SET_PLAYER_LEAGUE` compares `newLeagueTier !== oldLeagueTier`, `oldLeagueTier` is whatever was left from the previous team's league. If the tiers differ, salaries get needlessly recalculated (harmless but wasteful). More importantly, `SET_LEAGUE_TABLE` is dispatched AFTER `PROMANAGER_SWITCH_TEAM` but the fixtures are dispatched later — there's a brief state where table exists but fixtures don't match.
**Fix:** No functional bug — ordering issue is benign since React batches synchronous dispatches.

## BUG-06 (MEDIUM) — Office batch simulation doesn't handle pendingAperturaClausuraFinal
**File:** `src/components/Office/Office.jsx`, ~line 413
**Description:** The batch simulation loop checks `state.pendingAperturaClausuraFinal` as a break condition, but this value comes from the ORIGINAL state, not from the batch's current state. The local loop can't detect when an Apertura-Clausura final is triggered mid-batch because that's computed inside `ADVANCE_WEEK` reducer. The loop will continue simulating past the end of Clausura, then `ADVANCE_WEEKS_BATCH` will catch it via its internal `currentState.pendingAperturaClausuraFinal` check.
**Fix:** Actually `ADVANCE_WEEKS_BATCH` already handles this correctly with `if (currentState.pendingAperturaClausuraFinal) break;`. The local loop may run extra iterations but they're harmless since it uses `isSeasonOver` as the primary break. No fix needed.

## BUG-07 (MEDIUM) — leagueEngine sortTable not exported but used in GameContext
**File:** `src/game/leagueEngine.js` / `src/context/GameContext.jsx`
**Description:** `sortTable` is imported from leagueEngine in GameContext but needs verification it's exported. Checking... it IS exported (line visible in imports). No bug.

## Actual confirmed bugs requiring fixes:

### BUG-01: Bankrupt check before refunds (CRITICAL)
### BUG-02: Season financial display mismatch (HIGH)  
### BUG-04: Trophy map variable shadows t() (MEDIUM)
