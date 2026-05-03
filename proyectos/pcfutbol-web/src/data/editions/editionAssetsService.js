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
const EDITION_ASSET_STORAGE_PREFIX = 'pcgaffer_edition_assets_';
const EDITION_ASSET_STORAGE_VERSION = 1;

// The public/importable JSON pack historically used a different id than the
// Firestore edition document that contains the official crest subcollection.
// Team/player names can still apply from the active pack id, but crest lookups
// must also try the canonical Firestore document id.
const EDITION_ASSET_ID_ALIASES = {
  competicion_2025_26: ['real_names_2025_26']
};

const editionAssetsCache = new Map();
const editionAssetsPreloadPromises = new Map();

export function getEditionAssetLookupIds(editionId) {
  if (!editionId) return [];
  return Array.from(new Set([
    editionId,
    ...(EDITION_ASSET_ID_ALIASES[editionId] || [])
  ].filter(Boolean)));
}

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

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function getEditionAssetStorageKey(editionId) {
  return `${EDITION_ASSET_STORAGE_PREFIX}${editionId}`;
}

function getEditionCache(editionId) {
  if (!editionId) return null;

  let cache = editionAssetsCache.get(editionId);
  if (!cache) {
    cache = new Map();
    editionAssetsCache.set(editionId, cache);
  }
  return cache;
}

function getUniqueAssetsFromCache(editionId) {
  const cache = editionAssetsCache.get(editionId);
  if (!cache?.size) return [];

  const unique = new Map();
  for (const asset of cache.values()) {
    if (asset?.id && !unique.has(asset.id)) {
      unique.set(asset.id, { ...asset });
    }
  }

  return Array.from(unique.values());
}

function hydrateCacheFromAssets(sourceEditionId, targetEditionId) {
  if (!sourceEditionId || !targetEditionId || sourceEditionId === targetEditionId) return false;

  const sourceAssets = getUniqueAssetsFromCache(sourceEditionId);
  if (sourceAssets.length === 0) return false;

  hydrateEditionAssetsCache(targetEditionId, sourceAssets);
  return true;
}

function buildAssetAliases(asset) {
  return Array.from(new Set([
    asset?.id,
    asset?.teamKey,
    asset?.teamId,
    normalizeTeamAssetKey(asset?.id),
    normalizeTeamAssetKey(asset?.teamKey),
    normalizeTeamAssetKey(asset?.teamId)
  ].filter(Boolean)));
}

function cacheEditionAsset(editionId, assetInput) {
  if (!editionId || !assetInput) return null;

  const asset = normalizeAsset(
    assetInput.id || assetInput.teamKey || assetInput.teamId || 'unknown',
    assetInput
  );

  const cache = getEditionCache(editionId);
  for (const alias of buildAssetAliases(asset)) {
    cache.set(alias, asset);
  }

  return asset;
}

function hydrateEditionAssetsCache(editionId, assets = []) {
  const cache = getEditionCache(editionId);
  cache.clear();

  for (const asset of assets) {
    cacheEditionAsset(editionId, asset);
  }

  return cache;
}

function persistEditionAssets(editionId, assets) {
  if (!editionId || !canUseLocalStorage()) return;

  try {
    localStorage.setItem(
      getEditionAssetStorageKey(editionId),
      JSON.stringify({
        version: EDITION_ASSET_STORAGE_VERSION,
        savedAt: Date.now(),
        assets: assets.map((asset) => normalizeAsset(asset.id || asset.teamKey || asset.teamId || 'unknown', asset))
      })
    );
  } catch (error) {
    console.warn('Could not persist edition assets cache:', editionId, error);
  }
}

function restorePersistedEditionAssets(editionId) {
  if (!editionId || !canUseLocalStorage()) return false;

  try {
    const raw = localStorage.getItem(getEditionAssetStorageKey(editionId));
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (parsed?.version !== EDITION_ASSET_STORAGE_VERSION || !Array.isArray(parsed.assets)) {
      localStorage.removeItem(getEditionAssetStorageKey(editionId));
      return false;
    }

    hydrateEditionAssetsCache(editionId, parsed.assets);
    return true;
  } catch (error) {
    console.warn('Could not restore persisted edition assets cache:', editionId, error);
    try {
      localStorage.removeItem(getEditionAssetStorageKey(editionId));
    } catch {
      // ignore storage cleanup errors
    }
    return false;
  }
}

function getCachedAssetInternal(editionId, teamKeyOrId) {
  if (!editionId || !teamKeyOrId) return null;

  for (const lookupEditionId of getEditionAssetLookupIds(editionId)) {
    const cache = editionAssetsCache.get(lookupEditionId);
    if ((!cache || cache.size === 0) && !restorePersistedEditionAssets(lookupEditionId)) {
      continue;
    }

    const hydratedCache = editionAssetsCache.get(lookupEditionId);
    if (!hydratedCache?.size) continue;

    const candidateKeys = Array.from(new Set([
      String(teamKeyOrId || ''),
      normalizeTeamAssetKey(teamKeyOrId)
    ].filter(Boolean)));

    for (const candidateKey of candidateKeys) {
      const asset = hydratedCache.get(candidateKey);
      if (asset) {
        if (lookupEditionId !== editionId) cacheEditionAsset(editionId, asset);
        return asset;
      }
    }
  }

  return null;
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

function toAssetMapObject(editionId) {
  return Object.fromEntries(
    getUniqueAssetsFromCache(editionId).map((asset) => [asset.teamKey, asset])
  );
}

export function getCachedEditionTeamAsset(editionId, teamKeyOrId) {
  const asset = getCachedAssetInternal(editionId, teamKeyOrId);
  return asset ? { ...asset } : null;
}

export async function preloadEditionTeamAssets(editionId, { forceRefresh = false } = {}) {
  if (!editionId) return {};

  const lookupEditionIds = getEditionAssetLookupIds(editionId);

  if (!forceRefresh) {
    for (const lookupEditionId of lookupEditionIds) {
      const cachedAssets = getUniqueAssetsFromCache(lookupEditionId);
      if (cachedAssets.length > 0) {
        if (lookupEditionId !== editionId) hydrateEditionAssetsCache(editionId, cachedAssets);
        return toAssetMapObject(editionId);
      }
    }

    for (const lookupEditionId of lookupEditionIds) {
      if (restorePersistedEditionAssets(lookupEditionId)) {
        if (lookupEditionId !== editionId) hydrateCacheFromAssets(lookupEditionId, editionId);
        return toAssetMapObject(editionId);
      }
    }
  }

  if (editionAssetsPreloadPromises.has(editionId)) {
    return editionAssetsPreloadPromises.get(editionId);
  }

  const promise = (async () => {
    try {
      for (const lookupEditionId of lookupEditionIds) {
        const snapshot = await getDocs(collection(db, 'editions', lookupEditionId, TEAM_ASSETS_SUBCOLLECTION));
        if (snapshot.empty) continue;

        const assets = await Promise.all(
          snapshot.docs.map(async (snap) => {
            const asset = normalizeAsset(snap.id, snap.data());
            return asset.downloadUrl ? asset : resolveAssetDownloadUrl(asset);
          })
        );

        hydrateEditionAssetsCache(lookupEditionId, assets);
        persistEditionAssets(lookupEditionId, assets);

        if (lookupEditionId !== editionId) {
          hydrateEditionAssetsCache(editionId, assets);
          persistEditionAssets(editionId, assets);
        }

        return toAssetMapObject(editionId);
      }

      hydrateEditionAssetsCache(editionId, []);
      return {};
    } catch (error) {
      console.error('Error loading edition team assets:', error);
      return {};
    } finally {
      editionAssetsPreloadPromises.delete(editionId);
    }
  })();

  editionAssetsPreloadPromises.set(editionId, promise);
  return promise;
}

export async function getEditionTeamAssets(editionId) {
  if (!editionId) return {};
  return preloadEditionTeamAssets(editionId);
}

export async function getEditionTeamAsset(editionId, teamKeyOrId) {
  if (!editionId || !teamKeyOrId) return null;

  const cached = getCachedAssetInternal(editionId, teamKeyOrId);
  if (cached) return { ...cached };

  const teamKey = normalizeTeamAssetKey(teamKeyOrId);

  try {
    const candidateKeys = Array.from(new Set([
      String(teamKeyOrId || ''),
      teamKey
    ].filter(Boolean)));

    for (const lookupEditionId of getEditionAssetLookupIds(editionId)) {
      for (const candidateKey of candidateKeys) {
        const snap = await getDoc(doc(db, 'editions', lookupEditionId, TEAM_ASSETS_SUBCOLLECTION, candidateKey));
        if (!snap.exists()) continue;

        const asset = normalizeAsset(snap.id, snap.data());
        const hydrated = await resolveAssetDownloadUrl(asset);
        cacheEditionAsset(lookupEditionId, hydrated);
        if (lookupEditionId !== editionId) cacheEditionAsset(editionId, hydrated);
        return { ...hydrated };
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading edition team asset:', error);
    return null;
  }
}

export function clearEditionTeamAssetsCache(editionId = null) {
  if (editionId) {
    editionAssetsCache.delete(editionId);
    editionAssetsPreloadPromises.delete(editionId);
    return;
  }

  editionAssetsCache.clear();
  editionAssetsPreloadPromises.clear();
}
