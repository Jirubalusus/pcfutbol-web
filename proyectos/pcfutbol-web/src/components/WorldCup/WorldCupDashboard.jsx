import React from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Trophy, ChevronRight, Shield, Target, Footprints, Dumbbell, Scale, Zap } from 'lucide-react';
import { WORLD_CUP_UI_I18N } from '../../data/worldCupEventsI18n';

const STYLE_ICONS = {
  defensive: Shield, offensive: Swords, balanced: Scale,
  'counter-attack': Zap, possession: Target, physical: Dumbbell,
};
const STYLE_KEYS = {
  defensive: 'styleDefensive', offensive: 'styleOffensive', balanced: 'styleBalanced',
  'counter-attack': 'styleCounterAttack', possession: 'stylePossession', physical: 'stylePhysical',
};
import ResourceBars from './ResourceBars';
import WorldCupBracket from './WorldCupBracket';
import FlagIcon from './FlagIcon';
import './WorldCupDashboard.scss';

export default function WorldCupDashboard({ state, teams, onPlayMatch, onBack }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = WORLD_CUP_UI_I18N[lang] || WORLD_CUP_UI_I18N.es;

  const teamMap = {};
  (teams || []).forEach(t => { teamMap[t.id] = t; });
  const getTeam = (id) => teamMap[id] || { flag: '🏳️', name: id, nameEs: id };
  const displayName = (t) => lang === 'es' ? (t.nameEs || t.name) : t.name;

  const phaseLabels = {
    groups: ui.groupStage,
    round16: ui.round16,
    quarters: ui.quarters,
    semis: ui.semis,
    final: ui.final,
  };

  // Find player's group
  const playerGroup = state.groups?.find(g => g.teams.includes(state.playerTeamId));

  // Find next match
  const nextMatch = (() => {
    if (state.phase === 'groups') {
      return state.groupFixtures?.find(f => !f.played && (f.home === state.playerTeamId || f.away === state.playerTeamId));
    }
    if (state.knockoutBracket) {
      const round = state.knockoutBracket[state.phase];
      return round?.find(f => !f.played && (f.home === state.playerTeamId || f.away === state.playerTeamId));
    }
    return null;
  })();

  // Player results
  const playerResults = (state.results || []).filter(r => r.home === state.playerTeamId || r.away === state.playerTeamId);

  return (
    <div className="wc-dash">
      <div className="wc-dash__content">
        {/* Phase header */}
        <div className="wc-dash__phase">
          <Trophy size={20} className="wc-dash__phase-icon" />
          <span>{phaseLabels[state.phase] || state.phase}</span>
        </div>

        {/* Group table */}
        {state.phase === 'groups' && playerGroup && (
          <div className="wc-dash__group">
            <h3 className="wc-dash__group-title">{ui.group} {playerGroup.name}</h3>
            <table className="wc-dash__table">
              <thead>
                <tr>
                  <th></th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {playerGroup.table.map((row, idx) => {
                  const t = getTeam(row.teamId);
                  const isPlayer = row.teamId === state.playerTeamId;
                  return (
                    <tr key={row.teamId} className={isPlayer ? 'wc-dash__table-row--player' : ''}>
                      <td className="wc-dash__table-team">
                        <span className="wc-dash__table-pos">{idx + 1}</span>
                        <span><FlagIcon teamId={t.id} size={16} /></span>
                        <span className="wc-dash__table-name">{displayName(t)}</span>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.goalsFor - row.goalsAgainst}</td>
                      <td className="wc-dash__table-pts">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Knockout bracket */}
        {state.phase !== 'groups' && state.knockoutBracket && (
          <WorldCupBracket bracket={state.knockoutBracket} playerTeamId={state.playerTeamId} teams={teams} />
        )}

        {/* Next match */}
        {nextMatch && (() => {
          const homeTeam = getTeam(nextMatch.home);
          const awayTeam = getTeam(nextMatch.away);
          const oppId = nextMatch.home === state.playerTeamId ? nextMatch.away : nextMatch.home;
          const oppTeam = getTeam(oppId);
          const oppStyle = oppTeam?.style;
          const StyleIcon = STYLE_ICONS[oppStyle] || Scale;
          return (
            <div className="wc-dash__next-match">
              <h3 className="wc-dash__section-title">{ui.nextMatch}</h3>
              <div className="wc-dash__match-card">
                <div className="wc-dash__match-team">
                  <FlagIcon teamId={nextMatch.home} size={48} />
                  <span className="wc-dash__match-code">{homeTeam.code || nextMatch.home.slice(0, 3).toUpperCase()}</span>
                  <span className="wc-dash__match-name">{displayName(homeTeam)}</span>
                </div>
                <div className="wc-dash__match-center">
                  <span className="wc-dash__match-vs-text">VS</span>
                  {oppStyle && (
                    <div className="wc-dash__opponent-style">
                      <StyleIcon size={14} />
                      <span>{ui[STYLE_KEYS[oppStyle]] || oppStyle}</span>
                    </div>
                  )}
                </div>
                <div className="wc-dash__match-team">
                  <FlagIcon teamId={nextMatch.away} size={48} />
                  <span className="wc-dash__match-code">{awayTeam.code || nextMatch.away.slice(0, 3).toUpperCase()}</span>
                  <span className="wc-dash__match-name">{displayName(awayTeam)}</span>
                </div>
              </div>
              <button className="wc-dash__play-btn" onClick={() => onPlayMatch(nextMatch)}>
                {ui.playMatch}
                <ChevronRight size={20} />
              </button>
            </div>
          );
        })()}

        {/* Match history */}
        {playerResults.length > 0 && (
          <div className="wc-dash__history">
            <h3 className="wc-dash__section-title">{lang === 'es' ? 'Historial' : 'Match History'}</h3>
            <div className="wc-dash__history-list">
              {playerResults.map((r, i) => {
                const home = getTeam(r.home);
                const away = getTeam(r.away);
                const isPlayerHome = r.home === state.playerTeamId;
                const playerWon = (isPlayerHome && r.homeScore > r.awayScore) || (!isPlayerHome && r.awayScore > r.homeScore);
                const isDraw = r.homeScore === r.awayScore;
                const resultClass = isDraw ? 'draw' : playerWon ? 'win' : 'loss';
                return (
                  <div key={i} className={`wc-dash__history-row wc-dash__history-row--${resultClass}`}>
                    <div className="wc-dash__history-team wc-dash__history-team--home">
                      <FlagIcon teamId={r.home} size={20} />
                      <span className="wc-dash__history-code">{home.code || r.home.slice(0, 3).toUpperCase()}</span>
                    </div>
                    <div className="wc-dash__history-score">
                      <span>{r.homeScore}</span>
                      <span className="wc-dash__history-sep">-</span>
                      <span>{r.awayScore}</span>
                    </div>
                    <div className="wc-dash__history-team wc-dash__history-team--away">
                      <span className="wc-dash__history-code">{away.code || r.away.slice(0, 3).toUpperCase()}</span>
                      <FlagIcon teamId={r.away} size={20} />
                    </div>
                    <span className={`wc-dash__history-badge wc-dash__history-badge--${resultClass}`}>
                      {isDraw ? 'D' : playerWon ? 'W' : 'L'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
