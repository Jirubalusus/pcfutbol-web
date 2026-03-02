import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FastForward, Play, Swords, Megaphone, ShieldCheck, Flame, Circle, RectangleHorizontal, Hand, Crosshair, TriangleAlert, ArrowLeftRight, Cross, Ban, Flag, Target, Timer, FlagTriangleRight, Zap, RefreshCw, CircleCheck } from 'lucide-react';
import { WORLD_CUP_UI_I18N } from '../../data/worldCupEventsI18n';
import FlagIcon from './FlagIcon';
import './WorldCupLiveMatch.scss';

const EVENT_ICONS = {
  goal:         { icon: null,                 color: '#fff',    bg: '#22c55e', custom: 'emoji' },
  yellow:       { icon: RectangleHorizontal, color: '#fbbf24', bg: 'rgba(251,191,36,0.2)' },
  red:          { icon: RectangleHorizontal, color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
  save:         { icon: Hand,                color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
  chance:       { icon: Crosshair,           color: '#f97316', bg: 'rgba(249,115,22,0.2)' },
  nearMiss:     { icon: TriangleAlert,       color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
  foul:         { icon: Zap,                 color: '#eab308', bg: 'rgba(234,179,8,0.2)' },
  possession:   { icon: RefreshCw,           color: '#64748b', bg: 'rgba(100,116,139,0.2)' },
  corner:       { icon: Flag,                color: '#f472b6', bg: 'rgba(244,114,182,0.2)' },
  freeKick:     { icon: Target,              color: '#14b8a6', bg: 'rgba(20,184,166,0.2)' },
  substitution: { icon: ArrowLeftRight,      color: '#60a5fa', bg: 'rgba(96,165,250,0.2)' },
  injury:       { icon: Cross,               color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
  offside:      { icon: Ban,                 color: '#94a3b8', bg: 'rgba(148,163,184,0.2)' },
  kickoff:      { icon: Play,                color: '#22c55e', bg: 'rgba(34,197,94,0.2)' },
  halftime:     { icon: Timer,               color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' },
  fulltime:     { icon: FlagTriangleRight,   color: '#22c55e', bg: 'rgba(34,197,94,0.2)' },
};

const FootballSVG = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#fff" stroke="#444" strokeWidth="1"/>
    <polygon points="12,5 15.5,8 14.5,12 9.5,12 8.5,8" fill="#444"/>
    <line x1="12" y1="5" x2="12" y2="1.5" stroke="#444" strokeWidth="0.7"/>
    <line x1="15.5" y1="8" x2="19" y2="5.5" stroke="#444" strokeWidth="0.7"/>
    <line x1="14.5" y1="12" x2="18.5" y2="13" stroke="#444" strokeWidth="0.7"/>
    <line x1="9.5" y1="12" x2="5.5" y2="13" stroke="#444" strokeWidth="0.7"/>
    <line x1="8.5" y1="8" x2="5" y2="5.5" stroke="#444" strokeWidth="0.7"/>
    <line x1="12" y1="22.5" x2="12" y2="19" stroke="#444" strokeWidth="0.7"/>
    <line x1="19" y1="5.5" x2="22" y2="9" stroke="#444" strokeWidth="0.7"/>
    <line x1="5" y1="5.5" x2="2" y2="9" stroke="#444" strokeWidth="0.7"/>
    <line x1="18.5" y1="13" x2="20.5" y2="17" stroke="#444" strokeWidth="0.7"/>
    <line x1="5.5" y1="13" x2="3.5" y2="17" stroke="#444" strokeWidth="0.7"/>
  </svg>
);

const EventIcon = ({ type, size = 16 }) => {
  const cfg = EVENT_ICONS[type] || { icon: Circle, color: '#94a3b8', bg: 'rgba(148,163,184,0.2)' };
  if (cfg.custom === 'emoji') {
    return (
      <span className="wc-live__event-icon" style={{ background: cfg.bg, fontSize: size }}>
        ⚽
      </span>
    );
  }
  const Icon = cfg.icon;
  return (
    <span className="wc-live__event-icon" style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={size} fill="none" />
    </span>
  );
};

const NARRATION_I18N = {
  es: {
    goal_player: '{player} ¡¡GOOOL!! ¡Increíble!',
    goal_opponent: 'Gol del rival. {player} marca.',
    yellow_player: 'Tarjeta amarilla para {player}',
    yellow_opponent: 'Amarilla para el rival',
    red_player: '¡Roja directa! {player} expulsado',
    red_opponent: 'Expulsión en el rival',
    save: '¡Gran parada del portero!',
    chance_player: '¡Ocasión clara! Disparo de {player}',
    chance_opponent: 'Disparo peligroso del rival',
    nearMiss: '¡Por poco! El balón roza el poste',
    foul: 'Falta en el centro del campo',
    possession: 'Cambio de posesión',
    corner: 'Saque de esquina',
    freeKick: 'Falta peligrosa cerca del área',
  },
  en: {
    goal_player: '{player} GOOOAL!! Incredible!',
    goal_opponent: 'Opponent scores. {player} on target.',
    yellow_player: 'Yellow card for {player}',
    yellow_opponent: 'Yellow card for the opponent',
    red_player: 'Straight red! {player} sent off',
    red_opponent: 'Red card for the opponent',
    save: 'Great save by the goalkeeper!',
    chance_player: 'Clear chance! Shot by {player}',
    chance_opponent: 'Dangerous shot by the opponent',
    nearMiss: 'So close! The ball grazes the post',
    foul: 'Foul in midfield',
    possession: 'Change of possession',
    corner: 'Corner kick',
    freeKick: 'Dangerous free kick near the box',
  },
  fr: {
    goal_player: '{player} BUUUT !! Incroyable !',
    goal_opponent: 'But de l\'adversaire. {player} marque.',
    yellow_player: 'Carton jaune pour {player}',
    yellow_opponent: 'Jaune pour l\'adversaire',
    red_player: 'Rouge directe ! {player} expulsé',
    red_opponent: 'Expulsion chez l\'adversaire',
    save: 'Superbe arrêt du gardien !',
    chance_player: 'Occasion franche ! Tir de {player}',
    chance_opponent: 'Tir dangereux de l\'adversaire',
    nearMiss: 'Tout près ! Le ballon frôle le poteau',
    foul: 'Faute au milieu de terrain',
    possession: 'Changement de possession',
    corner: 'Corner', freeKick: 'Coup franc dangereux',
  },
  de: {
    goal_player: '{player} TOOOR!! Unglaublich!',
    goal_opponent: 'Gegentor. {player} trifft.',
    yellow_player: 'Gelbe Karte für {player}',
    yellow_opponent: 'Gelb für den Gegner',
    red_player: 'Glatt Rot! {player} vom Platz',
    red_opponent: 'Platzverweis beim Gegner',
    save: 'Tolle Parade des Torwarts!',
    chance_player: 'Große Chance! Schuss von {player}',
    chance_opponent: 'Gefährlicher Schuss des Gegners',
    nearMiss: 'Knapp! Ball streift den Pfosten',
    foul: 'Foul im Mittelfeld',
    possession: 'Ballbesitzwechsel',
    corner: 'Eckstoß', freeKick: 'Gefährlicher Freistoß',
  },
  pt: {
    goal_player: '{player} GOLOOO!! Incrível!',
    goal_opponent: 'Golo do adversário. {player} marca.',
    yellow_player: 'Cartão amarelo para {player}',
    yellow_opponent: 'Amarelo para o adversário',
    red_player: 'Vermelho direto! {player} expulso',
    red_opponent: 'Expulsão no adversário',
    save: 'Grande defesa do guarda-redes!',
    chance_player: 'Ocasião clara! Remate de {player}',
    chance_opponent: 'Remate perigoso do adversário',
    nearMiss: 'Por pouco! A bola roça o poste',
    foul: 'Falta no meio-campo',
    possession: 'Mudança de posse',
    corner: 'Canto', freeKick: 'Livre perigoso',
  },
  it: {
    goal_player: '{player} GOOOL!! Incredibile!',
    goal_opponent: 'Gol dell\'avversario. {player} segna.',
    yellow_player: 'Cartellino giallo per {player}',
    yellow_opponent: 'Giallo per l\'avversario',
    red_player: 'Rosso diretto! {player} espulso',
    red_opponent: 'Espulsione nell\'avversario',
    save: 'Grande parata del portiere!',
    chance_player: 'Occasione chiara! Tiro di {player}',
    chance_opponent: 'Tiro pericoloso dell\'avversario',
    nearMiss: 'Quasi! La palla sfiora il palo',
    foul: 'Fallo a centrocampo',
    possession: 'Cambio di possesso',
    corner: 'Calcio d\'angolo', freeKick: 'Punizione pericolosa',
  },
};

function getNarration(event, lang) {
  const texts = NARRATION_I18N[lang] || NARRATION_I18N.en;
  const type = event.type;
  
  if (type === 'goal') {
    const key = event.team === 'player' ? 'goal_player' : 'goal_opponent';
    return (texts[key] || '').replace('{player}', event.player || '');
  }
  if (type === 'yellow' || type === 'red') {
    const key = `${type}_${event.team === 'player' ? 'player' : 'opponent'}`;
    return (texts[key] || '').replace('{player}', event.player || '');
  }
  if (type === 'chance') {
    const key = event.team === 'player' ? 'chance_player' : 'chance_opponent';
    return (texts[key] || '').replace('{player}', event.player || '');
  }
  return texts[type] || '';
}

export default function WorldCupLiveMatch({
  events, homeTeam, awayTeam, isHome, onComplete, onHalftimeChoice, lang: langProp
}) {
  const { i18n } = useTranslation();
  const lang = langProp || i18n.language?.slice(0, 2) || 'es';
  const ui = WORLD_CUP_UI_I18N[lang] || WORLD_CUP_UI_I18N.es;

  const [displayedEvents, setDisplayedEvents] = useState([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [showHalftime, setShowHalftime] = useState(false);
  const [finished, setFinished] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [goalOverlay, setGoalOverlay] = useState(null); // 'player' | 'opponent' | null

  // Use refs for mutable state that the interval reads
  const eventIndexRef = useRef(0);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const halftimeDoneRef = useRef(false);
  const fastModeRef = useRef(false);
  const scrollRef = useRef(null);
  const finishedRef = useRef(false);
  const eventsRef = useRef(events);
  const onCompleteRef = useRef(onComplete);
  const goalOverlayTimerRef = useRef(null);

  useEffect(() => { fastModeRef.current = fastMode; }, [fastMode]);
  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Single interval that checks refs
  useEffect(() => {
    const tick = () => {
      if (pausedRef.current || finishedRef.current) return;

      const idx = eventIndexRef.current;
      if (idx >= eventsRef.current.length) {
        finishedRef.current = true;
        setFinished(true);
        setCurrentMinute(90);
        clearInterval(timerRef.current);
        setTimeout(() => onCompleteRef.current(), 2500);
        return;
      }

      const evt = eventsRef.current[idx];

      // Halftime pause: first event at minute >= 45, if halftime not done yet
      if (evt.minute >= 45 && !halftimeDoneRef.current) {
        pausedRef.current = true;
        setShowHalftime(true);
        setCurrentMinute(45);
        return;
      }

      setCurrentMinute(evt.minute);

      if (evt.type === 'goal') {
        // Pause simulation to enjoy the goal animation
        pausedRef.current = true;
        if (evt.team === 'player') {
          setPlayerScore(s => s + 1);
          setGoalOverlay('player');
          goalOverlayTimerRef.current = setTimeout(() => { setGoalOverlay(null); pausedRef.current = false; }, 2500);
        } else {
          setOpponentScore(s => s + 1);
          setGoalOverlay('opponent');
          goalOverlayTimerRef.current = setTimeout(() => { setGoalOverlay(null); pausedRef.current = false; }, 2000);
        }
      }

      setDisplayedEvents(prev => [...prev, evt]);
      eventIndexRef.current = idx + 1;
    };

    // Use dynamic interval via recursive setTimeout for speed toggling
    const schedule = () => {
      const delay = fastModeRef.current ? 300 : 1500;
      timerRef.current = setTimeout(() => {
        tick();
        if (!finishedRef.current) schedule();
      }, delay);
    };

    schedule();
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(goalOverlayTimerRef.current);
    };
  }, []); // Only run once on mount

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedEvents]);

  const handleHalftimeChoice = (choice) => {
    setShowHalftime(false);
    halftimeDoneRef.current = true;
    // Don't unpause yet — wait for events to update from parent via useEffect
    if (onHalftimeChoice) onHalftimeChoice(choice);
  };

  // Unpause after halftime events arrive (eventsRef is updated in useEffect above)
  useEffect(() => {
    if (halftimeDoneRef.current && pausedRef.current && !showHalftime) {
      // Events have been updated, safe to resume
      pausedRef.current = false;
    }
  }, [events, showHalftime]);

  const homeName = lang === 'es' ? (homeTeam?.nameEs || homeTeam?.name || '') : (homeTeam?.name || '');
  const awayName = lang === 'es' ? (awayTeam?.nameEs || awayTeam?.name || '') : (awayTeam?.name || '');
  const homeScore = isHome ? playerScore : opponentScore;
  const awayScore = isHome ? opponentScore : playerScore;

  const playerTeamName = isHome ? homeName : awayName;
  const opponentTeamName = isHome ? awayName : homeName;

  return (
    <div className="wc-live">
      {/* Goal overlay effect */}
      {goalOverlay && (
        <div className={`wc-live__goal-overlay wc-live__goal-overlay--${goalOverlay}`}>
          <div className="wc-live__goal-net"></div>
          <div className="wc-live__goal-overlay-content">
            <span className="wc-live__goal-overlay-emoji">⚽</span>
            <span className="wc-live__goal-overlay-text">
              {goalOverlay === 'player' ? (lang === 'es' ? '¡¡GOOOL!!' : lang === 'fr' ? 'BUUUT !!' : lang === 'de' ? 'TOOOR!!' : lang === 'pt' ? 'GOLOOO!!' : lang === 'it' ? 'GOOOL!!' : 'GOOOAL!!') : (lang === 'es' ? 'Gol del rival...' : 'Opponent scores...')}
            </span>
            {goalOverlay === 'player' && <span className="wc-live__goal-overlay-team">{playerTeamName}</span>}
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="wc-live__scoreboard">
        <div className="wc-live__team-col">
          <span className="wc-live__flag"><FlagIcon teamId={homeTeam?.id} size={32} /></span>
          <span className="wc-live__team-name">{homeName}</span>
        </div>
        <div className="wc-live__score-col">
          <div className="wc-live__score">{homeScore} - {awayScore}</div>
          <div className={`wc-live__clock ${finished ? 'wc-live__clock--finished' : ''}`}>
            {finished ? ui.fullTime : showHalftime ? ui.halfTime : `${currentMinute}'`}
          </div>
        </div>
        <div className="wc-live__team-col">
          <span className="wc-live__flag"><FlagIcon teamId={awayTeam?.id} size={32} /></span>
          <span className="wc-live__team-name">{awayName}</span>
        </div>
      </div>

      {/* Events timeline */}
      <div className="wc-live__timeline" ref={scrollRef}>
        <div className="wc-live__event wc-live__event--kickoff">
          <EventIcon type="kickoff" />
          <span className="wc-live__event-text">{ui.kickOff}</span>
        </div>
        {displayedEvents.map((evt, i) => (
          <div
            key={i}
            className={`wc-live__event wc-live__event--${evt.type} ${evt.team === 'player' ? 'wc-live__event--player' : 'wc-live__event--opponent'} wc-live__event--appear`}
          >
            <span className="wc-live__event-minute">{evt.minute}'</span>
            <EventIcon type={evt.type} />
            <span className="wc-live__event-text">{getNarration(evt, lang)}</span>
            <span className="wc-live__event-flag">
              <FlagIcon teamId={evt.team === 'player' ? (isHome ? homeTeam?.id : awayTeam?.id) : (isHome ? awayTeam?.id : homeTeam?.id)} size={18} />
            </span>
          </div>
        ))}
        {finished && (
          <div className="wc-live__event wc-live__event--fulltime">
            <EventIcon type="fulltime" />
            <span className="wc-live__event-text">{ui.fullTime}</span>
          </div>
        )}
      </div>

      {/* Fast forward button */}
      {!showHalftime && !finished && (
        <button className={`wc-live__ff ${fastMode ? 'wc-live__ff--active' : ''}`} onClick={() => setFastMode(f => !f)}>
          {fastMode ? <Play size={16} /> : <FastForward size={16} />} {fastMode ? (ui.normalSpeed || 'Normal') : ui.fastForward}
        </button>
      )}

      {/* Halftime decisions overlay */}
      {showHalftime && (
        <div className="wc-live__halftime">
          <h3>{ui.halftimeTitle}</h3>
          <p>{ui.halftimeDesc}</p>
          <div className="wc-live__ht-options">
            {[
              { choice: 'changeFormation', i18n: 'ChangeFormation', icon: <Swords size={20} />, cls: 'attack' },
              { choice: 'motivational', i18n: 'Motivational', icon: <Megaphone size={20} />, cls: 'morale' },
              { choice: 'conservative', i18n: 'Conservative', icon: <ShieldCheck size={20} />, cls: 'defense' },
              { choice: 'aggressive', i18n: 'Aggressive', icon: <Flame size={20} />, cls: 'fire' },
            ].map(({ choice, i18n, icon, cls }) => (
              <button key={choice} className="wc-live__ht-btn" onClick={() => handleHalftimeChoice(choice)}>
                <span className={`wc-live__ht-icon wc-live__ht-icon--${cls}`}>{icon}</span>
                <div className="wc-live__ht-info">
                  <span className="wc-live__ht-label">{ui[`ht${i18n}`]}</span>
                  <span className="wc-live__ht-pro"><CircleCheck size={13} /> {ui[`ht${i18n}Pro`]}</span>
                  <span className="wc-live__ht-con"><TriangleAlert size={13} /> {ui[`ht${i18n}Con`]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
