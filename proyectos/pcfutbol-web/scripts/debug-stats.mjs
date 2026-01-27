/**
 * Debug: Extraer estructura de la página de estadísticas
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'es-ES'
  });
  const page = await context.newPage();
  
  const url = 'https://www.transfermarkt.es/real-madrid/leistungsdaten/verein/418/plus/1?saison_id=2023';
  console.log('Navegando a:', url);
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Extraer jugadores con estadísticas
  const players = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.items > tbody > tr');
    const results = [];
    
    rows.forEach(row => {
      if (!row.classList.contains('odd') && !row.classList.contains('even')) return;
      
      // Nombre
      const nameEl = row.querySelector('td.hauptlink');
      if (!nameEl) return;
      const name = nameEl.textContent.trim().split('\n')[0].trim();
      
      // Todas las celdas numéricas
      const cells = row.querySelectorAll('td');
      const numbers = [];
      cells.forEach((cell, idx) => {
        const text = cell.textContent.trim();
        // Solo números o minutos
        if (/^\d+$/.test(text) || text.includes("'")) {
          numbers.push({ idx, value: text });
        }
      });
      
      results.push({ name: name.substring(0, 20), cells: numbers });
    });
    
    return results.slice(0, 15); // Primeros 15 jugadores
  });
  
  console.log('\n=== JUGADORES CON STATS ===\n');
  players.forEach(p => {
    console.log(`${p.name}: ${p.cells.map(c => `[${c.idx}]=${c.value}`).join(' ')}`);
  });
  
  await browser.close();
}

main().catch(console.error);
