import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { Timer, Trophy, TrendingUp, TrendingDown, Star, Flag, MapPin, Crown } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import { LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import './ContrarrelojProgress.scss';

function getLeagueName(leagueId) {
  return LEAGUE_CONFIG[leagueId]?.name || leagueId;
}

export default function ContrarrelojProgress() {
  const { t } = useTranslation();
  const { state } = useGame();
  const data = state.contrarrelojData;
  if (!data) return null;

  const history = data.seasonHistory || [];
  const trophies = data.trophies || [];
  const currentSeason = data.seasonsPlayed || 1;
  const currentLeague = getLeagueName(state.leagueId || state.playerLeagueId);

  // Current league position
  const table = state.leagueTable || [];
  const currentPos = table.findIndex(t => t.teamId === state.teamId) + 1;
  const totalTeams = table.length;

  // Build timeline events from history
  const events = [];

  // Start event
  events.push({
    type: 'start',
    season: 1,
    icon: <MapPin size={16} />,
    title: t('contrarrelojProgress.challengeStart'),
    detail: `${data.startTeam?.name} — ${getLeagueName(data.startLeague)}`,
    color: 'blue'
  });

  // Historical seasons
  for (const s of history) {
    // League position
    events.push({
      type: 'season',
      season: s.season,
      icon: <FootballIcon size={16} />,
      title: t('contrarrelojProgress.seasonPosition', { season: s.season, position: s.position, total: s.totalTeams }),
      detail: s.leagueName || getLeagueName(s.league),
      color: 'neutral'
    });

    // Promotion
    if (s.promoted) {
      events.push({
        type: 'promotion',
        season: s.season,
        icon: <TrendingUp size={16} />,
        title: t('contrarrelojProgress.promotion'),
        detail: t('contrarrelojProgress.promotionDetail', { from: getLeagueName(s.league), to: getLeagueName(s.promotedTo) }),
        color: 'green'
      });
    }

    // Relegation
    if (s.relegated) {
      events.push({
        type: 'relegation',
        season: s.season,
        icon: <TrendingDown size={16} />,
        title: t('contrarrelojProgress.relegation'),
        detail: t('contrarrelojProgress.relegationDetail', { from: getLeagueName(s.league), to: getLeagueName(s.relegatedTo) }),
        color: 'red'
      });
    }

    // European phase
    if (s.europeanPhase) {
      events.push({
        type: 'european',
        season: s.season,
        icon: <Star size={16} />,
        title: s.europeanComp || t('contrarrelojProgress.continentalCompetition'),
        detail: t('contrarrelojProgress.phaseReached', { phase: s.europeanPhase }),
        color: 'gold'
      });
    }

    // Trophies this season
    const seasonTrophies = trophies.filter(tr => tr.season === s.season);
    for (const trophy of seasonTrophies) {
      events.push({
        type: 'trophy',
        season: trophy.season,
        icon: <Trophy size={16} />,
        title: t('contrarrelojProgress.trophyWon', { trophy: trophy.name }),
        detail: t('contrarrelojProgress.seasonLabel', { season: trophy.season }),
        color: 'gold'
      });
    }
  }

  // Current season (live)
  events.push({
    type: 'current',
    season: currentSeason,
    icon: <Timer size={16} />,
    title: t('contrarrelojProgress.currentSeason', { season: currentSeason }),
    detail: `${currentLeague} · ${currentPos > 0 ? t('contrarrelojProgress.currentPosition', { position: currentPos, total: totalTeams }) : t('contrarrelojProgress.noClassification')}`,
    color: 'accent'
  });

  // Goal
  const isSA = ['argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
    'uruguayPrimera', 'ecuadorLigaPro', 'paraguayPrimera', 'peruLiga1',
    'boliviaPrimera', 'venezuelaPrimera'].includes(data.startLeague);
  const goalName = isSA ? t('contrarrelojProgress.copaLibertadores') : t('contrarrelojProgress.championsLeague');

  events.push({
    type: 'goal',
    season: null,
    icon: <Crown size={16} />,
    title: t('contrarrelojProgress.winGoal', { competition: goalName }),
    detail: data.won ? t('contrarrelojProgress.accomplished') : t('contrarrelojProgress.howManySeasonsQuestion'),
    color: data.won ? 'gold' : 'dimmed'
  });

  return (
    <div className="contrarreloj-progress">
      {/* Hero card */}
      <div className="contrarreloj-progress__hero">
        <div className="hero-icon">
          <Timer size={28} />
        </div>
        <div className="hero-info">
          <h2>{t('contrarrelojProgress.roadToGlory')}</h2>
          <span className="hero-sub">{data.startTeam?.name} — {t('contrarrelojProgress.startingFrom')} {getLeagueName(data.startLeague)}</span>
        </div>
        <div className="hero-season">
          <div className="season-num">{currentSeason}</div>
          <div className="season-label">{t('contrarrelojProgress.seasonLabel', { season: currentSeason })}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="contrarreloj-progress__stats">
        <div className="stat-card stat-card--league">
          <div className={`stat-value${currentLeague.length > 12 ? ' stat-value--long' : ''}`} title={currentLeague}>{currentLeague}</div>
          <div className="stat-label">{t('contrarrelojProgress.currentLeague')}</div>
        </div>
        <div className="stat-card stat-card--position">
          <div className="stat-value">{currentPos > 0 ? `${currentPos}º` : '—'}</div>
          <div className="stat-label">{totalTeams > 0 ? t('contrarrelojProgress.positionOf', { total: totalTeams }) : t('contrarrelojProgress.position')}</div>
        </div>
        <div className="stat-card stat-card--trophies">
          <div className="stat-value">{trophies.length}</div>
          <div className="stat-label">{t('contrarrelojProgress.trophies')}</div>
        </div>
        <div className="stat-card stat-card--goal">
          <div className="stat-value">{isSA ? '🏆' : '⭐'}</div>
          <div className="stat-label">{goalName}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="contrarreloj-progress__timeline-title">{t('contrarrelojProgress.timeline')}</div>
      <div className="contrarreloj-progress__timeline">
        {events.map((evt, idx) => (
          <div key={idx} className={`timeline-event timeline-event--${evt.color} ${evt.type === 'current' ? 'timeline-event--active' : ''}`}>
            <div className="timeline-event__line">
              <div className="timeline-event__dot">{evt.icon}</div>
              {idx < events.length - 1 && <div className="timeline-event__connector" />}
            </div>
            <div className="timeline-event__content">
              <span className="timeline-event__title">{evt.title}</span>
              <span className="timeline-event__detail">{evt.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
