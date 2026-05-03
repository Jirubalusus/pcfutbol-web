// ============================================================
// EUROPE — European Competitions UI Component
// ============================================================
// Shows Swiss league table, knockout brackets, prize money, etc.
// ============================================================

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { COMPETITIONS } from '../../game/europeanCompetitions';
import { SA_COMPETITIONS } from '../../game/southAmericanCompetitions';
import { getPlayerCompetition, isTeamAlive } from '../../game/europeanSeason';
import { getPlayerSACompetition } from '../../game/southAmericanSeason';
import { isSouthAmericanLeague } from '../../game/southAmericanCompetitions';
import { Trophy, Globe, Star, ChevronDown, ChevronUp, Award, Zap, Medal, Shield, Crown, Swords, CircleDot, Target, Route, WalletCards } from 'lucide-react';
import TeamCrest from '../TeamCrest/TeamCrest';
import './Europe.scss';


const COMPETITION_ICON_MAP = {
  championsLeague: Crown,
  europaLeague: Trophy,
  conferenceleague: Medal,
  copaLibertadores: Trophy,
  copaSudamericana: Shield,
  recopaSudamericana: Medal
};

const LEAGUE_CODES = {
  laliga: 'ESP',
  segunda: 'ESP',
  primeraRFEF: 'ESP',
  segundaRFEF: 'ESP',
  premierLeague: 'ENG',
  championship: 'ENG',
  serieA: 'ITA',
  serieB: 'ITA',
  bundesliga: 'GER',
  bundesliga2: 'GER',
  ligue1: 'FRA',
  eredivisie: 'NED',
  primeiraLiga: 'POR',
  belgianPro: 'BEL',
  superLig: 'TUR',
  scottishPrem: 'SCO',
  austrianBundesliga: 'AUT',
  greekSuperLeague: 'GRE',
  swissSuperLeague: 'SUI',
  danishSuperliga: 'DEN',
  croatianLeague: 'CRO',
  czechLeague: 'CZE'
};

function getCompetitionIcon(compId, size = 18) {
  const Icon = COMPETITION_ICON_MAP[compId] || Globe;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

function getLeagueCode(leagueId) {
  return LEAGUE_CODES[leagueId] || (leagueId ? leagueId.slice(0, 3).toUpperCase() : '—');
}

function getTeamId(team) {
  return team?.teamId || team?.id || null;
}

function getTeamDisplayName(team) {
  return team?.teamName || team?.name || team?.shortName || team?.teamId || 'Por decidir';
}

function TeamIdentity({ team, size = 22, compact = false }) {
  const teamId = getTeamId(team);
  return (
    <span className={`europe__team-identity ${compact ? 'compact' : ''}`}>
      {teamId && <TeamCrest teamId={teamId} size={size} />}
      <span>{getTeamDisplayName(team)}</span>
    </span>
  );
}

function getPhaseOrder() {
  return ['league', 'playoff', 'r16', 'qf', 'sf', 'final'];
}

function getPhaseStatus(phase, currentPhase) {
  const order = getPhaseOrder();
  if (currentPhase === 'completed') return 'done';
  const phaseIndex = order.indexOf(phase);
  const currentIndex = order.indexOf(currentPhase);
  if (phaseIndex < currentIndex) return 'done';
  if (phaseIndex === currentIndex) return 'now';
  return 'pending';
}

function getPhaseShortLabel(phase) {
  const labels = {
    league: 'Liguilla',
    playoff: 'Playoff',
    r16: 'Octavos',
    qf: 'Cuartos',
    sf: 'Semis',
    final: 'Campeón'
  };
  return labels[phase] || phase;
}

function getPhaseMeta(phase, compState) {
  if (phase === 'league') return compState.currentMatchday >= 8 ? '8/8' : `${compState.currentMatchday || 0}/8`;
  if (phase === 'final') return <Trophy size={16} strokeWidth={1.9} aria-label="Trofeo" />;
  if (getPhaseStatus(phase, compState.phase) === 'done') return 'OK';
  return phase === compState.phase ? 'Ahora' : '—';
}

function phaseMatches(compState, phase) {
  const map = {
    playoff: compState.playoffResults?.length ? compState.playoffResults : compState.playoffMatchups,
    r16: compState.r16Results?.length ? compState.r16Results : compState.r16Matchups,
    qf: compState.qfResults?.length ? compState.qfResults : compState.qfMatchups,
    sf: compState.sfResults?.length ? compState.sfResults : compState.sfMatchups,
    final: compState.finalResult ? [compState.finalResult] : (compState.finalMatchup ? [compState.finalMatchup] : [])
  };
  return map[phase] || [];
}

function findPlayerKnockoutMatch(compState, playerTeamId) {
  const phases = ['playoff', 'r16', 'qf', 'sf', 'final'];
  const start = Math.max(0, phases.indexOf(compState.phase));
  const ordered = [...phases.slice(start), ...phases.slice(0, start)];
  for (const phase of ordered) {
    const matches = phaseMatches(compState, phase);
    const index = matches.findIndex((m) =>
      m?.team1?.teamId === playerTeamId || m?.team2?.teamId === playerTeamId ||
      m?.winner?.teamId === playerTeamId
    );
    if (index >= 0) return { phase, match: matches[index], index };
  }
  return null;
}

function getCurrentPhaseMatches(compState) {
  if (compState.phase === 'completed') return compState.finalResult ? [compState.finalResult] : [];
  return phaseMatches(compState, compState.phase);
}

function getPotentialNextOpponent(compState, playerMatch, playerTeamId) {
  if (!playerMatch) return null;
  const phases = ['playoff', 'r16', 'qf', 'sf', 'final'];
  const nextPhase = phases[phases.indexOf(playerMatch.phase) + 1];
  if (!nextPhase) return null;

  const sameRound = phaseMatches(compState, playerMatch.phase);
  const pairedIndex = playerMatch.index % 2 === 0 ? playerMatch.index + 1 : playerMatch.index - 1;
  const pairedMatch = sameRound[pairedIndex];
  const namedTeams = [pairedMatch?.team1, pairedMatch?.team2].filter(Boolean);
  if (namedTeams.length) return namedTeams.map(getTeamDisplayName).join(' / ');

  const nextMatch = phaseMatches(compState, nextPhase).find((match) =>
    match?.team1?.teamId === playerTeamId || match?.team2?.teamId === playerTeamId
  );
  return getOppositeTeam(nextMatch, playerTeamId) ? getTeamDisplayName(getOppositeTeam(nextMatch, playerTeamId)) : null;
}

function getOppositeTeam(match, playerTeamId) {
  if (!match) return null;
  if (match.team1?.teamId === playerTeamId) return match.team2;
  if (match.team2?.teamId === playerTeamId) return match.team1;
  return match.team1 || match.team2 || null;
}

function KnockoutDashboard({ compState, playerTeamId, playerPrizeMoney, formatMoney, getPhaseLabel }) {
  const playerMatch = findPlayerKnockoutMatch(compState, playerTeamId);
  const rival = getOppositeTeam(playerMatch?.match, playerTeamId);
  const playerStanding = compState.standings?.findIndex((team) => team.teamId === playerTeamId) ?? -1;
  const playerRow = playerStanding >= 0 ? compState.standings[playerStanding] : null;
  const phaseLabel = getPhaseLabel(compState.phase);
  const nextPrize = compState.config?.prizes?.[compState.phase] || compState.config?.prizes?.qf || 0;
  const currentMatches = getCurrentPhaseMatches(compState).slice(0, 6);
  const possibleNext = getPotentialNextOpponent(compState, playerMatch, playerTeamId);
  const playerTeam = playerMatch?.match?.team1?.teamId === playerTeamId
    ? playerMatch.match.team1
    : playerMatch?.match?.team2?.teamId === playerTeamId
      ? playerMatch.match.team2
      : playerRow || compState.teams?.find((team) => team.teamId === playerTeamId);

  const renderFixtureTeam = (team, sideLabel, isPlayer = false, align = 'left') => (
    <div className={`europe__fixture-team ${align === 'right' ? 'away' : ''} ${isPlayer ? 'player' : ''}`}>
      {align === 'left' && <TeamCrest teamId={getTeamId(team)} size={28} />}
      <span>
        <small>{isPlayer ? 'Tu equipo' : sideLabel}</small>
        <strong>{getTeamDisplayName(team)}</strong>
      </span>
      {align === 'right' && <TeamCrest teamId={getTeamId(team)} size={28} />}
    </div>
  );

  const renderFixture = (matchup, idx) => {
    const isPlayerMatchup = matchup.team1?.teamId === playerTeamId || matchup.team2?.teamId === playerTeamId;
    const hasResult = matchup.winner != null;
    return (
      <div key={`${getTeamId(matchup.team1)}-${getTeamId(matchup.team2)}-${idx}`} className={`europe__fixture ${isPlayerMatchup ? 'player' : ''}`}>
        {isPlayerMatchup && <span className="europe__fixture-badge">Tú</span>}
        {renderFixtureTeam(matchup.team1, 'Local', matchup.team1?.teamId === playerTeamId)}
        <div className="europe__fixture-time">
          <strong>{hasResult ? matchup.aggregate || 'OK' : 'Próx.'}</strong>
          <small>{hasResult ? 'global' : 'VS'}</small>
        </div>
        {renderFixtureTeam(matchup.team2, 'Visitante', matchup.team2?.teamId === playerTeamId, 'right')}
      </div>
    );
  };

  return (
    <section className="europe__ko-dashboard" aria-label="Resumen de eliminatorias">
      <div className="europe__ko-hero">
        <div>
          <span className="europe__eyebrow">Ruta al título</span>
          <h3><Trophy size={24} strokeWidth={1.9} className="europe__hero-trophy" /> {compState.phase === 'completed' ? 'Campeón decidido' : phaseLabel}</h3>
        </div>
        <div className="europe__ko-money">
          <WalletCards size={18} />
          <span>{formatMoney(playerPrizeMoney)}</span>
          <small>premios</small>
        </div>
      </div>

      <div className="europe__phase-road" aria-label="Progreso de fases">
        {getPhaseOrder().map((phase) => (
          <div key={phase} className={`europe__phase-step ${getPhaseStatus(phase, compState.phase)}`}>
            <span>{getPhaseShortLabel(phase)}</span>
            <strong>{getPhaseMeta(phase, compState)}</strong>
          </div>
        ))}
      </div>

      <div className="europe__ko-overview">
        <article className="europe__path-panel" aria-label="Tu camino">
          <div className="europe__panel-title">
            <div>
              <h3>Tu camino</h3>
              <p>Rival actual y lo que viene si avanzas.</p>
            </div>
            <span className="europe__status-pill">{playerTeam ? `${getTeamDisplayName(playerTeam)} · Tú` : 'Tu equipo'}</span>
          </div>

          <div className="europe__main-clash">
            <div className="europe__clash-team">
              <TeamCrest teamId={getTeamId(rival)} size={42} />
              <small>Rival</small>
              <strong>{getTeamDisplayName(rival)}</strong>
            </div>
            <div className="europe__clash-vs">
              <Swords size={20} />
              <strong>VS</strong>
              <span>{playerMatch ? getPhaseShortLabel(playerMatch.phase) : 'Sorteo'}</span>
            </div>
            <div className="europe__clash-team player">
              <TeamCrest teamId={getTeamId(playerTeam)} size={42} />
              <small>Tu equipo</small>
              <strong>{getTeamDisplayName(playerTeam)}</strong>
              <span>Tú</span>
            </div>
          </div>

          <div className="europe__ko-grid">
            <article className="europe__route-card europe__route-card--primary">
              <Target size={18} />
              <small>Si ganas</small>
              <strong>{possibleNext || 'Rival por decidir'}</strong>
              <p>Posible cruce en la siguiente ronda</p>
            </article>

            <article className="europe__route-card">
              <Route size={18} />
              <small>Liguilla</small>
              <strong>{playerRow ? `${playerStanding + 1}º · ${playerRow.points} pts` : 'Sin datos'}</strong>
              <p>{playerRow ? `${playerRow.won}V ${playerRow.drawn}E ${playerRow.lost}D · DG ${playerRow.goalDifference > 0 ? '+' : ''}${playerRow.goalDifference}` : 'Sin tabla'}</p>
            </article>

            <article className="europe__route-card">
              <Award size={18} />
              <small>Premio posible</small>
              <strong>{nextPrize ? `+${formatMoney(nextPrize)}` : 'Prestigio'}</strong>
              <p>{compState.phase === 'completed' ? 'Título cerrado' : 'Siguiente ronda'}</p>
            </article>
          </div>
        </article>

        <article className="europe__fixtures-panel" aria-label="Próximos cruces">
          <div className="europe__panel-title">
            <div>
              <h3>Próximos cruces</h3>
              <p>Ronda actual sin buscar en el cuadro.</p>
            </div>
            <span className="europe__round-pill">{phaseLabel}</span>
          </div>
          <div className="europe__fixtures-list">
            {currentMatches.length > 0 ? currentMatches.map(renderFixture) : <p className="europe__no-data">Pendiente de sorteo</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

export default function Europe() {
  const { t } = useTranslation();
  const { state } = useGame();
  const [selectedComp, setSelectedComp] = useState(null);
  const [sortBy, setSortBy] = useState('points');
  const [sortDir, setSortDir] = useState('desc');

  const isInSA = isSouthAmericanLeague(state.playerLeagueId);
  
  // Use SA or European competitions depending on the player's league
  const european = isInSA ? state.saCompetitions : state.europeanCompetitions;
  
  // Find player's competition
  const playerComp = useMemo(() => {
    if (!european?.competitions) return null;
    if (isInSA) return getPlayerSACompetition(european, state.teamId);
    return getPlayerCompetition(european, state.teamId);
  }, [european, state.teamId, isInSA]);

  // Default to player's competition, or first available
  const activeCompId = selectedComp || playerComp?.competitionId || 
    (european?.competitions ? Object.keys(european.competitions).find(k => european.competitions[k]) : null);
  
  const activeComp = european?.competitions?.[activeCompId];

  if (!european || !european.initialized) {
    return (
      <div className="europe">
        <div className="europe__empty">
          <Globe size={48} strokeWidth={1.5} />
          <h2>{t('europe.title')}</h2>
          <p>{t('europe.notQualified')}</p>
          <p className="europe__hint">{t('europe.qualificationHint')}</p>
        </div>
      </div>
    );
  }

  // Is player's team in this competition?
  const playerInComp = activeComp?.teams?.some(t => t.teamId === state.teamId);
  const playerAlive = activeComp ? isTeamAlive(activeComp, state.teamId) : false;

  // Prize money for player's team
  const playerPrizeMoney = activeComp?.prizesMoney?.[state.teamId] || 0;

  // Sorted standings
  const sortedStandings = (() => {
    if (!activeComp?.standings) return [];
    const standings = [...activeComp.standings];
    
    standings.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name': aVal = a.teamName; bVal = b.teamName; break;
        case 'played': aVal = a.played; bVal = b.played; break;
        case 'won': aVal = a.won; bVal = b.won; break;
        case 'drawn': aVal = a.drawn; bVal = b.drawn; break;
        case 'lost': aVal = a.lost; bVal = b.lost; break;
        case 'gf': aVal = a.goalsFor; bVal = b.goalsFor; break;
        case 'ga': aVal = a.goalsAgainst; bVal = b.goalsAgainst; break;
        case 'gd': aVal = a.goalDifference; bVal = b.goalDifference; break;
        case 'points': 
        default:
          aVal = a.points; bVal = b.points; break;
      }
      if (sortBy === 'name') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return standings;
  })();

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  const formatMoney = (amount) => {
    if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `€${(amount / 1_000).toFixed(0)}K`;
    return `€${amount}`;
  };

  const getPositionZone = (pos) => {
    if (pos <= 8) return 'direct';       // Direct to R16
    if (pos <= 24) return 'playoff';     // Playoffs
    return 'eliminated';                  // Out
  };

  const getPhaseLabel = (phase) => {
    const labels = {
      league: t('europe.phases.league'),
      playoff: t('europe.phases.playoff'),
      r16: t('europe.phases.r16'),
      qf: t('europe.phases.qf'),
      sf: t('europe.phases.sf'),
      final: t('europe.phases.final'),
      completed: t('europe.phases.completed')
    };
    return labels[phase] || phase;
  };

  return (
    <div className="europe">
      {/* Competition Tabs */}
      <div className="europe__tabs">
        {Object.entries(COMPETITIONS).map(([compId, comp]) => {
          const compState = european.competitions[compId];
          if (!compState) return null;
          const isActive = activeCompId === compId;
          const isPlayerComp = playerComp?.competitionId === compId;
          
          return (
            <button
              key={compId}
              className={`europe__tab ${isActive ? 'active' : ''} ${isPlayerComp ? 'player' : ''}`}
              onClick={() => setSelectedComp(compId)}
            >
              <span className="europe__tab-icon">{getCompetitionIcon(compId, 16)}</span>
              <span className="europe__tab-name">{comp.shortName}</span>
              {isPlayerComp && <Star size={12} className="europe__tab-star" />}
            </button>
          );
        })}
      </div>

      {!activeComp && (
        <div className="europe__empty">
          <p>{t('europe.selectCompetition')}</p>
        </div>
      )}

      {activeComp && (
        <div className={`europe__content ${activeComp.phase !== 'league' ? 'europe__content--knockout' : ''}`}>
          {/* Header */}
          <div className="europe__header">
            <div className="europe__header-info">
              <h2>
                <span className="europe__comp-icon">{getCompetitionIcon(activeCompId, 22)}</span>
                {activeComp.config.name}
              </h2>
              <div className="europe__phase-badge">
                {getPhaseLabel(activeComp.phase)}
                {activeComp.phase === 'league' && activeComp.currentMatchday > 0 && (
                  <span> — {t('europe.matchday', { current: activeComp.currentMatchday, total: 8 })}</span>
                )}
              </div>
            </div>
            
            {playerInComp && (
              <div className="europe__player-info">
                <div className="europe__prize">
                  <Award size={16} />
                  <span>{t('europe.prizes', { amount: formatMoney(playerPrizeMoney) })}</span>
                </div>
                {!playerAlive && activeComp.phase !== 'league' && (
                  <div className="europe__eliminated-badge">
                    <Zap size={14} />
                    <span>{t('europe.eliminated')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeComp.phase !== 'league' && (
            <KnockoutDashboard
              compState={activeComp}
              playerTeamId={state.teamId}
              playerPrizeMoney={playerPrizeMoney}
              formatMoney={formatMoney}
              getPhaseLabel={getPhaseLabel}
            />
          )}

          {/* Swiss League Table */}
          {(activeComp.phase === 'league' || sortedStandings.length > 0) && (
            <div className="europe__standings">
              <h3>{t('europe.standings')}</h3>
              <div className="europe__table-wrapper">
                <table className="europe__table">
                  <thead>
                    <tr>
                      <th className="pos">#</th>
                      <th className="team" onClick={() => handleSort('name')}>
                        {t('common.team')} {renderSortIcon('name')}
                      </th>
                      <th className="league-flag">{t('common.league')}</th>
                      <th className="num" onClick={() => handleSort('played')}>
                        {t('leagueTable.played')} {renderSortIcon('played')}
                      </th>
                      <th className="num" onClick={() => handleSort('won')}>
                        {t('leagueTable.won')} {renderSortIcon('won')}
                      </th>
                      <th className="num" onClick={() => handleSort('drawn')}>
                        {t('leagueTable.drawn')} {renderSortIcon('drawn')}
                      </th>
                      <th className="num" onClick={() => handleSort('lost')}>
                        {t('leagueTable.lost')} {renderSortIcon('lost')}
                      </th>
                      <th className="num" onClick={() => handleSort('gf')}>
                        {t('leagueTable.goalsFor')} {renderSortIcon('gf')}
                      </th>
                      <th className="num" onClick={() => handleSort('ga')}>
                        {t('leagueTable.goalsAgainst')} {renderSortIcon('ga')}
                      </th>
                      <th className="num" onClick={() => handleSort('gd')}>
                        {t('leagueTable.goalDifference')} {renderSortIcon('gd')}
                      </th>
                      <th className="num pts" onClick={() => handleSort('points')}>
                        {t('leagueTable.points')} {renderSortIcon('points')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStandings.map((team, idx) => {
                      const pos = idx + 1;
                      const zone = getPositionZone(pos);
                      const isPlayer = team.teamId === state.teamId;

                      return (
                        <tr 
                          key={team.teamId} 
                          className={`${zone} ${isPlayer ? 'is-player' : ''}`}
                        >
                          <td className="pos">
                            <span className={`pos-badge ${zone}`}>{pos}</span>
                          </td>
                          <td className="team">
                            <TeamIdentity team={team} size={22} compact />
                            {isPlayer && <Star size={10} className="player-star" />}
                          </td>
                          <td className="league-flag"><span className="league-code">{getLeagueCode(team.league)}</span></td>
                          <td className="num">{team.played}</td>
                          <td className="num">{team.won}</td>
                          <td className="num">{team.drawn}</td>
                          <td className="num">{team.lost}</td>
                          <td className="num">{team.goalsFor}</td>
                          <td className="num">{team.goalsAgainst}</td>
                          <td className="num">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                          <td className="num pts">{team.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Zone legend */}
              <div className="europe__legend">
                <span className="legend-item direct">
                  <span className="dot"></span> {t('europe.legend.directQualification')}
                </span>
                <span className="legend-item playoff">
                  <span className="dot"></span> {t('europe.legend.playoff')}
                </span>
                <span className="legend-item eliminated">
                  <span className="dot"></span> {t('europe.legend.eliminated')}
                </span>
              </div>
            </div>
          )}

          {/* Knockout Bracket */}
          {activeComp.phase !== 'league' && activeComp.phase !== 'completed' && (
            <div className="europe__knockout">
              <div className="europe__knockout-head">
                <h3>{t('europe.knockoutPhase', { phase: getPhaseLabel(activeComp.phase) })}</h3>
                <span className="europe__bracket-hint">Desliza cuadro →</span>
              </div>
              {renderKnockoutPhase(activeComp, state.teamId, t)}
            </div>
          )}

          {/* Final Result */}
          {activeComp.phase === 'completed' && activeComp.finalResult && (
            <div className="europe__final-result">
              <Trophy size={32} />
              <h3>{t('europe.championTitle', { competition: activeComp.config.name })}</h3>
              <p className="europe__winner-name">
                {activeComp.finalResult.winner?.teamName || t('common.unknown')}
              </p>
              <p className="europe__final-score">
                {t('europe.finalScore', { score: activeComp.finalResult.aggregate })}
              </p>
            </div>
          )}

          {/* Recent Results */}
          {activeComp.results.length > 0 && (
            <div className="europe__results">
              <h3>{t('europe.recentResults')}</h3>
              <div className="europe__results-list">
                {activeComp.results.slice(-12).reverse().map((r, idx) => {
                  const homeTeam = activeComp.teams.find(t => t.teamId === r.homeTeamId);
                  const awayTeam = activeComp.teams.find(t => t.teamId === r.awayTeamId);
                  const isPlayerMatch = r.homeTeamId === state.teamId || r.awayTeamId === state.teamId;
                  
                  return (
                    <div key={idx} className={`europe__result-item ${isPlayerMatch ? 'player-match' : ''}`}>
                      <span className="matchday">J{r.matchday}</span>
                      <TeamIdentity team={homeTeam || { teamId: r.homeTeamId }} size={18} compact />
                      <span className="score">{r.homeScore} - {r.awayScore}</span>
                      <TeamIdentity team={awayTeam || { teamId: r.awayTeamId }} size={18} compact />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Render knockout phase matchups
 */
function renderKnockoutPhase(compState, playerTeamId, t) {
  const phaseMatchups = {
    playoff: compState.playoffResults || compState.playoffMatchups || [],
    r16: compState.r16Results || compState.r16Matchups || [],
    qf: compState.qfResults || compState.qfMatchups || [],
    sf: compState.sfResults || compState.sfMatchups || [],
    final: compState.finalResult ? [compState.finalResult] : (compState.finalMatchup ? [compState.finalMatchup] : [])
  };

  const phasesToShow = ['playoff', 'r16', 'qf', 'sf', 'final'].filter(p => 
    phaseMatchups[p].length > 0
  );

  if (phasesToShow.length === 0) {
    return <p className="europe__no-data">{t('europe.pendingDraw')}</p>;
  }

  const getRoundTitle = (phase) => (
    phase === 'playoff' ? t('europe.phases.playoff') :
    phase === 'r16' ? t('europe.phases.r16Short') :
    phase === 'qf' ? t('europe.phases.qfShort') :
    phase === 'sf' ? t('europe.phases.sfShort') : <Trophy size={18} strokeWidth={1.9} aria-label={t('europe.phases.final')} />
  );

  const renderMatchup = (matchup, idx, mode = 'desktop') => {
    const team1 = matchup.team1;
    const team2 = matchup.team2;
    const hasResult = matchup.winner != null;
    const isPlayerMatchup = team1?.teamId === playerTeamId || team2?.teamId === playerTeamId;

    return (
      <div key={idx} className={`europe__matchup ${mode === 'mobile' ? 'mobile' : ''} ${isPlayerMatchup ? 'player' : ''} ${hasResult ? 'completed' : 'pending'}`}>
        {isPlayerMatchup && mode === 'mobile' && <span className="europe__you-badge">Tú</span>}
        <div className={`europe__matchup-team ${matchup.winner?.teamId === team1?.teamId ? 'winner' : ''}`}>
          <span className="team-name"><TeamIdentity team={team1} size={mode === 'mobile' ? 24 : 20} compact /></span>
          {matchup.leg1 && (
            <span className="leg-score">{matchup.leg1.homeScore}-{matchup.leg1.awayScore}</span>
          )}
        </div>
        <div className={`europe__matchup-team ${matchup.winner?.teamId === team2?.teamId ? 'winner' : ''}`}>
          <span className="team-name"><TeamIdentity team={team2} size={mode === 'mobile' ? 24 : 20} compact /></span>
          {matchup.leg2 && (
            <span className="leg-score">{matchup.leg2.homeScore}-{matchup.leg2.awayScore}</span>
          )}
        </div>
        {hasResult && (
          <div className="europe__matchup-agg">
            {t('europe.aggregate', { score: matchup.aggregate })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="europe__mobile-bracket">
        {phasesToShow.map(phase => (
          <section key={phase} className="europe__mobile-round">
            <div className="europe__mobile-round-head">
              <span>{getRoundTitle(phase)}</span>
              <small>{phaseMatchups[phase].length} cruces</small>
            </div>
            <div className="europe__mobile-match-list">
              {phaseMatchups[phase].map((matchup, idx) => renderMatchup(matchup, idx, 'mobile'))}
            </div>
          </section>
        ))}
      </div>

      <div className="europe__bracket">
        {phasesToShow.map(phase => (
          <div key={phase} className="europe__bracket-round">
            <h4 className="europe__bracket-title">{getRoundTitle(phase)}</h4>
            <div className="europe__bracket-matchups">
              {phaseMatchups[phase].map((matchup, idx) => renderMatchup(matchup, idx))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
