export const GLORY_NO_SEGUNDA_RFEF_NOTE = 'Esta temporada historica no incluye Segunda RFEF: arrancas en Primera Federacion y no hay descenso a una categoria inexistente.';

export function universeHasLeague(activeSeasonUniverse, leagueId) {
  return (activeSeasonUniverse?.entries || []).some(entry => entry.id === leagueId && entry.teams?.length > 0);
}

export function activeUniverseHasSegundaRfef(activeSeasonUniverse) {
  return universeHasLeague(activeSeasonUniverse, 'segundaRFEF');
}

export function gloryStartsInHistoricalPrimeraRfef(activeSeasonUniverse, targetLeagueId = null) {
  const hasSegundaRFEF = activeUniverseHasSegundaRfef(activeSeasonUniverse);
  const hasPrimeraRFEF = universeHasLeague(activeSeasonUniverse, 'primeraRFEF');
  const selectedPrimera = targetLeagueId == null || targetLeagueId === 'primeraRFEF';
  return !!activeSeasonUniverse?.historical && !hasSegundaRFEF && hasPrimeraRFEF && selectedPrimera;
}

export function shouldSuppressGloryHistoricalRelegation(state, leagueId) {
  return state?.gameMode === 'glory'
    && !!state?.historicalDatabase
    && leagueId === 'primeraRFEF'
    && (state?.gloryData?.historicalNoSegundaRfef === true
      || state?.gloryData?.noRelegationFrom?.includes('primeraRFEF'));
}

export function buildGloryHistoricalFlags(activeSeasonUniverse, targetLeagueId) {
  const historicalNoSegundaRfef = gloryStartsInHistoricalPrimeraRfef(activeSeasonUniverse, targetLeagueId);
  return {
    startDivision: targetLeagueId,
    historicalNoSegundaRfef,
    noRelegationFrom: historicalNoSegundaRfef ? ['primeraRFEF'] : [],
    ...(historicalNoSegundaRfef ? { startDivisionNote: GLORY_NO_SEGUNDA_RFEF_NOTE } : {})
  };
}
