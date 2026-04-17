/**
 * E2E Deep Match Simulation Battery
 * Comprehensive testing: match flow, simulation integrity, injuries, suspensions,
 * standings, calendar, morale, form, finances, and persistence.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.QA_URL || 'http://localhost:5173/';
const ART = path.resolve(process.cwd(), 'artifacts');
fs.mkdirSync(ART, { recursive: true });

const findings = [];
const note = (level, area, msg, extra) => {
  findings.push({ level, area, msg, extra: extra || null, ts: Date.now() });
  const tag = level === 'bug' ? 'BUG' : level === 'warn' ? 'WARN' : 'INFO';
  console.log(`[${tag}] ${area}: ${msg}${extra ? '  ' + JSON.stringify(extra).slice(0, 300) : ''}`);
};

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(ART, `e2e-deep-${name}.png`), fullPage: false }); } catch (_) {}
}

async function waitForLoaded(page, timeout = 25000) {
  await page.waitForFunction(() => !!window.__pcfGame && window.__pcfGame.state?.loaded, { timeout }).catch(() => {});
}

async function loginAsGuest(page) {
  await waitForLoaded(page);
  await page.evaluate(() => { if (window.__pcfAuth?.loginAsGuest) window.__pcfAuth.loginAsGuest(); });
  await page.waitForFunction(() => !!window.__pcfAuth?.isAuthenticated, { timeout: 8000 }).catch(() => {});
}

async function dispatch(page, action) {
  await page.evaluate(a => window.__pcfGame.dispatch(a), action);
}

async function getState(page) {
  return page.evaluate(() => {
    const s = window.__pcfGame?.state;
    if (!s) return null;
    const lineup = s.lineup || {};
    return {
      loaded: s.loaded, currentScreen: s.currentScreen, gameStarted: s.gameStarted,
      teamId: s.teamId, teamName: s.team?.name, playerCount: s.team?.players?.length,
      leagueId: s.leagueId || s.playerLeagueId,
      money: s.money, currentWeek: s.currentWeek, currentSeason: s.currentSeason,
      preseasonPhase: s.preseasonPhase, preseasonWeek: s.preseasonWeek,
      formation: s.formation, tactic: s.tactic,
      lineupCount: Object.values(lineup).filter(Boolean).length,
      leagueTableLength: s.leagueTable?.length,
      fixtureCount: s.fixtures?.length,
      playingMatch: s.playingMatch,
      pendingEuropean: !!s.pendingEuropeanMatch, pendingSA: !!s.pendingSAMatch, pendingCup: !!s.pendingCupMatch,
      hasCupMatch: !!s.pendingCupMatch,
      hasEuropeanMatch: !!s.pendingEuropeanMatch,
      hasSAMatch: !!s.pendingSAMatch,
      stadiumLevel: s.stadium?.level,
      stadiumAccIncome: s.stadium?.accumulatedTicketIncome,
      morale: s.leagueTable?.find(t => t.teamId === s.teamId)?.morale,
    };
  });
}

async function getFullState(page) {
  return page.evaluate(() => {
    const s = window.__pcfGame?.state;
    if (!s) return null;
    return {
      leagueTable: (s.leagueTable || []).map(t => ({
        teamId: t.teamId, teamName: t.teamName, played: t.played, won: t.won,
        drawn: t.drawn, lost: t.lost, goalsFor: t.goalsFor, goalsAgainst: t.goalsAgainst,
        points: t.points, form: t.form, morale: t.morale, streak: t.streak
      })),
      players: (s.team?.players || []).map(p => ({
        name: p.name, position: p.position, overall: p.overall,
        injured: p.injured, injuryWeeksLeft: p.injuryWeeksLeft, injuryType: p.injuryType,
        yellowCards: p.yellowCards, suspended: p.suspended, suspensionMatches: p.suspensionMatches,
        goals: p.goals, assists: p.assists, matchesPlayed: p.matchesPlayed,
        onLoan: p.onLoan, loanedOut: p.loanedOut,
      })),
      results: s.results || [],
      currentWeek: s.currentWeek,
      money: s.money,
      weekFixtures: (s.fixtures || []).filter(f => f.week === s.currentWeek).map(f => ({
        homeTeam: f.homeTeam, awayTeam: f.awayTeam, played: f.played,
        homeScore: f.homeScore, awayScore: f.awayScore
      })),
      allFixtures: (s.fixtures || []).map(f => ({
        week: f.week, homeTeam: f.homeTeam, awayTeam: f.awayTeam, played: f.played,
        homeScore: f.homeScore, awayScore: f.awayScore
      })),
      lineup: Object.entries(s.lineup || {}).filter(([, v]) => v).map(([pos, p]) => ({ pos, name: p.name, injured: p.injured, suspended: p.suspended })),
      messages: (s.messages || []).slice(-15).map(m => ({ type: m.type, titleKey: m.titleKey, title: m.title })),
      playerForm: s.playerForm ? Object.fromEntries(Object.entries(s.playerForm).slice(0, 30)) : {},
      playerSeasonStats: s.playerSeasonStats || {},
    };
  });
}

// Collect console errors
const consoleErrors = [];
function monitorConsole(page) {
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', msg: err.message });
    note('bug', 'pageerror', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon') && !t.includes('Firestore') && !t.includes('Failed to load resource') &&
          !t.includes('three-globe') && !t.includes('CORS') && !t.includes('access') && !t.toLowerCase().includes('warn') &&
          !t.includes('ERR_BLOCKED_BY_CLIENT') && !t.includes('net::') && !t.includes('cdnjs') &&
          !t.includes('googletagmanager') && !t.includes('firebase') && !t.includes('googleapis')) {
        consoleErrors.push({ type: 'console.error', msg: t.slice(0, 400) });
      }
    }
  });
}

// ─── HELPERS ─────────────────────────────────────────────────

async function playMatch(page, label) {
  // Click play button
  const played = await page.evaluate(() => {
    const btns = document.querySelectorAll('.match-day__play-btn');
    const playBtn = btns[btns.length - 1];
    if (playBtn && !playBtn.disabled) { playBtn.click(); return true; }
    return false;
  });
  if (!played) {
    note('warn', label, 'Play button not clickable');
    return false;
  }
  // Wait for simulation
  await page.waitForTimeout(2500);
  // Skip to end
  await page.evaluate(() => { const s = document.querySelector('.match-day__skip-btn'); if (s) s.click(); });
  await page.waitForTimeout(1200);
  // Click continue
  const continued = await page.evaluate(() => {
    const c = document.querySelector('.match-day__continue-btn');
    if (c) { c.click(); return true; }
    return false;
  });
  if (!continued) {
    // Maybe still in playing phase, wait more
    await page.waitForTimeout(3000);
    await page.evaluate(() => { const s = document.querySelector('.match-day__skip-btn'); if (s) s.click(); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const c = document.querySelector('.match-day__continue-btn'); if (c) c.click(); });
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);
  return true;
}

async function advanceAndPlayIfMatch(page, label) {
  const beforeSt = await getState(page);
  const beforeFull = await getFullState(page);
  let leagueMatchPlayed = false;
  let cupMatchesPlayed = 0;

  // Keep advancing until the week actually changes (handles cup/European matches that
  // don't advance the week, requiring a second advance for the league match)
  for (let attempt = 0; attempt < 4; attempt++) {
    const curSt = await getState(page);
    // If week already advanced, we're done
    if (attempt > 0 && curSt.currentWeek > beforeSt.currentWeek) break;

    // Ensure in office
    if (curSt?.currentScreen !== 'office') {
      await dispatch(page, { type: 'SET_SCREEN', payload: 'office' });
      await page.waitForTimeout(500);
    }

    // Click advance
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('.office__advance-btn');
      if (btn && !btn.disabled) { btn.click(); return true; }
      return false;
    });
    if (!clicked) {
      note('warn', label, `Advance button not clickable (attempt ${attempt + 1})`);
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(1500);

    // Check if match appeared
    const matchShowing = await page.evaluate(() => !!document.querySelector('.match-day'));
    if (!matchShowing) {
      // Auto-advanced (no match or bye week)
      if (attempt === 0) note('info', label, 'No match this week (auto-advance)');
      break;
    }

    // Detect match type from state and UI
    const matchType = await page.evaluate(() => {
      const s = window.__pcfGame?.state;
      if (s?.pendingCupMatch) return 'cup';
      if (s?.pendingEuropeanMatch) return 'european';
      if (s?.pendingSAMatch) return 'sa';
      const h2 = document.querySelector('.match-day__preview h2');
      const text = h2?.textContent || '';
      if (/copa|cup/i.test(text)) return 'cup';
      if (/europa|champions|continental|libertadores|sudamericana/i.test(text)) return 'european';
      if (/amistoso|friendly/i.test(text)) return 'preseason';
      return 'league';
    });

    if (matchType !== 'league') {
      note('info', label, `${matchType} match detected (attempt ${attempt + 1}) — playing it`);
    }

    const played = await playMatch(page, `${label}${matchType !== 'league' ? `-${matchType}` : ''}`);
    if (!played) {
      note('warn', label, `Match visible but play button not available (attempt ${attempt + 1})`);
      // Try clicking the "no match" continue button
      await page.evaluate(() => {
        const btn = document.querySelector('.match-day__no-match button');
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);
      continue;
    }

    if (matchType === 'league') {
      leagueMatchPlayed = true;
    } else {
      cupMatchesPlayed++;
    }
    await page.waitForTimeout(500);
  }

  const afterSt = await getState(page);
  const afterFull = await getFullState(page);
  return { beforeSt, beforeFull, afterSt, afterFull, matchPlayed: leagueMatchPlayed, cupMatchesPlayed };
}

// ─── TABLE INTEGRITY ─────────────────────────────────────────

function checkTableIntegrity(table, label) {
  let errors = 0;
  for (const team of table) {
    // W+D+L = P
    const wdl = team.won + team.drawn + team.lost;
    if (wdl !== team.played) {
      note('bug', `${label}-integrity`, `${team.teamName}: W${team.won}+D${team.drawn}+L${team.lost}=${wdl} != P${team.played}`);
      errors++;
    }
    // Points = 3W + D
    const expectedPts = team.won * 3 + team.drawn;
    if (team.points !== expectedPts) {
      note('bug', `${label}-integrity`, `${team.teamName}: Pts${team.points} != 3*${team.won}+${team.drawn}=${expectedPts}`);
      errors++;
    }
    // Non-negative goals
    if (team.goalsFor < 0 || team.goalsAgainst < 0) {
      note('bug', `${label}-integrity`, `${team.teamName}: negative goals GF=${team.goalsFor} GA=${team.goalsAgainst}`);
      errors++;
    }
    // Form should be array of W/D/L with max 5 entries
    if (team.form && team.form.length > 5) {
      note('warn', `${label}-integrity`, `${team.teamName}: form length ${team.form.length} > 5`);
    }
  }

  // Cross-check: total goals for = total goals against (in entire table)
  const totalGF = table.reduce((s, t) => s + t.goalsFor, 0);
  const totalGA = table.reduce((s, t) => s + t.goalsAgainst, 0);
  if (totalGF !== totalGA) {
    note('bug', `${label}-integrity`, `Total GF(${totalGF}) != Total GA(${totalGA}) - goals not balanced`);
    errors++;
  }

  // Total points consistency: between 2*matches and 3*matches
  const totalPoints = table.reduce((s, t) => s + t.points, 0);
  const totalMatches = table.reduce((s, t) => s + t.played, 0) / 2;
  if (totalPoints < 2 * totalMatches || totalPoints > 3 * totalMatches) {
    note('bug', `${label}-integrity`, `Total points ${totalPoints} out of range [${2 * totalMatches}, ${3 * totalMatches}] for ${totalMatches} matches`);
    errors++;
  }

  // Table sorted by points
  for (let i = 1; i < table.length; i++) {
    if (table[i].points > table[i - 1].points) {
      note('warn', `${label}-integrity`, `Table not sorted: pos ${i} has ${table[i].points} > pos ${i - 1} has ${table[i - 1].points}`);
      break;
    }
  }

  // All teams should have played roughly same number of games
  const playedArr = table.map(t => t.played);
  const minP = Math.min(...playedArr);
  const maxP = Math.max(...playedArr);
  if (maxP - minP > 1) {
    note('warn', `${label}-integrity`, `Played spread: ${minP}-${maxP} (>1 difference)`);
  }

  return errors;
}

// ─── FIXTURE INTEGRITY ───────────────────────────────────────

function checkFixtureIntegrity(allFixtures, teamId, currentWeek, label) {
  // Played fixtures before current week should all be marked played
  const pastUnplayed = allFixtures.filter(f => f.week < currentWeek && !f.played);
  if (pastUnplayed.length > 0) {
    note('bug', `${label}-fixtures`, `${pastUnplayed.length} past fixtures not marked played (weeks before ${currentWeek})`);
  }
  // Future fixtures should not be played
  const futurePlayed = allFixtures.filter(f => f.week > currentWeek && f.played);
  if (futurePlayed.length > 0) {
    note('bug', `${label}-fixtures`, `${futurePlayed.length} future fixtures already marked played`);
  }
  // Team should appear in every week exactly once (home or away)
  const teamFixtures = allFixtures.filter(f => f.homeTeam === teamId || f.awayTeam === teamId);
  const weekMap = {};
  for (const f of teamFixtures) {
    if (weekMap[f.week]) {
      note('bug', `${label}-fixtures`, `Team has duplicate fixture in week ${f.week}`);
    }
    weekMap[f.week] = true;
  }
}

// ─── MAIN TEST ───────────────────────────────────────────────

async function run() {
  console.log('\n===  E2E DEEP MATCH SIMULATION BATTERY  ===\n');
  console.log(`Target: ${BASE}`);

  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--enable-accelerated-2d-canvas'],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();
  monitorConsole(page);

  const matchHistory = [];

  try {
    // ═══════════════ 1. GAME SETUP ═══════════════
    console.log('\n=== 1. GAME SETUP ===');
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitForLoaded(page);
    await loginAsGuest(page);
    await page.waitForTimeout(500);

    // Navigate to team selection
    await dispatch(page, { type: 'SET_SCREEN', payload: 'team_selection' });
    await page.waitForTimeout(2200);

    // Select country via mobile list or globe
    const isMobileList = await page.locator('.countries-mobile').count();
    if (isMobileList > 0) {
      await page.locator('.countries-mobile__item').first().click();
    } else {
      await page.waitForFunction(() => document.querySelectorAll('.globe-marker').length > 0, { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => {
        const el = document.querySelector('.globe-marker');
        if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    await page.waitForTimeout(900);

    // Select first league
    if (await page.locator('.map-selection__league').count() > 0) {
      await page.locator('.map-selection__league').first().click();
    }
    await page.waitForTimeout(1500);

    // Select first team
    if (await page.locator('.team-row').count() > 0) {
      await page.locator('.team-row').first().click();
    }
    await page.waitForTimeout(700);

    // Click start
    const startBtn = page.locator('.btn-start');
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
    }
    await page.waitForTimeout(1200);

    // Handle preseason modal
    const preseasonCard = page.locator('.preseason-card').first();
    if (await preseasonCard.count() > 0) {
      await preseasonCard.click();
      await page.waitForTimeout(400);
      const confirmBtn = page.locator('button').filter({ hasText: /confirmar|empezar|start|iniciar|comenzar|continuar/i }).last();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
      }
    }

    // Wait for office screen
    await page.waitForFunction(() => window.__pcfGame?.state?.currentScreen === 'office', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);

    let st = await getState(page);
    note('info', 'setup', `Game state: team=${st?.teamName}, week=${st?.currentWeek}, season=${st?.currentSeason}, preseason=${st?.preseasonPhase}`);
    await shot(page, 'setup-done');

    if (!st?.teamId) {
      note('bug', 'setup', 'Could not start a game - aborting');
      return;
    }

    // Skip preseason
    if (st.preseasonPhase) {
      note('info', 'preseason', `Skipping preseason (week ${st.preseasonWeek})...`);
      for (let i = 0; i < 10; i++) {
        st = await getState(page);
        if (!st.preseasonPhase) break;
        await page.evaluate(() => { const b = document.querySelector('.office__advance-btn'); if (b && !b.disabled) b.click(); });
        await page.waitForTimeout(1000);
        const matchDay = page.locator('.match-day').first();
        if (await matchDay.count() > 0) {
          await playMatch(page, 'preseason');
        }
      }
      st = await getState(page);
      note('info', 'preseason', `After preseason: week=${st?.currentWeek}, preseason=${st?.preseasonPhase}`);
    }

    // Ensure in office
    st = await getState(page);
    if (st?.currentScreen !== 'office') {
      await dispatch(page, { type: 'SET_SCREEN', payload: 'office' });
      await page.waitForTimeout(500);
    }

    // ═══════════════ 2. PRE-MATCH DEEP VALIDATION ═══════════════
    console.log('\n=== 2. PRE-MATCH DEEP VALIDATION ===');
    const preMatch = await getFullState(page);
    st = await getState(page);

    // 2a. Lineup check
    if (preMatch.lineup.length < 11) {
      note('warn', 'pre-match', `Lineup has ${preMatch.lineup.length} players (need 11)`);
    } else {
      note('info', 'pre-match', `Lineup: ${preMatch.lineup.length} players`);
    }

    // 2b. Injured/suspended should NOT be in lineup
    const injInLineup = preMatch.lineup.filter(l => {
      const p = preMatch.players.find(pl => pl.name === l.name);
      return p?.injured;
    });
    if (injInLineup.length > 0) {
      note('bug', 'pre-match', `Injured in lineup: ${injInLineup.map(l => l.name).join(', ')}`);
    }
    const suspInLineup = preMatch.lineup.filter(l => {
      const p = preMatch.players.find(pl => pl.name === l.name);
      return p?.suspended && p?.suspensionMatches > 0;
    });
    if (suspInLineup.length > 0) {
      note('bug', 'pre-match', `Suspended in lineup: ${suspInLineup.map(l => l.name).join(', ')}`);
    }

    // 2c. Loaned-out players should not be in lineup
    const loanedInLineup = preMatch.lineup.filter(l => {
      const p = preMatch.players.find(pl => pl.name === l.name);
      return p?.loanedOut;
    });
    if (loanedInLineup.length > 0) {
      note('bug', 'pre-match', `Loaned-out in lineup: ${loanedInLineup.map(l => l.name).join(', ')}`);
    }

    // 2d. Fixture integrity
    checkFixtureIntegrity(preMatch.allFixtures, st.teamId, preMatch.currentWeek, 'pre-match');

    // 2e. Table integrity
    const preTableErrors = checkTableIntegrity(preMatch.leagueTable, 'pre-match');
    if (preTableErrors === 0) note('info', 'pre-match', 'Table integrity OK');

    // 2f. Player form data exists
    const formKeys = Object.keys(preMatch.playerForm || {});
    note('info', 'pre-match', `Player form entries: ${formKeys.length}`);

    await shot(page, 'pre-match');

    // ═══════════════ 3. FORMATION TAB VERIFICATION ═══════════════
    console.log('\n=== 3. FORMATION TAB ===');
    await dispatch(page, { type: 'SET_OFFICE_TAB', payload: 'formation' });
    await page.waitForTimeout(800);

    const formationRendered = await page.evaluate(() => {
      const pitch = document.querySelector('.formation-pitch, .formation__pitch, .pitch-container, .formation');
      const markers = document.querySelectorAll('.pitch-marker, .formation__player, .player-dot');
      return { hasPitch: !!pitch, markerCount: markers.length };
    });
    note('info', 'formation', `Pitch rendered: ${formationRendered.hasPitch}, markers: ${formationRendered.markerCount}`);
    if (!formationRendered.hasPitch) {
      note('warn', 'formation', 'No pitch element found');
    }
    await shot(page, 'formation');

    // ═══════════════ 4-8. PLAY 5 MATCHES WITH DEEP CHECKS ═══════════════
    const MATCHES_TO_PLAY = 5;
    console.log(`\n=== 4-8. PLAY ${MATCHES_TO_PLAY} MATCHES ===`);

    for (let m = 1; m <= MATCHES_TO_PLAY; m++) {
      const label = `match-${m}`;
      console.log(`\n--- Match ${m} ---`);

      st = await getState(page);
      if (st?.currentScreen !== 'office') {
        await dispatch(page, { type: 'SET_SCREEN', payload: 'office' });
        await page.waitForTimeout(500);
      }

      const result = await advanceAndPlayIfMatch(page, label);

      if (result.cupMatchesPlayed > 0) {
        note('info', label, `Played ${result.cupMatchesPlayed} cup/european match(es) this week`);
      }

      if (result.matchPlayed) {
        // Deep post-match checks (league match was played)
        const { beforeSt, beforeFull, afterSt, afterFull } = result;

        // a. Week advanced?
        if (afterSt.currentWeek <= beforeSt.currentWeek) {
          note('bug', label, `Week did NOT advance: ${beforeSt.currentWeek} -> ${afterSt.currentWeek}`);
        }

        // b. Results count (league match was played, so results should increase)
        if (afterFull.results.length <= beforeFull.results.length) {
          note('bug', label, 'Results count did not increase');
        } else {
          const r = afterFull.results[afterFull.results.length - 1];
          note('info', label, `Result: ${r?.homeTeam} ${r?.homeScore}-${r?.awayScore} ${r?.awayTeam}`);
          matchHistory.push(r);

          // Validate score is non-negative integer
          if (r.homeScore < 0 || r.awayScore < 0 || !Number.isInteger(r.homeScore) || !Number.isInteger(r.awayScore)) {
            note('bug', label, `Invalid score: ${r.homeScore}-${r.awayScore}`);
          }
        }

        // c. Table integrity after match
        const tableErrors = checkTableIntegrity(afterFull.leagueTable, label);
        if (tableErrors === 0) note('info', label, 'Table integrity OK');

        // d. Player entry in table updated (only for league matches)
        const playerBefore = beforeFull.leagueTable.find(t => t.teamId === beforeSt.teamId);
        const playerAfter = afterFull.leagueTable.find(t => t.teamId === afterSt.teamId);
        if (playerAfter) {
          const playedDiff = (playerAfter.played || 0) - (playerBefore?.played || 0);
          if (playedDiff !== 1) {
            note('bug', label, `Played count changed by ${playedDiff} (expected 1)`);
          }
          // Points monotonically non-decreasing
          if (playerAfter.points < (playerBefore?.points || 0)) {
            note('bug', label, `Points DECREASED: ${playerBefore?.points} -> ${playerAfter.points}`);
          }
          note('info', label, `Table: P${playerAfter.played} W${playerAfter.won} D${playerAfter.drawn} L${playerAfter.lost} Pts${playerAfter.points} Form:${(playerAfter.form || []).join('')}`);
        }

        // e. Morale change
        if (playerBefore?.morale !== undefined && playerAfter?.morale !== undefined) {
          const moraleDiff = (playerAfter.morale || 0) - (playerBefore.morale || 0);
          note('info', label, `Morale: ${playerBefore.morale} -> ${playerAfter.morale} (${moraleDiff >= 0 ? '+' : ''}${moraleDiff})`);
          // Morale should be clamped 0-100
          if (playerAfter.morale < 0 || playerAfter.morale > 100) {
            note('bug', label, `Morale out of range: ${playerAfter.morale}`);
          }
        }

        // f. Injuries check
        const newInjuries = afterFull.players.filter(p => {
          const pre = beforeFull.players.find(pp => pp.name === p.name);
          return p.injured && !pre?.injured;
        });
        if (newInjuries.length > 0) {
          note('info', label, `Injuries: ${newInjuries.map(p => `${p.name}(${p.injuryType},${p.injuryWeeksLeft}w)`).join(', ')}`);
          // Injured should be removed from lineup
          const postLineupNames = new Set(afterFull.lineup.map(l => l.name));
          const injStillIn = newInjuries.filter(p => postLineupNames.has(p.name));
          if (injStillIn.length > 0) {
            note('bug', label, `Injured still in lineup: ${injStillIn.map(p => p.name).join(', ')}`);
          }
        }

        // g. Injury healing from previous weeks
        const healed = afterFull.players.filter(p => {
          const pre = beforeFull.players.find(pp => pp.name === p.name);
          return pre?.injured && pre?.injuryWeeksLeft > 0 && p.injuryWeeksLeft < pre.injuryWeeksLeft;
        });
        if (healed.length > 0) {
          note('info', label, `Healing: ${healed.map(p => `${p.name}(${p.injuryWeeksLeft}w left)`).join(', ')}`);
        }

        // h. Cards and suspensions
        const newYellows = afterFull.players.filter(p => {
          const pre = beforeFull.players.find(pp => pp.name === p.name);
          return (p.yellowCards || 0) > (pre?.yellowCards || 0);
        });
        if (newYellows.length > 0) {
          note('info', label, `Yellows: ${newYellows.map(p => `${p.name}(total:${p.yellowCards})`).join(', ')}`);
        }

        const newSusp = afterFull.players.filter(p => {
          const pre = beforeFull.players.find(pp => pp.name === p.name);
          return p.suspended && !pre?.suspended;
        });
        if (newSusp.length > 0) {
          note('info', label, `New suspensions: ${newSusp.map(p => `${p.name}(${p.suspensionMatches}m)`).join(', ')}`);
          // Suspended should not be in lineup
          const postLineupNames = new Set(afterFull.lineup.map(l => l.name));
          const suspStillIn = newSusp.filter(p => postLineupNames.has(p.name));
          if (suspStillIn.length > 0) {
            note('bug', label, `Suspended still in lineup: ${suspStillIn.map(p => p.name).join(', ')}`);
          }
        }

        // i. Financial impact (money should change if home match with attendance)
        const moneyDiff = (afterSt.money || 0) - (beforeSt.money || 0);
        if (moneyDiff !== 0) {
          note('info', label, `Money: ${beforeSt.money?.toLocaleString()} -> ${afterSt.money?.toLocaleString()} (${moneyDiff >= 0 ? '+' : ''}${moneyDiff.toLocaleString()})`);
        }

        // j. Lineup count should still be 11 after replacements
        if (afterFull.lineup.length < 11) {
          note('warn', label, `Post-match lineup only ${afterFull.lineup.length} players`);
        }

        await shot(page, `post-match-${m}`);
      } else {
        // No match this week, still check state consistency
        if (result.afterSt.currentWeek <= result.beforeSt.currentWeek) {
          note('warn', label, `Week did not advance (no match). Still ${result.afterSt.currentWeek}`);
        }
      }
    }

    // ═══════════════ 9. CALENDAR DEEP CHECK ═══════════════
    console.log('\n=== 9. CALENDAR DEEP CHECK ===');
    st = await getState(page);
    if (st?.currentScreen !== 'office') {
      await dispatch(page, { type: 'SET_SCREEN', payload: 'office' });
      await page.waitForTimeout(500);
    }
    await dispatch(page, { type: 'SET_OFFICE_TAB', payload: 'calendar' });
    await page.waitForTimeout(800);

    const calendarInfo = await page.evaluate(() => {
      const items = document.querySelectorAll('.calendar-item, .calendar__match, .calendar__week, .fixture-item');
      return { itemCount: items.length };
    });
    note('info', 'calendar', `Calendar items rendered: ${calendarInfo.itemCount}`);
    if (calendarInfo.itemCount === 0) {
      note('warn', 'calendar', 'No calendar items found in DOM');
    }
    await shot(page, 'calendar');

    // Deep fixture check
    const fullState = await getFullState(page);
    checkFixtureIntegrity(fullState.allFixtures, st.teamId, fullState.currentWeek, 'calendar');

    // ═══════════════ 10. FINAL LEAGUE TABLE ═══════════════
    console.log('\n=== 10. FINAL LEAGUE TABLE ===');
    await dispatch(page, { type: 'SET_OFFICE_TAB', payload: 'competitions' });
    await page.waitForTimeout(800);
    await shot(page, 'league-table');

    const finalFull = await getFullState(page);
    const finalSt = await getState(page);

    const finalTableErrors = checkTableIntegrity(finalFull.leagueTable, 'final-table');
    if (finalTableErrors === 0) note('info', 'final-table', 'Final table integrity: ALL CHECKS PASS');

    // Print top 5
    finalFull.leagueTable.slice(0, 5).forEach((t, i) => {
      note('info', 'table', `${i + 1}. ${t.teamName} P${t.played} W${t.won} D${t.drawn} L${t.lost} GD${t.goalsFor - t.goalsAgainst >= 0 ? '+' : ''}${t.goalsFor - t.goalsAgainst} Pts${t.points}`);
    });

    // ═══════════════ 11. SQUAD STATS AFTER MATCHES ═══════════════
    console.log('\n=== 11. SQUAD STATS ===');
    await dispatch(page, { type: 'SET_OFFICE_TAB', payload: 'plantilla' });
    await page.waitForTimeout(800);
    await shot(page, 'plantilla');

    const squad = finalFull.players;
    const injured = squad.filter(p => p.injured);
    const suspended = squad.filter(p => p.suspended);
    const scorers = squad.filter(p => (p.goals || 0) > 0).sort((a, b) => b.goals - a.goals);
    const assisters = squad.filter(p => (p.assists || 0) > 0).sort((a, b) => b.assists - a.assists);

    note('info', 'squad', `Injured: ${injured.length} | Suspended: ${suspended.length}`);
    if (scorers.length > 0) note('info', 'squad', `Top scorer: ${scorers[0].name} (${scorers[0].goals}g)`);
    if (assisters.length > 0) note('info', 'squad', `Top assister: ${assisters[0].name} (${assisters[0].assists}a)`);

    // Check that matchesPlayed is tracked in playerSeasonStats (not in player objects)
    const seasonStats = finalFull.playerSeasonStats || {};
    const withMatches = Object.entries(seasonStats).filter(([, s]) => (s.matchesPlayed || 0) > 0);
    if (withMatches.length === 0 && matchHistory.length > 0) {
      note('warn', 'squad', 'No players have matchesPlayed > 0 in playerSeasonStats despite playing matches');
    } else {
      note('info', 'squad', `Players with matchesPlayed > 0 (from seasonStats): ${withMatches.length}`);
      if (withMatches.length > 0) {
        const topPlayed = withMatches.sort((a, b) => b[1].matchesPlayed - a[1].matchesPlayed);
        note('info', 'squad', `Most appearances: ${topPlayed[0][0]} (${topPlayed[0][1].matchesPlayed}m)`);
      }
    }

    // ═══════════════ 12. PERSISTENCE TEST ═══════════════
    console.log('\n=== 12. PERSISTENCE TEST ===');
    const beforeReload = await getState(page);
    const beforeReloadFull = await getFullState(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForLoaded(page);
    await page.waitForTimeout(3000);

    let afterReload = await getState(page);

    // Guest might need re-login
    if (!afterReload?.gameStarted) {
      await loginAsGuest(page);
      await page.waitForTimeout(2500);
      afterReload = await getState(page);
    }

    if (afterReload?.gameStarted && afterReload?.teamId === beforeReload?.teamId) {
      note('info', 'persistence', 'Game persisted across reload');

      // Check week
      if (afterReload.currentWeek !== beforeReload.currentWeek) {
        note('warn', 'persistence', `Week drift: ${beforeReload.currentWeek} -> ${afterReload.currentWeek}`);
      }
      // Check money
      if (afterReload.money !== beforeReload.money) {
        note('warn', 'persistence', `Money drift: ${beforeReload.money} -> ${afterReload.money}`);
      }
      // Check league table persisted
      const afterReloadFull = await getFullState(page);
      const reloadedEntry = afterReloadFull.leagueTable.find(t => t.teamId === afterReload.teamId);
      const preReloadEntry = beforeReloadFull.leagueTable.find(t => t.teamId === beforeReload.teamId);
      if (reloadedEntry && preReloadEntry) {
        if (reloadedEntry.played !== preReloadEntry.played || reloadedEntry.points !== preReloadEntry.points) {
          note('bug', 'persistence', `Table state changed after reload: P${preReloadEntry.played}/${reloadedEntry.played} Pts${preReloadEntry.points}/${reloadedEntry.points}`);
        } else {
          note('info', 'persistence', 'Table state consistent after reload');
        }
      }

      // Check injuries persisted
      const reloadInjured = afterReloadFull.players.filter(p => p.injured);
      const preReloadInjured = beforeReloadFull.players.filter(p => p.injured);
      if (reloadInjured.length !== preReloadInjured.length) {
        note('warn', 'persistence', `Injury count changed: ${preReloadInjured.length} -> ${reloadInjured.length}`);
      }

      // Check lineup persisted
      if (afterReloadFull.lineup.length !== beforeReloadFull.lineup.length) {
        note('warn', 'persistence', `Lineup count changed: ${beforeReloadFull.lineup.length} -> ${afterReloadFull.lineup.length}`);
      }
    } else {
      note('warn', 'persistence', 'Game state lost after reload (guest mode may not persist)');
    }

    await shot(page, 'after-reload');

    // ═══════════════ 13. MATCH HISTORY CONSISTENCY ═══════════════
    console.log('\n=== 13. MATCH HISTORY CONSISTENCY ===');
    if (matchHistory.length > 0) {
      // All results should have valid team IDs and scores
      for (const r of matchHistory) {
        if (!r.homeTeam || !r.awayTeam) {
          note('bug', 'history', `Result missing team: ${JSON.stringify(r)}`);
        }
        if (r.homeScore === null || r.homeScore === undefined || r.awayScore === null || r.awayScore === undefined) {
          note('bug', 'history', `Result missing score: ${JSON.stringify(r)}`);
        }
      }
      note('info', 'history', `${matchHistory.length} matches recorded, all have valid structure`);
    }

  } catch (err) {
    note('bug', 'fatal', `Unhandled error: ${err.message}\n${err.stack?.slice(0, 500)}`);
    await shot(page, 'fatal-error');
  } finally {
    await browser.close();
  }

  // ═══════════════ SUMMARY ═══════════════
  console.log('\n' + '='.repeat(60));
  console.log('  E2E DEEP MATCH SIMULATION - SUMMARY');
  console.log('='.repeat(60));

  const bugs = findings.filter(f => f.level === 'bug');
  const warns = findings.filter(f => f.level === 'warn');
  const infos = findings.filter(f => f.level === 'info');

  console.log(`\n  BUGS:     ${bugs.length}`);
  console.log(`  WARNINGS: ${warns.length}`);
  console.log(`  INFO:     ${infos.length}`);

  if (bugs.length > 0) {
    console.log('\n  BUGS FOUND:');
    bugs.forEach(b => console.log(`    [${b.area}] ${b.msg}`));
  }
  if (warns.length > 0) {
    console.log('\n  WARNINGS:');
    warns.forEach(w => console.log(`    [${w.area}] ${w.msg}`));
  }

  if (consoleErrors.length > 0) {
    console.log(`\n  Console errors: ${consoleErrors.length}`);
    consoleErrors.slice(0, 8).forEach(e => console.log(`    [${e.type}] ${e.msg.slice(0, 200)}`));
  }

  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { bugs: bugs.length, warnings: warns.length, infos: infos.length, consoleErrors: consoleErrors.length },
    findings,
    consoleErrors: consoleErrors.slice(0, 30),
    matchHistory,
  };
  fs.writeFileSync(path.join(ART, 'e2e-deep-match-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n  Report: artifacts/e2e-deep-match-report.json`);
  console.log('='.repeat(60) + '\n');

  process.exit(bugs.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
