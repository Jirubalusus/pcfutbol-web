#!/usr/bin/env node
/**
 * Rebuild public leaderboard aggregate docs with Firebase Admin SDK.
 *
 * Usage (trusted environment only):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json \
 *   FIREBASE_PROJECT_ID=pcfutbol-web \
 *   node scripts/rebuild-leaderboard-aggregates.mjs
 *
 * Writes:
 *   leaderboard_aggregates/contrarreloj_top
 *   leaderboard_aggregates/ranked_top
 *
 * The browser client reads these single docs and falls back to legacy queries
 * when they are missing. Firestore rules keep these docs read-only for clients.
 */
import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const MAX = 100;

if (!admin.apps.length) {
  admin.initializeApp(projectId ? { projectId } : undefined);
}

const db = admin.firestore();

function sanitizeContrarreloj(entry) {
  if (!entry) return null;
  const trophies = Array.isArray(entry.trophies) ? entry.trophies.slice(0, 30).map((t) => {
    if (!t || typeof t !== 'object') return t;
    return {
      name: t.name || '',
      type: t.type || '',
      season: t.season || null,
    };
  }) : [];
  let date = entry.date || null;
  if (date && typeof date.toDate === 'function') date = date.toDate().toISOString();
  return {
    id: entry.id || null,
    playerName: entry.playerName || 'Gaffer',
    teamName: entry.teamName || '',
    leagueName: entry.leagueName || '',
    seasonsPlayed: Number(entry.seasonsPlayed || 0),
    trophies,
    wonCompetition: entry.wonCompetition || null,
    totalWins: Number(entry.totalWins || 0),
    totalDraws: Number(entry.totalDraws || 0),
    totalLosses: Number(entry.totalLosses || 0),
    totalMatches: Number(entry.totalMatches || 0),
    difficultyBonus: Number(entry.difficultyBonus || 0),
    weightedScore: Number(entry.weightedScore ?? ((entry.seasonsPlayed || 0) - (entry.difficultyBonus || 0))),
    date,
  };
}

function sortContrarreloj(entries) {
  return entries.sort((a, b) => {
    const aScore = (a.seasonsPlayed || 0) - (a.difficultyBonus || 0);
    const bScore = (b.seasonsPlayed || 0) - (b.difficultyBonus || 0);
    if (aScore !== bScore) return aScore - bScore;
    const trophyDiff = (b.trophies?.length || 0) - (a.trophies?.length || 0);
    if (trophyDiff !== 0) return trophyDiff;
    const aWinRate = (a.totalMatches || 0) > 0 ? (a.totalWins || 0) / a.totalMatches : 0;
    const bWinRate = (b.totalMatches || 0) > 0 ? (b.totalWins || 0) / b.totalMatches : 0;
    if (Math.abs(bWinRate - aWinRate) > 0.001) return bWinRate - aWinRate;
    return (a.totalMatches || 0) - (b.totalMatches || 0);
  });
}

function sanitizeRanked(id, data) {
  if (!data) return null;
  return {
    id,
    displayName: data.displayName || 'Jugador',
    totalLP: Number(data.totalLP || 0),
    wins: Number(data.wins || 0),
    losses: Number(data.losses || 0),
    draws: Number(data.draws || 0),
  };
}

async function rebuildContrarreloj() {
  const snap = await db.collection('contrarreloj_ranking').orderBy('seasonsPlayed', 'asc').limit(500).get();
  const all = snap.docs.map((doc) => sanitizeContrarreloj({ id: doc.id, ...doc.data() })).filter(Boolean);
  const entries = sortContrarreloj(all).slice(0, MAX);
  await db.collection('leaderboard_aggregates').doc('contrarreloj_top').set({
    entries,
    total: snap.size,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: 'admin-rebuild',
  }, { merge: true });
  console.log(`contrarreloj_top: ${entries.length} entries, sampled total ${snap.size}`);
}

async function rebuildRanked() {
  const snap = await db.collection('ranked_players').orderBy('totalLP', 'desc').limit(MAX).get();
  const entries = snap.docs.map((doc) => sanitizeRanked(doc.id, doc.data())).filter(Boolean);
  await db.collection('leaderboard_aggregates').doc('ranked_top').set({
    entries,
    total: snap.size,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source: 'admin-rebuild',
  }, { merge: true });
  console.log(`ranked_top: ${entries.length} entries`);
}

await rebuildContrarreloj();
await rebuildRanked();
console.log('Done.');
