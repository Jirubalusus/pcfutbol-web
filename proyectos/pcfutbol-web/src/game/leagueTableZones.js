// ============================================================
// LEAGUE TABLE ZONES - pure zone resolution for the classification UI
// ============================================================
//
// Resolves the visual zone (champions / europa / conference / promotion /
// playoff / relegation) for a single standings position. Kept as a pure,
// dependency-free function so it can be unit-audited without React/SCSS.
//
// Promotion, European and playoff zones are anchored to the TOP of the table,
// so their static position arrays are always correct. Relegation is always the
// bottom N rows, so it is anchored to the ACTUAL table length rather than the
// static config positions: a league whose live size differs from its static
// config (e.g. Segunda Ibérica is configured for 20 teams / relegation
// [18,19,20] but a Pro Manager career can run it with 22 teams, where the real
// relegation zone is [20,21,22]) still paints the true last-N rows.

/**
 * @param {Object} params
 * @param {number} params.position    1-based standings position.
 * @param {Object} params.leagueConfig Zone config (champions/europaLeague/…/relegation/relegationFromBottom).
 * @param {number} [params.tableLength] Number of rows in the live table (0/unknown → fall back to static relegation array).
 * @returns {string} zone class name, or '' for none.
 */
export function resolveRowZone({ position, leagueConfig = {}, tableLength = 0 }) {
  if (leagueConfig.champions?.includes(position)) return 'champions';
  if (leagueConfig.libertadores?.includes(position)) return 'champions'; // Same color as CL
  if (leagueConfig.europaLeague?.includes(position)) return 'europa';
  if (leagueConfig.sudamericana?.includes(position)) return 'europa'; // Same color as EL
  if (leagueConfig.conference?.includes(position)) return 'conference';
  if (leagueConfig.promotion?.includes(position)) return 'promotion';
  if (leagueConfig.playoff?.includes(position)) return 'playoff';

  // Relegation: bottom N rows of the actual table. Anchoring to tableLength
  // keeps the last-N rows red even when the live league is bigger/smaller than
  // its static config. Falls back to the static array when the size is unknown.
  const relegationSlots = leagueConfig.relegation?.length || 0;
  if (relegationSlots > 0) {
    if (tableLength > 0) {
      if (position > tableLength - relegationSlots) return 'relegation';
    } else if (leagueConfig.relegation.includes(position)) {
      return 'relegation';
    }
  }

  // Dynamic relegation for group leagues (last N teams).
  if (leagueConfig.relegationFromBottom && tableLength > 0) {
    if (position > tableLength - leagueConfig.relegationFromBottom) return 'relegation';
  }

  return '';
}
