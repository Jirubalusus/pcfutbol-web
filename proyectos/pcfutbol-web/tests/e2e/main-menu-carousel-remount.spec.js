// @ts-check
// Regression: returning from Editor (EditionMode) / Auth early-return screens must
// not desync the mode carousel. Before the fix, selecting Contrarreloj then opening
// the Editor and pressing "Volver" remounted the track at scrollLeft 0 (showing
// Carrera Libre) while the active card class / dot still pointed at Contrarreloj.
import { test, expect } from 'playwright/test';

async function waitForLoaded(page) {
  await page.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 15_000 }).catch(() => {});
}

async function loginAsGuest(page) {
  await page.waitForFunction(
    () => window.__pcfAuth && typeof window.__pcfAuth.loginAsGuest === 'function',
    { timeout: 15_000 }
  );
  await page.evaluate(() => window.__pcfAuth.loginAsGuest());
  // Firebase onAuthStateChanged can race and reset user to null — retry once.
  try {
    await page.waitForFunction(() => !!document.querySelector('.mode-card-full--hero'), { timeout: 8_000 });
  } catch {
    await page.evaluate(() => window.__pcfAuth.loginAsGuest());
    await page.waitForFunction(() => !!document.querySelector('.mode-card-full--hero'), { timeout: 8_000 });
  }
}

// Snapshot of the three things that must agree: the card carrying the active
// class, the active dot, and the card visually centred under the rail.
async function carouselState(page) {
  return page.evaluate(() => {
    const track = document.querySelector('.mode-carousel__track');
    if (!track) return null;
    const cards = Array.from(track.children);
    const activeClassMode = cards.find(c => c.classList.contains('mode-card-full--active'))?.getAttribute('data-mode') ?? null;

    // Card whose centre is closest to the rail's centre = the one the user sees.
    const center = track.scrollLeft + track.clientWidth / 2;
    let visibleMode = null;
    let min = Infinity;
    for (const c of cards) {
      const cc = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(cc - center);
      if (d < min) { min = d; visibleMode = c.getAttribute('data-mode'); }
    }

    const dots = Array.from(document.querySelectorAll('[data-mode-carousel-dot]'));
    const activeDotIndex = dots.findIndex(d => d.classList.contains('is-active'));

    return { activeClassMode, visibleMode, activeDotIndex, scrollLeft: track.scrollLeft };
  });
}

test.describe('Main menu mode carousel — survives Editor remount', () => {
  test('Contrarreloj stays selected, centred and dotted after Volver from Editor', async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);
    await loginAsGuest(page);

    // Poll until the card closest to the rail centre is `mode` (works for the
    // mobile one-card layout and the desktop two-cards-plus-peek layout alike).
    const waitCentredOn = (mode) => page.waitForFunction((m) => {
      const track = document.querySelector('.mode-carousel__track');
      if (!track) return false;
      const cards = Array.from(track.children);
      const center = track.scrollLeft + track.clientWidth / 2;
      let closest = null;
      let min = Infinity;
      for (const c of cards) {
        const cc = c.offsetLeft + c.clientWidth / 2;
        const d = Math.abs(cc - center);
        if (d < min) { min = d; closest = c.getAttribute('data-mode'); }
      }
      return closest === m;
    }, mode, { timeout: 5_000 });

    // Select Contrarreloj (carousel index 1) via its pagination dot.
    await page.locator('[data-mode-carousel-dot]').nth(1).click();
    await expect(page.locator('[data-mode="contrarreloj"]')).toHaveClass(/mode-card-full--active/, { timeout: 5_000 });
    await waitCentredOn('contrarreloj');

    const before = await carouselState(page);
    expect(before).not.toBeNull();
    expect(before.activeClassMode).toBe('contrarreloj');
    expect(before.visibleMode).toBe('contrarreloj');
    expect(before.activeDotIndex).toBe(1);

    // Open the Editor (3rd secondary icon button) and come back via Volver.
    await page.locator('.main-menu__secondary .main-menu__btn--icon').nth(2).click();
    await expect(page.locator('.btn-back')).toBeVisible({ timeout: 10_000 });
    await page.locator('.btn-back').click();
    await page.waitForFunction(() => !!document.querySelector('.mode-card-full--hero'), { timeout: 10_000 });

    // After the remount, the visual position must be re-anchored to Contrarreloj
    // so active class, dot and centred card all still agree.
    await waitCentredOn('contrarreloj');

    const after = await carouselState(page);
    expect(after).not.toBeNull();
    expect(after.activeClassMode).toBe('contrarreloj');
    expect(after.visibleMode).toBe('contrarreloj');
    expect(after.activeDotIndex).toBe(1);
  });
});
