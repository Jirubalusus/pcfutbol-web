// Lightweight scraper that fetches only the team list (rank, name, slug, transfermarktId)
// from a Transfermarkt league startseite page.
//
// Usage:
//   node scripts/scrape-league-teams-only.mjs <leagueKey> <tmUrl> [--season 2025]
//
// Example:
//   node scripts/scrape-league-teams-only.mjs ligamx https://www.transfermarkt.es/liga-mx-clausura/startseite/wettbewerb/MEX1

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let season = 2025;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--season' && args[i + 1]) { season = parseInt(args[i + 1]); i++; }
  else positional.push(args[i]);
}
const [leagueKey, baseUrl] = positional;
if (!leagueKey || !baseUrl) {
  console.error('Usage: node scripts/scrape-league-teams-only.mjs <leagueKey> <tmUrl> [--season 2025]');
  process.exit(1);
}

const seasonStr = `${season}-${(season + 1).toString().slice(-2)}`;
const url = `${baseUrl}/plus/?saison_id=${season}`;
const outputDir = path.join(process.cwd(), 'scraped-data', seasonStr);
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  locale: 'es-ES'
});
const page = await context.newPage();

try {
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const teams = await page.evaluate(({ leagueId, seasonStr }) => {
    const rows = document.querySelectorAll('table.items tbody tr');
    const out = [];
    let rank = 0;
    const seen = new Set();
    rows.forEach((row) => {
      const linkEl = row.querySelector('td.hauptlink a[href*="/startseite/verein/"]');
      if (!linkEl) return;
      const href = linkEl.getAttribute('href');
      const m = href.match(/\/([^\/]+)\/startseite\/verein\/(\d+)/);
      if (!m) return;
      const [, slug, teamId] = m;
      if (seen.has(teamId)) return;
      seen.add(teamId);
      rank++;
      const valueEl = row.querySelector('td.rechts a, td:last-child');
      const valueText = valueEl?.textContent?.trim() || '0';
      out.push({
        id: `tm-${teamId}`,
        name: linkEl.textContent.trim(),
        slug,
        transfermarktId: teamId,
        teamUrl: `https://www.transfermarkt.es${href}`,
        marketValueText: valueText,
        league: leagueId,
        season: seasonStr,
        rank
      });
    });
    return out;
  }, { leagueId: leagueKey, seasonStr });

  if (!teams.length) throw new Error('No teams parsed from page');

  const outFile = path.join(outputDir, `${leagueKey}.json`);
  fs.writeFileSync(outFile, JSON.stringify(teams, null, 2));
  console.log(`Saved ${teams.length} teams -> ${outFile}`);
  teams.forEach((t) => console.log(`  ${t.rank}. tm-${t.transfermarktId} ${t.name}`));
} finally {
  await browser.close();
}
