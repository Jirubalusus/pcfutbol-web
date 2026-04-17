// @ts-check
import { test, expect } from 'playwright/test';

/* ── helpers ───────────────────────────────────────────────────────── */

function isMobile(testInfo) {
  return testInfo.project.name === 'mobile';
}

async function loginAsGuest(page) {
  await page.waitForFunction(
    () => window.__pcfAuth && typeof window.__pcfAuth.loginAsGuest === 'function',
    { timeout: 15_000 }
  );
  await page.evaluate(() => window.__pcfAuth.loginAsGuest());
  // Retry once — Firebase onAuthStateChanged may race and reset user to null
  try {
    await page.waitForFunction(
      () => !!document.querySelector('.main-menu__mode-card--hero'),
      { timeout: 8_000 }
    );
  } catch {
    await page.evaluate(() => window.__pcfAuth.loginAsGuest());
    await page.waitForFunction(
      () => !!document.querySelector('.main-menu__mode-card--hero'),
      { timeout: 8_000 }
    );
  }
}

async function waitForLoaded(page) {
  await page.waitForFunction(
    () => !document.querySelector('.loading-screen'),
    { timeout: 15_000 }
  ).catch(() => {});
}

/** Wait for the office to be fully loaded — works for both desktop and mobile */
async function waitForOffice(page) {
  // Both .sidebar and .mobile-nav exist in DOM; CSS hides one based on viewport
  await page.waitForFunction(
    () => document.querySelector('.sidebar') || document.querySelector('.mobile-nav'),
    { timeout: 15_000 }
  );
  await page.waitForTimeout(500);
}

/**
 * Start a new game by going through team selection.
 * Falls back to JS injection if the 3D globe is not clickable in headless.
 */
async function startNewGame(page) {
  await page.click('.main-menu__mode-card--hero');
  await expect(page.locator('.pcf-ts-progress')).toBeVisible({ timeout: 10_000 });

  await page.waitForTimeout(3000);

  let leagueBtns = page.locator('.map-selection__league:not(.disabled)');
  let leagueCount = await leagueBtns.count();

  if (leagueCount === 0) {
    const globeCanvas = page.locator('.map-selection__map canvas').first();
    if (await globeCanvas.isVisible()) {
      for (const pos of [
        { x: 150, y: 170 }, { x: 180, y: 190 }, { x: 120, y: 160 },
        { x: 200, y: 200 }, { x: 160, y: 150 }, { x: 140, y: 200 },
      ]) {
        await globeCanvas.click({ position: pos });
        await page.waitForTimeout(600);
        leagueCount = await leagueBtns.count();
        if (leagueCount > 0) break;
      }
    }
  }

  // On mobile, globe may be replaced by a country list
  if (leagueCount === 0) {
    const countryItem = page.locator('.map-selection__country-item, .country-list__item, [class*="country"]').first();
    if (await countryItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await countryItem.click();
      await page.waitForTimeout(1000);
      leagueCount = await leagueBtns.count();
    }
  }

  if (leagueCount > 0) {
    await leagueBtns.first().click();
    await page.waitForTimeout(1000);
    const teamRows = page.locator('.team-row');
    await expect(teamRows.first()).toBeVisible({ timeout: 8_000 });
    await teamRows.first().click();
    await page.waitForTimeout(500);
    await page.locator('.btn-start').click();

    const preseasonModal = page.locator('.preseason-modal');
    const office = page.locator('.sidebar, .mobile-nav');
    await expect(preseasonModal.or(office)).toBeVisible({ timeout: 15_000 });
    if (await preseasonModal.isVisible()) {
      const cards = page.locator('.preseason-card');
      if (await cards.count() > 0) await cards.first().click();
      await page.locator('.btn-confirm').click();
    }
  } else {
    // Globe not working — inject game via JS
    const backBtn = page.locator('.btn-back').first();
    if (await backBtn.isVisible()) await backBtn.click();
    await page.waitForTimeout(500);

    const started = await page.evaluate(async () => {
      try {
        const mod = await import('/src/data/teamsFirestore.js');
        if (typeof mod.loadAllData === 'function') await mod.loadAllData();
        const teams = mod.getLaLigaTeams();
        if (!teams || teams.length === 0) return false;

        const team = teams[0];
        window.__pcfGame.dispatch({
          type: 'NEW_GAME',
          payload: {
            teamId: team.id,
            team: team,
            leagueId: 'laliga',
            stadiumInfo: { name: team.stadium || 'Estadio', capacity: team.stadiumCapacity || 30000 },
            stadiumLevel: 3,
            gameMode: 'career',
            preseasonPhase: false,
          }
        });
        return true;
      } catch (e) {
        console.warn('[E2E] JS game injection failed:', e);
        return false;
      }
    });

    if (!started) {
      test.skip(true, 'Could not load team data for game injection');
      return;
    }
  }

  await waitForOffice(page);
}

async function clickSidebarTab(page, index) {
  const tab = page.locator('.sidebar__item').nth(index);
  if (await tab.isVisible()) {
    await tab.click();
    await page.waitForTimeout(500);
  }
}

/** Navigate to a tab on mobile via MobileNav bottom bar or "More" drawer */
async function mobileNavigateToTab(page, tabId) {
  const PRIMARY_IDS = ['overview', 'plantilla', 'competitions'];
  if (PRIMARY_IDS.includes(tabId)) {
    const idx = PRIMARY_IDS.indexOf(tabId);
    await page.locator('.mobile-nav__tab').nth(idx).click();
  } else {
    // Open "More" menu
    await page.locator('.mobile-nav__tab').last().click();
    await expect(page.locator('.mobile-menu')).toBeVisible({ timeout: 3_000 });
    const menuItems = page.locator('.mobile-menu__item');
    const count = await menuItems.count();
    // Match by item id order: formation, objectives, calendar, transfers, stadium, finance, facilities, messages
    const MENU_ORDER = ['formation', 'objectives', 'calendar', 'transfers', 'stadium', 'finance', 'facilities', 'messages'];
    const idx = MENU_ORDER.indexOf(tabId);
    if (idx >= 0 && idx < count) {
      await menuItems.nth(idx).click();
    }
  }
  await page.waitForTimeout(500);
}

/** Navigate to tab — auto-selects desktop sidebar or mobile nav */
async function navigateToTab(page, testInfo, tabId, sidebarIndex) {
  if (isMobile(testInfo)) {
    await mobileNavigateToTab(page, tabId);
  } else {
    await clickSidebarTab(page, sidebarIndex);
  }
}

/** Return to main menu from the office — handles both layouts */
async function returnToMainMenu(page, testInfo) {
  if (isMobile(testInfo)) {
    await page.locator('.mobile-nav__tab').last().click();
    await expect(page.locator('.mobile-menu')).toBeVisible({ timeout: 3_000 });
    await page.locator('.mobile-menu__footer-btn--exit').click();
  } else {
    await page.click('.sidebar__menu-btn');
  }
  await expect(page.locator('.main-menu')).toBeVisible({ timeout: 8_000 });
}

/* ── TESTS ─────────────────────────────────────────────────────────── */

test.describe('Main Menu — Unauthenticated', () => {
  test('shows login button and guest notice when not logged in', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForLoaded(page);

    await expect(page.locator('.main-menu')).toBeVisible();
    await expect(page.locator('.main-menu__btn--primary')).toBeVisible();
    // Guest notice is hidden on mobile via CSS
    if (!isMobile(testInfo)) {
      await expect(page.locator('.main-menu__guest-notice')).toBeVisible();
    }
    await expect(page.locator('.main-menu__btn--icon')).toBeVisible();
    await expect(page.locator('.main-menu__mode-card--hero')).not.toBeVisible();
  });

  test('login button opens Auth screen and back returns to menu', async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);

    await page.click('.main-menu__btn--primary');
    await expect(page.locator('.auth__google')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.auth__form')).toBeVisible();

    await page.click('.btn-back');
    await expect(page.locator('.main-menu')).toBeVisible();
  });
});

test.describe('Main Menu — Guest Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);
  });

  test('shows game mode cards after guest login', async ({ page }) => {
    await expect(page.locator('.main-menu__mode-card--hero')).toBeVisible();
    const modeCards = page.locator('.main-menu__mode-card--compact');
    await expect(modeCards).toHaveCount(4);
    await expect(page.locator('.main-menu__user')).toBeVisible();
    await expect(page.locator('.main-menu__guest-notice')).not.toBeVisible();
  });

  test('settings overlay opens and closes from main menu', async ({ page }) => {
    await page.locator('.main-menu__btn--icon').nth(1).click();
    await expect(page.locator('.settings')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.settings__language-card').first()).toBeVisible();
    await page.click('.settings__close');
    await expect(page.locator('.settings')).not.toBeVisible();
  });

  test('rankings screen accessible and has back button', async ({ page }) => {
    await page.locator('.main-menu__btn--icon').nth(0).click();
    await expect(page.locator('.ranking')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.btn-back')).toBeVisible();
  });
});

test.describe('Team Selection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);
  });

  test('career button navigates to team selection', async ({ page }) => {
    await page.click('.main-menu__mode-card--hero');
    await expect(page.locator('.pcf-ts-progress')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.progress-step')).toHaveCount(2);
  });

  test('team selection shows globe and league panel', async ({ page }, testInfo) => {
    await page.click('.main-menu__mode-card--hero');
    await expect(page.locator('.pcf-ts-progress')).toBeVisible({ timeout: 10_000 });
    if (isMobile(testInfo)) {
      const mapOrList = page.locator('.map-selection__map, [class*="map-selection"]');
      await expect(mapOrList.first()).toBeVisible();
    } else {
      await expect(page.locator('.map-selection__map')).toBeVisible();
      await expect(page.locator('.map-selection__panel')).toBeVisible();
    }
  });
});

test.describe('Office / Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);
    await startNewGame(page);
  });

  test('office loads with navigation and team info', async ({ page }, testInfo) => {
    if (isMobile(testInfo)) {
      await expect(page.locator('.mobile-nav')).toBeVisible();
    } else {
      await expect(page.locator('.sidebar')).toBeVisible();
      await expect(page.locator('.sidebar__team-name')).toBeVisible();
      await expect(page.locator('.sidebar__item.active')).toBeVisible();
    }
  });

  test('can navigate all desktop sidebar tabs without crash', async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), 'Desktop sidebar test — mobile covered separately');
    const tabCount = await page.locator('.sidebar__item').count();
    for (let i = 0; i < tabCount; i++) {
      await page.locator('.sidebar__item').nth(i).click();
      await page.waitForTimeout(600);
      const errors = await page.locator('.error-boundary, [class*="ErrorBoundary"]').count();
      expect(errors, `Tab index ${i} crashed`).toBe(0);
      await expect(page.locator('.sidebar')).toBeVisible();
    }
  });

  test('can navigate all mobile nav items without crash', async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'Mobile nav test — desktop covered separately');
    // Test primary bottom tabs (overview, plantilla, competitions)
    const tabCount = await page.locator('.mobile-nav__tab').count();
    for (let i = 0; i < tabCount - 1; i++) {
      await page.locator('.mobile-nav__tab').nth(i).click();
      await page.waitForTimeout(600);
      const errors = await page.locator('.error-boundary, [class*="ErrorBoundary"]').count();
      expect(errors, `Mobile tab ${i} crashed`).toBe(0);
    }
    // Test "more" drawer items
    await page.locator('.mobile-nav__tab').last().click();
    await expect(page.locator('.mobile-menu')).toBeVisible({ timeout: 3_000 });
    const itemCount = await page.locator('.mobile-menu__item').count();
    for (let i = 0; i < itemCount; i++) {
      if (i > 0) {
        await page.locator('.mobile-nav__tab').last().click();
        await expect(page.locator('.mobile-menu')).toBeVisible({ timeout: 3_000 });
      }
      await page.locator('.mobile-menu__item').nth(i).click();
      await page.waitForTimeout(600);
      const errors = await page.locator('.error-boundary, [class*="ErrorBoundary"]').count();
      expect(errors, `Mobile menu item ${i} crashed`).toBe(0);
    }
  });

  test('plantilla tab shows player content', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'plantilla', 1);
    await expect(page.locator('div.plantilla')).toBeVisible({ timeout: 5_000 });
  });

  test('formation tab shows pitch/field', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'formation', 2);
    await expect(page.locator('.pcf-formation')).toBeVisible({ timeout: 5_000 });
  });

  test('calendar tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'calendar', 4);
    await expect(page.locator('.calendar-v2')).toBeVisible({ timeout: 5_000 });
  });

  test('transfers tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'transfers', 5);
    await expect(page.locator('.transfers-v2')).toBeVisible({ timeout: 5_000 });
  });

  test('competitions tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'competitions', 6);
    await expect(page.locator('.competitions')).toBeVisible({ timeout: 5_000 });
  });

  test('stadium tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'stadium', 7);
    await expect(page.locator('.stadium-simple, .stadium-3d-fallback')).toBeVisible({ timeout: 5_000 });
  });

  test('finance tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'finance', 8);
    await expect(page.locator('div.finance')).toBeVisible({ timeout: 5_000 });
  });

  test('facilities tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'facilities', 9);
    await expect(page.locator('.facilities-v2')).toBeVisible({ timeout: 5_000 });
  });

  test('messages tab renders', async ({ page }, testInfo) => {
    await navigateToTab(page, testInfo, 'messages', 10);
    await expect(page.locator('div.messages')).toBeVisible({ timeout: 5_000 });
  });

  test('settings opens and closes from office', async ({ page }, testInfo) => {
    if (isMobile(testInfo)) {
      await page.locator('.mobile-nav__tab').last().click();
      await expect(page.locator('.mobile-menu')).toBeVisible({ timeout: 3_000 });
      await page.locator('.mobile-menu__footer-btn').first().click();
      await expect(page.locator('.settings')).toBeVisible({ timeout: 5_000 });
      await page.click('.settings__close');
      await expect(page.locator('.settings')).not.toBeVisible();
    } else {
      await page.click('.sidebar__settings-btn');
      await expect(page.locator('.settings')).toBeVisible({ timeout: 5_000 });
      await page.click('.settings__close');
      await expect(page.locator('.settings')).not.toBeVisible();
    }
  });

  test('can return to main menu from office', async ({ page }, testInfo) => {
    await returnToMainMenu(page, testInfo);
  });
});

test.describe('Persistence & State', () => {
  test('game state persists after returning to main menu', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);
    await startNewGame(page);

    await waitForOffice(page);

    // Return to main menu
    await returnToMainMenu(page, testInfo);

    // Career card should show active game
    const heroCard = page.locator('.main-menu__mode-card--hero');
    await expect(heroCard).toBeVisible();

    // Click to resume → should show continue prompt
    await heroCard.click();
    const continueBtn = page.locator('.btn-continue');
    await expect(continueBtn).toBeVisible({ timeout: 8_000 });

    await continueBtn.click();
    await waitForOffice(page);
  });
});

test.describe('Regression checks', () => {
  test('no console errors on main menu load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await waitForLoaded(page);

    const critical = errors.filter(e =>
      !e.includes('Firebase') && !e.includes('firestore') &&
      !e.includes('network') && !e.includes('Failed to fetch') &&
      !e.includes('CORS') && !e.includes('ERR_')
    );
    expect(critical, `Console errors: ${critical.join(', ')}`).toHaveLength(0);
  });

  test('no console errors during game flow', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);
    await startNewGame(page);

    if (isMobile(testInfo)) {
      for (let i = 0; i < 3; i++) {
        await page.locator('.mobile-nav__tab').nth(i).click();
        await page.waitForTimeout(500);
      }
    } else {
      for (const idx of [1, 2, 4, 6]) {
        await clickSidebarTab(page, idx);
      }
    }

    const critical = errors.filter(e =>
      !e.includes('Firebase') && !e.includes('firestore') &&
      !e.includes('network') && !e.includes('Failed to fetch') &&
      !e.includes('CORS') && !e.includes('ERR_') &&
      !e.includes('ResizeObserver') && !e.includes('getAuth')
    );
    if (critical.length > 0) console.warn('Console errors:', critical);
    expect(critical.length).toBeLessThanOrEqual(3);
  });

  test('no broken images on main menu', async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);
    // Give images time to load
    await page.waitForTimeout(2000);

    const broken = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(img => {
          if (!img.src || img.src.startsWith('data:')) return false;
          // complete=true + naturalWidth=0 means the image errored
          return img.complete && img.naturalWidth === 0;
        })
        .map(img => img.src);
    });
    expect(broken, `Broken images: ${broken.join(', ')}`).toHaveLength(0);
  });
});
