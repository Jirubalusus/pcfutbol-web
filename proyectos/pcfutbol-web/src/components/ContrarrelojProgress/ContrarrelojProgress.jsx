import React from 'react';
import { useGame } from '../../context/GameContext';
import { Timer, Trophy, TrendingUp, TrendingDown, Star, Flag, MapPin, Crown } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import './ContrarrelojProgress.scss';

// League display names
const LEAGUE_NAMES = {
  laliga: 'La Liga',
  segunda: 'La Liga Hypermotion',
  primeraRFEF: 'Primera Federación',
  segundaRFEF: 'Segunda Federación',
  premierLeague: 'Premier League',
  serieA: 'Serie A',
  bundesliga: 'Bundesliga',
  ligue1: 'Ligue 1',
  eredivisie: 'Eredivisie',
  primeiraLiga: 'Primeira Liga',
  championship: 'Championship',
  belgianPro: 'Jupiler Pro League',
  superLig: 'Süper Lig',
  scottishPrem: 'Scottish Premiership',
  serieB: 'Serie B',
  bundesliga2: '2. Bundesliga',
  ligue2: 'Ligue 2',
  swissSuperLeague: 'Super League (CH)',
  austrianBundesliga: 'Bundesliga (AT)',
  greekSuperLeague: 'Super League (GR)',
  danishSuperliga: 'Superligaen',
  croatianLeague: 'HNL',
  czechLeague: 'Chance Liga',
  argentinaPrimera: 'Liga Profesional',
  brasileiraoA: 'Série A',
  colombiaPrimera: 'Liga BetPlay',
  chilePrimera: 'Primera División (CL)',
  uruguayPrimera: 'Primera División (UY)',
  ecuadorLigaPro: 'LigaPro',
  paraguayPrimera: 'División de Honor',
  peruLiga1: 'Liga 1',
  boliviaPrimera: 'División Profesional',
  venezuelaPrimera: 'Liga FUTVE',
};

function getLeagueName(leagueId) {
  return LEAGUE_NAMES[leagueId] || leagueId;
}

export default function ContrarrelojProgress() {
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
    title: 'Inicio del desafío',
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
      title: `Temporada ${s.season} — ${s.position}º de ${s.totalTeams}`,
      detail: s.leagueName || getLeagueName(s.league),
      color: 'neutral'
    });

    // Promotion
    if (s.promoted) {
      events.push({
        type: 'promotion',
        season: s.season,
        icon: <TrendingUp size={16} />,
        title: '¡Ascenso!',
        detail: `De ${getLeagueName(s.league)} a ${getLeagueName(s.promotedTo)}`,
        color: 'green'
      });
    }

    // Relegation
    if (s.relegated) {
      events.push({
        type: 'relegation',
        season: s.season,
        icon: <TrendingDown size={16} />,
        title: 'Descenso',
        detail: `De ${getLeagueName(s.league)} a ${getLeagueName(s.relegatedTo)}`,
        color: 'red'
      });
    }

    // European phase
    if (s.europeanPhase) {
      events.push({
        type: 'european',
        season: s.season,
        icon: <Star size={16} />,
        title: s.europeanComp || 'Competición continental',
        detail: `Fase alcanzada: ${s.europeanPhase}`,
        color: 'gold'
      });
    }

    // Trophies this season
    const seasonTrophies = trophies.filter(t => t.season === s.season);
    for (const t of seasonTrophies) {
      events.push({
        type: 'trophy',
        season: t.season,
        icon: <Trophy size={16} />,
        title: `🏆 ${t.name}`,
        detail: `Temporada ${t.season}`,
        color: 'gold'
      });
    }
  }

  // Current season (live)
  events.push({
    type: 'current',
    season: currentSeason,
    icon: <Timer size={16} />,
    title: `Temporada ${currentSeason} — EN CURSO`,
    detail: `${currentLeague} · ${currentPos > 0 ? `${currentPos}º de ${totalTeams}` : 'Sin clasificación'}`,
    color: 'accent'
  });

  // Goal
  const isSA = ['argentinaPrimera', 'brasileiraoA', 'colombiaPrimera', 'chilePrimera',
    'uruguayPrimera', 'ecuadorLigaPro', 'paraguayPrimera', 'peruLiga1',
    'boliviaPrimera', 'venezuelaPrimera'].includes(data.startLeague);
  const goalName = isSA ? 'Copa Libertadores' : 'Champions League';

  events.push({
    type: 'goal',
    season: null,
    icon: <Crown size={16} />,
    title: `🎯 Ganar la ${goalName}`,
    detail: data.won ? '¡CONSEGUIDO!' : '¿Cuántas temporadas necesitarás?',
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
          <h2>Camino a la Gloria</h2>
          <span className="hero-sub">{data.startTeam?.name} — desde {getLeagueName(data.startLeague)}</span>
        </div>
        <div className="hero-season">
          <div className="season-num">{currentSeason}</div>
          <div className="season-label">Temporada</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="contrarreloj-progress__stats">
        <div className="stat-card stat-card--league">
          <div className={`stat-value${currentLeague.length > 12 ? ' stat-value--long' : ''}`} title={currentLeague}>{currentLeague}</div>
          <div className="stat-label">Liga actual</div>
        </div>
        <div className="stat-card stat-card--position">
          <div className="stat-value">{currentPos > 0 ? `${currentPos}º` : '—'}</div>
          <div className="stat-label">{totalTeams > 0 ? `de ${totalTeams}` : 'Posición'}</div>
        </div>
        <div className="stat-card stat-card--trophies">
          <div className="stat-value">{trophies.length}</div>
          <div className="stat-label">Trofeos</div>
        </div>
        <div className="stat-card stat-card--goal">
          <div className="stat-value">{isSA ? '🏆' : '⭐'}</div>
          <div className="stat-label">{goalName}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="contrarreloj-progress__timeline-title">Cronología</div>
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
