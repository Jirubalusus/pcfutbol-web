/**
 * Scraper de Transfermarkt con Playwright v2
 * Incluye estadísticas (goles, asistencias, minutos)
 * 
 * Uso:
 *   node scrape-playwright-v2.mjs laliga --season 2023
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CURRENT_SEASON = 2025;

// Configuración de ligas
const LEAGUES = {
  laliga: { 
    url: 'https://www.transfermarkt.es/laliga/startseite/wettbewerb/ES1', 
    id: 'ES1', 
    country: 'ES',
    baseOverall: 75,
    tier: 1
  },
  laliga2: { 
    url: 'https://www.transfermarkt.es/segunda-division/startseite/wettbewerb/ES2', 
    id: 'ES2', 
    country: 'ES',
    baseOverall: 68,
    tier: 2
  },
  primeraRfefG1: { 
    url: 'https://www.transfermarkt.es/primera-federacion-grupo-1/startseite/wettbewerb/E3G1', 
    id: 'E3G1', 
    country: 'ES',
    baseOverall: 62,
    tier: 3,
    minSeason: 2021
  },
  primeraRfefG2: { 
    url: 'https://www.transfermarkt.es/primera-federacion-grupo-2/startseite/wettbewerb/E3G2', 
    id: 'E3G2', 
    country: 'ES',
    baseOverall: 62,
    tier: 3,
    minSeason: 2021
  },
  segundaRfefG1: {
    url: 'https://www.transfermarkt.es/segunda-federacion-grupo-1/startseite/wettbewerb/E4G1',
    id: 'E4G1',
    country: 'ES',
    baseOverall: 56,
    tier: 4,
    minSeason: 2021
  },
  segundaRfefG2: {
    url: 'https://www.transfermarkt.es/segunda-federacion-grupo-2/startseite/wettbewerb/E4G2',
    id: 'E4G2',
    country: 'ES',
    baseOverall: 56,
    tier: 4,
    minSeason: 2021
  },
  segundaRfefG3: {
    url: 'https://www.transfermarkt.es/segunda-federacion-grupo-3/startseite/wettbewerb/E4G3',
    id: 'E4G3',
    country: 'ES',
    baseOverall: 56,
    tier: 4,
    minSeason: 2021
  },
  segundaRfefG4: {
    url: 'https://www.transfermarkt.es/segunda-federacion-grupo-4/startseite/wettbewerb/E4G4',
    id: 'E4G4',
    country: 'ES',
    baseOverall: 56,
    tier: 4,
    minSeason: 2021
  },
  segundaRfefG5: {
    url: 'https://www.transfermarkt.es/segunda-federacion-grupo-5/startseite/wettbewerb/E4G5',
    id: 'E4G5',
    country: 'ES',
    baseOverall: 56,
    tier: 4,
    minSeason: 2021
  },
  premier: { 
    url: 'https://www.transfermarkt.es/premier-league/startseite/wettbewerb/GB1', 
    id: 'GB1', 
    country: 'GB',
    baseOverall: 76,
    tier: 1
  },
  bundesliga: { 
    url: 'https://www.transfermarkt.es/bundesliga/startseite/wettbewerb/L1', 
    id: 'L1', 
    country: 'DE',
    baseOverall: 74,
    tier: 1
  },
  seriea: { 
    url: 'https://www.transfermarkt.es/serie-a/startseite/wettbewerb/IT1', 
    id: 'IT1', 
    country: 'IT',
    baseOverall: 74,
    tier: 1
  },
  ligue1: { 
    url: 'https://www.transfermarkt.es/ligue-1/startseite/wettbewerb/FR1', 
    id: 'FR1', 
    country: 'FR',
    baseOverall: 73,
    tier: 1
  },
  // Second divisions
  championship: { 
    url: 'https://www.transfermarkt.es/championship/startseite/wettbewerb/GB2', 
    id: 'GB2', 
    country: 'GB',
    baseOverall: 70,
    tier: 2
  },
  serieB: { 
    url: 'https://www.transfermarkt.es/serie-b/startseite/wettbewerb/IT2', 
    id: 'IT2', 
    country: 'IT',
    baseOverall: 67,
    tier: 2
  },
  bundesliga2: { 
    url: 'https://www.transfermarkt.es/2-bundesliga/startseite/wettbewerb/L2', 
    id: 'L2', 
    country: 'DE',
    baseOverall: 68,
    tier: 2
  },
  ligue2: { 
    url: 'https://www.transfermarkt.es/ligue-2/startseite/wettbewerb/FR2', 
    id: 'FR2', 
    country: 'FR',
    baseOverall: 66,
    tier: 2
  },
  // Other top leagues
  eredivisie: { 
    url: 'https://www.transfermarkt.es/eredivisie/startseite/wettbewerb/NL1', 
    id: 'NL1', 
    country: 'NL',
    baseOverall: 71,
    tier: 1
  },
  primeiraLiga: { 
    url: 'https://www.transfermarkt.es/liga-portugal-betclic/startseite/wettbewerb/PO1', 
    id: 'PO1', 
    country: 'PT',
    baseOverall: 72,
    tier: 1
  },
  belgianPro: { 
    url: 'https://www.transfermarkt.es/jupiler-pro-league/startseite/wettbewerb/BE1', 
    id: 'BE1', 
    country: 'BE',
    baseOverall: 69,
    tier: 1
  },
  superLig: { 
    url: 'https://www.transfermarkt.es/super-lig/startseite/wettbewerb/TR1', 
    id: 'TR1', 
    country: 'TR',
    baseOverall: 69,
    tier: 1
  },
  scottishPrem: { 
    url: 'https://www.transfermarkt.es/scottish-premiership/startseite/wettbewerb/SC1', 
    id: 'SC1', 
    country: 'SC',
    baseOverall: 66,
    tier: 1
  },
  swissSuperLeague: { 
    url: 'https://www.transfermarkt.es/super-league/startseite/wettbewerb/C1', 
    id: 'C1', 
    country: 'CH',
    baseOverall: 66,
    tier: 1
  },
  austrianBundesliga: { 
    url: 'https://www.transfermarkt.es/bundesliga/startseite/wettbewerb/A1', 
    id: 'A1', 
    country: 'AT',
    baseOverall: 66,
    tier: 1
  },
  greekSuperLeague: { 
    url: 'https://www.transfermarkt.es/super-league-1/startseite/wettbewerb/GR1', 
    id: 'GR1', 
    country: 'GR',
    baseOverall: 67,
    tier: 1
  },
  danishSuperliga: { 
    url: 'https://www.transfermarkt.es/superligaen/startseite/wettbewerb/DK1', 
    id: 'DK1', 
    country: 'DK',
    baseOverall: 65,
    tier: 1
  },
  croatianLeague: { 
    url: 'https://www.transfermarkt.es/hrvatska-nogometna-liga/startseite/wettbewerb/KR1', 
    id: 'KR1', 
    country: 'HR',
    baseOverall: 64,
    tier: 1
  },
  czechLeague: { 
    url: 'https://www.transfermarkt.es/chance-liga/startseite/wettbewerb/TS1', 
    id: 'TS1', 
    country: 'CZ',
    baseOverall: 64,
    tier: 1
  },
  // South American leagues
  argentinaPrimera: {
    url: 'https://www.transfermarkt.es/torneo-apertura/startseite/wettbewerb/ARG1',
    id: 'ARG1',
    country: 'AR',
    baseOverall: 72,
    tier: 1
  },
  brasileiraoA: {
    url: 'https://www.transfermarkt.es/campeonato-brasileiro-serie-a/startseite/wettbewerb/BRA1',
    id: 'BRA1',
    country: 'BR',
    baseOverall: 73,
    tier: 1
  },
  colombiaPrimera: {
    url: 'https://www.transfermarkt.es/liga-betplay/startseite/wettbewerb/COL1',
    id: 'COL1',
    country: 'CO',
    baseOverall: 67,
    tier: 1
  },
  chilePrimera: {
    url: 'https://www.transfermarkt.es/liga-de-primera/startseite/wettbewerb/CLPD',
    id: 'CLPD',
    country: 'CL',
    baseOverall: 66,
    tier: 1
  },
  uruguayPrimera: {
    url: 'https://www.transfermarkt.es/liga-auf-apertura/startseite/wettbewerb/URU1',
    id: 'URU1',
    country: 'UY',
    baseOverall: 67,
    tier: 1
  },
  ecuadorLigaPro: {
    url: 'https://www.transfermarkt.es/ligapro-serie-a/startseite/wettbewerb/EC1N',
    id: 'EC1N',
    country: 'EC',
    baseOverall: 65,
    tier: 1
  },
  paraguayPrimera: {
    url: 'https://www.transfermarkt.es/primera-division-apertura/startseite/wettbewerb/PR1A',
    id: 'PR1A',
    country: 'PY',
    baseOverall: 63,
    tier: 1
  },
  peruLiga1: {
    url: 'https://www.transfermarkt.es/liga-1-apertura/startseite/wettbewerb/TDeA',
    id: 'TDeA',
    country: 'PE',
    baseOverall: 63,
    tier: 1
  },
  boliviaPrimera: {
    url: 'https://www.transfermarkt.es/division-profesional/startseite/wettbewerb/BO1A',
    id: 'BO1A',
    country: 'BO',
    baseOverall: 60,
    tier: 1
  },
  venezuelaPrimera: {
    url: 'https://www.transfermarkt.es/liga-futve-apertura/startseite/wettbewerb/VZ1A',
    id: 'VZ1A',
    country: 'VE',
    baseOverall: 61,
    tier: 1
  }
};

// Curvas de edad por posición (año pico y decay)
const AGE_CURVES = {
  GK: { peakStart: 28, peakEnd: 34, youngPenalty: -3, oldPenalty: -2 },
  CB: { peakStart: 26, peakEnd: 32, youngPenalty: -2, oldPenalty: -3 },
  LB: { peakStart: 25, peakEnd: 30, youngPenalty: -2, oldPenalty: -4 },
  RB: { peakStart: 25, peakEnd: 30, youngPenalty: -2, oldPenalty: -4 },
  CDM: { peakStart: 26, peakEnd: 32, youngPenalty: -2, oldPenalty: -3 },
  CM: { peakStart: 25, peakEnd: 31, youngPenalty: -2, oldPenalty: -3 },
  CAM: { peakStart: 24, peakEnd: 30, youngPenalty: -1, oldPenalty: -4 },
  LW: { peakStart: 24, peakEnd: 29, youngPenalty: -1, oldPenalty: -5 },
  RW: { peakStart: 24, peakEnd: 29, youngPenalty: -1, oldPenalty: -5 },
  CF: { peakStart: 25, peakEnd: 30, youngPenalty: -1, oldPenalty: -4 },
  ST: { peakStart: 25, peakEnd: 30, youngPenalty: -1, oldPenalty: -4 }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calcular ajuste de edad según posición
function getAgeAdjustment(position, age) {
  const curve = AGE_CURVES[position] || AGE_CURVES.CM;
  
  if (age >= curve.peakStart && age <= curve.peakEnd) {
    return 2; // En su pico
  } else if (age < curve.peakStart - 3) {
    return curve.youngPenalty; // Muy joven
  } else if (age < curve.peakStart) {
    return 0; // Desarrollándose
  } else if (age > curve.peakEnd + 4) {
    return curve.oldPenalty * 1.5; // Muy veterano
  } else if (age > curve.peakEnd) {
    return curve.oldPenalty; // Veterano
  }
  return 0;
}

// Calcular overall refinado
function calculateOverall(player, teamRank, totalTeams, leagueConfig) {
  const { baseOverall } = leagueConfig;
  let overall = baseOverall;
  
  // 1. Ajuste por posición en la tabla del equipo
  if (teamRank && totalTeams) {
    const position = teamRank / totalTeams;
    if (position <= 0.15) overall += 6;      // Top 3
    else if (position <= 0.25) overall += 4; // Top 5
    else if (position <= 0.4) overall += 2;  // Top 8
    else if (position >= 0.85) overall -= 3; // Descenso
  }
  
  // 2. Ajuste por valor de mercado
  const mv = player.marketValue || 0;
  if (mv >= 100000000) overall += 15;
  else if (mv >= 70000000) overall += 13;
  else if (mv >= 50000000) overall += 11;
  else if (mv >= 30000000) overall += 8;
  else if (mv >= 15000000) overall += 5;
  else if (mv >= 5000000) overall += 2;
  else if (mv >= 1000000) overall += 1;
  
  // 3. Ajuste por edad según posición
  const ageAdj = getAgeAdjustment(player.position, player.age || 25);
  overall += ageAdj;
  
  // 4. Ajuste por estadísticas (si disponibles)
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const minutes = player.minutes || 0;
  const matches = player.matches || 0;
  
  if (matches > 0) {
    // Goles por partido (ajustado por posición)
    const goalsPerMatch = goals / matches;
    if (player.position === 'ST' || player.position === 'CF') {
      if (goalsPerMatch >= 0.7) overall += 4;
      else if (goalsPerMatch >= 0.5) overall += 2;
      else if (goalsPerMatch >= 0.3) overall += 1;
      else if (goalsPerMatch < 0.15 && matches > 15) overall -= 2;
    } else if (player.position === 'CAM' || player.position === 'LW' || player.position === 'RW') {
      if (goalsPerMatch >= 0.4) overall += 3;
      else if (goalsPerMatch >= 0.25) overall += 1;
    } else if (player.position === 'CM' || player.position === 'CDM') {
      if (goalsPerMatch >= 0.2) overall += 2;
    }
    
    // Asistencias por partido
    const assistsPerMatch = assists / matches;
    if (assistsPerMatch >= 0.4) overall += 3;
    else if (assistsPerMatch >= 0.25) overall += 2;
    else if (assistsPerMatch >= 0.15) overall += 1;
    
    // Minutos jugados (regularidad)
    const avgMinutes = minutes / matches;
    if (avgMinutes >= 80 && matches >= 25) overall += 2; // Titular indiscutible
    else if (avgMinutes < 45 && matches > 10) overall -= 1; // Suplente habitual
  }
  
  // 5. Élite mundial (valor > 80M)
  if (mv >= 80000000) overall += 2;
  
  // Limitar rango
  return Math.max(45, Math.min(99, Math.round(overall)));
}

function parseMarketValue(text) {
  if (!text) return 0;
  const clean = text.replace(/[^\d,\.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  
  if (text.includes('mil mill') || text.includes('bn')) return num * 1000000000;
  if (text.includes('mill') || text.includes('M')) return num * 1000000;
  if (text.includes('miles') || text.includes('K') || text.includes('k')) return num * 1000;
  return num;
}

function mapPosition(posEs) {
  if (!posEs) return 'CM';
  const pos = posEs.toLowerCase();
  if (pos.includes('portero')) return 'GK';
  if (pos.includes('central')) return 'CB';
  if (pos.includes('lateral izq') || pos.includes('defensa izq')) return 'LB';
  if (pos.includes('lateral der') || pos.includes('defensa der')) return 'RB';
  if (pos.includes('lateral')) return 'RB';
  if (pos.includes('defensa')) return 'CB';
  if (pos.includes('pivote') || pos.includes('med. centro def') || pos.includes('mediocentro def')) return 'CDM';
  if (pos.includes('mediocentro') || pos.includes('centrocampista')) return 'CM';
  if (pos.includes('interior')) return 'CM';
  if (pos.includes('mediapunta') || pos.includes('med. ofensivo')) return 'CAM';
  if (pos.includes('extremo izq')) return 'LW';
  if (pos.includes('extremo der')) return 'RW';
  if (pos.includes('extremo')) return 'RW';
  if (pos.includes('delantero centro') || pos.includes('ariete')) return 'ST';
  if (pos.includes('delantero')) return 'ST';
  if (pos.includes('segundo delantero') || pos.includes('media punta')) return 'CF';
  return 'CM';
}

// Extraer estadísticas de la página de rendimiento
async function scrapeTeamStats(page, teamSlug, teamId, season) {
  const statsUrl = `https://www.transfermarkt.es/${teamSlug}/leistungsdaten/verein/${teamId}/plus/1?saison_id=${season}`;
  
  try {
    await page.goto(statsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);
    
    const stats = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.items > tbody > tr');
      const playerStats = {};
      
      rows.forEach(row => {
        try {
          if (!row.classList.contains('odd') && !row.classList.contains('even')) return;
          
          // Nombre - buscar en hauptlink
          const nameEl = row.querySelector('td.hauptlink');
          if (!nameEl) return;
          // Extraer solo el nombre principal (antes del salto de línea)
          let name = nameEl.textContent.trim().split('\n')[0].trim();
          // Limpiar el nombre duplicado (ej: "Vinícius JúniorVinícius Jr." -> "Vinícius Júnior")
          if (name.length > 10) {
            const half = Math.floor(name.length / 2);
            const first = name.substring(0, half);
            const second = name.substring(half);
            // Si la segunda parte empieza similar, quedarse con la primera
            if (second.startsWith(first.substring(0, 3))) {
              name = first;
            }
          }
          
          const cells = row.querySelectorAll('td');
          
          // Buscar índices por contenido
          let matches = 0, goals = 0, assists = 0, minutes = 0;
          
          // Estructura típica de Transfermarkt (índices aproximados):
          // [0]=dorsal, [1]=foto/nombre, [3]=nombre, [4]=posición, [5]=edad,
          // [7]=partidos, [8]=titular, [9]=goles, [10]=asistencias, [17]=minutos
          
          // Extraer valores de índices conocidos
          if (cells[7]) matches = parseInt(cells[7].textContent.trim()) || 0;
          if (cells[9]) {
            const g = cells[9].textContent.trim();
            if (g !== '-') goals = parseInt(g) || 0;
          }
          if (cells[10]) {
            const a = cells[10].textContent.trim();
            if (a !== '-') assists = parseInt(a) || 0;
          }
          
          // Minutos: buscar la celda que termina con '
          for (let i = cells.length - 1; i >= 0; i--) {
            const text = cells[i].textContent.trim();
            if (text.includes("'")) {
              minutes = parseInt(text.replace(/[^\d]/g, '')) || 0;
              break;
            }
          }
          
          // Normalizar nombre para matching
          const nameKey = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          playerStats[nameKey] = { matches, goals, assists, minutes, originalName: name };
        } catch (e) {}
      });
      
      return playerStats;
    });
    
    return stats;
  } catch (err) {
    console.log(`      ⚠️ Sin estadísticas: ${err.message}`);
    return {};
  }
}

// Extraer plantilla básica
async function scrapeTeamSquad(page, teamUrl, season) {
  const squadUrl = teamUrl.replace('/startseite/', '/kader/') + `/saison_id/${season}`;
  
  await page.goto(squadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);
  
  const players = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.items > tbody > tr');
    const playerList = [];
    const seenNames = new Set();
    
    rows.forEach(row => {
      try {
        if (!row.classList.contains('odd') && !row.classList.contains('even')) return;
        
        const nameEl = row.querySelector('td.hauptlink a[href*="/profil/spieler/"]');
        if (!nameEl) return;
        const name = nameEl.textContent.trim().replace(/\s+/g, ' ');
        
        if (seenNames.has(name)) return;
        seenNames.add(name);
        
        // Posición
        const dorsalCell = row.querySelector('td.rueckennummer, td[title*="Portero"], td[title*="Defensa"], td[title*="Centrocampista"], td[title*="Delantero"]');
        let position = dorsalCell?.getAttribute('title') || '';
        
        if (!position) {
          const inlineTable = row.querySelector('table.inline-table');
          if (inlineTable) {
            const posRow = inlineTable.querySelector('tr:last-child td');
            position = posRow?.textContent?.trim() || '';
          }
        }
        
        // Edad
        let age = 25;
        const cells = row.querySelectorAll('td.zentriert');
        for (const cell of cells) {
          const text = cell.textContent.trim();
          if (/^\d{1,2}$/.test(text)) {
            const num = parseInt(text);
            if (num >= 15 && num <= 45) {
              age = num;
              break;
            }
          }
        }
        
        // Nacionalidad
        const flagImg = row.querySelector('img.flaggenrahmen');
        const nationality = flagImg?.getAttribute('title') || 'Desconocido';
        
        // Valor de mercado
        const valueEl = row.querySelector('td.rechts.hauptlink a');
        const valueText = valueEl?.textContent?.trim() || '0';
        
        // Fecha nacimiento (para calcular edad histórica)
        const birthEl = row.querySelector('td.zentriert[title]');
        const birthDate = birthEl?.getAttribute('title') || '';
        
        playerList.push({ name, position, age, nationality, valueText, birthDate });
      } catch (e) {}
    });
    
    return playerList;
  });
  
  return players.map(p => ({
    name: p.name,
    position: mapPosition(p.position),
    positionRaw: p.position,
    age: p.age,
    nationality: p.nationality,
    marketValue: parseMarketValue(p.valueText),
    marketValueText: p.valueText,
    birthDate: p.birthDate,
    // Stats se añadirán después
    goals: 0,
    assists: 0,
    matches: 0,
    minutes: 0
  }));
}

async function scrapeLeague(page, leagueKey, season) {
  const league = LEAGUES[leagueKey];
  if (!league) throw new Error(`Liga desconocida: ${leagueKey}`);
  
  if (league.minSeason && season < league.minSeason) {
    console.log(`   ⚠️ ${leagueKey} no existe antes de ${league.minSeason}`);
    return null;
  }
  
  const leagueUrl = `${league.url}/plus/?saison_id=${season}`;
  const seasonStr = `${season}-${(season+1).toString().slice(-2)}`;
  console.log(`\n📥 Scrapeando ${leagueKey} (${seasonStr})...`);
  
  await page.goto(leagueUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  
  // Extraer equipos
  const teams = await page.evaluate(({ leagueId, seasonStr }) => {
    const rows = document.querySelectorAll('table.items tbody tr');
    const teamList = [];
    let rank = 0;
    
    rows.forEach(row => {
      rank++;
      const linkEl = row.querySelector('td.hauptlink a[href*="/startseite/verein/"]');
      if (!linkEl) return;
      
      const href = linkEl.getAttribute('href');
      const match = href.match(/\/([^\/]+)\/startseite\/verein\/(\d+)/);
      if (!match) return;
      
      const [, slug, teamId] = match;
      const name = linkEl.textContent.trim();
      
      const valueEl = row.querySelector('td.rechts a, td:last-child');
      const valueText = valueEl?.textContent?.trim() || '0';
      
      teamList.push({
        id: `tm-${teamId}`,
        name,
        slug,
        transfermarktId: teamId,
        teamUrl: `https://www.transfermarkt.es${href}`,
        marketValueText: valueText,
        league: leagueId,
        season: seasonStr,
        rank
      });
    });
    
    return teamList;
  }, { leagueId: leagueKey, seasonStr });
  
  if (teams.length === 0) {
    console.log(`   ⚠️ No se encontraron equipos`);
    return null;
  }
  
  console.log(`   Encontrados ${teams.length} equipos`);
  const totalTeams = teams.length;
  
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    console.log(`   [${i+1}/${teams.length}] ${team.name}...`);
    
    try {
      // 1. Obtener plantilla básica
      team.players = await scrapeTeamSquad(page, team.teamUrl, season);
      
      // 2. Obtener estadísticas
      const stats = await scrapeTeamStats(page, team.slug, team.transfermarktId, season);
      
      // 3. Combinar datos (normalizar nombres para matching)
      team.players = team.players.map(player => {
        const nameKey = player.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        // Buscar por nombre normalizado o parcial
        let playerStats = stats[nameKey];
        if (!playerStats) {
          // Buscar coincidencia parcial
          const keys = Object.keys(stats);
          for (const key of keys) {
            if (key.includes(nameKey.substring(0, 8)) || nameKey.includes(key.substring(0, 8))) {
              playerStats = stats[key];
              break;
            }
          }
        }
        playerStats = playerStats || {};
        return {
          ...player,
          goals: playerStats.goals || 0,
          assists: playerStats.assists || 0,
          matches: playerStats.matches || 0,
          minutes: playerStats.minutes || 0
        };
      });
      
      // 4. Calcular overalls
      team.players = team.players.map(player => ({
        ...player,
        overall: calculateOverall(player, team.rank, totalTeams, league)
      }));
      
      team.avgOverall = team.players.length > 0
        ? Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length)
        : league.baseOverall;
      
      team.marketValue = parseMarketValue(team.marketValueText);
      
      const goalsTotal = team.players.reduce((s, p) => s + p.goals, 0);
      console.log(`      ✓ ${team.players.length} jugadores, avg ${team.avgOverall}, ${goalsTotal} goles`);
      
      await sleep(1000);
    } catch (err) {
      console.log(`      ✗ Error: ${err.message}`);
      team.players = [];
      team.avgOverall = league.baseOverall;
    }
  }
  
  return teams;
}

function parseArgs(args) {
  const result = { leagues: [], season: CURRENT_SEASON };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--season' && args[i + 1]) {
      result.season = parseInt(args[i + 1]);
      i++;
    } else if (!args[i].startsWith('--')) {
      result.leagues.push(args[i]);
    }
  }
  
  if (result.leagues.length === 0) {
    result.leagues = Object.keys(LEAGUES);
  }
  
  return result;
}

async function main() {
  console.log('🏟️ Transfermarkt Scraper v2 (con estadísticas)');
  console.log('==============================================\n');
  
  const { leagues, season } = parseArgs(process.argv.slice(2));
  const seasonStr = `${season}-${(season + 1).toString().slice(-2)}`;
  
  console.log(`📅 Temporada: ${seasonStr}`);
  console.log(`🏆 Ligas: ${leagues.join(', ')}\n`);
  
  const outputDir = path.join(process.cwd(), 'scraped-data', seasonStr);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'es-ES'
  });
  
  const page = await context.newPage();
  
  const summary = { season: seasonStr, leagues: {}, scrapedAt: new Date().toISOString() };
  
  try {
    for (const leagueKey of leagues) {
      if (!LEAGUES[leagueKey]) {
        console.log(`\n❌ Liga desconocida: ${leagueKey}`);
        continue;
      }
      
      try {
        const teams = await scrapeLeague(page, leagueKey, season);
        
        if (!teams) continue;
        
        const outFile = path.join(outputDir, `${leagueKey}.json`);
        fs.writeFileSync(outFile, JSON.stringify(teams, null, 2));
        console.log(`\n   💾 Guardado: ${outFile}`);
        
        const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
        const totalGoals = teams.reduce((s, t) => t.players.reduce((g, p) => g + p.goals, 0) + s, 0);
        console.log(`   📊 ${teams.length} equipos, ${totalPlayers} jugadores, ${totalGoals} goles totales`);
        
        summary.leagues[leagueKey] = { teams: teams.length, players: totalPlayers, goals: totalGoals };
        
      } catch (err) {
        console.error(`\n❌ Error en ${leagueKey}:`, err.message);
      }
      
      await sleep(3000);
    }
  } finally {
    await browser.close();
  }
  
  const summaryFile = path.join(outputDir, '_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n==============================================');
  console.log(`✅ Scraping ${seasonStr} completado!`);
  console.log(`📁 Datos guardados en: ${outputDir}`);
}

main().catch(console.error);
