import { useEffect } from 'react';
import { getActiveEditionId } from '../../data/editions/editionService';
import {
  getCachedEditionTeamAsset,
  getEditionTeamAsset,
  normalizeTeamAssetKey
} from '../../data/editions/editionAssetsService';

const crestImageCache = new Map();

export function getOfficialCrestUrlFromAsset(asset) {
  return asset?.assetType === 'crest' && asset?.status !== 'archived'
    ? asset.downloadUrl || null
    : null;
}

export function isCrestImageReady(url) {
  return !!url && crestImageCache.get(url)?.status === 'loaded';
}

export function preloadCrestImage(url) {
  if (!url || typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(false);
  }

  const cached = crestImageCache.get(url);
  if (cached?.status === 'loaded') return Promise.resolve(true);
  if (cached?.promise) return cached.promise;

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';

    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') {
          await image.decode();
        }
      } catch {
        // The image is already loaded; decode can reject for SVG/CORS/browser quirks.
      }

      crestImageCache.set(url, { status: 'loaded', promise: Promise.resolve(true) });
      resolve(true);
    };

    image.onerror = () => {
      crestImageCache.set(url, { status: 'error', promise: Promise.resolve(false) });
      resolve(false);
    };

    image.src = url;
  });

  crestImageCache.set(url, { status: 'loading', promise });
  return promise;
}

export async function getEditionCrestUrl(editionId, teamId) {
  if (!editionId || !normalizeTeamAssetKey(teamId)) return null;

  const cachedAsset = getCachedEditionTeamAsset(editionId, teamId);
  const cachedUrl = getOfficialCrestUrlFromAsset(cachedAsset);
  if (cachedUrl) return cachedUrl;

  const asset = await getEditionTeamAsset(editionId, teamId);
  return getOfficialCrestUrlFromAsset(asset);
}

export async function preloadTeamCrests(teamIds, { editionId = getActiveEditionId(), limit = 80 } = {}) {
  if (!editionId || !Array.isArray(teamIds) || teamIds.length === 0) return [];

  const uniqueTeamIds = Array.from(new Set(teamIds.filter(Boolean))).slice(0, limit);
  const urls = await Promise.all(uniqueTeamIds.map((teamId) => getEditionCrestUrl(editionId, teamId)));
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

  await Promise.all(uniqueUrls.map((url) => preloadCrestImage(url)));
  return uniqueUrls;
}

export function usePreloadTeamCrests(teamIds, options) {
  const editionId = options?.editionId || getActiveEditionId();
  const limit = options?.limit;
  const teamKey = Array.isArray(teamIds) ? teamIds.filter(Boolean).join('|') : '';

  useEffect(() => {
    if (!editionId || !teamKey) return;

    let cancelled = false;
    const ids = teamKey.split('|');

    preloadTeamCrests(ids, { editionId, limit }).catch((error) => {
      if (!cancelled) {
        console.warn('Could not preload team crests:', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [editionId, teamKey, limit]);
}

