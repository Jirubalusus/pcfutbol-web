# Stadium System QA Audit Report
**Date:** 2025-02-15 | **Branch:** feature/ranked-1v1 | **Auditor:** AI

---

## Mode-by-Mode Analysis

### 1. Career (Normal) Mode ✅
- **Accessible:** Yes, via Sidebar → Stadium tab
- **Initialization:** Correct — NEW_GAME sets level, name, realCapacity, seasonTickets, campaignOpen
- **Persistence:** Stadium state stored in game state, saved/loaded correctly
- **Income:** Season tickets collected at END of season (START_NEW_SEASON), ticket income accumulated, naming income yearly — all correct
- **Bugs:** See general bugs below

### 2. Contrarreloj Mode ✅
- **Accessible:** Yes, same Office/Sidebar as career
- **Initialization:** Correct — ContrarrelojSetup dispatches NEW_GAME with stadiumInfo/stadiumLevel
- **Income:** Works same as career mode
- **No mode-specific bugs**

### 3. ProManager Mode ✅
- **Accessible:** Yes, same Office/Sidebar
- **Initialization:** Correct — ProManagerSetup dispatches NEW_GAME with stadiumInfo/stadiumLevel
- **Team Switch:** ProManagerSeasonEnd → handleAcceptOffer dispatches PROMANAGER_SWITCH_TEAM but does NOT reset stadium state for the new team
- **Bug:** See BUG-01 below

### 4. Ranked Mode ✅ (correctly hidden)
- **Accessible:** No — hidden via `RANKED_HIDDEN_TABS` in Sidebar
- **Should be accessible:** No — ranked is ephemeral, no stadium management
- **Stadium state used?** Yes, for attendance calculation in Office.handleSimulateWeeks — uses `state.stadium` with defaults, works OK

---

## General Bugs

### 🔴 BUG-01: ProManager team switch doesn't reset stadium state
**File:** `src/context/GameContext.jsx` (PROMANAGER_SWITCH_TEAM reducer)  
**Severity:** 🔴 Critical  
**Description:** When a ProManager switches teams at season end via `handleAcceptOffer`, the `PROMANAGER_SWITCH_TEAM` action is dispatched. Need to check if it resets stadium.  
**Impact:** Player could carry over stadium naming rights, grass condition, capacity from previous team to new team.

### 🟡 BUG-02: Hardcoded Spanish strings in Stadium.jsx
**File:** `src/components/Stadium/Stadium.jsx`, lines 283, 317, 334, 355, 380, 404
**Severity:** 🟡 Medium  
**Description:** `date: \`Semana ${state.currentWeek}\`` appears in 6 ADD_MESSAGE dispatches. Should use `t('common.week')` or similar i18n key.  
**Fix:** Replace with ``date: `${t('common.week')} ${state.currentWeek}` ``

### 🟡 BUG-03: Hardcoded Spanish in sponsor offer display
**File:** `src/components/Stadium/Stadium.jsx`, lines 742-743  
**Severity:** 🟡 Medium  
**Description:** `/año` and `años` are hardcoded Spanish instead of using i18n.  
**Fix:** Use `t('stadium.perYear')` and `t('stadium.yearsRemaining', { years: sponsor.duration })`

### 🟡 BUG-04: STADIUM_LEVELS names are hardcoded Spanish
**File:** `src/components/Stadium/Stadium.jsx`, lines 71-75  
**Severity:** 🟡 Medium  
**Description:** Level names "Municipal", "Moderno", "Grande", "Élite", "Legendario" are hardcoded. The en.json has `levelNames` with translations but they're not used in Stadium.jsx.  
**Fix:** Use `t('facilities.levelNames.municipal')` etc. or build a mapping.

### 🟡 BUG-05: Fallback stadium name is hardcoded Spanish
**File:** `src/components/Stadium/Stadium.jsx`, line 416  
**Severity:** 🟡 Medium  
**Description:** `\`Estadio ${currentLevel.name}\`` — "Estadio" is hardcoded Spanish.  
**Fix:** Use `t('stadium.title')` or `t('stadium.defaultName', { level: ... })`

### 🟡 BUG-06: ADVANCE_WEEK auto-close campaign uses wrong season ticket count  
**File:** `src/context/GameContext.jsx`, ~line 1685  
**Severity:** 🟡 Medium  
**Description:** When auto-closing the season ticket campaign at deadline, it uses `state.stadium?.seasonTickets` (the initial ~40% estimate) instead of calling the `calculateSeasonTickets()` function that accounts for price, team overall, reputation, etc. This means the auto-close always fixes at the initial 40% regardless of what price the player set.  
**Fix:** The auto-close should use the same calculation as Stadium.jsx's `calculatedSeasonTickets`, or at minimum use `seasonTicketsFinal` if already set.

### 🟡 BUG-07: ProManagerSeasonEnd achievements use hardcoded Spanish
**File:** `src/components/ProManager/ProManagerSeasonEnd.jsx`, lines ~134-142  
**Severity:** 🟡 Medium  
**Description:** Strings like "¡Campeón de liga!", "Top 4 en la liga", "goles a favor", etc. are hardcoded Spanish.

### 🟢 BUG-08: STADIUM_LEVELS duplicate entry for level 0 and 1 in LEVEL_RANGES
**File:** `src/components/Stadium/Stadium.jsx`, lines 88-89  
**Severity:** 🟢 Low  
**Description:** `generateNamingOffers` has LEVEL_RANGES with 6 entries for 5 levels (indices 0-4). Entries [0] and [1] are identical `[300000, 1000000]`. The level mapping (`Math.max(0, Math.min(5, stadiumLevel))`) can reach index 5 which maps correctly, but the duplicated range for 0/1 is just cosmetic — both level 0 and level 1 get the same naming offers, which may be intended.

### 🟢 BUG-09: Event income doesn't scale with league tier
**File:** `src/components/Stadium/Stadium.jsx`, SPECIAL_EVENTS_DATA  
**Severity:** 🟢 Low  
**Description:** Concerts give €500K fixed regardless of league tier. A Segunda RFEF team hosting a concert for €500K is unrealistic. Not a bug per se but a balance issue.

### 🟢 BUG-10: Grass repair cost is fixed at €200K regardless of tier
**File:** `src/components/Stadium/Stadium.jsx`, line 376  
**Severity:** 🟢 Low  
**Description:** Same issue as events — doesn't scale.

---

## Verified Working Correctly

- ✅ Season ticket campaign opens at season start, auto-closes at week 4
- ✅ Ticket price locked after preseason (END_PRESEASON)
- ✅ Grass recovers +5%/week in ADVANCE_WEEK
- ✅ Naming rights: years decrement in START_NEW_SEASON, expire correctly
- ✅ Naming offers regenerate at season start if no deal
- ✅ Accumulated ticket income collected at season end
- ✅ Season ticket income collected at season end
- ✅ Stadium level synced with facilities.stadium
- ✅ Home advantage scales with prestige + occupancy
- ✅ Event cooldowns work per-type
- ✅ Expansion (upgrade) works, costs money, increases capacity
- ✅ Ranked mode correctly hides stadium tab
- ✅ Contrarreloj initialization correct
