import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import puppeteer from 'puppeteer-core';

const OUTPUT_DIR = join(import.meta.dirname, 'sofifa-leagues');
mkdirSync(OUTPUT_DIR, { recursive: true });

const LEAGUES = [
  { id: 31, name: 'Serie A' },
  { id: 19, name: 'Bundesliga' },
  { id: 16, name: 'Ligue 1' },
  { id: 10, name: 'Eredivisie' },
  { id: 308, name: 'Primeira Liga' },
  { id: 14, name: 'Championship' },
  { id: 4, name: 'Belgian Pro League' },
  { id: 68, name: 'Süper Lig' },
  { id: 50, name: 'Scottish Premiership' },
  { id: 32, name: 'Serie B' },
  { id: 20, name: '2. Bundesliga' },
  { id: 17, name: 'Ligue 2' },
  { id: 189, name: 'Swiss Super League' },
  { id: 80, name: 'Austrian Bundesliga' },
  { id: 63, name: 'Greek Super League' },
  { id: 1, name: 'Danish Superliga' },
  { id: 317, name: 'Croatian HNL' },
  { id: 319, name: 'Czech Liga' },
  { id: 7, name: 'Brasileirão' },
  { id: 353, name: 'Argentina Primera' },
  { id: 350, name: 'Saudi Pro League' },
  { id: 336, name: 'MLS' },
  { id: 39, name: 'Unknown_39' },
  { id: 335, name: 'Unknown_335' },
  { id: 337, name: 'Unknown_337' },
  { id: 338, name: 'Unknown_338' },
  { id: 2017, name: 'Unknown_2017' },
  { id: 2018, name: 'Unknown_2018' },
  { id: 2019, name: 'Unknown_2019' },
  { id: 2020, name: 'Unknown_2020' },
  { id: 341, name: 'Liga MX (verify)' },
  { id: 349, name: 'J-League (verify)' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeLeague(page, leagueId) {
  return await page.evaluate(async (lid) => {
    const players = [];
    let offset = 0;
    let pages = 0;
    while (true) {
      const url = `/players?type=all&lg%5B0%5D=${lid}&col=oa&sort=desc&showCol%5B%5D=pi&showCol%5B%5D=ae&showCol%5B%5D=oa&showCol%5B%5D=pt&showCol%5B%5D=tc${offset > 0 ? '&offset=' + offset : ''}`;
      const resp = await fetch(url);
      if (!resp.ok) break;
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tbody tr');
      if (rows.length === 0) break;
      let pc = 0;
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;
        const nl = cells[1].querySelector('a[href*="/player/"]');
        if (!nl) return;
        const pos = [];
        cells[1].querySelectorAll('a[href*="?pn="]').forEach(l => pos.push(l.textContent.trim()));
        const oe = cells[3].querySelector('em');
        const pe = cells[4].querySelector('em');
        const tl = cells[5].querySelector('a[href*="/team/"]');
        players.push({
          name: nl.textContent.trim(),
          overall: oe ? parseInt(oe.textContent) : 0,
          potential: pe ? parseInt(pe.textContent) : 0,
          position: pos.join(', '),
          age: parseInt(cells[2].textContent) || 0,
          team: tl ? tl.textContent.trim() : ''
        });
        pc++;
      });
      pages++;
      if (pc < 60) break;
      offset += 60;
      await new Promise(r => setTimeout(r, 400));
    }
    return { count: players.length, pages, players };
  }, leagueId);
}

async function main() {
  console.log('Connecting to browser on CDP port 18800...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:18800',
    defaultViewport: null,
  });
  
  // Find or create a SoFIFA tab
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('sofifa'));
  
  if (!page) {
    console.log('No SoFIFA tab found, creating one...');
    page = await browser.newPage();
    await page.goto('https://sofifa.com/players', { waitUntil: 'networkidle2', timeout: 30000 });
  }
  
  console.log('Using page:', page.url());
  console.log('');
  
  const summary = {};
  let total = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < LEAGUES.length; i++) {
    const league = LEAGUES[i];
    process.stdout.write(`[${i+1}/${LEAGUES.length}] ${league.id} (${league.name})... `);
    
    try {
      const data = await scrapeLeague(page, league.id);
      console.log(`${data.count} players (${data.pages} pages)`);
      
      writeFileSync(join(OUTPUT_DIR, `${league.id}.json`), JSON.stringify(data.players, null, 2));
      
      summary[league.id] = { name: league.name, count: data.count, pages: data.pages };
      total += data.count;
      
      writeFileSync(join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
      await sleep(800);
    } catch (e) {
      console.log(`ERROR: ${e.message.substring(0, 150)}`);
      summary[league.id] = { name: league.name, count: 0, error: e.message.substring(0, 200) };
      writeFileSync(join(OUTPUT_DIR, `${league.id}.json`), '[]');
      writeFileSync(join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
      
      // If context was destroyed, try to recover
      if (e.message.includes('context') || e.message.includes('destroyed') || e.message.includes('detached')) {
        console.log('  Recovering: navigating to SoFIFA...');
        try {
          await page.goto('https://sofifa.com/players', { waitUntil: 'networkidle2', timeout: 30000 });
          await sleep(2000);
        } catch (navErr) {
          console.log('  Recovery failed, creating new page...');
          page = await browser.newPage();
          await page.goto('https://sofifa.com/players', { waitUntil: 'networkidle2', timeout: 30000 });
          await sleep(2000);
        }
      }
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${total} players in ${elapsed}s`);
  console.log('='.repeat(50));
  
  console.log('\nUnknown/verify leagues:');
  for (const l of LEAGUES) {
    if (l.name.startsWith('Unknown_') || l.name.includes('verify')) {
      const s = summary[l.id];
      console.log(`  ${l.id} (${l.name}): ${s?.count || 0} players${s?.error ? ' [ERROR]' : ''}`);
    }
  }
  
  // DON'T close the browser - it's shared
  browser.disconnect();
  console.log('\nDone!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
