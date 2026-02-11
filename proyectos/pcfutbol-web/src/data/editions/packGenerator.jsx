/**
 * Pack Generator Component — temporary dev tool
 * Reads teams (real) and teams_v2 (fictional) from Firebase,
 * generates a mapping pack, and outputs JSON to copy.
 */
import React, { useState } from 'react';
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

export default function PackGenerator() {
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setStatus('Iniciando...');
    
    const pack = {
      id: 'real_names_2025_26',
      name: 'Competición 2025/2026',
      description: 'Nombres reales de equipos y jugadores — Temporada 2025/2026',
      author: 'PC Gaffer',
      version: '1.0',
      teams: {}
    };

    try {
      for (const leagueId of LEAGUES) {
        setStatus(`Procesando ${leagueId}...`);
        
        const v2Snap = await getDocs(query(collection(db, 'teams_v2'), where('leagueId', '==', leagueId)));
        const realSnap = await getDocs(query(collection(db, 'teams'), where('leagueId', '==', leagueId)));
        
        const v2Teams = v2Snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        const realTeams = realSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
        
        if (v2Teams.length === 0 || realTeams.length === 0) continue;
        
        for (const v2 of v2Teams) {
          // Match by doc ID
          const real = realTeams.find(r => r.docId === v2.docId);
          if (!real) continue;
          
          const entry = {};
          let hasChanges = false;
          
          if (v2.name !== real.name && real.name) {
            entry.name = real.name;
            hasChanges = true;
          }
          if (v2.shortName !== real.shortName && real.shortName) {
            entry.shortName = real.shortName;
          }
          if (v2.stadium !== real.stadium && real.stadium) {
            entry.stadium = real.stadium;
          }
          
          // Player mapping
          if (v2.players && real.players && v2.players.length === real.players.length) {
            const playerMap = {};
            for (let i = 0; i < v2.players.length; i++) {
              const v2Name = v2.players[i].name || v2.players[i].n;
              const realName = real.players[i].name || real.players[i].n;
              if (v2Name && realName && v2Name !== realName) {
                playerMap[v2Name] = realName;
                hasChanges = true;
              }
            }
            if (Object.keys(playerMap).length > 0) {
              entry.players = playerMap;
            }
          }
          
          if (hasChanges) {
            // Use fictional name as key (that's what we match against at runtime)
            pack.teams[v2.name] = entry;
          }
        }
      }
      
      pack.teamCount = Object.keys(pack.teams).length;
      pack.playerCount = Object.values(pack.teams).reduce((sum, t) => 
        sum + (t.players ? Object.keys(t.players).length : 0), 0
      );
      
      setStatus(`✅ Completado: ${pack.teamCount} equipos, ${pack.playerCount} jugadores`);
      setResult(JSON.stringify(pack, null, 2));
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    }
    
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setStatus('📋 Copiado al portapapeles');
  };

  return (
    <div style={{ padding: '1rem', background: '#0a1628', color: '#e0e8f0', minHeight: '100vh' }}>
      <h2>🔧 Generador de Pack</h2>
      <p>Lee teams (reales) y teams_v2 (ficticios) de Firebase y genera el pack de mapeo.</p>
      <button 
        onClick={generate} 
        disabled={generating}
        style={{ padding: '0.5rem 1rem', background: '#2266cc', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', marginBottom: '1rem' }}
      >
        {generating ? 'Generando...' : 'Generar Pack'}
      </button>
      <p>{status}</p>
      {result && (
        <>
          <button onClick={copyToClipboard} style={{ padding: '0.3rem 0.8rem', background: '#338833', color: 'white', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
            Copiar JSON
          </button>
          <textarea 
            value={result} 
            readOnly 
            style={{ width: '100%', height: '400px', background: '#111', color: '#aaffaa', fontFamily: 'monospace', fontSize: '0.7rem', padding: '0.5rem', border: '1px solid #333' }} 
          />
        </>
      )}
    </div>
  );
}
