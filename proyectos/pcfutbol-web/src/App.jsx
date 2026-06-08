import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Office from './components/Office/Office';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataProvider';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationCenter from './components/Notifications/NotificationCenter';
import MainMenu from './components/MainMenu/MainMenu';
import Auth from './components/Auth/Auth';
import TrialBanner from './components/TrialBanner/TrialBanner';
import NicknameModal from './components/NicknameModal/NicknameModal';
import PageLoader from './components/common/PageLoader';
import { useAudioManager } from './hooks/useAudioManager';
import { useSoundEffects } from './hooks/useSoundEffects';
import { checkPremiumStatus } from './services/purchaseService';
import i18n from './i18n';
import {
  initAnalytics,
  trackEvent,
  trackScreenView,
  trackClick,
  setAnalyticsUserProperties,
  setAnalyticsUserId,
  trackAuthState,
  trackSessionHeartbeat,
  gameModeLabel,
  sanitizeLabel,
} from './firebase/analytics';

const TeamSelection = lazy(() => import('./components/TeamSelection/TeamSelection'));
const CityMode = lazy(() => import('./components/City3D/CityMode'));
const ContrarrelojSetup = lazy(() => import('./components/ContrarrelojSetup/ContrarrelojSetup'));
const ContrarrelojEnd = lazy(() => import('./components/ContrarrelojEnd/ContrarrelojEnd'));
const Ranking = lazy(() => import('./components/Ranking/Ranking'));
const RankedLobby = lazy(() => import('./components/Ranked/RankedLobby'));
const RankedMatch = lazy(() => import('./components/Ranked/RankedMatch'));
const DraftMatch = lazy(() => import('./components/Ranked/DraftMatch'));
const RankedLeaderboard = lazy(() => import('./components/Ranked/RankedLeaderboard'));
const ProManagerSetup = lazy(() => import('./components/ProManager/ProManagerSetup'));
const ProManagerSeasonEnd = lazy(() => import('./components/ProManager/ProManagerSeasonEnd'));
const GlorySetup = lazy(() => import('./components/GloryMode/GlorySetup'));
const GloryMenu = lazy(() => import('./components/GloryMode/GloryMenu'));
const WorldCup = lazy(() => import('./components/WorldCup/WorldCup'));
const WorldCupDraft = lazy(() => import('./components/WorldCupDraft/WorldCupDraft'));
const isWorldCupDraftAllowed = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('pcgaffer-preprod.web.app') || host === 'localhost' || host === '127.0.0.1';
};
import './index.css';
import './styles/_effects.scss';
import './styles/_laptop-responsive.scss';
import './styles/_unified-screen.scss';

// Groups the many shell screens into a handful of analytics "areas" so reports
// stay readable. Purely derived from the screen id — no personal data.
function appAreaFor(screen) {
  if (screen === 'match') return 'match';
  if (screen === 'main_menu') return 'menu';
  if (screen === 'office' || screen === 'team_selection') return 'career';
  if (screen.startsWith('contrarreloj')) return 'contrarreloj';
  if (screen.startsWith('ranked')) return 'ranked';
  if (screen.startsWith('promanager')) return 'promanager';
  if (screen.startsWith('glory')) return 'glory';
  if (screen.startsWith('worldcup_draft')) return 'worldcup_draft';
  if (screen.startsWith('worldcup')) return 'worldcup';
  if (screen === 'ranking') return 'rankings';
  return 'other';
}

function GameRouter() {
  const { state, dispatch } = useGame();
  const { user, loading: authLoading, needsNickname, setNickname, isAuthenticated, isEmailVerified, isTrial, isGuest, isPlayGames } = useAuth();

  // Trial → Auth: the in-game TrialBanner opens the contextual login flow here at
  // shell level so the in-memory trial game survives (no RESET_GAME). Once the
  // user signs in, the existing career autosave migrates it to their real UID.
  const [trialAuthIntent, setTrialAuthIntent] = useState(null);
  useEffect(() => {
    if (isAuthenticated) setTrialAuthIntent(null);
  }, [isAuthenticated]);

  // Check premium status (Google Play Billing) on native
  useEffect(() => {
    async function checkPremium() {
      try {
        const isPremium = await checkPremiumStatus();
        if (isPremium) dispatch({ type: 'SET_PREMIUM', payload: true });
      } catch {
        // Non-native platforms can skip billing bootstrap
      }
    }
    if (!authLoading) checkPremium();
  }, [authLoading, dispatch]);
  
  // Audio manager
  const isMatchScreen = state.playingMatch || state.pendingMatch;
  const audioScreen = isMatchScreen ? 'matchDay'
    : state.currentScreen === 'team_selection' ? 'teamSelection'
    : state.currentScreen === 'contrarreloj_setup' ? 'contrarrelojSetup'
    : state.currentScreen === 'office' ? 'default'
    : 'menu';
  useAudioManager(audioScreen, state.settings, state.preseasonPhase ? 'preseason' : 'season');
  
  // SFX
  const { playClick, playToggle } = useSoundEffects(state.settings);
  useEffect(() => {
    const handleClick = (e) => {
      const el = e.target.closest('button, a, [role="button"], .clickable');
      if (!el) return;
      if (el.classList.contains('settings__toggle') || el.querySelector('.toggle-knob')) {
        playToggle();
      } else {
        playClick();
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [playClick, playToggle]);

  // --- Analytics: app lifecycle ------------------------------------------
  // app_start fires once per session as early as possible; analytics self-gates
  // on the measurement id so this is a no-op when none is configured.
  useEffect(() => {
    initAnalytics();
    trackEvent('app_start', { language: i18n.language });
  }, []);

  // app_loaded fires once, the first time the shell is ready to render a screen.
  const appLoadedRef = useRef(false);
  useEffect(() => {
    if (appLoadedRef.current) return;
    if (state.loaded && !authLoading) {
      appLoadedRef.current = true;
      trackEvent('app_loaded', { language: i18n.language });
    }
  }, [state.loaded, authLoading]);

  // --- Analytics: user properties (non-personal) -------------------------
  const authState = isAuthenticated
    ? (isEmailVerified ? 'verified' : 'unverified')
    : (isTrial ? 'trial' : 'anonymous');
  const loginStatus = isAuthenticated ? 'logged_in' : (isTrial ? 'trial' : 'logged_out');
  useEffect(() => {
    setAnalyticsUserProperties({
      auth_state: authState,
      login_status: loginStatus,
      language: i18n.language,
    });
  }, [authState, loginStatus]);

  // --- Analytics: GA4 user id (UID only) + auth-state event --------------
  // Only authenticated users get a setUserId (their opaque Firebase UID). Trial,
  // anonymous and logged-out sessions clear it. We never pass an email/name.
  // session_auth_state fires once auth has resolved and on every change, which is
  // what GA4 uses to segment logged vs unlogged and returning/engaged users.
  useEffect(() => {
    if (authLoading) return; // wait until auth resolves
    if (isAuthenticated && user?.uid) {
      setAnalyticsUserId(user.uid);
    } else {
      setAnalyticsUserId(null);
    }
    const provider = isPlayGames ? 'playgames'
      : isGuest ? 'guest'
      : isAuthenticated ? 'firebase'
      : 'none';
    trackAuthState(authState, { login_status: loginStatus, provider, language: i18n.language });
  }, [authState, authLoading, isAuthenticated, isPlayGames, isGuest, user?.uid]);

  // --- Analytics: screen views -------------------------------------------
  // Tracks high-level shell navigation. A match overlay (playingMatch/pendingMatch)
  // is reported as its own screen so we can see how much match-play happens.
  const matchActive = Boolean(state.playingMatch || state.pendingMatch);
  const analyticsScreen = matchActive ? 'match' : (state.currentScreen || 'main_menu');
  useEffect(() => {
    if (!state.loaded || authLoading) return;
    trackScreenView(analyticsScreen, {
      app_area: appAreaFor(analyticsScreen),
      language: i18n.language,
      auth_state: authState,
    });
  }, [analyticsScreen, state.loaded, authLoading]);

  // --- Analytics: presence heartbeat (GA4 Realtime) ----------------------
  // Emits a lightweight ping ~every 60s while the app is open so GA4 Realtime
  // can approximate who is currently playing and in which area, with zero
  // Firestore/RTDB cost. Params are non-personal. A ref carries the latest
  // context so the interval is created once and never resets on navigation.
  const gameMode = state.gameStarted ? gameModeLabel(state.gameMode) : 'none';
  const heartbeatRef = useRef({});
  heartbeatRef.current = {
    auth_state: authState,
    login_status: loginStatus,
    current_screen: analyticsScreen,
    app_area: appAreaFor(analyticsScreen),
    game_mode: gameMode,
    language: i18n.language,
  };
  useEffect(() => {
    if (!state.loaded || authLoading) return undefined;
    // Fire one immediately so a short session still registers presence.
    trackSessionHeartbeat(heartbeatRef.current);
    const id = setInterval(() => {
      // Only ping while the tab is visible — a backgrounded tab is not "playing".
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      trackSessionHeartbeat(heartbeatRef.current);
    }, 60000);
    return () => clearInterval(id);
  }, [state.loaded, authLoading]);

  // --- Analytics: game session start -------------------------------------
  // Fires when a playable mode becomes active (new game or resumed save). The
  // mode is allow-listed; no team/player data is sent.
  const sessionStartedRef = useRef(false);
  useEffect(() => {
    if (state.gameStarted && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      trackEvent('game_session_start', {
        game_mode: gameModeLabel(state.gameMode),
        app_area: appAreaFor(analyticsScreen),
        auth_state: authState,
      });
    } else if (!state.gameStarted && sessionStartedRef.current) {
      // Returned to menu / reset — allow the next start to be tracked again.
      sessionStartedRef.current = false;
    }
  }, [state.gameStarted, state.gameMode]);

  // --- Analytics: match lifecycle ----------------------------------------
  // match_start when a match overlay opens, match_finish when it closes. Only
  // coarse numeric/season context — never team or player names.
  const matchOpenRef = useRef(false);
  useEffect(() => {
    if (matchActive && !matchOpenRef.current) {
      matchOpenRef.current = true;
      trackEvent('match_start', {
        game_mode: gameModeLabel(state.gameMode),
        app_area: appAreaFor(analyticsScreen),
        season: Number(state.currentSeason) || undefined,
        matchday: Number(state.currentWeek) || undefined,
      });
    } else if (!matchActive && matchOpenRef.current) {
      matchOpenRef.current = false;
      trackEvent('match_finish', {
        game_mode: gameModeLabel(state.gameMode),
        app_area: appAreaFor(analyticsScreen),
        season: Number(state.currentSeason) || undefined,
        matchday: Number(state.currentWeek) || undefined,
      });
    }
  }, [matchActive]);

  // --- Analytics: global sanitized click delegation ----------------------
  // Mirrors the SFX delegation pattern. Only actionable controls are tracked;
  // labels are sanitized/truncated and we never read input values or hrefs
  // beyond a coarse domain/type. Explicit, higher-signal events (mode selection,
  // draft funnel) are emitted from their components.
  useEffect(() => {
    const handleAnalyticsClick = (e) => {
      const el = e.target.closest('button, a, [role="button"]');
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      // Label priority: explicit analytics id > aria-label > visible text.
      const rawLabel = el.getAttribute('data-analytics-label')
        || el.getAttribute('aria-label')
        || el.textContent
        || el.getAttribute('title');
      const params = {
        screen: analyticsScreen,
        element: tag,
        label: sanitizeLabel(rawLabel, 60),
      };
      const mode = el.getAttribute('data-mode');
      if (mode) params.mode = sanitizeLabel(mode, 40);
      if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        if (href.startsWith('mailto:')) {
          params.link_type = 'mailto';
        } else if (/^https?:/i.test(href)) {
          params.link_type = 'external';
          try { params.link_domain = new URL(href).hostname; } catch { /* ignore */ }
        } else {
          params.link_type = 'internal';
        }
      }
      trackClick(params);
    };
    document.addEventListener('click', handleAnalyticsClick, true);
    return () => document.removeEventListener('click', handleAnalyticsClick, true);
  }, [analyticsScreen]);

  if (!state.loaded || authLoading) {
    return <PageLoader label="Cargando" />;
  }
  
  const showNotifications = state.gameStarted && state.currentScreen === 'office';

  if (isAuthenticated && isEmailVerified && needsNickname) {
    return <NicknameModal onConfirm={setNickname} />;
  }

  // Contextual login opened from the trial banner — full-screen, keeps game state.
  if (trialAuthIntent) {
    return <Auth intent={trialAuthIntent} onBack={() => setTrialAuthIntent(null)} />;
  }

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'team_selection':
        return <TeamSelection />;
      case 'office':
        if (state.settings?.cityMode3D && !state._cityBypass) {
          return <CityMode onExitCity={() => dispatch({ type: 'SET_CITY_BYPASS', payload: true })} />;
        }
        return (
          <Office
            trialBanner={
              isTrial && state.gameStarted && state.currentScreen === 'office' ? (
                <TrialBanner onSave={() => setTrialAuthIntent('save-progress')} />
              ) : null
            }
          />
        );
      case 'contrarreloj_setup':
        return <ContrarrelojSetup />;
      case 'contrarreloj_end':
        return <ContrarrelojEnd />;
      case 'ranking':
        return <Ranking />;
      case 'ranked_lobby':
        return <RankedLobby />;
      case 'ranked_match':
        return <RankedMatch />;
      case 'ranked_draft':
        return <DraftMatch
          matchId={state.rankedMatchId}
          onExit={() => dispatch({ type: 'SET_SCREEN', payload: 'ranked_lobby' })}
        />;
      case 'ranked_leaderboard':
        return <RankedLeaderboard />;
      case 'promanager_setup':
        return <ProManagerSetup />;
      case 'promanager_season_end':
        return <ProManagerSeasonEnd />;
      case 'glory_menu':
        return <GloryMenu />;
      case 'glory_setup':
        return <GlorySetup />;
      case 'worldcup_setup':
      case 'worldcup':
        return <WorldCup onExit={() => dispatch({ type: 'SET_SCREEN', payload: 'main_menu' })} />;
      case 'worldcup_draft':
        if (!isWorldCupDraftAllowed()) {
          return <MainMenu />;
        }
        return <WorldCupDraft onExit={() => dispatch({ type: 'SET_SCREEN', payload: 'main_menu' })} />;
      default:
        return <MainMenu />;
    }
  };

  const getLoadingLabel = () => {
    if (state.currentScreen === 'office' && state.settings?.cityMode3D && !state._cityBypass) {
      return 'Cargando ciudad';
    }

    const labels = {
      office: 'Cargando oficina',
      contrarreloj_setup: 'Cargando contrarreloj',
      contrarreloj_end: 'Cargando resultados',
      ranking: 'Cargando ranking',
      ranked_lobby: 'Cargando lobby',
      ranked_match: 'Cargando partido',
      ranked_draft: 'Cargando draft',
      ranked_leaderboard: 'Cargando clasificación',
      promanager_setup: 'Cargando Pro Manager',
      promanager_season_end: 'Cargando fin de temporada',
      glory_menu: 'Cargando Glory Mode',
      glory_setup: 'Cargando configuración',
      worldcup_setup: 'Cargando Mundial',
      worldcup: 'Cargando Mundial',
      worldcup_draft: 'Cargando Mundial Draft'
    };

    return labels[state.currentScreen] || 'Cargando';
  };

  return (
    <>
      {showNotifications && <NotificationCenter />}
      <Suspense fallback={<PageLoader label={getLoadingLabel()} />}>
        <div key={state.currentScreen} className="app-screen-transition">
          {renderScreen()}
        </div>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <GameProvider>
              <GameRouter />
            </GameProvider>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
