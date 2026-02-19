const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

initializeApp();
const db = getFirestore();

const BATCH_SIZE = 500;
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/**
 * Delete documents in batches.
 */
async function deleteDocs(docRefs) {
  let deleted = 0;
  for (let i = 0; i < docRefs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docRefs.slice(i, i + BATCH_SIZE);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

/**
 * Get set of all existing user IDs.
 */
async function getExistingUserIds() {
  const usersSnap = await db.collection("users").select().get();
  const ids = new Set();
  usersSnap.forEach((doc) => ids.add(doc.id));
  return ids;
}

/**
 * Find orphaned docs (userId not in users collection) and inactive docs (older than 6 months).
 */
async function findDocsToDelete(collectionName, userIds) {
  const snapshot = await db.collection(collectionName).get();
  const orphaned = [];
  const inactive = [];
  const cutoff = Date.now() - SIX_MONTHS_MS;

  snapshot.forEach((doc) => {
    const data = doc.data();

    // Check orphaned
    if (data.userId && !userIds.has(data.userId)) {
      orphaned.push(doc.ref);
      return; // Don't double-count
    }

    // Check inactive
    const timestamp = data.lastSaved || data.updatedAt;
    if (timestamp) {
      const ts = timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
      if (ts < cutoff) {
        inactive.push(doc.ref);
      }
    }
  });

  return { orphaned, inactive };
}

/**
 * Scheduled cleanup - runs every Sunday at 03:00 UTC.
 */
exports.cleanupOrphanedData = onSchedule("every sunday 03:00", async () => {
  logger.info("Starting cleanup of orphaned and inactive data...");

  const userIds = await getExistingUserIds();
  logger.info(`Found ${userIds.size} existing users.`);

  const stats = {
    saves: { orphaned: 0, inactive: 0 },
    promanager_saves: { orphaned: 0, inactive: 0 },
  };

  for (const collection of ["saves", "promanager_saves"]) {
    const { orphaned, inactive } = await findDocsToDelete(collection, userIds);

    if (orphaned.length > 0) {
      stats[collection].orphaned = await deleteDocs(orphaned);
    }
    if (inactive.length > 0) {
      stats[collection].inactive = await deleteDocs(inactive);
    }
  }

  logger.info("Cleanup complete.", { stats });
  return stats;
});
