// Regression: global button :active feedback must not move the main-menu mode
// carousel card, CTA area, arrows or dots. These controls have fixed carousel
// geometry; pressed feedback should be visual only.
import { test, expect } from 'playwright/test';

async function waitForLoaded(page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  ` });
  await page.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 15_000 }).catch(() => {});
  await page.waitForSelector('.mode-card-full--active', { timeout: 15_000 });
  await page.waitForTimeout(250);
}

async function boxAndScroll(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const rect = el?.getBoundingClientRect();
    return {
      x: rect?.x ?? null,
      y: rect?.y ?? null,
      width: rect?.width ?? null,
      height: rect?.height ?? null,
      scrollY: window.scrollY,
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  }, selector);
}

function assertStable(before, during, label) {
  expect(during.y, `${label} y`).not.toBeNull();
  expect(Math.abs(during.y - before.y), `${label} moved vertically`).toBeLessThanOrEqual(2);
  expect(Math.abs(during.scrollY - before.scrollY), `${label} changed scrollY`).toBeLessThanOrEqual(2);
  expect(during.docOverflowX, `${label} created horizontal overflow`).toBeLessThanOrEqual(1);
}

async function pressAndMeasure(page, selector, label) {
  const target = page.locator(selector).first();
  await expect(target, label).toBeVisible();
  const box = await target.boundingBox();
  expect(box, label).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  const before = await boxAndScroll(page, selector);
  await page.mouse.down();
  await page.waitForTimeout(80);
  const during = await boxAndScroll(page, selector);
  assertStable(before, during, label);

  await page.mouse.move(1, 1);
  await page.mouse.up();
}

test.describe('Main menu mode carousel press stability', () => {
  test('active card controls do not shift while pressed', async ({ page }) => {
    await page.goto('/');
    await waitForLoaded(page);

    await pressAndMeasure(page, '.mode-card-full--active', 'active mode card');
    await pressAndMeasure(page, '.mode-card-full--active .mode-card-full__cta', 'active mode CTA');
    await pressAndMeasure(page, '.mode-carousel__dot.is-active', 'active carousel dot');

    const next = page.locator('[data-mode-carousel-next]');
    if (await next.isVisible()) {
      await pressAndMeasure(page, '[data-mode-carousel-next]', 'next carousel arrow');
    }

    const prev = page.locator('[data-mode-carousel-prev]');
    if (await prev.isVisible()) {
      await pressAndMeasure(page, '[data-mode-carousel-prev]', 'previous carousel arrow');
    }
  });
});
