import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import Settings from '../Settings/Settings';
import Auth from '../Auth/Auth';
import { hasActiveCareer, getCareerSave, deleteCareerSave } from '../../firebase/careerSaveService';
import { getLocalCareerInfo, loadLocalCareer, deleteLocalCareer } from '../../game/localCareerSave';
import { hasActiveContrarreloj, getContrarrelojSave, deleteContrarrelojSave } from '../../firebase/contrarrelojSaveService';
import { hasActiveProManager, getProManagerSave, deleteProManagerSave } from '../../firebase/proManagerService';
import { getGlorySave, deleteGlorySave } from '../../firebase/glorySaveService';
import { getLocalGloryInfo, loadLocalGlory, deleteLocalGlory } from '../../game/localGlorySave';
import { deleteAllSaveSlots } from '../../firebase/savesService';
import {
  Play, LogIn, LogOut, Save, Trophy, Settings as SettingsIcon,
  Lightbulb, User, Gamepad2, ChevronRight, ChevronLeft, Timer, Briefcase, Package, Mountain, Globe, Lock, Mail, Coffee
} from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import EditionMode from '../EditionMode/EditionMode';
import { useTheme } from '../../context/ThemeContext';
import { getActiveEditionId } from '../../data/editions/editionService';
import { getDatabaseOptions, getStoredActiveDatabaseId, setStoredActiveDatabaseId, formatDatabaseLabel, CURRENT_DATABASE_ID } from '../../data/activeDatabaseService';
import { trackEvent, gameModeLabel } from '../../firebase/analytics';
import './MainMenu.scss';

// Normalize a Firestore `lastSaved` (Timestamp | {seconds} | epoch ms) to millis.
function cloudSaveMillis(saveData) {
  const ts = saveData?.lastSaved;
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  return 0;
}

// Decide whether the on-device backup should win over the cloud save on Continue.
// Prefer local when it still needs syncing (the player advanced offline) or when
// its timestamp is strictly newer than the cloud's. Equal/older local never wins,
// so a fresh cloud save is honored. Guards missing timestamps to avoid false wins.
function shouldPreferLocalBackup(local, saveData) {
  if (!local?.state) return false;
  if (local.sync?.pending) return true;
  const localMs = local.savedAt || 0;
  const cloudMs = cloudSaveMillis(saveData);
  return localMs > 0 && localMs > cloudMs;
}

export default function MainMenu() {
  const { t } = useTranslation();
  const { themeId, themes: themeList } = useTheme();
  const isLightTheme = themeList[themeId]?.colorScheme === 'light';
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, isEmailVerified, logout, loading: authLoading, startTrial } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  // Contextual reason the Auth screen is being opened (save-progress, rankings,
  // edition-mode, cloud-load, generic). Drives the contextual copy in <Auth>.
  const [authIntent, setAuthIntent] = useState('generic');
  const openAuth = (intent = 'generic') => {
    setAuthIntent(intent);
    setShowAuth(true);
  };
  const [loggingOut, setLoggingOut] = useState(false);
  const [databaseOptions, setDatabaseOptions] = useState([]);
  const [activeDatabaseId, setActiveDatabaseId] = useState(() => getStoredActiveDatabaseId());
  const [selectedDatabaseId, setSelectedDatabaseId] = useState(() => getStoredActiveDatabaseId());
  const [pendingDatabaseId, setPendingDatabaseId] = useState(null);
  // Throttle wheel/trackpad steps so a single flick advances at most one season.
  const seasonWheelLockRef = useRef(0);
  // Pointer-drag state for the season wheel. Holding click + dragging the dial
  // horizontally steps through seasons; `seasonDragOffset` is the live visual
  // slide (in px) and `seasonDragging` toggles grabbing-cursor / no-transition.
  const seasonDragRef = useRef(null);
  const seasonClickSuppressRef = useRef(false);
  const [seasonDragging, setSeasonDragging] = useState(false);
  const [seasonDragOffset, setSeasonDragOffset] = useState(0);
  // Mode-card carousel: live scroll container + active card index drive the
  // overlay arrows and the pagination dots. The index is derived from scroll
  // position so manual drag/touch/wheel keeps the dots in sync.
  const modeTrackRef = useRef(null);
  const modeScrollRafRef = useRef(0);
  const modeNavClickSuppressUntilRef = useRef(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  // Mirror of activeCardIndex readable from effects/listeners bound once, so the
  // remount sync can restore the right card without re-binding on every change.
  const activeCardIndexRef = useRef(0);
  activeCardIndexRef.current = activeCardIndex;
  const [changingDatabase, setChangingDatabase] = useState(false);
  const activeDatabaseOption = databaseOptions.find(option => option.id === activeDatabaseId);
  const selectedDatabaseOption = databaseOptions.find(option => option.id === selectedDatabaseId);
  const pendingDatabaseOption = databaseOptions.find(option => option.id === pendingDatabaseId);
  const cleanDatabaseShortLabel = (label) => String(label || '')
    .replace(/^Temporada\s+/i, '')
    .replace(/[\s\u00a0]+actual$/i, '')
    .trim()
    .replace(/^(\d{4})-(\d{2})$/, '$1/$2');
  const activeDatabaseLabel = formatDatabaseLabel(activeDatabaseOption || activeDatabaseId);
  const activeDatabaseShortLabel = cleanDatabaseShortLabel(activeDatabaseOption?.shortLabel || activeDatabaseLabel);
  const selectedDatabaseLabel = formatDatabaseLabel(selectedDatabaseOption || selectedDatabaseId);
  const selectedDatabaseShortLabel = cleanDatabaseShortLabel(selectedDatabaseOption?.shortLabel || selectedDatabaseLabel);
  const selectedDatabaseType = selectedDatabaseOption?.historical ? t('mainMenu.dbHistorical') : t('mainMenu.dbCurrent');
  const hasSelectedDifferentDatabase = Boolean(selectedDatabaseId && selectedDatabaseId !== activeDatabaseId);

  // Timeline neighbours for the season carousel: previous (newer in the list) and
  // next (older) database options surrounding the browsed/selected season.
  const selectedDatabaseIndex = databaseOptions.findIndex(option => option.id === selectedDatabaseId);
  const prevDatabaseOption = selectedDatabaseIndex > 0 ? databaseOptions[selectedDatabaseIndex - 1] : null;
  const nextDatabaseOption = selectedDatabaseIndex >= 0 && selectedDatabaseIndex < databaseOptions.length - 1
    ? databaseOptions[selectedDatabaseIndex + 1]
    : null;
  // Second-tier neighbours — shown as faint, non-interactive "depth" hints that
  // peek in further while the wheel is being dragged. Null at the timeline edges
  // so we never render a bogus label.
  const seasonOptionAt = (offset) => {
    if (selectedDatabaseIndex < 0) return null;
    const idx = selectedDatabaseIndex + offset;
    return idx >= 0 && idx < databaseOptions.length ? databaseOptions[idx] : null;
  };
  const prev2DatabaseOption = seasonOptionAt(-2);
  const next2DatabaseOption = seasonOptionAt(2);
  const seasonSlotLabel = (option) => cleanDatabaseShortLabel(option?.shortLabel || formatDatabaseLabel(option));

  // Career state
  const [careerInfo, setCareerInfo] = useState({ hasActive: false, summary: null });
  const [showCareerPrompt, setShowCareerPrompt] = useState(false);
  const [loadingCareer, setLoadingCareer] = useState(false);
  // Contrarreloj state
  const [contrarrelojInfo, setContrarrelojInfo] = useState({ hasActive: false, summary: null });
  const [showContrarrelojPrompt, setShowContrarrelojPrompt] = useState(false);
  const [loadingContrarreloj, setLoadingContrarreloj] = useState(false);
  const [showEditionMode, setShowEditionMode] = useState(false);

  // ProManager state
  const [proManagerInfo, setProManagerInfo] = useState({ hasActive: false, summary: null });
  const [showProManagerPrompt, setShowProManagerPrompt] = useState(false);
  const [loadingProManager, setLoadingProManager] = useState(false);
  
  // Glory state
  const [gloryInfo, setGloryInfo] = useState({ hasActive: false, summary: null });
  const [showGloryPrompt, setShowGloryPrompt] = useState(false);
  const [loadingGlory, setLoadingGlory] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDatabaseOptions().then((options) => {
      if (cancelled) return;
      setDatabaseOptions(options);
      if (!options.some(option => option.id === activeDatabaseId)) {
        setActiveDatabaseId(CURRENT_DATABASE_ID);
        setSelectedDatabaseId(CURRENT_DATABASE_ID);
        setStoredActiveDatabaseId(CURRENT_DATABASE_ID);
      } else if (!options.some(option => option.id === selectedDatabaseId)) {
        setSelectedDatabaseId(activeDatabaseId);
      }
    });
    return () => { cancelled = true; };
  }, [activeDatabaseId, selectedDatabaseId]);

  const hasAnyActiveSave = () => {
    const uid = user?.uid && !user?.isGuest ? user.uid : null;
    const localCareerInfo = getLocalCareerInfo(uid ? { uid } : undefined);
    return Boolean(
      careerInfo.hasActive || localCareerInfo.hasActive || contrarrelojInfo.hasActive || proManagerInfo.hasActive || gloryInfo.hasActive || state.gameStarted
    );
  };

  const selectSeasonWheelDatabase = (nextId) => {
    if (!nextId || nextId === selectedDatabaseId) return;
    setSelectedDatabaseId(nextId);
  };

  const applySelectedDatabase = () => {
    if (!selectedDatabaseId || selectedDatabaseId === activeDatabaseId) return;
    if (hasAnyActiveSave()) {
      setPendingDatabaseId(selectedDatabaseId);
      return;
    }
    setActiveDatabaseId(selectedDatabaseId);
    setStoredActiveDatabaseId(selectedDatabaseId);
  };

  // Mouse wheel / trackpad over the season wheel steps one season per flick.
  // Throttled so a momentum scroll cannot skip across several seasons at once.
  const handleSeasonWheel = (event) => {
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;
    const target = delta > 0 ? nextDatabaseOption : prevDatabaseOption;
    if (!target) return;
    const now = Date.now();
    if (now - seasonWheelLockRef.current < 320) return;
    seasonWheelLockRef.current = now;
    selectSeasonWheelDatabase(target.id);
  };

  // ── Season wheel drag ──
  // Hold click (or touch) and drag horizontally to spin the dial. SEASON_DRAG_*
  // tune the feel: nothing happens until the pointer travels past the threshold
  // (so plain taps on the arrows/sides still register as clicks), then each
  // SEASON_STEP_DISTANCE px of travel advances one season. Dragging right reveals
  // the left (previous) season, like sliding a physical strip. The selection is
  // committed continuously while crossing thresholds, computed from the index
  // captured at press time so re-renders never desync the step maths.
  const SEASON_DRAG_THRESHOLD = 6;
  const SEASON_STEP_DISTANCE = 54;

  // The window pointermove/up listeners are bound once per drag, but their logic
  // depends on values that change mid-drag (activeDatabaseId, databaseOptions).
  // Route them through a ref kept pointing at the latest closures so a re-render
  // triggered by a step never strands the listener on stale state.
  const seasonHandlersRef = useRef({});

  const teardownSeasonDrag = () => {
    const st = seasonDragRef.current;
    if (st) {
      window.removeEventListener('pointermove', st.move);
      window.removeEventListener('pointerup', st.up);
      window.removeEventListener('pointercancel', st.up);
    }
    seasonDragRef.current = null;
  };

  const handleSeasonPointerMove = (event) => {
    const st = seasonDragRef.current;
    if (!st) return;
    const dx = event.clientX - st.startX;
    if (!st.active) {
      if (Math.abs(dx) < SEASON_DRAG_THRESHOLD) return;
      st.active = true;
      setSeasonDragging(true);
    }
    if (event.cancelable) event.preventDefault();
    const steps = Math.round(dx / SEASON_STEP_DISTANCE);
    if (steps !== st.appliedSteps) {
      const targetIndex = Math.max(0, Math.min(databaseOptions.length - 1, st.startIndex - steps));
      const target = databaseOptions[targetIndex];
      if (target && target.id !== selectedDatabaseId) selectSeasonWheelDatabase(target.id);
      st.appliedSteps = steps;
    }
    // Visual slide follows the finger but resets each crossed step, so the dial
    // feels tactile without drifting away from the centred season.
    const remainder = dx - steps * SEASON_STEP_DISTANCE;
    setSeasonDragOffset(Math.max(-SEASON_STEP_DISTANCE, Math.min(SEASON_STEP_DISTANCE, remainder)));
  };

  const handleSeasonPointerUp = () => {
    const st = seasonDragRef.current;
    // A drag that crossed the threshold must not also fire a click on whatever
    // arrow/side button the pointer happens to be released over.
    if (st?.active) seasonClickSuppressRef.current = true;
    teardownSeasonDrag();
    setSeasonDragging(false);
    setSeasonDragOffset(0);
  };

  // Keep the ref aimed at the freshest handlers every render.
  seasonHandlersRef.current.move = handleSeasonPointerMove;
  seasonHandlersRef.current.up = handleSeasonPointerUp;

  const handleSeasonPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    if (databaseOptions.length <= 1) return;
    const startIndex = databaseOptions.findIndex(option => option.id === selectedDatabaseId);
    if (startIndex < 0) return;
    teardownSeasonDrag();
    const move = (e) => seasonHandlersRef.current.move(e);
    const up = () => seasonHandlersRef.current.up();
    seasonDragRef.current = { startX: event.clientX, startIndex, active: false, appliedSteps: 0, move, up };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // Swallow the synthetic click that follows a real drag (and only that one).
  const handleSeasonClickCapture = (event) => {
    if (seasonClickSuppressRef.current) {
      seasonClickSuppressRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Safety net: drop any window listeners if we unmount mid-drag.
  useEffect(() => () => teardownSeasonDrag(), []);

  // Scroll a given mode card to the centre of the rail (one card per arrow tap
  // / dot click). Uses measured offsets so it works regardless of card width or
  // the desktop/mobile flex-basis.
  const scrollModeCardIntoView = (index) => {
    const track = modeTrackRef.current;
    if (!track) return;
    const clampedIndex = Math.max(0, Math.min(index, track.children.length - 1));
    const card = track.children[clampedIndex];
    if (!card) return;
    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    const left = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    setActiveCardIndex(clampedIndex);
    track.scrollTo({ left: Math.max(0, Math.min(maxScrollLeft, left)), behavior: 'smooth' });
  };

  // Position the rail so the currently-active card sits centred, WITHOUT changing
  // activeCardIndex. Used to re-anchor the visual scroll to the selected card when
  // the track DOM is (re)created — e.g. coming back from Editor/Auth, which remount
  // the whole menu at scrollLeft 0 while activeCardIndex still points at, say,
  // Contrarreloj. Defaults to a non-animated jump so there is no visible slide-in.
  const syncModeTrackToActiveCard = (behavior = 'auto') => {
    const track = modeTrackRef.current;
    if (!track) return;
    const index = Math.max(0, Math.min(activeCardIndexRef.current, track.children.length - 1));
    const card = track.children[index];
    if (!card) return;
    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    const left = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, Math.min(maxScrollLeft, left)), behavior });
  };

  const handleModeNavPointerDown = (event, direction) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    modeNavClickSuppressUntilRef.current = Date.now() + 700;
    scrollModeCardIntoView(activeCardIndex + direction);
  };

  const handleModeNavKeyboardClick = (event, direction) => {
    // Pointer/touch taps are handled on pointerdown because the edge overlay/card
    // composition can swallow mouseup/click on some mobile browsers. Keyboard
    // activation still arrives as a click with detail=0 and remains supported.
    event.preventDefault();
    event.stopPropagation();
    if (event.detail !== 0) return;
    scrollModeCardIntoView(activeCardIndex + direction);
  };

  const handleModeCardClick = (event, onClick, modeKey) => {
    if (Date.now() < modeNavClickSuppressUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Funnel entry point: which mode card the player chose. Allow-listed label,
    // no personal data.
    trackEvent('mode_select', { game_mode: gameModeLabel(modeKey), locked: Boolean(event.currentTarget?.classList?.contains('mode-card-full--locked')) });
    onClick?.(event);
  };

  // Derive the active card from the resting scroll position. Edge states are
  // explicit so desktop's "two cards + peek" layout still reports card 1 at the
  // hard-left start and the final card at max scroll, matching the arrows/dots.
  const handleModeTrackScroll = () => {
    if (modeScrollRafRef.current) return;
    modeScrollRafRef.current = requestAnimationFrame(() => {
      modeScrollRafRef.current = 0;
      const track = modeTrackRef.current;
      if (!track) return;
      const lastIndex = Math.max(0, track.children.length - 1);
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      let closest = 0;

      if (track.scrollLeft <= 2) {
        closest = 0;
      } else if (track.scrollLeft >= maxScrollLeft - 2) {
        closest = lastIndex;
      } else {
        const center = track.scrollLeft + track.clientWidth / 2;
        let min = Infinity;
        for (let i = 0; i < track.children.length; i += 1) {
          const child = track.children[i];
          const childCenter = child.offsetLeft + child.clientWidth / 2;
          const dist = Math.abs(childCenter - center);
          if (dist < min) { min = dist; closest = i; }
        }
      }

      setActiveCardIndex((prev) => (prev === closest ? prev : closest));
    });
  };

  // Keep the carousel's visual scroll position locked to activeCardIndex on mount
  // and every time we return from an early-return screen (Editor/Auth). Those
  // screens unmount the whole menu, so coming back remounts the track at scrollLeft
  // 0 while activeCardIndex still points at the previously selected card — without
  // this the dots/active classes say "Contrarreloj" while the rail shows "Carrera
  // Libre". We restore the selected card (not reset to 0). useLayoutEffect anchors
  // it before paint so there is no flash of the wrong card.
  useLayoutEffect(() => {
    if (showEditionMode || showAuth) return undefined;
    // First pass before paint; a second next-frame pass catches late layout (lazy
    // images / responsive flex-basis) so the centred offset is exact, then derives
    // the active dot from the settled scroll (centre snap-align can nudge it).
    syncModeTrackToActiveCard('auto');
    const id = requestAnimationFrame(() => {
      syncModeTrackToActiveCard('auto');
      handleModeTrackScroll();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditionMode, showAuth]);

  // Drop any in-flight scroll-derive rAF when the menu unmounts for good.
  useEffect(() => () => {
    if (modeScrollRafRef.current) cancelAnimationFrame(modeScrollRafRef.current);
  }, []);

  const confirmDatabaseChange = async () => {
    if (!pendingDatabaseId) return;
    setChangingDatabase(true);
    try {
      if (user?.uid) {
        await Promise.allSettled([
          deleteCareerSave(user.uid),
          deleteContrarrelojSave(user.uid),
          deleteProManagerSave(user.uid),
          deleteGlorySave(user.uid),
          deleteAllSaveSlots(user.uid),
        ]);
        deleteLocalCareer({ uid: user.uid });
        deleteLocalGlory({ uid: user.uid });
      }
      deleteLocalCareer();
      localStorage.removeItem('pcfutbol_pending_slot');
      dispatch({ type: 'RESET_GAME' });
      setCareerInfo({ hasActive: false, summary: null });
      setContrarrelojInfo({ hasActive: false, summary: null });
      setProManagerInfo({ hasActive: false, summary: null });
      setGloryInfo({ hasActive: false, summary: null });
      setActiveDatabaseId(pendingDatabaseId);
      setStoredActiveDatabaseId(pendingDatabaseId);
      setPendingDatabaseId(null);
    } finally {
      setChangingDatabase(false);
    }
  };

  // Detect active contrarreloj: check in-memory state first, then Firebase
  const isContrarrelojInMemory = state.gameStarted && state.gameMode === 'contrarreloj' && !state.contrarrelojData?.finished;

  useEffect(() => {
    // If contrarreloj is already in memory, use that info directly
    if (isContrarrelojInMemory) {
      setContrarrelojInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || t('common.unknownTeam'),
          teamId: state.teamId,
          leagueId: state.leagueId || state.playerLeagueId,
          season: state.contrarrelojData?.seasonsPlayed || 1,
          week: state.currentWeek || 1,
          money: state.money || 0,
          trophies: state.contrarrelojData?.trophies?.length || 0
        }
      });
      return;
    }

    // Otherwise check Firebase. Guest users are local-only and cannot read Firestore.
    if (isAuthenticated && user?.uid && !user?.isGuest) {
      hasActiveContrarreloj(user.uid)
        .then(info => setContrarrelojInfo(info))
        .catch(() => setContrarrelojInfo({ hasActive: false, summary: null }));
    } else {
      setContrarrelojInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, user?.isGuest, isContrarrelojInMemory]);

  // Detect active ProManager
  const isProManagerInMemory = state.gameStarted && state.gameMode === 'promanager' && !state.proManagerData?.finished;

  useEffect(() => {
    if (isProManagerInMemory) {
      setProManagerInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || 'Unknown',
          teamId: state.teamId,
          season: state.proManagerData?.seasonsManaged || 1,
          prestige: state.proManagerData?.prestige || 10,
        }
      });
      return;
    }
    if (isAuthenticated && user?.uid && !user?.isGuest) {
      hasActiveProManager(user.uid)
        .then(info => setProManagerInfo(info))
        .catch(() => setProManagerInfo({ hasActive: false, summary: null }));
    } else {
      setProManagerInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, user?.isGuest, isProManagerInMemory]);

  // Detect active Glory Mode
  const isGloryInMemory = state.gameStarted && state.gameMode === 'glory';

  useEffect(() => {
    if (isGloryInMemory) {
      setGloryInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || state.gloryData?.teamName || 'FC Gloria',
          season: state.gloryData?.season || 1,
          division: state.gloryData?.division || 'segundaRFEF',
          week: state.currentWeek || 1,
        }
      });
      return;
    }
    // Only a real authenticated user can read Firestore. Guests (DEV) and trial
    // visitors are local-only and must never trigger a cloud read. For Glory, the
    // on-device backup is also the critical refresh safety net, so prefer it when
    // the cloud doc is missing or older.
    if (isAuthenticated && user?.uid && !user?.isGuest) {
      Promise.all([
        getGlorySave(user.uid).catch(() => null),
        Promise.resolve(loadLocalGlory({ uid: user.uid }))
      ])
        .then(([cloudSave, local]) => {
          if (local?.state && (!cloudSave || shouldPreferLocalBackup(local, cloudSave))) {
            setGloryInfo(getLocalGloryInfo({ uid: user.uid }));
            return;
          }
          if (cloudSave) {
            setGloryInfo({
              hasActive: true,
              source: 'cloud',
              summary: {
                teamName: cloudSave.team?.name || cloudSave.gloryData?.teamName || 'FC Gloria',
                season: cloudSave.gloryData?.season || 1,
                division: cloudSave.gloryData?.division || 'segundaRFEF',
                week: cloudSave.currentWeek || 1,
                cards: (cloudSave.gloryData?.pickedCards || []).length,
                databaseSeasonId: cloudSave.databaseSeasonId || 'current',
              }
            });
            return;
          }
          setGloryInfo({ hasActive: false, summary: null });
        })
        .catch(() => setGloryInfo(getLocalGloryInfo({ uid: user.uid })));
    } else {
      setGloryInfo({ hasActive: false, summary: null });
    }
  }, [isAuthenticated, user?.uid, user?.isGuest, isGloryInMemory]);

  // Detect active Career
  const isCareerInMemory = state.gameStarted && (!state.gameMode || state.gameMode === 'career');

  useEffect(() => {
    if (isCareerInMemory) {
      setCareerInfo({
        hasActive: true,
        source: 'memory',
        summary: {
          teamName: state.team?.name || t('common.unknownTeam'),
          teamId: state.teamId,
          season: state.currentSeason || 1,
          week: state.currentWeek || 1,
          money: state.money || 0
        }
      });
      return;
    }
    // Only a real authenticated user can read Firestore. Guests (DEV) and trial
    // visitors are local-only and must never trigger a cloud read. For signed-in
    // users, fall back to the on-device backup if the cloud save is missing or
    // temporarily unreadable; otherwise a successful local backup would be invisible.
    if (isAuthenticated && user?.uid && !user?.isGuest) {
      hasActiveCareer(user.uid)
        .then(info => {
          if (info?.hasActive) {
            setCareerInfo(info);
            return;
          }
          setCareerInfo(getLocalCareerInfo({ uid: user.uid }));
        })
        .catch(() => setCareerInfo(getLocalCareerInfo({ uid: user.uid })));
    } else {
      // Trial / guest: surface a local (on-device) career save so a no-login game
      // can be resumed after a refresh instead of silently disappearing.
      setCareerInfo(getLocalCareerInfo());
    }
  }, [isAuthenticated, user?.uid, user?.isGuest, isCareerInMemory]);


  // Cerrar Auth cuando el usuario se autentique
  useEffect(() => {
    if (isAuthenticated && showAuth) {
      setShowAuth(false);
    }
  }, [isAuthenticated, showAuth]);
  
  const handlePlay = () => {
    if (!isAuthenticated) {
      // No-login trial: start a local Carrera session. No Firebase user, no UID,
      // no cloud read/write — the campaign is persisted to localStorage so it
      // survives refreshes; cloud sync is offered later via the in-game TrialBanner.
      startTrial();
      if (careerInfo.hasActive) {
        // A local trial save exists on this device — offer Continue vs New.
        setShowCareerPrompt(true);
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
      }
      return;
    }
    if (careerInfo.hasActive) {
      setShowCareerPrompt(true);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
    }
  };
  
  const handleCareerContinue = async () => {
    if (isCareerInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowCareerPrompt(false);
      return;
    }
    if (!user?.uid) {
      // Trial / guest: resume the locally-persisted campaign. Mark the trial session
      // so the in-game cloud-sync offer still appears — Continue may be reached
      // straight from the auto-shown prompt without going through handlePlay.
      startTrial();
      const loaded = loadLocalCareer();
      if (loaded?.state) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...loaded.state, gameMode: 'career', rankedMatchId: null } });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
      }
      setShowCareerPrompt(false);
      return;
    }
    setLoadingCareer(true);
    try {
      const saveData = await getCareerSave(user.uid);
      const local = loadLocalCareer({ uid: user.uid });
      // Cloud-first, but never silently discard a newer/pending on-device backup:
      // if the player advanced offline, the local copy is the real latest state.
      const loadLocalNow = () => {
        dispatch({ type: 'LOAD_SAVE', payload: { ...local.state, gameMode: 'career', rankedMatchId: null } });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      };
      if (saveData && (!local?.state || !shouldPreferLocalBackup(local, saveData))) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, gameMode: 'career', rankedMatchId: null } });
        const dn = getAuth().currentUser?.displayName;
        if (dn) dispatch({ type: 'SET_MANAGER_NAME', payload: dn });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      } else if (local?.state) {
        loadLocalNow();
      }
    } catch (err) {
      console.error('Error loading career save:', err);
      const local = loadLocalCareer({ uid: user.uid });
      if (local?.state) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...local.state, gameMode: 'career', rankedMatchId: null } });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    }
    setLoadingCareer(false);
    setShowCareerPrompt(false);
  };

  const handleCareerNew = () => {
    // A no-login player may reach this straight from the auto-shown prompt, so mark
    // the trial session here too (handlePlay isn't always the entry point now).
    if (!isAuthenticated) startTrial();
    // Navigate immediately, delete save in background
    if (user?.uid) {
      deleteCareerSave(user.uid).catch(err => console.error('Error deleting old career save:', err));
      deleteLocalCareer({ uid: user.uid });
    }
    deleteLocalCareer();
    if (isCareerInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setCareerInfo({ hasActive: false, summary: null });
    setShowCareerPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    dispatch({ type: 'RESET_GAME' });
    setLoggingOut(false);
  };

  // Contrarreloj handlers
  const handleContrarreloj = () => {
    if (!isAuthenticated) {
      openAuth('rankings');
      return;
    }
    if (contrarrelojInfo.hasActive) {
      setShowContrarrelojPrompt(true);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' });
    }
  };

  const handleContrarrelojContinue = async () => {
    // If already in memory, just go to office
    if (isContrarrelojInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowContrarrelojPrompt(false);
      return;
    }

    // Otherwise load from Firebase
    if (!user?.uid) return;
    setLoadingContrarreloj(true);
    try {
      const saveData = await getContrarrelojSave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _contrarrelojUserId: user.uid, gameMode: 'contrarreloj', rankedMatchId: null } });
        // Sync manager name from Firebase Auth
        const dn = getAuth().currentUser?.displayName;
        if (dn) dispatch({ type: 'SET_MANAGER_NAME', payload: dn });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading contrarreloj save:', err);
    }
    setLoadingContrarreloj(false);
    setShowContrarrelojPrompt(false);
  };

  // ProManager handlers
  const handleProManager = () => {
    if (!isAuthenticated) {
      openAuth('save-progress');
      return;
    }
    if (proManagerInfo.hasActive) {
      setShowProManagerPrompt(true);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'promanager_setup' });
    }
  };

  const handleProManagerContinue = async () => {
    if (isProManagerInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowProManagerPrompt(false);
      return;
    }
    if (!user?.uid) return;
    setLoadingProManager(true);
    try {
      const saveData = await getProManagerSave(user.uid);
      if (saveData) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _proManagerUserId: user.uid, gameMode: 'promanager', rankedMatchId: null } });
        // Sync manager name from Firebase Auth
        const dn2 = getAuth().currentUser?.displayName;
        if (dn2) dispatch({ type: 'SET_MANAGER_NAME', payload: dn2 });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    } catch (err) {
      console.error('Error loading ProManager save:', err);
    }
    setLoadingProManager(false);
    setShowProManagerPrompt(false);
  };

  const handleProManagerNew = () => {
    if (user?.uid) {
      deleteProManagerSave(user.uid).catch(() => {});
    }
    if (isProManagerInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setProManagerInfo({ hasActive: false, summary: null });
    setShowProManagerPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'promanager_setup' });
  };

  // Glory handlers
  const handleGlory = () => {
    if (!isAuthenticated) {
      openAuth('save-progress');
      return;
    }
    dispatch({ type: 'SET_SCREEN', payload: 'glory_menu' });
  };

  const handleGloryContinue = async () => {
    if (isGloryInMemory) {
      dispatch({ type: 'SET_SCREEN', payload: 'office' });
      setShowGloryPrompt(false);
      return;
    }
    if (!user?.uid) return;
    setLoadingGlory(true);
    try {
      const saveData = await getGlorySave(user.uid);
      const local = loadLocalGlory({ uid: user.uid });
      // Cloud-first, but never silently discard a newer/pending on-device backup:
      // if the player advanced and the cloud write was dropped on refresh, the local
      // copy is the real latest state.
      const loadLocalNow = () => {
        dispatch({ type: 'LOAD_SAVE', payload: { ...local.state, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      };
      if (saveData && (!local?.state || !shouldPreferLocalBackup(local, saveData))) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...saveData, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        const dn3 = getAuth().currentUser?.displayName;
        if (dn3) dispatch({ type: 'SET_MANAGER_NAME', payload: dn3 });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      } else if (local?.state) {
        loadLocalNow();
      }
    } catch (err) {
      console.error('Error loading Glory save:', err);
      const local = loadLocalGlory({ uid: user.uid });
      if (local?.state) {
        dispatch({ type: 'LOAD_SAVE', payload: { ...local.state, _gloryUserId: user.uid, gameMode: 'glory', rankedMatchId: null } });
        dispatch({ type: 'SET_SCREEN', payload: 'office' });
      }
    }
    setLoadingGlory(false);
    setShowGloryPrompt(false);
  };

  const handleGloryNew = () => {
    if (user?.uid) {
      deleteGlorySave(user.uid).catch(() => {});
      deleteLocalGlory({ uid: user.uid });
    }
    if (isGloryInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setGloryInfo({ hasActive: false, summary: null });
    setShowGloryPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'glory_setup' });
  };

  const handleContrarrelojNew = () => {
    if (user?.uid && !user?.isGuest) {
      deleteContrarrelojSave(user.uid).catch(() => {});
    }
    if (isContrarrelojInMemory) {
      dispatch({ type: 'RESET_GAME' });
    }
    setContrarrelojInfo({ hasActive: false, summary: null });
    setShowContrarrelojPrompt(false);
    dispatch({ type: 'SET_SCREEN', payload: 'contrarreloj_setup' });
  };
  
  if (showEditionMode) {
    return (
      <EditionMode 
        onBack={() => setShowEditionMode(false)}
        onEditionApplied={() => {
          // EditionMode already handles save deletion
          // Force full page reload to re-fetch data with new names
          window.location.reload();
        }}
      />
    );
  }

  /* Settings rendered as overlay below, not early return */

  if (showAuth) {
    return <Auth intent={authIntent} onBack={() => setShowAuth(false)} />;
  }

  /* SaveSlots removed — career uses single save like other modes */

  // Full-art game-mode cards (ChatGPT Image 2.0 / gpt-image-2-high backgrounds).
  // Carrera Libre is always playable (trial for guests); login-only modes show a
  // locked state for guests and route through the existing contextual Auth handlers.
  const modeCardBase = `${import.meta.env.BASE_URL}images/mode-cards/`;
  const isWorldCupDraftAllowed = (() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host.includes('pcgaffer-preprod.web.app') || host === 'localhost' || host === '127.0.0.1';
  })();
  const modeCards = [
    {
      key: 'career',
      image: `${modeCardBase}free-career.png`,
      accent: '#00f5a0',
      accentRgb: '0, 245, 160',
      featured: true,
      modeLabel: t('mainMenu.modeLabel', 'Modo de juego'),
      title: t('mainMenu.playButton', 'Carrera Libre'),
      subtitle: careerInfo.hasActive
        ? `${careerInfo.summary?.teamName} · ${t('common.season')} ${careerInfo.summary?.season}`
        : t('mainMenu.freeCareerIntro', 'Elige cualquier equipo, sin limites.'),
      badges: [
        { icon: User, label: t('mainMenu.chipSolo', '1 jugador') },
        { icon: Timer, label: t('mainMenu.chipLongTerm', 'Largo plazo') },
        { icon: Globe, label: t('mainMenu.chipAllLeagues', 'Todas las ligas') },
      ],
      infoRows: [
        { icon: Gamepad2, title: t('mainMenu.freeCareerInfoFreedomTitle', 'Total libertad'), description: t('mainMenu.freeCareerInfoFreedomDesc', 'Elige cualquier club y temporada.') },
        { icon: Lightbulb, title: t('mainMenu.freeCareerInfoProjectTitle', 'Proyecto a tu manera'), description: t('mainMenu.freeCareerInfoProjectDesc', 'Fichajes, tactica, cantera y finanzas.') },
        { icon: Trophy, title: t('mainMenu.freeCareerInfoStoryTitle', 'Escribe tu historia'), description: t('mainMenu.freeCareerInfoStoryDesc', 'Cada temporada cuenta.') },
      ],
      cta: isAuthenticated ? t('mainMenu.cardPlay') : t('mainMenu.playNow'),
      onClick: handlePlay,
    },
    {
      key: 'contrarreloj',
      image: `${modeCardBase}time-trial.png`,
      accent: '#fbbf24',
      accentRgb: '251, 191, 36',
      modeLabel: t('mainMenu.modeLabel', 'Modo de juego'),
      title: t('mainMenu.contrarreloj'),
      subtitle: isAuthenticated
        ? (contrarrelojInfo.hasActive ? contrarrelojInfo.summary?.teamName : t('mainMenu.reachChampions'))
        : t('mainMenu.lockedLoginRequired'),
      badges: [
        { icon: User, label: t('mainMenu.chipSolo', '1 jugador') },
        { icon: Timer, label: t('mainMenu.chipBestTime', 'Mejor tiempo') },
        { icon: Trophy, label: t('mainMenu.chipGlobalRanking', 'Ranking global') },
      ],
      infoRows: [
        { icon: Timer, title: t('mainMenu.timeTrialInfoAttemptTitle', 'Nuevo intento'), description: t('mainMenu.timeTrialInfoAttemptDesc', 'Completa una carrera rapida.') },
        { icon: Mountain, title: t('mainMenu.timeTrialInfoChallengesTitle', 'Desafios de tiempo'), description: t('mainMenu.timeTrialInfoChallengesDesc', 'Supera objetivos de temporada.') },
        { icon: Trophy, title: t('mainMenu.timeTrialInfoRecordsTitle', 'Records y ranking'), description: t('mainMenu.timeTrialInfoRecordsDesc', 'Compite contra tus marcas y la tabla global.') },
      ],
      cta: isAuthenticated ? t('mainMenu.cardPlay') : t('mainMenu.cardUnlock'),
      onClick: handleContrarreloj,
      locked: !isAuthenticated,
    },
    {
      key: 'promanager',
      image: `${modeCardBase}pro-manager.png`,
      accent: '#22c55e',
      accentRgb: '34, 197, 94',
      modeLabel: t('mainMenu.modeLabel', 'Modo de juego'),
      title: t('proManager.title'),
      subtitle: isAuthenticated
        ? (proManagerInfo.hasActive ? proManagerInfo.summary?.teamName : t('proManager.menuSubtitle'))
        : t('mainMenu.lockedLoginRequired'),
      badges: [
        { icon: Briefcase, label: t('mainMenu.chipJobOffers', 'Ofertas') },
        { icon: Timer, label: t('mainMenu.chipLongTerm', 'Largo plazo') },
        { icon: Trophy, label: t('mainMenu.chipReputation', 'Reputacion') },
      ],
      infoRows: [
        { icon: Briefcase, title: t('mainMenu.proManagerInfoOffersTitle', 'Acepta ofertas'), description: t('mainMenu.proManagerInfoOffersDesc', 'Empieza donde te contraten.') },
        { icon: Save, title: t('mainMenu.proManagerInfoObjectivesTitle', 'Cumple objetivos'), description: t('mainMenu.proManagerInfoObjectivesDesc', 'Gana confianza o te cesan.') },
        { icon: Trophy, title: t('mainMenu.proManagerInfoCareerTitle', 'Escala tu carrera'), description: t('mainMenu.proManagerInfoCareerDesc', 'Cambia a clubes mejores.') },
      ],
      cta: isAuthenticated ? t('mainMenu.cardPlay') : t('mainMenu.cardUnlock'),
      onClick: handleProManager,
      locked: !isAuthenticated,
    },
    {
      key: 'glory',
      image: `${modeCardBase}road-to-glory.png`,
      accent: '#ffd740',
      accentRgb: '255, 215, 64',
      modeLabel: t('mainMenu.modeLabel', 'Modo de juego'),
      title: t('mainMenu.glory'),
      subtitle: isAuthenticated
        ? (gloryInfo.hasActive ? gloryInfo.summary?.teamName : t('mainMenu.gloryDesc'))
        : t('mainMenu.lockedLoginRequired'),
      badges: [
        { icon: Trophy, label: t('mainMenu.chipPromotions', 'Ascensos') },
        { icon: Mountain, label: t('mainMenu.chipLongChallenge', 'Reto largo') },
        { icon: Package, label: t('mainMenu.chipHumbleClub', 'Club humilde') },
      ],
      infoRows: [
        { icon: Mountain, title: t('mainMenu.gloryInfoBottomTitle', 'Desde abajo'), description: t('mainMenu.gloryInfoBottomDesc', 'Arranca con equipos modestos.') },
        { icon: Trophy, title: t('mainMenu.gloryInfoPromotionsTitle', 'Sube divisiones'), description: t('mainMenu.gloryInfoPromotionsDesc', 'Persigue ascensos reales.') },
        { icon: Lightbulb, title: t('mainMenu.gloryInfoLegacyTitle', 'Construye legado'), description: t('mainMenu.gloryInfoLegacyDesc', 'Convierte un pequeno en gigante.') },
      ],
      cta: isAuthenticated ? t('mainMenu.cardPlay') : t('mainMenu.cardUnlock'),
      onClick: handleGlory,
      locked: !isAuthenticated,
    },
    {
      key: 'worldcup_draft',
      image: `${modeCardBase}world-cup.png`,
      accent: '#14b8a6',
      accentRgb: '20, 184, 166',
      modeLabel: t('mainMenu.modeLabel', 'Modo de juego'),
      title: 'Mundial Draft',
      subtitle: 'Draftea leyendas y juega un Mundial completo: grupos y eliminatorias.',
      badges: [
        { icon: Globe, label: 'Mundial completo' },
        { icon: Trophy, label: 'Leyendas draft' },
        { icon: Timer, label: 'Grupos + cruces' },
      ],
      infoRows: [
        { icon: Trophy, title: 'Draft de leyendas', description: 'Construye un XI con jugadores históricos de todos los Mundiales.' },
        { icon: Globe, title: 'Fase de grupos', description: 'Tres partidos para clasificar antes de los cruces.' },
        { icon: Timer, title: 'Eliminatorias', description: 'Octavos, cuartos, semifinal y final por la copa.' },
      ],
      cta: t('mainMenu.cardPlay'),
      onClick: () => dispatch({ type: 'SET_SCREEN', payload: 'worldcup_draft' }),
    },
    {
      key: 'worldcup',
      image: `${modeCardBase}world-cup.png`,
      accent: '#14b8a6',
      accentRgb: '20, 184, 166',
      modeLabel: t('mainMenu.modeLabel', 'Modo de juego'),
      title: 'Mundial Libre',
      subtitle: t('mainMenu.soon'),
      badges: [
        { icon: Globe, label: t('mainMenu.chipSoon', 'Proximamente') },
        { icon: Trophy, label: t('mainMenu.chipTournament', 'Torneo') },
      ],
      infoRows: [
        { icon: Globe, title: t('mainMenu.worldCupInfoTitle', 'Copa mundial'), description: t('mainMenu.worldCupInfoDesc', 'Modo internacional en preparacion.') },
        { icon: Trophy, title: t('mainMenu.worldCupInfoTournamentTitle', 'Fase final'), description: t('mainMenu.worldCupInfoTournamentDesc', 'Grupos, cruces y gloria global.') },
        { icon: Lock, title: t('mainMenu.worldCupInfoSoonTitle', 'Bloqueado'), description: t('mainMenu.worldCupInfoSoonDesc', 'Llegara en una proxima version.') },
      ],
      cta: t('mainMenu.soon'),
      disabled: true,
    },
  ];

  // The carousel only shows modes the player can actually act on. Disabled /
  // coming-soon modes (e.g. World Cup) are dropped from the rail, the dots and
  // the arrow bounds so an unavailable mode never appears as a dead disabled
  // button. Locked-but-actionable modes (login required) stay — they're needed
  // to explain that signing in unlocks them and they open the Auth flow.
  const visibleModeCards = modeCards.filter(card => !card.disabled && (card.key !== 'worldcup_draft' || isWorldCupDraftAllowed));

  return (
    <div className={`main-menu ${animateIn ? 'animate-in' : ''}`}>
      <div className="main-menu__background">
        <div className="main-menu__gradient"></div>
        <div className="main-menu__pattern"></div>
        <div className="main-menu__glow"></div>
        <div className="main-menu__particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`particle particle--${i}`} />
          ))}
        </div>
      </div>
      
      {/* User status — logged in (outside content for proper absolute positioning) */}
      {isAuthenticated && (
        <div className="main-menu__user">
          <div className="main-menu__user-avatar">
            <User size={14} />
          </div>
          <span className="main-menu__user-name">
            {user?.displayName || user?.email?.split('@')[0]}
          </span>
          <button 
            className="main-menu__user-logout" 
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={13} />
            <span>{loggingOut ? t('mainMenu.loggingOut') : t('mainMenu.logout')}</span>
          </button>
        </div>
      )}

      <div className="main-menu__content">
        <div className="main-menu__hero">
          <div className="main-menu__ball">
            <div className="main-menu__ball-inner">
              {isLightTheme
                ? <span className="hero-ball" role="img" aria-label={t('mainMenu.ballAlt')}>⚽</span>
                : <img className="hero-ball-img" src={`${import.meta.env.BASE_URL}ball.jpg`} alt={t('mainMenu.ballAlt')} />
              }
            </div>
          </div>
          <h1 className="main-menu__title">
            <span className="pc">P C</span>
            <span className="futbol">{t('mainMenu.title').split(' ')[1] || 'GAFFER'}</span>
          </h1>
          {/* Subtitle and season removed — clean hero */}
        </div>
        
        <nav className="main-menu__nav">
          {/* ── Season wheel (rueca) — sits directly above the mode carousel ── */}
          {/* A game-UI dial, not a dropdown: a glowing central season flanked by */}
          {/* faded neighbours, a ruler of ticks, and wheel/arrow/tap stepping.   */}
          <div
            className="main-menu__season-wheel"
            data-main-menu-season-carousel
            data-main-menu-season-wheel
            onWheel={handleSeasonWheel}
          >
            <span className="season-wheel__eyebrow">{t('mainMenu.changeSeason')}</span>

            <div
              className={`season-wheel__viewport${seasonDragging ? ' is-dragging' : ''}`}
              onPointerDown={handleSeasonPointerDown}
              onClickCapture={handleSeasonClickCapture}
            >
              <span className="season-wheel__top-glow" aria-hidden="true" />
              <span className="season-wheel__lane" aria-hidden="true" />
              <span className="season-wheel__sweep" aria-hidden="true" />

              <button
                type="button"
                className="season-wheel__arrow season-wheel__arrow--prev"
                onClick={() => prevDatabaseOption && selectSeasonWheelDatabase(prevDatabaseOption.id)}
                disabled={!prevDatabaseOption}
                aria-label={t('mainMenu.changeDatabaseAria')}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <div
                className="season-wheel__stage"
                style={{ transform: `translate3d(${seasonDragOffset}px, 0, 0)` }}
              >
                {prev2DatabaseOption && (
                  <span className="season-wheel__ghost season-wheel__ghost--prev" aria-hidden="true">
                    {seasonSlotLabel(prev2DatabaseOption)}
                  </span>
                )}

                <button
                  type="button"
                  className="season-wheel__side season-wheel__side--prev"
                  onClick={() => prevDatabaseOption && selectSeasonWheelDatabase(prevDatabaseOption.id)}
                  disabled={!prevDatabaseOption}
                  tabIndex={prevDatabaseOption ? 0 : -1}
                  aria-label={prevDatabaseOption ? seasonSlotLabel(prevDatabaseOption) : undefined}
                  aria-hidden={!prevDatabaseOption}
                >
                  {prevDatabaseOption ? seasonSlotLabel(prevDatabaseOption) : ''}
                </button>

                <div className="season-wheel__center" aria-current="true" aria-live="polite">
                  {/* Keyed on the active label so each season change remounts the node
                      and replays the brief settle/entrance animation (see SCSS). */}
                  <span className="season-wheel__year" key={selectedDatabaseShortLabel}>{selectedDatabaseShortLabel}</span>
                  <span className="season-wheel__type">{selectedDatabaseType}</span>
                </div>

                <button
                  type="button"
                  className="season-wheel__side season-wheel__side--next"
                  onClick={() => nextDatabaseOption && selectSeasonWheelDatabase(nextDatabaseOption.id)}
                  disabled={!nextDatabaseOption}
                  tabIndex={nextDatabaseOption ? 0 : -1}
                  aria-label={nextDatabaseOption ? seasonSlotLabel(nextDatabaseOption) : undefined}
                  aria-hidden={!nextDatabaseOption}
                >
                  {nextDatabaseOption ? seasonSlotLabel(nextDatabaseOption) : ''}
                </button>

                {next2DatabaseOption && (
                  <span className="season-wheel__ghost season-wheel__ghost--next" aria-hidden="true">
                    {seasonSlotLabel(next2DatabaseOption)}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="season-wheel__arrow season-wheel__arrow--next"
                onClick={() => nextDatabaseOption && selectSeasonWheelDatabase(nextDatabaseOption.id)}
                disabled={!nextDatabaseOption}
                aria-label={t('mainMenu.changeDatabaseAria')}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>

              <div className="season-wheel__ticks" aria-hidden="true">
                {[...Array(33)].map((_, i) => (
                  <span
                    key={i}
                    className={`season-wheel__tick${i % 4 === 0 ? ' season-wheel__tick--major' : ''}${i === 16 ? ' season-wheel__tick--center' : ''}`}
                  />
                ))}
              </div>
            </div>

            {hasSelectedDifferentDatabase && (
              <button
                type="button"
                className="season-wheel__apply"
                data-main-menu-season-apply
                onClick={applySelectedDatabase}
              >
                <Globe size={14} aria-hidden="true" />
                <span>{t('mainMenu.applySeason', 'Apply season')}</span>
              </button>
            )}
          </div>

          {/* ── Game-mode cards carousel ── */}
          <div className="main-menu__mode-carousel" data-main-menu-mode-carousel>
            <div className="mode-carousel__viewport">
              <button
                type="button"
                data-mode-carousel-prev
                className="mode-carousel__nav mode-carousel__nav--prev"
                onPointerDown={(event) => handleModeNavPointerDown(event, -1)}
                onClick={(event) => handleModeNavKeyboardClick(event, -1)}
                disabled={activeCardIndex <= 0}
                aria-label={t('common.previous')}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>

              <div
                className="mode-carousel__track"
                ref={modeTrackRef}
                onScroll={handleModeTrackScroll}
              >
              {visibleModeCards.map((card, i) => {
                // Position relative to the centred card drives the 3D recede:
                // the active card sits forward, neighbours rotate/recede along Z.
                const rel = i - activeCardIndex;
                const posClass = rel === 0
                  ? ' mode-card-full--active'
                  : rel < 0
                    ? ' mode-card-full--side mode-card-full--side-left'
                    : ' mode-card-full--side mode-card-full--side-right';
                return (
                <button
                  key={card.key}
                  type="button"
                  data-mode={card.key}
                  data-card-position={rel === 0 ? 'active' : rel < 0 ? 'left' : 'right'}
                  className={`mode-card-full${posClass}${card.featured ? ' mode-card-full--hero' : ''}${card.locked ? ' mode-card-full--locked' : ''}${card.disabled ? ' mode-card-full--disabled' : ''}`}
                  style={{ '--card-accent': card.accent, '--card-accent-rgb': card.accentRgb }}
                  onClick={(event) => handleModeCardClick(event, card.onClick, card.key)}
                  disabled={card.disabled}
                  title={card.disabled ? t('mainMenu.soon') : undefined}
                >
                  <span className="mode-card-full__media" aria-hidden="true">
                    <img src={card.image} alt="" loading="lazy" />
                    <span className="mode-card-full__scrim" />
                  </span>
                  <span className="mode-card-full__body">
                    <span className="mode-card-full__eyebrow">
                      <Gamepad2 size={13} aria-hidden="true" />
                      <span>{card.modeLabel}</span>
                    </span>
                    <span className="mode-card-full__headline">
                      <span className="mode-card-full__title">{card.title}</span>
                      <span className="mode-card-full__subtitle">{card.subtitle}</span>
                    </span>
                    {card.badges?.length > 0 && (
                      <span className="mode-card-full__badges">
                        {card.badges.map((badge, i) => {
                          const BadgeIcon = badge.icon;
                          return (
                            <span key={i} className="mode-card-full__badge-pill">
                              <BadgeIcon size={14} aria-hidden="true" />
                              <span>{badge.label}</span>
                            </span>
                          );
                        })}
                      </span>
                    )}
                    {card.infoRows?.length > 0 && (
                      <span className="mode-card-full__info-panel">
                        {card.infoRows.map((row, i) => {
                          const RowIcon = row.icon;
                          return (
                            <span key={i} className="mode-card-full__info-row">
                              <span className="mode-card-full__info-icon">
                                <RowIcon size={20} aria-hidden="true" />
                              </span>
                              <span className="mode-card-full__info-copy">
                                <span className="mode-card-full__info-title">{row.title}</span>
                                <span className="mode-card-full__info-desc">{row.description}</span>
                              </span>
                              <ChevronRight size={17} className="mode-card-full__info-chevron" aria-hidden="true" />
                            </span>
                          );
                        })}
                      </span>
                    )}
                    <span className="mode-card-full__cta">
                      {card.locked && <Lock size={15} aria-hidden="true" />}
                      <span>{card.cta}</span>
                      {!card.locked && !card.disabled && (
                        <ChevronRight size={17} className="mode-card-full__cta-arrow" aria-hidden="true" />
                      )}
                    </span>
                  </span>
                  {card.locked && (
                    <span className="mode-card-full__badge" aria-hidden="true"><Lock size={13} /></span>
                  )}
                  {card.disabled && (
                    <span className="mode-card-full__badge mode-card-full__badge--soon" aria-hidden="true">{t('mainMenu.soon')}</span>
                  )}
                </button>
                );
              })}
              </div>

              <button
                type="button"
                data-mode-carousel-next
                className="mode-carousel__nav mode-carousel__nav--next"
                onPointerDown={(event) => handleModeNavPointerDown(event, 1)}
                onClick={(event) => handleModeNavKeyboardClick(event, 1)}
                disabled={activeCardIndex >= visibleModeCards.length - 1}
                aria-label={t('common.next')}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Pagination pills (under the card): active card = neon pill, others dim dots. */}
            <div className="mode-carousel__dots">
              {visibleModeCards.map((card, i) => (
                <button
                  key={card.key}
                  type="button"
                  data-mode-carousel-dot
                  className={`mode-carousel__dot${i === activeCardIndex ? ' is-active' : ''}`}
                  style={{ '--card-accent': card.accent, '--card-accent-rgb': card.accentRgb }}
                  onClick={() => scrollModeCardIntoView(i)}
                  aria-label={card.title}
                  aria-current={i === activeCardIndex ? 'true' : undefined}
                />
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <button
              className="main-menu__btn main-menu__btn--login-secondary"
              onClick={() => openAuth('generic')}
              disabled={authLoading}
            >
              <span className="icon-wrapper"><LogIn size={18} /></span>
              <span className="label">{t('mainMenu.loginCreateAccount')}</span>
            </button>
          )}

          <div className="main-menu__secondary">
            <button
              className={`main-menu__btn main-menu__btn--icon${isAuthenticated ? '' : ' is-locked'}`}
              onClick={() => isAuthenticated
                ? dispatch({ type: 'SET_SCREEN', payload: 'ranking' })
                : openAuth('rankings')}
              title={t('mainMenu.recordsButton')}
              aria-label={t('mainMenu.recordsButton')}
            >
              {isAuthenticated
                ? <Trophy size={18} className="icon-svg" />
                : <Lock size={18} className="icon-svg" />}
              <span className="main-menu__secondary-label">{t('mainMenu.recordsButton')}</span>
            </button>

            <button
              className="main-menu__btn main-menu__btn--icon"
              onClick={() => setShowSettings(true)}
              title={t('mainMenu.optionsButton')}
              aria-label={t('mainMenu.optionsButton')}
            >
              <SettingsIcon size={18} className="icon-svg" />
              <span className="main-menu__secondary-label">{t('mainMenu.optionsButton')}</span>
            </button>

            <button
              className={`main-menu__btn main-menu__btn--icon${isAuthenticated ? '' : ' is-locked'}`}
              onClick={() => isAuthenticated
                ? setShowEditionMode(true)
                : openAuth('edition-mode')}
              title={t('mainMenu.editionButton')}
              aria-label={t('mainMenu.editionButton')}
            >
              {isAuthenticated
                ? <Package size={18} className="icon-svg" />
                : <Lock size={18} className="icon-svg" />}
              <span className="main-menu__secondary-label">{t('mainMenu.editionButton')}</span>
            </button>
          </div>
        </nav>

        {/* Career prompt: Continuar / Nueva partida */}
        {pendingDatabaseId && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setPendingDatabaseId(null)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Globe size={24} />
                <h3>{t('mainMenu.changeDatabaseTitle')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name season-change-summary">
                  <span>{activeDatabaseShortLabel}</span>
                  <span aria-hidden="true">→</span>
                  <span>{cleanDatabaseShortLabel(pendingDatabaseOption?.shortLabel || formatDatabaseLabel(pendingDatabaseOption || pendingDatabaseId))}</span>
                </p>
                <p className="details">
                  {t('mainMenu.changeDatabaseConfirmWarning', 'If you change season, your current saved games will be lost. Are you sure?')}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button className="btn-new" onClick={() => setPendingDatabaseId(null)} disabled={changingDatabase}>{t('common.cancel')}</button>
                <button className="btn-continue" onClick={confirmDatabaseChange} disabled={changingDatabase}>
                  {changingDatabase ? t('mainMenu.changing') : t('mainMenu.changeSeasonAndDelete', 'Change season and delete saves')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Career prompt: Continuar / Nueva partida */}
        {showCareerPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowCareerPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Gamepad2 size={24} />
                <h3>{t('mainMenu.careerActive')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{careerInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {careerInfo.summary?.season} · 
                  {t('common.week')} {careerInfo.summary?.week}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button 
                  className="btn-continue" 
                  onClick={handleCareerContinue}
                  disabled={loadingCareer}
                >
                  <Play size={18} />
                  {loadingCareer ? t('common.loading') : t('common.continue')}
                </button>
                <button 
                  className="btn-new" 
                  onClick={handleCareerNew}
                >
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {/* Contrarreloj prompt: Continuar / Nueva partida */}
        {showContrarrelojPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowContrarrelojPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Timer size={24} />
                <h3>{t('mainMenu.contrarrelojActive')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{contrarrelojInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {contrarrelojInfo.summary?.season} · 
                  {t('common.week')} {contrarrelojInfo.summary?.week}
                  {contrarrelojInfo.summary?.trophies > 0 && ` · 🏆 ${contrarrelojInfo.summary.trophies}`}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button 
                  className="btn-continue" 
                  onClick={handleContrarrelojContinue}
                  disabled={loadingContrarreloj}
                >
                  <Play size={18} />
                  {loadingContrarreloj ? t('common.loading') : t('common.continue')}
                </button>
                <button 
                  className="btn-new" 
                  onClick={handleContrarrelojNew}
                >
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {/* ProManager prompt */}
        {showProManagerPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowProManagerPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Briefcase size={24} />
                <h3>{t('proManager.activeCareer')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{proManagerInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {proManagerInfo.summary?.season}
                  {proManagerInfo.summary?.prestige != null && ` · ⭐ ${proManagerInfo.summary.prestige}`}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button
                  className="btn-continue"
                  onClick={handleProManagerContinue}
                  disabled={loadingProManager}
                >
                  <Play size={18} />
                  {loadingProManager ? t('common.loading') : t('common.continue')}
                </button>
                <button className="btn-new" onClick={handleProManagerNew}>
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {showGloryPrompt && (
          <div className="main-menu__contrarreloj-prompt">
            <div className="contrarreloj-prompt__overlay" onClick={() => setShowGloryPrompt(false)} />
            <div className="contrarreloj-prompt__card">
              <div className="contrarreloj-prompt__header">
                <Mountain size={24} />
                <h3>{t('mainMenu.gloryActive')}</h3>
              </div>
              <div className="contrarreloj-prompt__info">
                <p className="team-name">{gloryInfo.summary?.teamName}</p>
                <p className="details">
                  {t('common.season')} {gloryInfo.summary?.season || 1} · {t('mainMenu.matchday')} {gloryInfo.summary?.week || 1}
                </p>
              </div>
              <div className="contrarreloj-prompt__actions">
                <button
                  className="btn-continue"
                  onClick={handleGloryContinue}
                  disabled={loadingGlory}
                >
                  <Play size={18} />
                  {loadingGlory ? t('common.loading') : t('common.continue')}
                </button>
                <button className="btn-new" onClick={handleGloryNew}>
                  {t('mainMenu.newGame')}
                </button>
              </div>
              <p className="contrarreloj-prompt__warning">
                {t('mainMenu.deleteWarning')}
              </p>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="main-menu__guest-notice">
            <Lightbulb size={14} className="notice-icon" />
            <p>{t('mainMenu.guestNotice')}</p>
          </div>
        )}
        
        <footer className="main-menu__footer">
          <p>{t('mainMenu.tribute')}</p>
          <a
            href="mailto:jirubalusus@gmail.com"
            className="main-menu__footer-link main-menu__footer-link--feedback"
          >
            <Mail size={14} aria-hidden="true" />
            <span>{t('mainMenu.feedbackContact', 'Feedback and suggestions: jirubalusus@gmail.com')}</span>
          </a>
          <a 
            href="https://buymeacoffee.com/jirubalusus" 
            target="_blank" 
            rel="noopener noreferrer"
            className="main-menu__footer-link main-menu__footer-link--support"
          >
            <Coffee size={14} aria-hidden="true" />
            <span>{t('mainMenu.supportUs', 'Support the project')}</span>
          </a>
        </footer>
      </div>

      {showSettings && (
        <div className="main-menu__settings-wrapper">
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}

    </div>
  );
}
