/**
 * Edition assets service
 *
 * Stores official crest metadata outside the main edition doc to avoid hitting
 * Firestore document size limits. Binary files live in Firebase Storage and the
 * metadata/index lives in Firestore under each edition.
 *
 * Data model:
 *   editions/{editionId}/team_assets/{teamKey}
 *   {
 *     teamKey: string,
 *     teamId: string | null,
 *     teamName: string,
 *     assetType: 'crest',
 *     variant: 'official',
 *     storagePath: string,
 *     downloadUrl: string,
 *     mimeType: string,
 *     width: number | null,
 *     height: number | null,
 *     sizeBytes: number | null,
 *     sourceUrl: string | null,
 *     sourceSite: string | null,
 *     sourceLicense: string | null,
 *     season: string | null,
 *     status: 'active' | 'pending' | 'archived',
 *     createdAt: ISOString,
 *     updatedAt: ISOString
 *   }
 */
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from '../../firebase/config';

const TEAM_ASSETS_SUBCOLLECTION = 'team_assets';

export function normalizeTeamAssetKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeAsset(docId, data = {}) {
  return {
    id: docId,
    teamKey: data.teamKey || docId,
    teamId: data.teamId || null,
    teamName: data.teamName || '',
    assetType: data.assetType || 'crest',
    variant: data.variant || 'official',
    storagePath: data.storagePath || null,
    downloadUrl: data.downloadUrl || null,
    mimeType: data.mimeType || null,
    width: data.width ?? null,
    height: data.height ?? null,
    sizeBytes: data.sizeBytes ?? null,
    sourceUrl: data.sourceUrl || null,
    sourceSite: data.sourceSite || null,
    sourceLicense: data.sourceLicense || null,
    season: data.season || null,
    status: data.status || 'active',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

async function resolveAssetDownloadUrl(asset) {
  if (asset.downloadUrl || !asset.storagePath) return asset;

  try {
    const url = await getDownloadURL(ref(storage, asset.storagePath));
    return { ...asset, downloadUrl: url };
  } catch (error) {
    console.warn('Could not resolve asset download URL:', asset.storagePath, error);
    return asset;
  }
}

export async function getEditionTeamAssets(editionId) {
  if (!editionId) return {};

  try {
    const snapshot = await getDocs(collection(db, 'editions', editionId, TEAM_ASSETS_SUBCOLLECTION));
    const entries = await Promise.all(
      snapshot.docs.map(async (snap) => {
        const asset = normalizeAsset(snap.id, snap.data());
        const hydrated = await resolveAssetDownloadUrl(asset);
        return [hydrated.teamKey, hydrated];
      })
    );

    return Object.fromEntries(entries);
  } catch (error) {
    console.error('Error loading edition team assets:', error);
    return {};
  }
}

export async function getEditionTeamAsset(editionId, teamKeyOrId) {
  if (!editionId || !teamKeyOrId) return null;

  const teamKey = normalizeTeamAssetKey(teamKeyOrId);

  try {
    const candidateKeys = Array.from(new Set([
      String(teamKeyOrId || ''),
      teamKey
    ].filter(Boolean)));

    for (const candidateKey of candidateKeys) {
      const snap = await getDoc(doc(db, 'editions', editionId, TEAM_ASSETS_SUBCOLLECTION, candidateKey));
      if (!snap.exists()) continue;

      const asset = normalizeAsset(snap.id, snap.data());
      return await resolveAssetDownloadUrl(asset);
    }

    return null;
  } catch (error) {
    console.error('Error loading edition team asset:', error);
    return null;
  }
}
