// Test ranked bot - writes directly to Firestore (no auth needed if rules allow)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, getDocs, deleteDoc, Timestamp, collection, query, where, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBIpJz1ZoZx_roIne3oc0yArVzeo4kDmvw",
  authDomain: "pcfutbol-web.firebaseapp.com",
  projectId: "pcfutbol-web",
  storageBucket: "pcfutbol-web.firebasestorage.app",
  messagingSenderId: "664376263748",
  appId: "1:664376263748:web:3ba1fd5d119d021cb5e811"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const FAKE_UID = 'test-bot-' + Date.now();

async function main() {
  console.log('🤖 Bot UID:', FAKE_UID);
  
  // Create player profile
  await setDoc(doc(db, 'ranked_players', FAKE_UID), {
    displayName: 'AutoBot',
    tier: 'bronze_iii', lp: 0, totalLP: 0,
    wins: 0, losses: 0, draws: 0, matchHistory: [],
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  });
  console.log('✅ Player profile created');

  // Join queue
  await setDoc(doc(db, 'ranked_queue', FAKE_UID), {
    uid: FAKE_UID, displayName: 'AutoBot', totalLP: 0,
    joinedAt: Timestamp.now(), status: 'waiting',
  });
  console.log('✅ In queue. Waiting for match...');

  // Poll for matches every 2s
  let matchId = null;
  let myKey = null;
  
  const pollInterval = setInterval(async () => {
    try {
      // Check all matches for our UID
      const q1 = query(collection(db, 'ranked_matches'), where('player1.uid', '==', FAKE_UID));
      const q2 = query(collection(db, 'ranked_matches'), where('player2.uid', '==', FAKE_UID));
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      let found = null;
      s1.forEach(d => { if (d.data().phase !== 'results') found = { id: d.id, ...d.data(), key: 'player1' }; });
      s2.forEach(d => { if (d.data().phase !== 'results') found = { id: d.id, ...d.data(), key: 'player2' }; });
      
      if (found && !matchId) {
        matchId = found.id;
        myKey = found.key;
        console.log('🎉 MATCH FOUND:', matchId, 'as', myKey);
        console.log('   League:', found.leagueName);
        console.log('   Teams:', found.teams?.map(t => t.name).join(', '));
        clearInterval(pollInterval);
        await playMatch(matchId, myKey, found);
      }
    } catch(e) {
      // Ignore query errors
    }
  }, 2000);

  // Timeout after 60s
  setTimeout(() => {
    if (!matchId) {
      console.log('⏰ No match found in 60s');
      clearInterval(pollInterval);
      cleanup();
    }
  }, 60000);
}

async function playMatch(matchId, myKey, matchData) {
  const otherKey = myKey === 'player1' ? 'player2' : 'player1';
  const matchRef = doc(db, 'ranked_matches', matchId);
  
  // Heartbeat loop
  const heartbeat = setInterval(async () => {
    try {
      await updateDoc(matchRef, {
        [`disconnectCheck.${myKey}Last`]: Timestamp.now(),
      });
    } catch(e) {}
  }, 8000);

  // Phase handler loop
  const phaseLoop = setInterval(async () => {
    try {
      const snap = await getDoc(matchRef);
      if (!snap.exists()) { clearInterval(phaseLoop); clearInterval(heartbeat); return; }
      const data = snap.data();
      
      console.log('  Phase:', data.phase);

      // Team selection
      if (data.phase === 'team_selection' && !data[myKey].team) {
        const otherTeam = data[otherKey].team;
        const available = (data.teams || []).filter(t => t.id !== otherTeam);
        if (available.length > 0) {
          const pick = available[Math.floor(Math.random() * available.length)];
          console.log('🤖 Selecting team:', pick.name);
          
          const update = { [`${myKey}.team`]: pick.id, updatedAt: Timestamp.now() };
          // If other player already selected, advance to round1
          if (data[otherKey].team) {
            update.phase = 'round1';
            update.phaseDeadline = Timestamp.fromDate(new Date(Date.now() + 180000));
          }
          await updateDoc(matchRef, update);
        }
      }
      
      // Rounds
      if ((data.phase === 'round1' || data.phase === 'round2')) {
        const roundKey = data.phase === 'round1' ? 'round1Data' : 'round2Data';
        if (!data[roundKey]?.[myKey]?.ready) {
          console.log('🤖 Submitting config for', data.phase);
          await updateDoc(matchRef, {
            [`${myKey}.config`]: { formation: '4-4-2', tactic: 'balanced', morale: 75 },
            [`${roundKey}.${myKey}`]: { formation: '4-4-2', tactic: 'balanced', ready: true, timestamp: Date.now() },
            updatedAt: Timestamp.now(),
          });
        }
      }
      
      // Results - done
      if (data.phase === 'results') {
        console.log('🏁 Match finished!');
        console.log('   Winner:', data.winner === FAKE_UID ? 'ME (bot)' : 'Opponent');
        console.log('   P1 pts:', data.results?.player1Points, 'P2 pts:', data.results?.player2Points);
        clearInterval(phaseLoop);
        clearInterval(heartbeat);
        setTimeout(cleanup, 3000);
      }
    } catch(e) {
      console.log('Phase loop error:', e.message);
    }
  }, 3000);
}

async function cleanup() {
  try {
    await deleteDoc(doc(db, 'ranked_queue', FAKE_UID));
    await deleteDoc(doc(db, 'ranked_players', FAKE_UID));
    console.log('🧹 Cleaned up');
  } catch(e) {}
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
