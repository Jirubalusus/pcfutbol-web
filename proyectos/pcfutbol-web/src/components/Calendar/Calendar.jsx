import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Circle
} from 'lucide-react';
import { getPhaseForWeekCompat, getCupRoundForWeek } from '../../game/europeanCompetitions';
import { getPlayerCompetition } from '../../game/europeanSeason';
import './Calendar.scss';

export default function Calendar() {
  const { state } = useGame();
  const carouselRef = useRef(null);

  // ── Player's European competition (for button coloring) ──
  const playerEuropean = useMemo(() => {
    if (!state.europeanCompetitions) return null;
    return getPlayerCompetition(state.europeanCompetitions, state.teamId);
  }, [state.europeanCompetitions, state.teamId]);

  // ── Calendar: use europeanCalendar if available, else simple league calendar ──
  const calendar = useMemo(() => {
    if (state.europeanCalendar) return state.europeanCalendar;
    const maxWeek = state.fixtures?.length > 0
      ? Math.max(...state.fixtures.map(f => f.week))
      : 38;
    return {
      leagueWeekMap: Array.from({ length: maxWeek }, (_, i) => i + 1),
      europeanWeeks: {},
      allEuropeanWeeks: [],
      cupWeeks: [],
      totalWeeks: maxWeek
    };
  }, [state.europeanCalendar, state.fixtures]);

  const totalWeeks = calendar.totalWeeks;
  const hasEuropean = !!state.europeanCompetitions?.initialized;
  const hasCup = !!state.cupCompetition;

  // ── Build unified chronological week entries ──
  const weekEntries = useMemo(() => {
    const { leagueWeekMap, allEuropeanWeeks, europeanWeeks, cupWeeks } = calendar;
    const entries = [];

    // week → league matchday reverse map
    const weekToMatchday = {};
    if (leagueWeekMap) {
      leagueWeekMap.forEach((calWeek, idx) => { weekToMatchday[calWeek] = idx + 1; });
    }

    const euroSet = new Set(allEuropeanWeeks || []);
    const cupSet = new Set(cupWeeks || []);

    // European phase info per week
    const euroPhaseMap = {};
    const phaseLabels = { league: 'J', playoff: 'PO', r16: '8v', qf: '4t', sf: 'SF', final: 'F' };
    if (europeanWeeks) {
      for (const [phase, weeks] of Object.entries(europeanWeeks)) {
        if (!Array.isArray(weeks)) continue;
        weeks.forEach((week, idx) => {
          euroPhaseMap[week] = { phase, matchday: idx + 1, total: weeks.length };
        });
      }
    }

    // Competition color for European button
    const compClassMap = { championsLeague: 'champions', europaLeague: 'europa', conferenceleague: 'conference' };
    const euroClass = playerEuropean ? (compClassMap[playerEuropean.competitionId] || 'champions') : 'champions';

    // Pre-index fixtures by week
    const fixturesByWeek = {};
    (state.fixtures || []).forEach(f => {
      if (!fixturesByWeek[f.week]) fixturesByWeek[f.week] = [];
      fixturesByWeek[f.week].push(f);
    });

    let euroNum = 0;

    for (let w = 1; w <= totalWeeks; w++) {
      // League
      if (weekToMatchday[w] !== undefined) {
        const md = weekToMatchday[w];
        const wf = fixturesByWeek[w] || [];
        entries.push({
          week: w, type: 'league', number: md,
          competitionClass: '', label: String(md),
          played: wf.length > 0 && wf.every(f => f.played)
        });
      }

      // European
      if (euroSet.has(w) && hasEuropean) {
        euroNum++;
        const pi = euroPhaseMap[w];
        let label = `J${euroNum}`;
        if (pi) {
          if (pi.phase === 'league') {
            label = `J${pi.matchday}`;
          } else {
            const short = phaseLabels[pi.phase] || pi.phase;
            label = pi.total > 1 ? `${short}${pi.matchday}` : short;
          }
        }
        entries.push({
          week: w, type: 'european', number: euroNum,
          competitionClass: euroClass, label,
          played: w < state.currentWeek
        });
      }

      // Cup
      if (cupSet.has(w) && hasCup) {
        const cupNum = (cupWeeks || []).indexOf(w) + 1;
        const roundIdx = getCupRoundForWeek(w, calendar);
        const roundName = (roundIdx !== null && state.cupCompetition.rounds?.[roundIdx]?.name) || `Ronda ${cupNum}`;
        const cupRoundPlayed = roundIdx !== null &&
          state.cupCompetition.rounds?.[roundIdx]?.matches?.some(m => m.played);
        let shortLabel = roundName;
        if (shortLabel.length > 4) shortLabel = `R${cupNum}`;

        entries.push({
          week: w, type: 'cup', number: cupNum, roundIdx,
          competitionClass: 'cup', label: shortLabel, fullLabel: roundName,
          played: cupRoundPlayed || w < state.currentWeek
        });
      }
    }

    return entries;
  }, [calendar, state.cupCompetition, state.fixtures, totalWeeks, hasEuropean, hasCup, playerEuropean, state.currentWeek]);

  // ── Selected entry index ──
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const cw = state.currentWeek || 1;
    let best = 0;
    for (let i = 0; i < weekEntries.length; i++) {
      if (weekEntries[i].week === cw) { best = i; break; }
      if (weekEntries[i].week > cw) { best = i; break; }
      best = i;
    }
    return best;
  });

  useEffect(() => {
    if (weekEntries.length > 0 && selectedIdx >= weekEntries.length) {
      setSelectedIdx(weekEntries.length - 1);
    }
  }, [weekEntries, selectedIdx]);

  const safeIdx = weekEntries.length > 0 ? Math.min(Math.max(0, selectedIdx), weekEntries.length - 1) : 0;
  const selectedEntry = weekEntries[safeIdx];
  const selectedWeek = selectedEntry?.week || state.currentWeek || 1;

  // Auto-scroll carousel to selected button
  useEffect(() => {
    if (!carouselRef.current) return;
    const btn = carouselRef.current.children[safeIdx];
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [safeIdx]);

  // ── League fixtures ──
  const weekFixtures = useMemo(() => {
    if (selectedEntry?.type !== 'league') return [];
    return state.fixtures?.filter(f => f.week === selectedWeek) || [];
  }, [state.fixtures, selectedWeek, selectedEntry?.type]);

  // ── ALL European fixtures (all competitions) ──
  const allEuropeanFixtures = useMemo(() => {
    if (selectedEntry?.type !== 'european') return [];
    if (!state.europeanCompetitions?.competitions) return [];

    const phaseInfo = getPhaseForWeekCompat(selectedWeek, calendar);
    if (!phaseInfo) return [];
    const { phase, matchday } = phaseInfo;
    const comps = [];

    for (const [compId, compState] of Object.entries(state.europeanCompetitions.competitions)) {
      if (!compState || compState.phase === 'completed') continue;

      const compFixtures = [];
      const teamMap = {};
      (compState.teams || []).forEach(t => { teamMap[t.teamId] = t.teamName || t.shortName || t.teamId; });

      if (phase === 'league') {
        // Swiss phase
        const fixtures = compState.matchdays?.[matchday - 1];
        if (!fixtures) continue;

        fixtures.forEach(f => {
          const result = compState.results?.find(r =>
            r.matchday === matchday &&
            r.homeTeamId === f.homeTeamId && r.awayTeamId === f.awayTeamId
          );
          compFixtures.push({
            homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId,
            homeName: teamMap[f.homeTeamId] || f.homeTeamId,
            awayName: teamMap[f.awayTeamId] || f.awayTeamId,
            played: !!result,
            homeScore: result?.homeScore ?? null,
            awayScore: result?.awayScore ?? null,
            isPlayer: f.homeTeamId === state.teamId || f.awayTeamId === state.teamId
          });
        });
      } else {
        // Knockout phases
        let matchups, results;
        if (phase === 'final') {
          matchups = compState.finalMatchup ? [compState.finalMatchup] : [];
          results = compState.finalResult ? [compState.finalResult] : [];
        } else {
          matchups = compState[`${phase}Matchups`] || [];
          results = compState[`${phase}Results`] || [];
        }

        matchups.forEach((matchup, i) => {
          const result = results[i];
          const t1Name = matchup.team1?.teamName || matchup.team1?.shortName || '???';
          const t2Name = matchup.team2?.teamName || matchup.team2?.shortName || '???';
          const isFinal = phase === 'final';
          const isLeg1 = matchday === 1 || isFinal;

          const homeId = isLeg1 ? matchup.team1?.teamId : matchup.team2?.teamId;
          const awayId = isLeg1 ? matchup.team2?.teamId : matchup.team1?.teamId;
          const homeName = isLeg1 ? t1Name : t2Name;
          const awayName = isLeg1 ? t2Name : t1Name;

          let played = false, homeScore = null, awayScore = null;
          if (result) {
            const legData = isLeg1 ? result.leg1 : result.leg2;
            if (legData) {
              played = true;
              homeScore = legData.homeScore;
              awayScore = legData.awayScore;
            } else if (isFinal && result.winner) {
              played = true;
              if (result.aggregate) {
                const parts = result.aggregate.split('-').map(Number);
                homeScore = parts[0]; awayScore = parts[1];
              }
            }
          }

          compFixtures.push({
            homeTeamId: homeId, awayTeamId: awayId,
            homeName, awayName, played, homeScore, awayScore,
            isPlayer: homeId === state.teamId || awayId === state.teamId,
            knockout: true, aggregate: result?.aggregate, winner: result?.winner?.teamId
          });
        });
      }

      if (compFixtures.length > 0) {
        const classMap = { championsLeague: 'champions', europaLeague: 'europa', conferenceleague: 'conference' };
        comps.push({
          compId,
          name: compState.config?.name || compId,
          shortName: compState.config?.shortName || compId,
          icon: compState.config?.icon || '⭐',
          cssClass: classMap[compId] || 'champions',
          fixtures: compFixtures
        });
      }
    }

    return comps;
  }, [selectedEntry?.type, selectedWeek, state.europeanCompetitions, calendar, state.teamId]);

  // ── ALL Cup fixtures ──
  const allCupFixtures = useMemo(() => {
    if (selectedEntry?.type !== 'cup') return [];
    if (!state.cupCompetition) return [];

    const roundIdx = selectedEntry.roundIdx;
    if (roundIdx === null || roundIdx === undefined) return [];
    const round = state.cupCompetition.rounds?.[roundIdx];
    if (!round) return [];

    return round.matches.map(m => ({
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      homeName: m.homeTeam?.teamName || '—',
      awayName: m.awayTeam?.teamName || '—',
      played: m.played, homeScore: m.homeScore, awayScore: m.awayScore,
      winnerId: m.winnerId, bye: m.bye, penalties: m.penalties,
      isPlayer: m.homeTeam?.teamId === state.teamId || m.awayTeam?.teamId === state.teamId
    }));
  }, [selectedEntry?.type, selectedEntry?.roundIdx, state.cupCompetition, state.teamId]);

  // ── Helper functions ──
  const getTeamName = (teamId) => {
    const team = state.leagueTable?.find(t => t.teamId === teamId);
    return team?.teamName || teamId;
  };

  const stripName = (name) => {
    if (!name) return '???';
    const stripped = name
      .replace(/^(FC |CF |CD |UD |RC |SD |CA |RCD |)/, '')
      .replace(/( CF| FC| CD| UD)$/, '')
      .trim();
    if (stripped.length > 14) {
      const words = stripped.split(' ');
      const meaningful = words.filter(w => !['de', 'del', 'la', 'las', 'los'].includes(w.toLowerCase()));
      return meaningful[0] || words[0];
    }
    return stripped;
  };

  const getDisplayName = (teamId) => stripName(getTeamName(teamId));

  const isPlayerMatch = (fixture) => fixture.homeTeam === state.teamId || fixture.awayTeam === state.teamId;
  const isPlayerHome = (fixture) => fixture.homeTeam === state.teamId;

  const getPlayerResult = (fixture) => {
    if (!fixture.played || !isPlayerMatch(fixture)) return null;
    const isHome = isPlayerHome(fixture);
    const pGoals = isHome ? fixture.homeScore : fixture.awayScore;
    const oGoals = isHome ? fixture.awayScore : fixture.homeScore;
    if (pGoals > oGoals) return 'W';
    if (pGoals < oGoals) return 'L';
    return 'D';
  };

  const getEuroPlayerResult = (f) => {
    if (!f.played || !f.isPlayer) return null;
    const isHome = f.homeTeamId === state.teamId;
    const pGoals = isHome ? f.homeScore : f.awayScore;
    const oGoals = isHome ? f.awayScore : f.homeScore;
    if (pGoals > oGoals) return 'W';
    if (pGoals < oGoals) return 'L';
    return 'D';
  };

  // ── Nav title ──
  const getNavTitle = () => {
    if (!selectedEntry) return { label: 'Jornada', sublabel: '1' };
    const phaseFullLabels = { league: 'Jornada', playoff: 'Playoff', r16: 'Octavos', qf: 'Cuartos', sf: 'Semi', final: 'Final' };
    switch (selectedEntry.type) {
      case 'league': return { label: 'Jornada', sublabel: String(selectedEntry.number) };
      case 'european': {
        const pi = getPhaseForWeekCompat(selectedEntry.week, calendar);
        const phaseLabel = pi ? phaseFullLabels[pi.phase] || pi.phase : 'Europa';
        const mdLabel = pi ? (pi.phase === 'league' ? String(pi.matchday) : (pi.total > 1 ? String(pi.matchday) : '')) : '';
        return { label: phaseLabel, sublabel: mdLabel || selectedEntry.label };
      }
      case 'cup': return { label: 'Copa', sublabel: selectedEntry.fullLabel || selectedEntry.label };
      default: return { label: 'Semana', sublabel: String(selectedEntry.week) };
    }
  };
  const navTitle = getNavTitle();

  // ── Render fixture card (reusable) ──
  const renderFixtureCard = (key, { homeName, awayName, homeIsPlayer, awayIsPlayer, played, homeScore, awayScore, playerResult, statusType, extraClass, penalties }) => (
    <div key={key} className={`fixture-card ${homeIsPlayer || awayIsPlayer ? 'is-player' : ''} ${played ? 'played' : ''} ${extraClass || ''}`}>
      <div className={`team home ${homeIsPlayer ? 'is-you' : ''}`}>
        <span className="team-name">{homeName}</span>
      </div>
      <div className="match-center">
        {played ? (
          <div className={`score ${playerResult ? `result-${playerResult.toLowerCase()}` : ''}`}>
            <span className="home-score">{homeScore}</span>
            <span className="separator">-</span>
            <span className="away-score">{awayScore}</span>
            {penalties && <span className="penalties-tag">(Pen)</span>}
          </div>
        ) : (
          <div className="vs-badge"><span>vs</span></div>
        )}
      </div>
      <div className={`team away ${awayIsPlayer ? 'is-you' : ''}`}>
        <span className="team-name">{awayName}</span>
      </div>
      <div className="match-status">
        {played ? (
          <span className={`status-dot ${playerResult === 'W' ? 'win' : playerResult === 'L' ? 'loss' : playerResult === 'D' ? 'draw' : 'neutral'}`} />
        ) : statusType === 'pending' ? (
          <span className="status-badge pending"><Clock size={14} /></span>
        ) : statusType === 'missed' ? (
          <span className="status-badge missed">!</span>
        ) : (
          <span className="status-badge upcoming"><Circle size={10} /></span>
        )}
      </div>
    </div>
  );

  const getStatusType = () => {
    if (selectedWeek === state.currentWeek) return 'pending';
    if (selectedWeek < state.currentWeek) return 'missed';
    return 'upcoming';
  };

  return (
    <div className="calendar-v2">
      {/* Header */}
      <div className="calendar-v2__header">
        <h2><CalendarDays size={24} /> Calendario</h2>
        <span className="season-badge">Temporada {state.currentSeason || 1}</span>
      </div>

      {/* Nav arrows + title */}
      <div className="calendar-v2__nav">
        <button className="nav-btn" onClick={() => setSelectedIdx(Math.max(0, safeIdx - 1))} disabled={safeIdx <= 0}>
          <ChevronLeft size={20} />
        </button>
        <div className="nav-title">
          <span className="week-label">{navTitle.label}</span>
          <span className="week-number">{navTitle.sublabel}</span>
        </div>
        <button className="nav-btn" onClick={() => setSelectedIdx(Math.min(weekEntries.length - 1, safeIdx + 1))} disabled={safeIdx >= weekEntries.length - 1}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Unified carousel */}
      <div className="calendar-v2__carousel" ref={carouselRef}>
        {weekEntries.map((entry, idx) => (
          <button
            key={`${entry.type}-${entry.week}`}
            className={[
              'carousel-btn',
              `carousel-btn--${entry.type}`,
              entry.competitionClass && `carousel-btn--${entry.competitionClass}`,
              idx === safeIdx && 'selected',
              entry.week === state.currentWeek && 'current',
              entry.played && 'played'
            ].filter(Boolean).join(' ')}
            onClick={() => setSelectedIdx(idx)}
            title={entry.type === 'cup' ? entry.fullLabel : entry.type === 'european' ? `Europa ${entry.label}` : `Jornada ${entry.number}`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Fixtures area */}
      <div className="calendar-v2__fixtures">

        {/* ── League ── */}
        {selectedEntry?.type === 'league' && (
          weekFixtures.length === 0 ? (
            <div className="no-fixtures"><Circle size={48} /><p>No hay partidos en esta jornada</p></div>
          ) : weekFixtures.map((fixture, idx) => {
            const pm = isPlayerMatch(fixture);
            const pr = getPlayerResult(fixture);
            return renderFixtureCard(fixture.id || idx, {
              homeName: getDisplayName(fixture.homeTeam),
              awayName: getDisplayName(fixture.awayTeam),
              homeIsPlayer: fixture.homeTeam === state.teamId,
              awayIsPlayer: fixture.awayTeam === state.teamId,
              played: fixture.played,
              homeScore: fixture.homeScore,
              awayScore: fixture.awayScore,
              playerResult: pr,
              statusType: getStatusType()
            });
          })
        )}

        {/* ── European — all competitions ── */}
        {selectedEntry?.type === 'european' && (
          allEuropeanFixtures.length === 0 ? (
            <div className="no-fixtures"><Circle size={48} /><p>No hay partidos europeos en esta jornada</p></div>
          ) : allEuropeanFixtures.map(comp => (
            <div key={comp.compId} className="competition-section">
              <div className={`competition-badge competition-badge--${comp.cssClass}`}>
                <span className="comp-icon">{comp.icon}</span>
                <span className="comp-name">{comp.shortName}</span>
              </div>
              {comp.fixtures.map((f, idx) => {
                const pr = getEuroPlayerResult(f);
                return renderFixtureCard(`${comp.compId}-${idx}`, {
                  homeName: stripName(f.homeName),
                  awayName: stripName(f.awayName),
                  homeIsPlayer: f.homeTeamId === state.teamId,
                  awayIsPlayer: f.awayTeamId === state.teamId,
                  played: f.played,
                  homeScore: f.homeScore,
                  awayScore: f.awayScore,
                  playerResult: pr,
                  statusType: getStatusType(),
                  extraClass: `euro-fixture euro-fixture--${comp.cssClass}`
                });
              })}
            </div>
          ))
        )}

        {/* ── Cup — all matches ── */}
        {selectedEntry?.type === 'cup' && (
          allCupFixtures.length === 0 ? (
            <div className="no-fixtures"><Circle size={48} /><p>No hay partidos de copa en esta ronda</p></div>
          ) : (
            <div className="competition-section">
              <div className="competition-badge competition-badge--cup">
                <span className="comp-icon">{state.cupCompetition?.config?.icon || '🏆'}</span>
                <span className="comp-name">{state.cupCompetition?.config?.shortName || 'Copa'}</span>
                <span className="comp-phase">{selectedEntry.fullLabel}</span>
              </div>
              {allCupFixtures.map((m, idx) => {
                if (m.bye) {
                  return renderFixtureCard(`cup-bye-${idx}`, {
                    homeName: stripName(m.homeName),
                    awayName: '—',
                    homeIsPlayer: m.homeTeam?.teamId === state.teamId,
                    awayIsPlayer: false,
                    played: true,
                    homeScore: null, awayScore: null,
                    playerResult: m.isPlayer ? 'W' : null,
                    statusType: 'played',
                    extraClass: 'cup-fixture'
                  });
                }
                const isWin = m.isPlayer && m.winnerId === state.teamId;
                const isLoss = m.isPlayer && m.played && m.winnerId !== state.teamId;
                const pr = m.played && m.isPlayer ? (isWin ? 'W' : 'L') : null;
                return renderFixtureCard(`cup-${idx}`, {
                  homeName: stripName(m.homeName),
                  awayName: stripName(m.awayName),
                  homeIsPlayer: m.homeTeam?.teamId === state.teamId,
                  awayIsPlayer: m.awayTeam?.teamId === state.teamId,
                  played: m.played,
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                  playerResult: pr,
                  statusType: getStatusType(),
                  extraClass: 'cup-fixture',
                  penalties: m.penalties
                });
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
