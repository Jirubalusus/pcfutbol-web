import { getAvailableHistoricalSeasons } from './historicalDatabaseService';

export const ACTIVE_DATABASE_STORAGE_KEY = 'pcgaffer_active_database_season';
export const CURRENT_DATABASE_ID = 'current';

export const CURRENT_DATABASE_OPTION = {
  id: CURRENT_DATABASE_ID,
  label: 'Temporada actual 2025/26',
  shortLabel: '2025/26 actual',
  startYear: 2025,
  historical: false,
  type: 'current',
};

export function getDatabaseSeasonStartYear(option) {
  if (!option) return null;
  if (Number.isInteger(option.startYear)) return option.startYear;
  if (Number.isInteger(option.seasonStartYear)) return option.seasonStartYear;

  const seasonId = typeof option.id === 'string' ? option.id : '';
  const idMatch = seasonId.match(/^(\d{4})[-/](\d{2}|\d{4})$/);
  if (idMatch) return Number(idMatch[1]);

  return null;
}

function getDatabaseSeasonKey(option) {
  const startYear = getDatabaseSeasonStartYear(option);
  if (!Number.isInteger(startYear)) return null;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function getStoredActiveDatabaseId() {
  if (typeof window === 'undefined') return CURRENT_DATABASE_ID;
  return window.localStorage.getItem(ACTIVE_DATABASE_STORAGE_KEY) || CURRENT_DATABASE_ID;
}

export function setStoredActiveDatabaseId(id) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_DATABASE_STORAGE_KEY, id || CURRENT_DATABASE_ID);
  window.dispatchEvent(new CustomEvent('pcgaffer:active-database-changed', { detail: { id: id || CURRENT_DATABASE_ID } }));
}

export async function getDatabaseOptions() {
  const historical = await getAvailableHistoricalSeasons().catch(() => []);
  const seenSeasonKeys = new Set([getDatabaseSeasonKey(CURRENT_DATABASE_OPTION)].filter(Boolean));
  const historicalOptions = (historical || []).map((season) => {
    const startYear = getDatabaseSeasonStartYear(season);
    return {
      ...season,
      id: season.id,
      label: season.label || `Temporada ${season.id?.replace('-', '/')}`,
      shortLabel: season.id?.replace('-', '/') || season.label,
      startYear,
      historical: true,
      type: 'historical',
    };
  }).filter((option) => {
    const seasonKey = getDatabaseSeasonKey(option);
    if (!seasonKey) return true;
    if (seenSeasonKeys.has(seasonKey)) return false;
    seenSeasonKeys.add(seasonKey);
    return true;
  });

  return [
    CURRENT_DATABASE_OPTION,
    ...historicalOptions,
  ];
}

export async function getActiveDatabaseOption() {
  const id = getStoredActiveDatabaseId();
  const options = await getDatabaseOptions();
  return options.find((option) => option.id === id) || CURRENT_DATABASE_OPTION;
}

export function formatDatabaseLabel(optionOrId) {
  if (!optionOrId) return CURRENT_DATABASE_OPTION.label;
  if (typeof optionOrId === 'string') {
    return optionOrId === CURRENT_DATABASE_ID ? CURRENT_DATABASE_OPTION.label : `Temporada ${optionOrId.replace('-', '/')}`;
  }
  return optionOrId.label || formatDatabaseLabel(optionOrId.id);
}
