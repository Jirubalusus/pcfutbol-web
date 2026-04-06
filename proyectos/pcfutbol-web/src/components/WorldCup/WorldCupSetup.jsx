import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Search, Star, ChevronRight, ArrowLeft, X, Users, TrendingUp, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { WORLD_CUP_UI_I18N } from '../../data/worldCupEventsI18n';
import FlagIcon from './FlagIcon';
import './WorldCupSetup.scss';

const CONFEDERATIONS = ['ALL', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC'];
const CONF_EMOJI = { ALL: '🌍', UEFA: '🇪🇺', CONMEBOL: '🌎', CONCACAF: '🌎', CAF: '🌍', AFC: '🌏' };

const STYLE_ICONS = {
  offensive: '⚔️', defensive: '🛡️', balanced: '⚖️',
  'counter-attack': '⚡', possession: '🎯', physical: '💪',
};

const STYLE_KEY_MAP = {
  offensive: 'styleOffensive', defensive: 'styleDefensive', balanced: 'styleBalanced',
  'counter-attack': 'styleCounterAttack', possession: 'stylePossession', physical: 'stylePhysical',
};

const DIFFICULTY_I18N = {
  es: { hard: 'Difícil', medium: 'Media', easy: 'Fácil', all: 'Todas', search: 'Buscar selección...', confirm: 'Confirmar', back: 'Volver', ranking: 'Ranking', rating: 'Valoración', name: 'Nombre', difficulty: 'Dificultad', sortBy: 'Ordenar', squad: 'Plantilla', avgRating: 'Media', topPlayers: 'Mejores jugadores', fifaRanking: 'Ranking FIFA', filters: 'Filtros', sort: 'Orden', teamsAvailable: 'selecciones disponibles', tapToInspect: 'Toca una selección para ver detalles y confirmar', style: 'Estilo', resultsFor: 'Resultados para', clear: 'Limpiar' },
  en: { hard: 'Hard', medium: 'Medium', easy: 'Easy', all: 'All', search: 'Search nation...', confirm: 'Confirm', back: 'Back', ranking: 'Ranking', rating: 'Rating', name: 'Name', difficulty: 'Difficulty', sortBy: 'Sort', squad: 'Squad', avgRating: 'Average', topPlayers: 'Top players', fifaRanking: 'FIFA Ranking', filters: 'Filters', sort: 'Sort', teamsAvailable: 'teams available', tapToInspect: 'Tap a nation to inspect details and confirm', style: 'Style', resultsFor: 'Results for', clear: 'Clear' },
  fr: { hard: 'Difficile', medium: 'Moyen', easy: 'Facile', all: 'Toutes', search: 'Rechercher nation...', confirm: 'Confirmer', back: 'Retour', ranking: 'Classement', rating: 'Note', name: 'Nom', difficulty: 'Difficulté', sortBy: 'Trier', squad: 'Effectif', avgRating: 'Moyenne', topPlayers: 'Meilleurs joueurs', fifaRanking: 'Classement FIFA', filters: 'Filtres', sort: 'Tri', teamsAvailable: 'sélections disponibles', tapToInspect: 'Touchez une sélection pour voir ses détails', style: 'Style', resultsFor: 'Résultats pour', clear: 'Effacer' },
  de: { hard: 'Schwer', medium: 'Mittel', easy: 'Leicht', all: 'Alle', search: 'Nation suchen...', confirm: 'Bestätigen', back: 'Zurück', ranking: 'Ranking', rating: 'Bewertung', name: 'Name', difficulty: 'Schwierigkeit', sortBy: 'Sortieren', squad: 'Kader', avgRating: 'Durchschnitt', topPlayers: 'Top-Spieler', fifaRanking: 'FIFA-Ranking', filters: 'Filter', sort: 'Sortierung', teamsAvailable: 'Teams verfügbar', tapToInspect: 'Tippe ein Team an, um Details zu sehen', style: 'Stil', resultsFor: 'Ergebnisse für', clear: 'Zurücksetzen' },
  pt: { hard: 'Difícil', medium: 'Médio', easy: 'Fácil', all: 'Todas', search: 'Pesquisar seleção...', confirm: 'Confirmar', back: 'Voltar', ranking: 'Ranking', rating: 'Avaliação', name: 'Nome', difficulty: 'Dificuldade', sortBy: 'Ordenar', squad: 'Plantel', avgRating: 'Média', topPlayers: 'Melhores jogadores', fifaRanking: 'Ranking FIFA', filters: 'Filtros', sort: 'Ordenação', teamsAvailable: 'seleções disponíveis', tapToInspect: 'Toque numa seleção para ver detalhes', style: 'Estilo', resultsFor: 'Resultados para', clear: 'Limpar' },
  it: { hard: 'Difficile', medium: 'Medio', easy: 'Facile', all: 'Tutte', search: 'Cerca nazione...', confirm: 'Conferma', back: 'Indietro', ranking: 'Classifica', rating: 'Valutazione', name: 'Nome', difficulty: 'Difficoltà', sortBy: 'Ordina', squad: 'Rosa', avgRating: 'Media', topPlayers: 'Migliori giocatori', fifaRanking: 'Ranking FIFA', filters: 'Filtri', sort: 'Ordine', teamsAvailable: 'nazionali disponibili', tapToInspect: 'Tocca una nazionale per vedere i dettagli', style: 'Stile', resultsFor: 'Risultati per', clear: 'Pulisci' },
};

function getDifficulty(rating) {
  if (rating >= 85) return 'easy';
  if (rating >= 75) return 'medium';
  return 'hard';
}

const DIFF_EMOJI = { hard: '🔴', medium: '🟡', easy: '🟢' };

function RatingStars({ rating, size = 14 }) {
  const stars = Math.round((rating / 100) * 5);
  return (
    <div className="wcs-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= stars ? 'wcs-stars__filled' : 'wcs-stars__empty'} />
      ))}
    </div>
  );
}

function getTeamStats(team) {
  if (!team.players?.length) return { starPlayer: null, top3: [], avgRating: 0 };
  const sorted = [...team.players].sort((a, b) => b.rating - a.rating);
  return {
    starPlayer: sorted[0],
    top3: sorted.slice(0, 3),
    avgRating: Math.round(sorted.reduce((s, p) => s + p.rating, 0) / sorted.length),
  };
}

export default function WorldCupSetup({ onSelectTeam, onBack }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'es';
  const ui = WORLD_CUP_UI_I18N[lang] || WORLD_CUP_UI_I18N.es;
  const t = DIFFICULTY_I18N[lang] || DIFFICULTY_I18N.en;

  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [confFilter, setConfFilter] = useState('ALL');
  const [diffFilter, setDiffFilter] = useState('all');
  const [sortBy, setSortBy] = useState('ranking');
  const [previewTeam, setPreviewTeam] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const gridRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    fetch('/data/national-teams.json')
      .then(r => r.json())
      .then(data => {
        setTeams(data);
        setTimeout(() => setAnimateIn(true), 50);
      })
      .catch(() => setTeams([]));
  }, []);

  const filtered = useMemo(() => {
    let result = teams.filter(team => {
      if (confFilter !== 'ALL' && team.confederation !== confFilter) return false;
      if (diffFilter !== 'all' && getDifficulty(team.rating) !== diffFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return team.name.toLowerCase().includes(q) || team.nameEs.toLowerCase().includes(q) || team.code.toLowerCase().includes(q);
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'ranking': return a.fifaRanking - b.fifaRanking;
        case 'rating': return b.rating - a.rating;
        case 'name': return displayName(a).localeCompare(displayName(b));
        case 'difficulty': return a.rating - b.rating;
        default: return 0;
      }
    });

    return result;
  }, [teams, search, confFilter, diffFilter, sortBy, lang]);

  const displayName = useCallback((team) => lang === 'es' ? team.nameEs : team.name, [lang]);

  const getStyleLabel = useCallback((style) => {
    if (!style) return '';
    const icon = STYLE_ICONS[style] || '';
    const key = STYLE_KEY_MAP[style];
    return `${icon} ${ui[key] || style}`;
  }, [ui]);

  const getDiffLabel = useCallback((rating) => {
    const d = getDifficulty(rating);
    return `${DIFF_EMOJI[d]} ${t[d]}`;
  }, [t]);

  const handleCardClick = useCallback((team) => {
    setPreviewTeam(team);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTeam(null);
  }, []);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) closePreview();
  }, [closePreview]);

  const handleConfirm = useCallback(() => {
    if (previewTeam) onSelectTeam(previewTeam);
  }, [previewTeam, onSelectTeam]);

  const stats = previewTeam ? getTeamStats(previewTeam) : null;
  const hasActiveFilters = search || confFilter !== 'ALL' || diffFilter !== 'all' || sortBy !== 'ranking';

  return (
    <div className={`wcs ${animateIn ? 'wcs--visible' : ''}`}>
      {/* Sticky header */}
      <div className="wcs__header">
        <div className="wcs__hero-card">
          <div className="wcs__header-top">
            {onBack && (
              <button className="wcs__back" onClick={onBack}>
                <ArrowLeft size={20} /> {t.back}
              </button>
            )}
            <div className="wcs__hero-inline">
              <Trophy size={24} className="wcs__trophy-sm" />
              <div className="wcs__hero-copy">
                <h1 className="wcs__title">{ui.worldCup}</h1>
                <p className="wcs__subtitle">{ui.selectTeam}</p>
              </div>
            </div>
          </div>

          <div className="wcs__toolbar">
            <div className="wcs__search">
              <Search size={18} />
              <input
                type="text"
                placeholder={t.search}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="wcs__search-clear" onClick={() => setSearch('')} aria-label={t.clear}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="wcs__status-row">
              <div className="wcs__status-pill">
                <ShieldCheck size={14} />
                <span>{filtered.length} {t.teamsAvailable}</span>
              </div>
              <div className="wcs__status-hint">{t.tapToInspect}</div>
            </div>
          </div>
        </div>

        <div className="wcs__controls-card">
          <div className="wcs__controls-head">
            <div className="wcs__controls-title">
              <SlidersHorizontal size={16} />
              <span>{t.filters}</span>
            </div>
            {hasActiveFilters && (
              <button
                className="wcs__reset"
                onClick={() => {
                  setSearch('');
                  setConfFilter('ALL');
                  setDiffFilter('all');
                  setSortBy('ranking');
                }}
              >
                {t.clear}
              </button>
            )}
          </div>

          <div className="wcs__control-group">
            <span className="wcs__control-label">Confederación</span>
            <div className="wcs__conf-scroll">
              {CONFEDERATIONS.map(key => (
                <button
                  key={key}
                  className={`wcs__conf-btn ${confFilter === key ? 'wcs__conf-btn--active' : ''}`}
                  onClick={() => setConfFilter(key)}
                >
                  {CONF_EMOJI[key]} {key === 'ALL' ? t.all : key}
                </button>
              ))}
            </div>
          </div>

          <div className="wcs__filter-row">
            <div className="wcs__control-group wcs__control-group--grow">
              <span className="wcs__control-label">{t.difficulty}</span>
              <div className="wcs__diff-filters">
                {['all', 'easy', 'medium', 'hard'].map(d => (
                  <button
                    key={d}
                    className={`wcs__diff-btn ${diffFilter === d ? 'wcs__diff-btn--active' : ''}`}
                    onClick={() => setDiffFilter(d)}
                  >
                    {d === 'all' ? t.all : `${DIFF_EMOJI[d]} ${t[d]}`}
                  </button>
                ))}
              </div>
            </div>
            <label className="wcs__sort-wrap">
              <span className="wcs__control-label">{t.sort}</span>
              <select className="wcs__sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="ranking">{t.ranking}</option>
                <option value="rating">{t.rating}</option>
                <option value="name">{t.name}</option>
                <option value="difficulty">{t.difficulty}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="wcs__results-bar">
        <span className="wcs__results-title">
          {search ? `${t.resultsFor} “${search}”` : ui.selectTeam}
        </span>
        <span className="wcs__results-count">{filtered.length}</span>
      </div>

      {/* Team grid */}
      <div className="wcs__grid" ref={gridRef}>
        {filtered.map((team, idx) => (
          <button
            key={team.id}
            className={`wcs__card ${previewTeam?.id === team.id ? 'wcs__card--selected' : ''}`}
            style={{ animationDelay: `${Math.min(idx, 20) * 30}ms` }}
            onClick={() => handleCardClick(team)}
          >
            <div className="wcs__card-top">
              <div className="wcs__card-identity">
                <FlagIcon teamId={team.id} size={32} className="wcs__card-flag" />
                <div className="wcs__card-copy">
                  <span className="wcs__card-name">{displayName(team)}</span>
                  <span className="wcs__card-conf">{team.confederation}</span>
                </div>
              </div>
              <span className="wcs__card-rank">#{team.fifaRanking}</span>
            </div>
            <div className="wcs__card-body">
              <div className="wcs__card-rating-row">
                <RatingStars rating={team.rating} size={12} />
                <span className="wcs__card-rating-value">{team.rating}</span>
              </div>
              <div className="wcs__card-meta">
                <span className="wcs__card-style">{getStyleLabel(team.style)}</span>
                <span className={`wcs__card-diff wcs__card-diff--${getDifficulty(team.rating)}`}>
                  {getDiffLabel(team.rating)}
                </span>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="wcs__empty">🔍 {t.search}</div>
        )}
      </div>

      {/* Preview panel (bottom sheet) */}
      {previewTeam && (
        <div className="wcs__overlay" ref={overlayRef} onClick={handleOverlayClick}>
          <div className="wcs__preview">
            <div className="wcs__preview-handle" />
            <button className="wcs__preview-close" onClick={closePreview}>
              <X size={22} />
            </button>

            {/* Team header */}
            <div className="wcs__preview-header">
              <FlagIcon teamId={previewTeam.id} size={48} className="wcs__preview-flag" />
              <div className="wcs__preview-info">
                <h2 className="wcs__preview-name">{displayName(previewTeam)}</h2>
                <div className="wcs__preview-meta">
                  <span className="wcs__preview-conf">{previewTeam.confederation}</span>
                  <span className="wcs__preview-rank">#{previewTeam.fifaRanking} {t.fifaRanking}</span>
                </div>
                <RatingStars rating={previewTeam.rating} size={16} />
              </div>
            </div>

            {/* Stats grid */}
            <div className="wcs__preview-stats">
              <div className="wcs__stat">
                <span className="wcs__stat-label">{t.difficulty}</span>
                <span className={`wcs__stat-value wcs__stat-value--${getDifficulty(previewTeam.rating)}`}>
                  {getDiffLabel(previewTeam.rating)}
                </span>
              </div>
              <div className="wcs__stat">
                <span className="wcs__stat-label">{t.style}</span>
                <span className="wcs__stat-value">{getStyleLabel(previewTeam.style)}</span>
              </div>
              <div className="wcs__stat">
                <span className="wcs__stat-label">{t.avgRating}</span>
                <span className="wcs__stat-value">
                  <TrendingUp size={14} /> {stats?.avgRating || '—'}
                </span>
              </div>
              <div className="wcs__stat">
                <span className="wcs__stat-label">{t.squad}</span>
                <span className="wcs__stat-value">
                  <Users size={14} /> {previewTeam.players?.length || 0}
                </span>
              </div>
            </div>

            {/* Star player */}
            {stats?.starPlayer && (
              <div className="wcs__preview-star">
                <span className="wcs__preview-star-badge">⭐ {ui.starPlayer}</span>
                <div className="wcs__preview-star-info">
                  <span className="wcs__preview-star-name">{stats.starPlayer.name}</span>
                  <span className="wcs__preview-star-pos">{stats.starPlayer.position}</span>
                  <span className="wcs__preview-star-rating">{stats.starPlayer.rating}</span>
                </div>
              </div>
            )}

            {/* Top 3 players */}
            {stats?.top3?.length > 0 && (
              <div className="wcs__preview-top3">
                <h3 className="wcs__preview-section-title">{t.topPlayers}</h3>
                {stats.top3.map((p, i) => (
                  <div key={i} className="wcs__preview-player">
                    <span className="wcs__preview-player-rank">{i + 1}</span>
                    <span className="wcs__preview-player-name">{p.name}</span>
                    <span className="wcs__preview-player-pos">{p.position}</span>
                    <span className="wcs__preview-player-rating">{p.rating}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm button */}
            <button className="wcs__preview-confirm" onClick={handleConfirm}>
              {t.confirm} — {displayName(previewTeam)} <FlagIcon teamId={previewTeam.id} size={20} />
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
