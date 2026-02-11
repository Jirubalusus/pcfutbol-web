/**
 * Script to generate edition pack by comparing teams_v2 (fictional) vs teams (real)
 * Run from browser console or Node with Firebase config
 * 
 * Usage: import and call generateRealNamesPack()
 */
import { db } from '../../firebase/config.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

const LEAGUES = [
  'laliga', 'laliga2', 'primera-rfef', 'segunda-rfef',
  'premier', 'seriea', 'bundesliga', 'ligue1',
  'eredivisie', 'primeiraLiga', 'championship', 'belgianPro',
  'superLig', 'scottishPrem', 'serieB', 'bundesliga2',
  'ligue2', 'swissSuperLeague', 'austrianBundesliga',
  'greekSuperLeague', 'danishSuperliga', 'croatianLeague', 'czechLeague',
  'argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
  'uruguayPrimera', 'ecuadorLigaPro', 'paraguayPrimera', 'peruLiga1',
  'boliviaPrimera', 'venezuelaPrimera',
  'mls', 'saudiProLeague', 'ligaMX', 'jLeague'
];

export async function generateRealNamesPack() {
  const pack = {
    id: 'real_names_2025_26',
    name: 'Competición 2025/2026',
    description: 'Nombres reales de equipos y jugadores para la temporada 2025/2026',
    author: 'PC Gaffer',
    version: '1.0',
    teams: {}
  };

  for (const leagueId of LEAGUES) {
    console.log(`Processing ${leagueId}...`);
    
    // Get fictional teams (teams_v2)
    const v2Query = query(collection(db, 'teams_v2'), where('leagueId', '==', leagueId));
    const v2Snap = await getDocs(v2Query);
    
    // Get real teams (teams)
    const realQuery = query(collection(db, 'teams'), where('leagueId', '==', leagueId));
    const realSnap = await getDocs(realQuery);
    
    const v2Teams = v2Snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const realTeams = realSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Match by document ID or by order
    for (const v2Team of v2Teams) {
      // Try to find matching real team by same doc ID
      const realTeam = realTeams.find(r => r.id === v2Team.id) 
        || realTeams.find(r => r.shortName === v2Team.shortName);
      
      if (!realTeam) continue;
      if (v2Team.name === realTeam.name) continue; // Already same name
      
      const teamEntry = {};
      
      if (v2Team.name !== realTeam.name) teamEntry.name = realTeam.name;
      if (v2Team.shortName !== realTeam.shortName) teamEntry.shortName = realTeam.shortName;
      if (v2Team.stadium !== realTeam.stadium) teamEntry.stadium = realTeam.stadium;
      
      // Match players by position+age or by order
      if (v2Team.players && realTeam.players) {
        const playerMap = {};
        for (let i = 0; i < v2Team.players.length && i < realTeam.players.length; i++) {
          const v2p = v2Team.players[i];
          const rp = realTeam.players[i];
          if (v2p.name !== rp.name) {
            playerMap[v2p.name] = rp.name;
          }
        }
        if (Object.keys(playerMap).length > 0) {
          teamEntry.players = playerMap;
        }
      }
      
      if (Object.keys(teamEntry).length > 0) {
        pack.teams[v2Team.name] = teamEntry;
      }
    }
  }

  pack.teamCount = Object.keys(pack.teams).length;
  pack.playerCount = Object.values(pack.teams).reduce((sum, t) => 
    sum + (t.players ? Object.keys(t.players).length : 0), 0
  );
  
  console.log(`Pack generated: ${pack.teamCount} teams, ${pack.playerCount} players`);
  return pack;
}
