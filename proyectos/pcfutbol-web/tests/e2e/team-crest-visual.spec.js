// @ts-check
import { test, expect } from 'playwright/test';
import sharp from 'sharp';

const TEAM_PRIMARY = { r: 165, g: 0, b: 68 };
const TEAM_SECONDARY = { r: 0, g: 77, b: 152 };

function colorDistance(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function isTeamFillColor(r, g, b, a) {
  if (a < 180) return false;
  const px = { r, g, b };
  // The SVG gradient brightens/darkens the fill, so allow a practical tolerance.
  return colorDistance(px, TEAM_PRIMARY) < 95 || colorDistance(px, TEAM_SECONDARY) < 95;
}

async function renderGeneratedCrestFixture(page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.setContent(`
    <html>
      <head>
        <style>
          html,body{margin:0;background:#07111d;width:390px;height:844px;display:grid;place-items:center;}
          #root{width:160px;height:160px;display:grid;place-items:center;background:#111a27;border-radius:18px;}
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module">
          import '/tests/e2e/fixtures/renderTeamCrest.jsx';
          window.renderGeneratedTeamCrest({ teamId: 'fc-barcelona', size: 128 });
        </script>
      </body>
    </html>
  `, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg.team-crest--generated', { timeout: 10_000 });
}

test.describe('TeamCrest generated SVG clipping', () => {
  test('keeps Nova Blau generated stripe fill inside the shield interior on mobile', async ({ page }) => {
    await renderGeneratedCrestFixture(page);

    const svg = page.locator('svg.team-crest--generated');
    const buffer = await svg.screenshot({ omitBackground: true });
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const geometry = await svg.evaluate((el) => {
      const viewBox = el.viewBox.baseVal;
      const rect = el.getBoundingClientRect();
      const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        viewBoxWidth: viewBox.width,
        viewBoxHeight: viewBox.height,
        scale,
        offsetX: (rect.width - viewBox.width * scale) / 2,
        offsetY: (rect.height - viewBox.height * scale) / 2,
        innerPath: el.querySelector('path:nth-of-type(2)')?.getAttribute('d') || ''
      };
    });

    const coloredSamples = [];
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (!isTeamFillColor(r, g, b, a)) continue;
        const svgX = (x + 0.5 - geometry.offsetX) / geometry.scale;
        const svgY = (y + 0.5 - geometry.offsetY) / geometry.scale;
        coloredSamples.push([svgX, svgY]);
      }
    }

    const outsideInteriorCount = await svg.evaluate((el, { samples, innerPath }) => {
      const ns = 'http://www.w3.org/2000/svg';
      const owner = document.createElementNS(ns, 'svg');
      owner.setAttribute('viewBox', '0 0 100 120');
      owner.style.position = 'fixed';
      owner.style.left = '-9999px';
      owner.style.top = '-9999px';
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', innerPath);
      owner.appendChild(path);
      document.body.appendChild(owner);
      let count = 0;
      for (const [x, y] of samples) {
        if (!path.isPointInFill(new DOMPoint(x, y))) count += 1;
      }
      owner.remove();
      return count;
    }, { samples: coloredSamples, innerPath: geometry.innerPath });

    // Regression guard for the mobile screenshot bug: the colored stripe fill must not
    // be painted in the border gutter/outside the visible interior shield line.
    expect(outsideInteriorCount, `${outsideInteriorCount} colored pixels bleed outside shield interior`).toBeLessThanOrEqual(2);
  });
});
