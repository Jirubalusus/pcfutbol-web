const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

setGlobalOptions({
  region: "europe-west1",
  timeoutSeconds: 120,
  memory: "256MiB",
  maxInstances: 1,
});

initializeApp();
const db = getFirestore();

const BATCH_SIZE = 450;
const MAX_DELETES_PER_RUN = 2000;
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const SAVE_COLLECTIONS = [
  "saves",
  "career_saves",
  "contrarreloj_saves",
  "glory_saves",
  "promanager_saves",
];

async function deleteSnapshotDocs(snapshot) {
  if (snapshot.empty) return 0;

  let deleted = 0;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

async function deleteOldDocsByField(collectionName, fieldName, cutoff, remainingBudget) {
  if (remainingBudget <= 0) return 0;

  const limit = Math.min(BATCH_SIZE, remainingBudget);
  const snapshot = await db
    .collection(collectionName)
    .where(fieldName, "<", cutoff)
    .orderBy(fieldName)
    .limit(limit)
    .get();

  return deleteSnapshotDocs(snapshot);
}

async function cleanupCollection(collectionName, cutoff, remainingBudget) {
  const stats = { lastSaved: 0, updatedAt: 0 };

  stats.lastSaved = await deleteOldDocsByField(collectionName, "lastSaved", cutoff, remainingBudget);
  remainingBudget -= stats.lastSaved;

  stats.updatedAt = await deleteOldDocsByField(collectionName, "updatedAt", cutoff, remainingBudget);
  return stats;
}

/**
 * Scheduled cleanup - runs every Sunday at 03:00 UTC.
 *
 * This intentionally avoids full scans of users and save collections. It only
 * deletes stale save docs found through single-field timestamp queries, capped
 * per execution so the job stays predictable as player volume grows.
 */
exports.cleanupOrphanedData = onSchedule("every sunday 03:00", async () => {
  logger.info("Starting inactive save cleanup...");

  const cutoff = new Date(Date.now() - SIX_MONTHS_MS);
  const stats = {};
  let remainingBudget = MAX_DELETES_PER_RUN;

  for (const collectionName of SAVE_COLLECTIONS) {
    if (remainingBudget <= 0) {
      stats[collectionName] = { skipped: "delete budget exhausted" };
      continue;
    }

    const collectionStats = await cleanupCollection(collectionName, cutoff, remainingBudget);
    const deleted = collectionStats.lastSaved + collectionStats.updatedAt;
    remainingBudget -= deleted;
    stats[collectionName] = collectionStats;
  }

  logger.info("Inactive save cleanup complete.", { stats, remainingBudget });
  return { stats, remainingBudget };
});
