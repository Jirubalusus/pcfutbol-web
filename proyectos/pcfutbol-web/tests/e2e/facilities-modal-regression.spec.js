// @ts-check
import { test, expect } from 'playwright/test';

async function waitForLoaded(page) {
  await page.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 15_000 }).catch(() => {});
}

async function loginAsGuest(page) {
  await page.waitForFunction(() => window.__pcfAuth && typeof window.__pcfAuth.loginAsGuest === 'function', { timeout: 15_000 });
  await page.evaluate(() => window.__pcfAuth.loginAsGuest());
  await page.waitForFunction(() => !!document.querySelector('.main-menu__mode-card--hero'), { timeout: 15_000 });
}

async function startInjectedGame(page) {
  await page.waitForFunction(() => window.__pcfGame && typeof window.__pcfGame.dispatch === 'function', { timeout: 15_000 });
  await page.evaluate(async () => {
    const teamsMod = await import('/src/data/teamsFirestore.js');
    const leagueMod = await import('/src/game/leagueEngine.js');
    if (typeof teamsMod.loadAllData === 'function') await teamsMod.loadAllData();
    const leagueId = 'laliga';
    const teams = teamsMod.getLaLigaTeams();
    const rawTeam = teams.find(t => Array.isArray(t.players) && t.players.length >= 11) || teams[0];
    const team = { ...rawTeam, budget: 50_000_000, transferBudget: 50_000_000, players: rawTeam.players || [] };
    const leagueTeams = teams.map(t => ({ ...t, budget: 50_000_000, players: t.players || [] }));
    const leagueData = leagueMod.initializeLeague(leagueTeams, team.id);
    window.__pcfGame.dispatch({
      type: 'NEW_GAME',
      payload: {
        teamId: team.id,
        team,
        leagueId,
        stadiumInfo: { name: team.stadium || 'Estadio', capacity: team.stadiumCapacity || 30_000 },
        stadiumLevel: 2,
        gameMode: 'career',
        preseasonMatches: [],
        preseasonPhase: false,
        managerName: 'E2E Manager',
      }
    });
    window.__pcfGame.dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    window.__pcfGame.dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    window.__pcfGame.dispatch({ type: 'SET_PLAYER_LEAGUE', payload: leagueId });
    window.__pcfGame.dispatch({ type: 'UPGRADE_FACILITY', payload: { facilityId: 'medical', cost: 0 } });
  });
  await page.waitForFunction(() => document.querySelector('.mobile-nav'));
}

async function mobileNavigateToFacilities(page) {
  await page.locator('.mobile-nav__tab').last().click();
  await expect(page.locator('.mobile-menu')).toBeVisible({ timeout: 3_000 });
  // order: formation, objectives, calendar, transfers, stadium, finance, facilities, messages
  await page.locator('.mobile-menu__item').nth(6).click();
  await expect(page.locator('.facilities-v2')).toBeVisible({ timeout: 5_000 });
}

test.describe('Facilities mobile modal', () => {
  test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  test('specialization modal opens above bottom controls and dims them', async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);
    await startInjectedGame(page);
    await mobileNavigateToFacilities(page);

    await page.locator('.facility-card').filter({ hasText: /Medical Center|Centro Médico/ }).click();
    await page.locator('.facility-card__spec').first().click();

    const metrics = await page.evaluate(() => {
      const overlay = document.querySelector('.facilities-v2__modal-overlay');
      const modal = document.querySelector('.facilities-v2__modal--spec');
      const nav = document.querySelector('.mobile-nav');
      if (!overlay || !modal || !nav) return null;
      const ob = overlay.getBoundingClientRect();
      const mb = modal.getBoundingClientRect();
      const nb = nav.getBoundingClientRect();
      const topEl = document.elementFromPoint(window.innerWidth / 2, Math.min(window.innerHeight - 24, nb.top + 20));
      return {
        viewportHeight: window.innerHeight,
        overlay: { top: ob.top, bottom: ob.bottom, height: ob.height },
        modal: { top: mb.top, bottom: mb.bottom, height: mb.height },
        nav: { top: nb.top, bottom: nb.bottom, height: nb.height },
        topElementClass: topEl?.className?.toString() || topEl?.tagName,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.overlay.top).toBeLessThanOrEqual(1);
    expect(metrics.overlay.bottom).toBeGreaterThanOrEqual(metrics.viewportHeight - 1);
    expect(metrics.modal.top).toBeGreaterThanOrEqual(8);
    expect(metrics.modal.bottom).toBeLessThanOrEqual(metrics.viewportHeight - 8);
    expect(metrics.topElementClass).toContain('facilities-v2__modal');
  });
});
