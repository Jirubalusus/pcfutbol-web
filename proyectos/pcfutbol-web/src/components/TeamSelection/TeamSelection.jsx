import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { getLeagueTier } from '../../game/leagueTiers';
import { translatePosition } from '../../game/positionNames';
import { 
  getLaLigaTeams,
  getSegundaTeams,
  getPrimeraRfefTeams,
  getSegundaRfefTeams,
  getPremierTeams,
  getSerieATeams,
  getBundesligaTeams,
  getLigue1Teams,
  getPrimeraRfefGroups,
  getSegundaRfefGroups,
  getEredivisieTeams,
  getPrimeiraLigaTeams,
  getChampionshipTeams,
  getBelgianProTeams,
  getSuperLigTeams,
  getScottishPremTeams,
  getSerieBTeams,
  getBundesliga2Teams,
  getLigue2Teams,
  getSwissTeams,
  getAustrianTeams,
  getGreekTeams,
  getDanishTeams,
  getCroatianTeams,
  getCzechTeams,
  getArgentinaTeams,
  getBrasileiraoTeams,
  getColombiaTeams,
  getChileTeams,
  getUruguayTeams,
  getEcuadorTeams,
  getParaguayTeams,
  getPeruTeams,
  getBoliviaTeams,
  getVenezuelaTeams,
  getMLSTeams,
  getSaudiTeams,
  getLigaMXTeams,
  getJLeagueTeams,
  getEliteserienTeams,
  getAllsvenskanTeams,
  getEkstraklasaTeams,
  getEersteDivisieTeams,
  getLigaPortugal2Teams,
  getRussiaPremierTeams,
  getUkrainePremierTeams,
  getRomaniaSuperligaTeams,
  getHungaryNBITeams,
  getKLeague1Teams,
  getALeagueMenTeams,
  getSouthAfricaPSLTeams
} from '../../data/teamsFirestore';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { isSouthAmericanLeague, qualifyTeamsForSouthAmerica, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
import { Calendar, Plane, Home, Sparkles, ChevronRight, Lock, Map, ClipboardList, Trophy, Building2, Users, DollarSign, Star, ArrowLeft } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import WorldMap from './WorldMap';
import TeamCrest from '../TeamCrest/TeamCrest';
import './TeamSelection.scss';
import './WorldMap.scss';

const EUROPEAN_COUNTRIES = [
  { id: 'spain', nameKey: 'countries.spain', flag: '🇪🇸', leagues: ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'] },
  { id: 'england', nameKey: 'countries.england', flag: 'ENG', flagVariant: 'code', leagues: ['premierLeague', 'championship'] },
  { id: 'italy', nameKey: 'countries.italy', flag: '🇮🇹', leagues: ['serieA', 'serieB'] },
  { id: 'germany', nameKey: 'countries.germany', flag: '🇩🇪', leagues: ['bundesliga', 'bundesliga2'] },
  { id: 'france', nameKey: 'countries.france', flag: '🇫🇷', leagues: ['ligue1', 'ligue2'] },
  { id: 'netherlands', nameKey: 'countries.netherlands', flag: '🇳🇱', leagues: ['eredivisie', 'eersteDivisie'] },
  { id: 'portugal', nameKey: 'countries.portugal', flag: '🇵🇹', leagues: ['primeiraLiga', 'ligaPortugal2'] },
  { id: 'belgium', nameKey: 'countries.belgium', flag: '🇧🇪', leagues: ['belgianPro'] },
  { id: 'turkey', nameKey: 'countries.turkey', flag: '🇹🇷', leagues: ['superLig'] },
  { id: 'scotland', nameKey: 'countries.scotland', flag: 'SCO', flagVariant: 'code', leagues: ['scottishPrem'] },
  { id: 'switzerland', nameKey: 'countries.switzerland', flag: '🇨🇭', leagues: ['swissSuperLeague'] },
  { id: 'austria', nameKey: 'countries.austria', flag: '🇦🇹', leagues: ['austrianBundesliga'] },
  { id: 'greece', nameKey: 'countries.greece', flag: '🇬🇷', leagues: ['greekSuperLeague'] },
  { id: 'denmark', nameKey: 'countries.denmark', flag: '🇩🇰', leagues: ['danishSuperliga'] },
  { id: 'norway', nameKey: 'countries.norway', flag: '🇳🇴', leagues: ['eliteserien'] },
  { id: 'sweden', nameKey: 'countries.sweden', flag: '🇸🇪', leagues: ['allsvenskan'] },
  { id: 'poland', nameKey: 'countries.poland', flag: '🇵🇱', leagues: ['ekstraklasa'] },
  { id: 'croatia', nameKey: 'countries.croatia', flag: '🇭🇷', leagues: ['croatianLeague'] },
  { id: 'czech', nameKey: 'countries.czech', flag: '🇨🇿', leagues: ['czechLeague'] },
  { id: 'russia', nameKey: 'countries.russia', flag: '🇷🇺', leagues: ['russiaPremier'] },
  { id: 'ukraine', nameKey: 'countries.ukraine', flag: '🇺🇦', leagues: ['ukrainePremier'] },
  { id: 'romania', nameKey: 'countries.romania', flag: '🇷🇴', leagues: ['romaniaSuperliga'] },
  { id: 'hungary', nameKey: 'countries.hungary', flag: '🇭🇺', leagues: ['hungaryNBI'] },
];

const SOUTH_AMERICAN_COUNTRIES = [
  { id: 'argentina', nameKey: 'countries.argentina', flag: '🇦🇷', leagues: ['argentinaPrimera'] },
  { id: 'brazil', nameKey: 'countries.brazil', flag: '🇧🇷', leagues: ['brasileiraoA'] },
  { id: 'colombia', nameKey: 'countries.colombia', flag: '🇨🇴', leagues: ['colombiaPrimera'] },
  { id: 'chile', nameKey: 'countries.chile', flag: '🇨🇱', leagues: ['chilePrimera'] },
  { id: 'uruguay', nameKey: 'countries.uruguay', flag: '🇺🇾', leagues: ['uruguayPrimera'] },
  { id: 'ecuador', nameKey: 'countries.ecuador', flag: '🇪🇨', leagues: ['ecuadorLigaPro'] },
  { id: 'paraguay', nameKey: 'countries.paraguay', flag: '🇵🇾', leagues: ['paraguayPrimera'] },
  { id: 'peru', nameKey: 'countries.peru', flag: '🇵🇪', leagues: ['peruLiga1'] },
  { id: 'bolivia', nameKey: 'countries.bolivia', flag: '🇧🇴', leagues: ['boliviaPrimera'] },
  { id: 'venezuela', nameKey: 'countries.venezuela', flag: '🇻🇪', leagues: ['venezuelaPrimera'] },
];

const REST_OF_WORLD_COUNTRIES = [
  { id: 'usa', nameKey: 'countries.usa', flag: '🇺🇸', leagues: ['mls'] },
  { id: 'saudiArabia', nameKey: 'countries.saudiArabia', flag: '🇸🇦', leagues: ['saudiPro'] },
  { id: 'mexico', nameKey: 'countries.mexico', flag: '🇲🇽', leagues: ['ligaMX'] },
  { id: 'japan', nameKey: 'countries.japan', flag: '🇯🇵', leagues: ['jLeague'] },
  { id: 'southKorea', nameKey: 'countries.southKorea', flag: '🇰🇷', leagues: ['kLeague1'] },
  { id: 'australia', nameKey: 'countries.australia', flag: '🇦🇺', leagues: ['aLeagueMen'] },
  { id: 'southAfrica', nameKey: 'countries.southAfrica', flag: '🇿🇦', leagues: ['southAfricaPSL'] },
];

const COUNTRIES = [...EUROPEAN_COUNTRIES, ...SOUTH_AMERICAN_COUNTRIES, ...REST_OF_WORLD_COUNTRIES];


let seasonSetupModulesPromise;
let preseasonModulesPromise;
let saveModulesPromise;

async function loadSeasonSetupModules() {
  if (!seasonSetupModulesPromise) {
    seasonSetupModulesPromise = Promise.all([
      import('../../game/leagueEngine'),
      import('../../game/objectivesEngine'),
      import('../../game/europeanCompetitions'),
      import('../../game/europeanSeason'),
      import('../../game/southAmericanSeason'),
      import('../../game/cupSystem'),
      import('../../game/multiLeagueEngine')
    ]).then(([
      leagueEngine,
      objectivesEngine,
      europeanCompetitions,
      europeanSeason,
      southAmericanSeason,
      cupSystem,
      multiLeagueEngine
    ]) => ({
      initializeLeague: leagueEngine.initializeLeague,
      generateSeasonObjectives: objectivesEngine.generateSeasonObjectives,
      qualifyTeamsForEurope: europeanCompetitions.qualifyTeamsForEurope,
      LEAGUE_SLOTS: europeanCompetitions.LEAGUE_SLOTS,
      buildSeasonCalendar: europeanCompetitions.buildSeasonCalendar,
      remapFixturesForEuropean: europeanCompetitions.remapFixturesForEuropean,
      initializeEuropeanCompetitions: europeanSeason.initializeEuropeanCompetitions,
      initializeSACompetitions: southAmericanSeason.initializeSACompetitions,
      getCupTeams: cupSystem.getCupTeams,
      generateCupBracket: cupSystem.generateCupBracket,
      initializeOtherLeagues: multiLeagueEngine.initializeOtherLeagues,
      LEAGUE_CONFIG: multiLeagueEngine.LEAGUE_CONFIG,
    }));
  }
  return seasonSetupModulesPromise;
}

async function loadPreseasonModules() {
  if (!preseasonModulesPromise) {
    preseasonModulesPromise = import('../../game/seasonManager').then((seasonManager) => ({
      generatePreseasonOptions: seasonManager.generatePreseasonOptions,
    }));
  }
  return preseasonModulesPromise;
}

async function loadSaveModules() {
  if (!saveModulesPromise) {
    saveModulesPromise = Promise.all([
      import('firebase/auth'),
      import('../../firebase/savesService')
    ]).then(([firebaseAuth, savesService]) => ({
      getAuth: firebaseAuth.getAuth,
      saveGameToSlot: savesService.saveGameToSlot,
    }));
  }
  return saveModulesPromise;
}

// Función helper para obtener equipos de una liga
function getLeagueTeams(leagueId) {
  switch(leagueId) {
    case 'laliga': return getLaLigaTeams();
    case 'segunda': return getSegundaTeams();
    case 'primeraRFEF': return getPrimeraRfefTeams();
    case 'segundaRFEF': return getSegundaRfefTeams();
    case 'premierLeague': return getPremierTeams();
    case 'serieA': return getSerieATeams();
    case 'bundesliga': return getBundesligaTeams();
    case 'ligue1': return getLigue1Teams();
    case 'eredivisie': return getEredivisieTeams();
    case 'primeiraLiga': return getPrimeiraLigaTeams();
    case 'championship': return getChampionshipTeams();
    case 'belgianPro': return getBelgianProTeams();
    case 'superLig': return getSuperLigTeams();
    case 'scottishPrem': return getScottishPremTeams();
    case 'serieB': return getSerieBTeams();
    case 'bundesliga2': return getBundesliga2Teams();
    case 'ligue2': return getLigue2Teams();
    case 'swissSuperLeague': return getSwissTeams();
    case 'austrianBundesliga': return getAustrianTeams();
    case 'greekSuperLeague': return getGreekTeams();
    case 'danishSuperliga': return getDanishTeams();
    case 'croatianLeague': return getCroatianTeams();
    case 'czechLeague': return getCzechTeams();
    // South America
    case 'argentinaPrimera': return getArgentinaTeams();
    case 'brasileiraoA': return getBrasileiraoTeams();
    case 'colombiaPrimera': return getColombiaTeams();
    case 'chilePrimera': return getChileTeams();
    case 'uruguayPrimera': return getUruguayTeams();
    case 'ecuadorLigaPro': return getEcuadorTeams();
    case 'paraguayPrimera': return getParaguayTeams();
    case 'peruLiga1': return getPeruTeams();
    case 'boliviaPrimera': return getBoliviaTeams();
    case 'venezuelaPrimera': return getVenezuelaTeams();
    // Rest of World
    case 'mls': return getMLSTeams();
    case 'saudiPro': return getSaudiTeams();
    case 'ligaMX': return getLigaMXTeams();
    case 'jLeague': return getJLeagueTeams();
    case 'kLeague1': return getKLeague1Teams();
    case 'aLeagueMen': return getALeagueMenTeams();
    case 'southAfricaPSL': return getSouthAfricaPSLTeams();
    // Nordic + Central Europe
    case 'eliteserien': return getEliteserienTeams();
    case 'allsvenskan': return getAllsvenskanTeams();
    case 'ekstraklasa': return getEkstraklasaTeams();
    // Second divisions
    case 'eersteDivisie': return getEersteDivisieTeams();
    case 'ligaPortugal2': return getLigaPortugal2Teams();
    // Eastern Europe
    case 'russiaPremier': return getRussiaPremierTeams();
    case 'ukrainePremier': return getUkrainePremierTeams();
    case 'romaniaSuperliga': return getRomaniaSuperligaTeams();
    case 'hungaryNBI': return getHungaryNBITeams();
    default: return [];
  }
}

// Función helper para obtener grupos
function getLeagueGroups(leagueId) {
  switch(leagueId) {
    case 'primeraRFEF': return getPrimeraRfefGroups();
    case 'segundaRFEF': return getSegundaRfefGroups();
    default: return null;
  }
}

// Local labels so TeamSelection doesn't need to pull multiLeagueEngine on first paint
const LEAGUE_NAMES = {
  laliga: 'LaLiga EA Sports',
  segunda: 'LaLiga Hypermotion',
  primeraRFEF: 'Primera RFEF',
  segundaRFEF: 'Segunda RFEF',
  premierLeague: 'Premier League',
  championship: 'Championship',
  serieA: 'Serie A',
  serieB: 'Serie B',
  bundesliga: 'Bundesliga',
  bundesliga2: '2. Bundesliga',
  ligue1: 'Ligue 1',
  ligue2: 'Ligue 2',
  eredivisie: 'Eredivisie',
  primeiraLiga: 'Primeira Liga',
  belgianPro: 'Belgian Pro League',
  superLig: 'Super Lig',
  scottishPrem: 'Scottish Premiership',
  swissSuperLeague: 'Swiss Super League',
  austrianBundesliga: 'Austrian Bundesliga',
  greekSuperLeague: 'Greek Super League',
  danishSuperliga: 'Danish Superliga',
  eliteserien: 'Eliteserien',
  allsvenskan: 'Allsvenskan',
  ekstraklasa: 'Ekstraklasa',
  croatianLeague: 'Croatian League',
  czechLeague: 'Czech League',
  argentinaPrimera: 'Liga Profesional Argentina',
  brasileiraoA: 'Brasileirao',
  colombiaPrimera: 'Liga BetPlay',
  chilePrimera: 'Primera Division de Chile',
  uruguayPrimera: 'Primera Division de Uruguay',
  ecuadorLigaPro: 'LigaPro Ecuador',
  paraguayPrimera: 'Primera Division Paraguay',
  peruLiga1: 'Liga 1 Peru',
  boliviaPrimera: 'Division Profesional Bolivia',
  venezuelaPrimera: 'Liga FUTVE',
  mls: 'Major League Soccer',
  saudiPro: 'Saudi Pro League',
  ligaMX: 'Liga MX',
  jLeague: 'J1 League',
  kLeague1: 'K League 1',
  aLeagueMen: 'A-League Men',
  southAfricaPSL: 'Betway Premiership',
  eersteDivisie: 'Eerste Divisie',
  ligaPortugal2: 'Liga Portugal 2',
  russiaPremier: 'Russian Premier League',
  ukrainePremier: 'Ukrainian Premier League',
  romaniaSuperliga: 'SuperLiga Romania',
  hungaryNBI: 'NB I Hungary',
};

// Ligas que tienen grupos
const LEAGUES_WITH_GROUPS = ['primeraRFEF', 'segundaRFEF'];

// Generar lista de temporadas disponibles (2025-26 → 2004-05)
const AVAILABLE_SEASONS = Array.from({ length: 22 }, (_, i) => {
  const startYear = 2025 - i;
  return {
    id: `${startYear}-${String(startYear + 1).slice(2)}`,
    label: `${startYear}/${String(startYear + 1).slice(2)}`,
    startYear
  };
});

export default function TeamSelection() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(AVAILABLE_SEASONS[0]); // Default: 2025-26
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreseason, setShowPreseason] = useState(false);
  const [selectedPreseason, setSelectedPreseason] = useState(null);
  const [preseasonOptions, setPreseasonOptions] = useState([]);
  const [isMobileTeamLayout, setIsMobileTeamLayout] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 900;
  });
  const [mobileTeamsView, setMobileTeamsView] = useState('list');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const updateMobileLayout = (event) => {
      const matches = event.matches ?? mediaQuery.matches;
      setIsMobileTeamLayout(matches);
      if (!matches) {
        setMobileTeamsView('list');
      } else if (selectedTeam) {
        setMobileTeamsView('details');
      }
    };

    updateMobileLayout(mediaQuery);
    mediaQuery.addEventListener('change', updateMobileLayout);

    return () => mediaQuery.removeEventListener('change', updateMobileLayout);
  }, [selectedTeam]);
  
  // Determinar si la liga seleccionada tiene grupos
  const hasGroups = selectedLeague && LEAGUES_WITH_GROUPS.includes(selectedLeague);
  
  // Calcular el número total de pasos (simplificado a 2)
  const totalSteps = 2;
  
  // Obtener equipos según liga y grupo (pre-calculando budget/reputation)
  const teams = useMemo(() => {
    let rawTeams = [];
    if (!selectedLeague) return rawTeams;
    
    // Si tiene grupos y hay uno seleccionado, usar equipos del grupo
    if (hasGroups && selectedGroup) {
      const groups = getLeagueGroups(selectedLeague);
      rawTeams = groups[selectedGroup]?.teams || [];
    } else if (!hasGroups) {
      rawTeams = getLeagueTeams(selectedLeague);
    }
    
    // Pre-calcular budget y reputation para equipos que no lo tengan
    // Budget escala por tier de liga
    const tierBudgets = {
      1: { pct: 0.12, min: 15_000_000, max: 500_000_000 },
      2: { pct: 0.10, min: 5_000_000, max: 120_000_000 },
      3: { pct: 0.07, min: 1_500_000, max: 30_000_000 },
      4: { pct: 0.05, min: 300_000, max: 5_000_000 },
      5: { pct: 0.03, min: 100_000, max: 1_500_000 }
    };
    const currentTier = getLeagueTier(selectedLeague);
    const budgetConfig = tierBudgets[currentTier] || tierBudgets[1];
    
    rawTeams = rawTeams.map(t => ({ ...t })); // Clone to avoid mutating shared data
    rawTeams.forEach(team => {
      if (!team.budget || !team.reputation) {
        const totalValue = (team.players || []).reduce((sum, p) => sum + (p.value || 0), 0);
        const avgOverall = team.players?.length 
          ? team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length
          : 70;
        
        if (!team.reputation) {
          if (avgOverall >= 82) team.reputation = 5;
          else if (avgOverall >= 78) team.reputation = 4;
          else if (avgOverall >= 73) team.reputation = 3;
          else if (avgOverall >= 68) team.reputation = 2;
          else team.reputation = 1;
        }
        
        if (!team.budget) {
          const baseBudget = Math.max(totalValue * budgetConfig.pct, budgetConfig.min);
          const repMultiplier = [0.5, 0.7, 1.0, 1.5, 2.5][team.reputation - 1] || 1.0;
          team.budget = Math.round(
            Math.min(baseBudget * repMultiplier, budgetConfig.max)
          );
        }
      }
    });
    
    return rawTeams;
  }, [selectedLeague, selectedGroup, hasGroups]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;
    return teams.filter(t => 
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);
  
  const handleBack = () => {
    if (step === 2 && isMobileTeamLayout && mobileTeamsView === 'details') {
      setMobileTeamsView('list');
      return;
    }

    if (step === 1) {
      // Si hay país seleccionado, deseleccionarlo primero (especialmente útil en móvil)
      if (selectedCountry) {
        setSelectedCountry(null);
      } else {
        dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
      }
    } else if (step === 2) {
      // Si estamos viendo equipos después de grupos, volver a grupos
      if (hasGroups && selectedGroup) {
        setSelectedGroup(null);
        setSelectedTeam(null);
      } else {
        // Volver al paso 1 (mapa + ligas)
        setStep(1);
        setSelectedLeague(null);
        setSelectedGroup(null);
        setSelectedTeam(null);
      }
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    // Solo selecciona el país, las ligas se muestran en el panel
    // No avanza de paso
  };

  const handleSelectLeague = (leagueId) => {
    setSelectedLeague(leagueId);
    setSelectedGroup(null);
    setSelectedTeam(null);
    setMobileTeamsView('list');
    setStep(2); // Ir a paso 2 (grupos o equipos)
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroup(groupId);
    setSelectedTeam(null);
    setMobileTeamsView('list');
    // Se queda en step 2, pero ahora muestra equipos
  };

  const handleSelectTeam = (originalTeam) => {
    // Clone to avoid mutating shared data
    const team = { ...originalTeam };
    // Ensure budget and reputation exist (scraped teams may lack these)
    // Budget escala por tier de liga
    if (!team.budget || !team.reputation) {
      const totalValue = (team.players || []).reduce((sum, p) => sum + (p.value || 0), 0);
      const avgOverall = team.players?.length 
        ? team.players.reduce((s, p) => s + (p.overall || 0), 0) / team.players.length
        : 70;
      
      const tierBudgets = {
        1: { pct: 0.12, min: 15_000_000, max: 500_000_000 },
        2: { pct: 0.10, min: 5_000_000, max: 120_000_000 },
        3: { pct: 0.07, min: 1_500_000, max: 30_000_000 },
        4: { pct: 0.05, min: 300_000, max: 5_000_000 },
        5: { pct: 0.03, min: 100_000, max: 1_500_000 }
      };
      const currentTier = getLeagueTier(selectedLeague);
      const budgetConfig = tierBudgets[currentTier] || tierBudgets[1];
      
      if (!team.reputation) {
        if (avgOverall >= 82) team.reputation = 5;
        else if (avgOverall >= 78) team.reputation = 4;
        else if (avgOverall >= 73) team.reputation = 3;
        else if (avgOverall >= 68) team.reputation = 2;
        else team.reputation = 1;
      }
      
      if (!team.budget) {
        const baseBudget = Math.max(totalValue * budgetConfig.pct, budgetConfig.min);
        const repMultiplier = [0.5, 0.7, 1.0, 1.5, 2.5][team.reputation - 1] || 1.0;
        team.budget = Math.round(
          Math.min(baseBudget * repMultiplier, budgetConfig.max)
        );
      }
    }
    setSelectedTeam(team);
    if (isMobileTeamLayout) {
      setMobileTeamsView('details');
    }
  };
  
  // Función para obtener todos los equipos de todas las ligas
  const getAllTeamsForPreseason = () => [
    ...getLaLigaTeams(), ...getSegundaTeams(), ...getPrimeraRfefTeams(), ...getSegundaRfefTeams(),
    ...getPremierTeams(), ...getSerieATeams(), ...getBundesligaTeams(), ...getLigue1Teams(),
    ...getEredivisieTeams(), ...getPrimeiraLigaTeams(), ...getChampionshipTeams(),
    ...getBelgianProTeams(), ...getSuperLigTeams(), ...getScottishPremTeams(),
    ...getSerieBTeams(), ...getBundesliga2Teams(), ...getLigue2Teams(),
    ...getSwissTeams(), ...getAustrianTeams(), ...getGreekTeams(),
    ...getDanishTeams(), ...getCroatianTeams(), ...getCzechTeams(),
    // South America
    ...getArgentinaTeams(), ...getBrasileiraoTeams(), ...getColombiaTeams(),
    ...getChileTeams(), ...getUruguayTeams(), ...getEcuadorTeams(),
    ...getParaguayTeams(), ...getPeruTeams(), ...getBoliviaTeams(), ...getVenezuelaTeams(),
    // Rest of World
    ...getMLSTeams(), ...getSaudiTeams(), ...getLigaMXTeams(), ...getJLeagueTeams(),
    ...getKLeague1Teams(), ...getALeagueMenTeams(), ...getSouthAfricaPSLTeams(),
    // Nordic + Central Europe
    ...getEliteserienTeams(), ...getAllsvenskanTeams(), ...getEkstraklasaTeams(),
    // Second divisions
    ...getEersteDivisieTeams(), ...getLigaPortugal2Teams(),
    // Eastern Europe
    ...getRussiaPremierTeams(), ...getUkrainePremierTeams(),
    ...getRomaniaSuperligaTeams(), ...getHungaryNBITeams()
  ];

  const handleShowPreseason = async () => {
    if (!selectedTeam || !selectedLeague) return;
    
    const { generatePreseasonOptions } = await loadPreseasonModules();
    const allTeams = getAllTeamsForPreseason();
    const options = generatePreseasonOptions(allTeams, selectedTeam, selectedLeague);
    setPreseasonOptions(options);
    setShowPreseason(true);
  };
  
  const handleStartGame = async () => {
    if (!selectedTeam || !selectedLeague || !selectedPreseason) return;
    
    // Obtener equipos de la liga/grupo para la competición
    let leagueTeams;
    if (hasGroups && selectedGroup) {
      leagueTeams = getLeagueGroups(selectedLeague)?.[selectedGroup]?.teams || [];
    } else {
      leagueTeams = getLeagueTeams(selectedLeague);
    }
    
    const { initializeLeague } = await loadSeasonSetupModules();
    const leagueData = initializeLeague(leagueTeams, selectedTeam.id);
    
    // Obtener información del estadio real
    const stadiumInfo = getStadiumInfo(selectedTeam.id, selectedTeam.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);
    
    // Reuse auth context so Firebase auth isn't part of the critical path here
    const managerName = user?.displayName || user?.email?.split('@')[0] || undefined;

    dispatch({ 
      type: 'NEW_GAME', 
      payload: { 
        teamId: selectedTeam.id, 
        team: { ...selectedTeam },
        leagueId: selectedLeague,
        group: selectedGroup,
        stadiumInfo,
        stadiumLevel,
        preseasonMatches: selectedPreseason.matches,
        preseasonPhase: true,
        managerName
      } 
    });
    
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: selectedLeague });
    
    // For group leagues, store the player's group ID
    if (hasGroups && selectedGroup) {
      dispatch({ type: 'SET_PLAYER_GROUP', payload: selectedGroup });
    }
    
    // ============================================================
    // DEFERRED HEAVY INITIALIZATION
    // Run after React has rendered the office screen to avoid blocking UI
    // ============================================================
    const _selTeam = selectedTeam;
    const _selLeague = selectedLeague;
    const _selGroup = selectedGroup;
    const _hasGroups = hasGroups;
    const _leagueData = leagueData;
    const _t = t;
    const _isAuth = isAuthenticated;
    const _user = user;
    setTimeout(async () => {
      try {
        await _deferredInit(dispatch, _selTeam, _selLeague, _selGroup, _hasGroups, _leagueData, _t, _isAuth, _user);
      } catch (e) { console.error('Deferred init error:', e); }
    }, 100);
  };
  
  // Heavy init that runs after the game screen is shown
  async function _deferredInit(dispatch, selectedTeam, selectedLeague, selectedGroup, hasGroups, leagueData, t, isAuthenticated, user) {
    const {
      generateSeasonObjectives,
      qualifyTeamsForEurope,
      LEAGUE_SLOTS,
      buildSeasonCalendar,
      remapFixturesForEuropean,
      initializeEuropeanCompetitions,
      initializeSACompetitions,
      getCupTeams,
      generateCupBracket,
      initializeOtherLeagues,
      LEAGUE_CONFIG,
    } = await loadSeasonSetupModules();
    // Guardar TODOS los equipos de TODAS las ligas para el mercado global y el explorador
    const allLeagueIds = [
      { id: 'laliga', getter: getLaLigaTeams },
      { id: 'segunda', getter: getSegundaTeams },
      { id: 'primeraRFEF', getter: getPrimeraRfefTeams },
      { id: 'segundaRFEF', getter: getSegundaRfefTeams },
      { id: 'premierLeague', getter: getPremierTeams },
      { id: 'serieA', getter: getSerieATeams },
      { id: 'bundesliga', getter: getBundesligaTeams },
      { id: 'ligue1', getter: getLigue1Teams },
      { id: 'eredivisie', getter: getEredivisieTeams },
      { id: 'primeiraLiga', getter: getPrimeiraLigaTeams },
      { id: 'championship', getter: getChampionshipTeams },
      { id: 'belgianPro', getter: getBelgianProTeams },
      { id: 'superLig', getter: getSuperLigTeams },
      { id: 'scottishPrem', getter: getScottishPremTeams },
      { id: 'serieB', getter: getSerieBTeams },
      { id: 'bundesliga2', getter: getBundesliga2Teams },
      { id: 'ligue2', getter: getLigue2Teams },
      { id: 'swissSuperLeague', getter: getSwissTeams },
      { id: 'austrianBundesliga', getter: getAustrianTeams },
      { id: 'greekSuperLeague', getter: getGreekTeams },
      { id: 'danishSuperliga', getter: getDanishTeams },
      { id: 'eliteserien', getter: getEliteserienTeams },
      { id: 'allsvenskan', getter: getAllsvenskanTeams },
      { id: 'ekstraklasa', getter: getEkstraklasaTeams },
      { id: 'croatianLeague', getter: getCroatianTeams },
      { id: 'czechLeague', getter: getCzechTeams },
      // South America
      { id: 'argentinaPrimera', getter: getArgentinaTeams },
      { id: 'brasileiraoA', getter: getBrasileiraoTeams },
      { id: 'colombiaPrimera', getter: getColombiaTeams },
      { id: 'chilePrimera', getter: getChileTeams },
      { id: 'uruguayPrimera', getter: getUruguayTeams },
      { id: 'ecuadorLigaPro', getter: getEcuadorTeams },
      { id: 'paraguayPrimera', getter: getParaguayTeams },
      { id: 'peruLiga1', getter: getPeruTeams },
      { id: 'boliviaPrimera', getter: getBoliviaTeams },
      { id: 'venezuelaPrimera', getter: getVenezuelaTeams },
      // Rest of World
      { id: 'mls', getter: getMLSTeams },
      { id: 'saudiPro', getter: getSaudiTeams },
      { id: 'ligaMX', getter: getLigaMXTeams },
      { id: 'jLeague', getter: getJLeagueTeams },
      { id: 'kLeague1', getter: getKLeague1Teams },
      { id: 'aLeagueMen', getter: getALeagueMenTeams },
      { id: 'southAfricaPSL', getter: getSouthAfricaPSLTeams },
      // Second divisions
      { id: 'eersteDivisie', getter: getEersteDivisieTeams },
      { id: 'ligaPortugal2', getter: getLigaPortugal2Teams },
      // Eastern Europe
      { id: 'russiaPremier', getter: getRussiaPremierTeams },
      { id: 'ukrainePremier', getter: getUkrainePremierTeams },
      { id: 'romaniaSuperliga', getter: getRomaniaSuperligaTeams },
      { id: 'hungaryNBI', getter: getHungaryNBITeams },
    ];
    
    const allLeagueTeamsWithData = [];
    for (const league of allLeagueIds) {
      const teams = league.getter();
      for (const t of teams) {
        allLeagueTeamsWithData.push({
          ...t,
          id: t.id,
          name: t.name,
          players: t.players || [],
          budget: t.budget || (t.reputation > 4 ? 100_000_000 : t.reputation > 3 ? 50_000_000 : 20_000_000),
          leagueId: league.id
        });
      }
    }
    dispatch({ type: 'UPDATE_LEAGUE_TEAMS', payload: allLeagueTeamsWithData });
    
    // Initialize other leagues (now runs deferred via setTimeout)
    const otherLeagues = initializeOtherLeagues(selectedLeague, hasGroups ? selectedGroup : null);
    dispatch({ type: 'SET_OTHER_LEAGUES', payload: otherLeagues });
    
    // ============================================================
    // BOOTSTRAP CONTINENTAL COMPETITIONS (primera temporada)
    // ============================================================
    const isPlayerInSA = isSouthAmericanLeague(selectedLeague);
    
    if (isPlayerInSA) {
      // ── SOUTH AMERICAN COMPETITIONS ──
      try {
        const bootstrapStandings = {};
        const allTeamsMap = {};
        
        for (const [leagueId, slots] of Object.entries(SA_LEAGUE_SLOTS)) {
          const config = LEAGUE_CONFIG[leagueId];
          if (!config || !config.getTeams) continue;
          
          const leagueTeams = config.getTeams();
          if (!leagueTeams || leagueTeams.length === 0) continue;
          
          const sorted = [...leagueTeams].sort((a, b) => 
            (b.reputation || 70) - (a.reputation || 70)
          );
          
          bootstrapStandings[leagueId] = sorted.map((t, idx) => ({
            teamId: t.id || t.teamId,
            teamName: t.name || t.teamName,
            shortName: t.shortName || '',
            reputation: t.reputation || 70,
            overall: t.overall || 70,
            leaguePosition: idx + 1
          }));
          
          leagueTeams.forEach(t => {
            allTeamsMap[t.id || t.teamId] = t;
          });
        }
        
        const qualifiedTeams = qualifyTeamsForSouthAmerica(bootstrapStandings, allTeamsMap);
        
        const usedTeamIds = new Set();
        Object.values(qualifiedTeams).forEach(teams => 
          teams.forEach(t => usedTeamIds.add(t.teamId))
        );
        
        const allAvailableTeams = Object.values(allTeamsMap)
          .filter(t => !usedTeamIds.has(t.id || t.teamId))
          .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        
        for (const compId of ['copaLibertadores', 'copaSudamericana']) {
          const needed = 32 - qualifiedTeams[compId].length;
          if (needed > 0) {
            const fillers = allAvailableTeams.splice(0, needed);
            qualifiedTeams[compId].push(...fillers.map(t => ({
              teamId: t.id || t.teamId,
              teamName: t.name || t.teamName,
              shortName: t.shortName || '',
              league: t.league || 'unknown',
              leaguePosition: 0,
              reputation: t.reputation || 60,
              overall: t.overall || 65,
              players: t.players || [],
              ...t
            })));
            fillers.forEach(t => usedTeamIds.add(t.id || t.teamId));
          }
        }
        
        const saState = initializeSACompetitions(qualifiedTeams);
        dispatch({ type: 'INIT_SA_COMPETITIONS', payload: saState });
        
        const playerQualComp = ['copaLibertadores', 'copaSudamericana']
          .find(c => qualifiedTeams[c].some(t => (t.teamId || t.id) === selectedTeam.id));
        
        if (playerQualComp) {
          const compNames = {
            copaLibertadores: 'South American Champions Cup',
            copaSudamericana: 'Copa Sudamericana'
          };
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + 50,
              type: 'southamerican',
              titleKey: 'gameMessages.continentalCompetition',
              contentKey: 'gameMessages.teamPlaysContinental', contentParams: { comp: compNames[playerQualComp] },
              date: `${t('common.week')} 1`
            }
          });
        }
      } catch (err) {
        console.error('Error bootstrapping SA competitions:', err);
      }
    } else {
      // ── EUROPEAN COMPETITIONS ──
      try {
        const bootstrapStandings = {};
        const allTeamsMap = {};
        
        for (const [leagueId, slots] of Object.entries(LEAGUE_SLOTS)) {
          const config = LEAGUE_CONFIG[leagueId];
          if (!config || !config.getTeams) continue;
          
          const leagueTeams = config.getTeams();
          if (!leagueTeams || leagueTeams.length === 0) continue;
          
          const sorted = [...leagueTeams].sort((a, b) => 
            (b.reputation || 70) - (a.reputation || 70)
          );
          
          bootstrapStandings[leagueId] = sorted.map((t, idx) => ({
            teamId: t.id || t.teamId,
            teamName: t.name || t.teamName,
            shortName: t.shortName || '',
            reputation: t.reputation || 70,
            overall: t.overall || 70,
            leaguePosition: idx + 1
          }));
          
          leagueTeams.forEach(t => {
            allTeamsMap[t.id || t.teamId] = t;
          });
        }
        
        const qualifiedTeams = qualifyTeamsForEurope(bootstrapStandings, allTeamsMap);
        
        const usedTeamIds = new Set();
        Object.values(qualifiedTeams).forEach(teams => 
          teams.forEach(t => usedTeamIds.add(t.teamId))
        );
        
        const allAvailableTeams = Object.values(allTeamsMap)
          .filter(t => !usedTeamIds.has(t.id || t.teamId))
          .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        
        for (const compId of ['championsLeague', 'europaLeague', 'conferenceleague']) {
          const needed = 32 - qualifiedTeams[compId].length;
          if (needed > 0) {
            const fillers = allAvailableTeams.splice(0, needed);
            qualifiedTeams[compId].push(...fillers.map(t => ({
              teamId: t.id || t.teamId,
              teamName: t.name || t.teamName,
              shortName: t.shortName || '',
              league: t.league || 'unknown',
              leaguePosition: 0,
              reputation: t.reputation || 60,
              overall: t.overall || 65,
              players: t.players || [],
              ...t
            })));
            fillers.forEach(t => usedTeamIds.add(t.id || t.teamId));
          }
        }
        
        const europeanState = initializeEuropeanCompetitions(qualifiedTeams);
        dispatch({ type: 'INIT_EUROPEAN_COMPETITIONS', payload: europeanState });
        
        const playerQualComp = ['championsLeague', 'europaLeague', 'conferenceleague']
          .find(c => qualifiedTeams[c].some(t => (t.teamId || t.id) === selectedTeam.id));
        
        if (playerQualComp) {
          const compNames = {
            championsLeague: 'Continental Champions Cup',
            europaLeague: 'Continental Shield',
            conferenceleague: 'Continental Trophy'
          };
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + 50,
              type: 'european',
              titleKey: 'gameMessages.continentalCompetition',
              contentKey: 'gameMessages.teamPlaysContinental', contentParams: { comp: compNames[playerQualComp] },
              date: `${t('common.week')} 1`
            }
          });
        }
      } catch (err) {
        console.error('Error bootstrapping European competitions:', err);
      }
    }
    
    // ============================================================
    // CUP COMPETITION — Initialize domestic cup (first season too!)
    // ============================================================
    let cupBracket = null;
    let cupRounds = 0;
    try {
      const cupData = getCupTeams(selectedLeague, selectedTeam, otherLeagues, leagueData.table);
      if (cupData && cupData.teams.length >= 2) {
        cupBracket = generateCupBracket(cupData.teams, selectedTeam.id);
        if (cupBracket) {
          cupRounds = cupBracket.rounds.length;
        }
      }
    } catch (err) {
      console.warn('Error initializing cup competition:', err);
    }

    if (cupBracket) {
      dispatch({ type: 'INIT_CUP_COMPETITION', payload: cupBracket });
    }

    // ============================================================
    // SEASON CALENDAR — Build and remap fixtures for European/Cup weeks
    // ============================================================
    try {
      const hasEuropean = true; // European comps were just initialized above
      const totalLeagueMDs = leagueData.fixtures.length > 0
        ? Math.max(...leagueData.fixtures.map(f => f.week))
        : 38;
      const europeanCalendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean, cupRounds });
      const remappedFixtures = remapFixturesForEuropean(leagueData.fixtures, europeanCalendar.leagueWeekMap);
      
      // Update fixtures with remapped weeks
      dispatch({ type: 'SET_FIXTURES', payload: remappedFixtures });
      dispatch({ type: 'SET_EUROPEAN_CALENDAR', payload: europeanCalendar });
    } catch (err) {
      console.error('Error building season calendar:', err);
    }
    
    const objectives = generateSeasonObjectives(selectedTeam, selectedLeague, leagueData.table);
    dispatch({ type: 'SET_SEASON_OBJECTIVES', payload: objectives });
    
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Date.now(),
        type: 'welcome',
        titleKey: 'gameMessages.welcomeTitle',
        contentKey: 'gameMessages.welcomeContent', contentParams: { team: selectedTeam.name },
        date: `${t('common.week')} 1`
      }
    });
    
    const criticalObj = objectives?.find(o => o.priority === 'critical');
    if (criticalObj) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 1,
          type: 'objectives',
          title: t('objectives.seasonObjectives'),
          content: `${t('objectives.boardExpects')}: ${criticalObj.nameKey ? t(criticalObj.nameKey) : criticalObj.name}. ${criticalObj.descKey ? t(criticalObj.descKey) : criticalObj.description}.`,
          date: `${t('common.week')} 1`
        }
      });
    }

    if (cupBracket) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 2,
          type: 'cup',
          titleKey: 'gameMessages.cupParticipationTitle', titleParams: { icon: cupBracket.config?.icon || '🏆', cup: cupBracket.config?.name || 'Cup' },
          contentKey: 'gameMessages.cupParticipationContent', contentParams: { cup: cupBracket.config?.name || 'Cup', rounds: cupBracket.rounds.length },
          date: `${t('common.week')} 1`
        }
      });
    }

    // Si hay un slot pendiente y usuario autenticado, guardar automáticamente
    const pendingSlot = localStorage.getItem('pcfutbol_pending_slot');
    if (pendingSlot !== null && isAuthenticated && user?.uid) {
      const slotIndex = Number.parseInt(pendingSlot, 10);
      localStorage.removeItem('pcfutbol_pending_slot');

      if (!Number.isInteger(slotIndex) || slotIndex < 0) {
        console.warn('Ignoring invalid pending save slot:', pendingSlot);
        return;
      }
      
      // Construir el estado inicial para guardar
      const initialGameState = {
        gameStarted: true,
        currentWeek: 1,
        currentSeason: 1,
        teamId: selectedTeam.id,
        team: { ...selectedTeam },
        money: selectedTeam.budget,
        leagueTable: leagueData.table,
        fixtures: leagueData.fixtures,
        seasonObjectives: objectives
      };
      
      try {
        const { saveGameToSlot } = await loadSaveModules();
        await saveGameToSlot(user.uid, slotIndex, initialGameState);
        console.log(`💾 Partida guardada automáticamente en hueco ${slotIndex + 1}`);
      } catch (err) {
        console.error('Error guardando partida inicial:', err);
      }
    }
  };
  
  const formatMoney = (amount) => {
    if (!amount) return '€0';
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(0)}M`;
    return `€${(amount / 1000).toFixed(0)}K`;
  };

  const getDifficulty = (team) => {
    if (!team?.budget) return { label: t('teamSelection.diffNormal'), color: '#ffd60a', stars: 3 };
    if (team.budget >= 150000000) return { label: t('teamSelection.diffEasy'), color: '#30d158', stars: 1 };
    if (team.budget >= 80000000) return { label: t('teamSelection.diffNormal'), color: '#ffd60a', stars: 2 };
    if (team.budget >= 40000000) return { label: t('teamSelection.diffMedium'), color: '#ff9f0a', stars: 3 };
    if (team.budget >= 15000000) return { label: t('teamSelection.diffHard'), color: '#ff6b35', stars: 4 };
    return { label: t('teamSelection.diffVeryHard'), color: '#ff453a', stars: 5 };
  };

  const getAvgOverall = (team) => {
    if (!team?.players?.length) return 0;
    return Math.round(team.players.reduce((sum, p) => sum + p.overall, 0) / team.players.length);
  };

  // Determinar qué mostrar en cada paso (simplificado a 2 pasos)
  const getCurrentStepContent = () => {
    // PASO 1: Mapa con países + panel de ligas
    if (step === 1) return 'countries';
    
    // PASO 2: Grupos (si aplica) o Equipos
    if (step === 2) {
      if (hasGroups && !selectedGroup) return 'groups';
      return 'teams';
    }
    
    return 'countries';
  };
  
  const currentContent = getCurrentStepContent();
  const showMobileTeamTabs = currentContent === 'teams' && isMobileTeamLayout;
  const teamsPanelClasses = `teams-panel${showMobileTeamTabs && mobileTeamsView === 'details' ? ' teams-panel--hidden-mobile' : ''}`;
  const detailsPanelClasses = `details-panel${showMobileTeamTabs ? ' details-panel--mobile-tab' : ''}${showMobileTeamTabs && mobileTeamsView !== 'details' ? ' details-panel--hidden-mobile' : ''}`;

  // Calcular paso visual para el progress bar (simplificado)
  const getVisualStep = () => {
    return step === 1 ? 1 : 2;
  };
  
  return (
    <div className="pcf-team-select">
      {/* HEADER */}
      <div className="pcf-ts-header">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <ArrowLeft size={16} /> {step === 1 ? (selectedCountry ? t('teamSelection.countries') : t('common.menu')) : t('common.back')}
          </button>
        </div>
        <div className="header-center">
          <h1>{t('teamSelection.title')}</h1>
        </div>
        <div className="header-right">
          <div className="step-indicator">
            {t('teamSelection.step', { current: getVisualStep(), total: totalSteps })}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR - Solo 2 pasos: País/Liga y Equipo */}
      <div className="pcf-ts-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-num">1</div>
          <div className="step-label">{t('teamSelection.countryLeague')}</div>
        </div>
        <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-num">2</div>
          <div className="step-label">{t('teamSelection.teamLabel')}</div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="pcf-ts-content">
        {/* PAÍSES - Mapa interactivo */}
        {currentContent === 'countries' && (
          <div className="map-selection">
            {/* Row con mapa y panel */}
            <div className="map-selection__row">
              {/* Globo unificado con todos los países */}
              <div className="map-selection__map">
                <WorldMap
                  countries={COUNTRIES}
                  selectedCountry={selectedCountry?.id}
                  onCountryClick={(countryId) => {
                    const country = COUNTRIES.find(c => c.id === countryId);
                    if (country) setSelectedCountry(country);
                  }}
                />
              </div>
              
              {/* Panel de ligas del país seleccionado */}
              <div className="map-selection__panel">
              {selectedCountry ? (
                <>
                  <div className="map-selection__title">
                    <span className={`flag ${selectedCountry.flagVariant === 'code' ? 'flag--code' : ''}`.trim()}>{selectedCountry.flag}</span>
                    {selectedCountry.nameKey ? t(selectedCountry.nameKey) : selectedCountry.name}
                  </div>
                  <div className="map-selection__leagues">
                    {selectedCountry.leagues.map(leagueId => {
                      const leagueTeams = getLeagueTeams(leagueId);
                      const hasGroupsForLeague = LEAGUES_WITH_GROUPS.includes(leagueId);
                      const groups = hasGroupsForLeague ? getLeagueGroups(leagueId) : null;
                      const numGroups = groups ? Object.keys(groups).length : 0;
                      
                      return (
                        <button
                          key={leagueId}
                          className={`map-selection__league ${leagueTeams.length === 0 ? 'disabled' : ''}`}
                          onClick={() => leagueTeams.length > 0 && handleSelectLeague(leagueId)}
                          disabled={leagueTeams.length === 0}
                        >
                          <div>
                            <div className="map-selection__league-name">{LEAGUE_NAMES[leagueId]}</div>
                            <div className="map-selection__league-info">
                              {leagueTeams.length > 0 
                                ? hasGroupsForLeague 
                                  ? t('teamSelection.groupsAndTeams', { groups: numGroups, teams: leagueTeams.length })
                                  : t('teamSelection.teamsCount', { count: leagueTeams.length })
                                : t('teamSelection.comingSoon')
                              }
                            </div>
                          </div>
                          <span className="map-selection__league-arrow">
                            {leagueTeams.length > 0 ? <ChevronRight size={18} /> : <Lock size={14} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="map-selection__title">
                    <Map size={20} /> {t('teamSelection.mobileSelectCountry')}
                  </div>
                  <div className="map-selection__countries">
                    <div className="map-selection__continent-header">🌍 {t('teamSelection.continentEurope')}</div>
                    {EUROPEAN_COUNTRIES.map(country => (
                      <button
                        key={country.id}
                        className="map-selection__country-card"
                        onClick={() => setSelectedCountry(country)}
                      >
                        <span className={`map-selection__country-flag ${country.flagVariant === 'code' ? 'map-selection__country-flag--code' : ''}`.trim()}>
                          {country.flag}
                        </span>
                        <span className="map-selection__country-name">{country.nameKey ? t(country.nameKey) : country.id}</span>
                        <span className="map-selection__country-teams">
                          {country.leagues.length}
                        </span>
                      </button>
                    ))}
                    <div className="map-selection__continent-header">🌎 {t('teamSelection.continentSouthAmerica')}</div>
                    {SOUTH_AMERICAN_COUNTRIES.map(country => (
                      <button
                        key={country.id}
                        className="map-selection__country-card"
                        onClick={() => setSelectedCountry(country)}
                      >
                        <span className="map-selection__country-flag">{country.flag}</span>
                        <span className="map-selection__country-name">{country.nameKey ? t(country.nameKey) : country.id}</span>
                        <span className="map-selection__country-teams">
                          {country.leagues.length}
                        </span>
                      </button>
                    ))}
                    <div className="map-selection__continent-header">🌏 {t('teamSelection.continentRestOfWorld')}</div>
                    {REST_OF_WORLD_COUNTRIES.map(country => (
                      <button
                        key={country.id}
                        className="map-selection__country-card"
                        onClick={() => setSelectedCountry(country)}
                      >
                        <span className="map-selection__country-flag">{country.flag}</span>
                        <span className="map-selection__country-name">{country.nameKey ? t(country.nameKey) : country.id}</span>
                        <span className="map-selection__country-teams">
                          {country.leagues.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            </div>{/* Cierre map-selection__row */}
          </div>
        )}

        {/* GRUPOS */}
        {currentContent === 'groups' && selectedLeague && (
          <div className="groups-grid">
            <h2><ClipboardList size={20} /> {LEAGUE_NAMES[selectedLeague]} - {t('teamSelection.selectGroup')}</h2>
            <div className="groups-list">
              {Object.entries(getLeagueGroups(selectedLeague) || {}).map(([groupId, group]) => (
                <button
                  key={groupId}
                  className="group-card"
                  onClick={() => handleSelectGroup(groupId)}
                >
                  <div className="group-icon"><Trophy size={20} /></div>
                  <div className="info">
                    <span className="name">{group.name}</span>
                    <span className="meta">
                      {group.region ? `${group.region} • ` : ''}{t('teamSelection.teamsCount', { count: group.teams.length })}
                    </span>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EQUIPOS */}
        {currentContent === 'teams' && (
          <div className="teams-layout">
            {showMobileTeamTabs && (
              <div className="teams-mobile-tabs">
                <button
                  type="button"
                  className={`teams-mobile-tab ${mobileTeamsView === 'list' ? 'active' : ''}`}
                  onClick={() => setMobileTeamsView('list')}
                >
                  {t('teamSelection.teamLabel')}
                </button>
                <button
                  type="button"
                  className={`teams-mobile-tab ${mobileTeamsView === 'details' ? 'active' : ''}`}
                  onClick={() => selectedTeam && setMobileTeamsView('details')}
                  disabled={!selectedTeam}
                >
                  Datos
                </button>
              </div>
            )}

            {/* Panel izquierdo: Lista de equipos */}
            <div className={teamsPanelClasses}>
              <div className="panel-header">
                <span className="league-name">
                  <span className={`league-country-flag ${selectedCountry?.flagVariant === 'code' ? 'league-country-flag--code' : ''}`.trim()}>{selectedCountry?.flag}</span> {LEAGUE_NAMES[selectedLeague]}
                  {selectedGroup && ` - ${getLeagueGroups(selectedLeague)?.[selectedGroup]?.name}`}
                </span>
                <span className="team-count">{t('teamSelection.teamsCount', { count: teams.length })}</span>
              </div>
              
              <div className="search-box">
                <input
                  type="text"
                  placeholder={t('teamSelection.searchTeam')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="teams-list">
                {filteredTeams.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#95a5a6' }}>
                    {searchTerm ? t('teamSelection.searchTeam') : t('teamSelection.noTeamsAvailable')}
                  </div>
                )}
                {filteredTeams.map((team, idx) => {
                  const difficulty = getDifficulty(team);
                  const avgOvr = getAvgOverall(team);
                  const isSelected = selectedTeam?.id === team.id;
                  
                  return (
                    <button
                      key={team.id}
                      className={`team-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectTeam(team)}
                    >
                      <span className="team-num">{idx + 1}</span>
                      <TeamCrest teamId={team.id} size={28} />
                      <div className="team-info">
                        <span className="name">{team.name}</span>
                        <span className="city">{team.city}</span>
                      </div>
                      <span className="team-ovr">{avgOvr || '??'}</span>
                      <span className="team-diff" style={{ color: difficulty.color }}>
                        {Array.from({ length: difficulty.stars }, (_, i) => <Star key={i} size={12} style={{fill:'currentColor'}} />)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Panel derecho: Detalles del equipo */}
            <div className={detailsPanelClasses}>
              {selectedTeam ? (
                <div className="team-details">
                  {/* Header del equipo */}
                  <div 
                    className="team-header"
                    style={{ 
                      '--primary': selectedTeam.colors?.primary || '#1a3a5a',
                      '--secondary': selectedTeam.colors?.secondary || '#fff'
                    }}
                  >
                    <div className="badge-large">
                      <TeamCrest teamId={selectedTeam.id} size={64} />
                    </div>
                    <div className="team-title">
                      <h2>{selectedTeam.name}</h2>
                      <p>{selectedTeam.city}{selectedCountry?.nameKey ? `, ${t(selectedCountry.nameKey)}` : ''}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="icon"><Building2 size={16} /></span>
                      <span className="label">{t('teamSelection.stadium')}</span>
                      <span className="value">{getStadiumInfo(selectedTeam.id, selectedTeam.reputation)?.name || selectedTeam.stadium || t('teamSelection.municipal')}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon"><Users size={16} /></span>
                      <span className="label">{t('teamSelection.capacity')}</span>
                      <span className="value">{(getStadiumInfo(selectedTeam.id, selectedTeam.reputation)?.capacity || selectedTeam.stadiumCapacity || 15000).toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon"><DollarSign size={16} /></span>
                      <span className="label">{t('common.budget')}</span>
                      <span className="value highlight">{formatMoney(selectedTeam.budget)}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon"><Star size={16} /></span>
                      <span className="label">{t('teamSelection.reputation')}</span>
                      <span className="value">{selectedTeam.reputation || 70}/100</span>
                    </div>
                  </div>

                  {/* Dificultad */}
                  <div className="difficulty-bar">
                    <span className="label">{t('teamSelection.difficulty')}:</span>
                    <span 
                      className="difficulty-value"
                      style={{ color: getDifficulty(selectedTeam).color }}
                    >
                      {getDifficulty(selectedTeam).label} {Array.from({ length: getDifficulty(selectedTeam).stars }, (_, i) => <Star key={i} size={12} style={{fill:'currentColor'}} />)}
                    </span>
                  </div>

                  {/* Plantilla destacada */}
                  {selectedTeam.players && selectedTeam.players.length > 0 && (
                    <div className="squad-preview">
                      <h3><Star size={16} /> {t('teamSelection.topPlayers')}</h3>
                      <div className="players-list">
                        {selectedTeam.players
                          .sort((a, b) => b.overall - a.overall)
                          .slice(0, 5)
                          .map((player, idx) => (
                            <div key={idx} className="player-row">
                              <span className="pos">{translatePosition(player.position)}</span>
                              <span className="name">{player.name}</span>
                              <span className="ovr">{player.overall}</span>
                            </div>
                          ))}
                      </div>
                      <div className="squad-total">
                        <ClipboardList size={14} /> {t('teamSelection.playersInSquad', { count: selectedTeam.players.length })}
                      </div>
                    </div>
                  )}

                  {/* Botón comenzar */}
                  <button className="btn-start" onClick={handleShowPreseason}>
                    <FootballIcon size={16} /> {t('teamSelection.startWith', { team: selectedTeam.name?.toUpperCase() })}
                  </button>
                </div>
              ) : (
                <div className="no-selection">
                  <span className="icon"><ChevronRight size={24} style={{transform:'rotate(180deg)'}} /></span>
                  <p>{t('teamSelection.selectTeamFromList')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Pretemporada */}
      {showPreseason && (
        <div className="preseason-modal-overlay">
          <div className="preseason-modal">
            <div className="preseason-header">
              <Calendar size={32} className="header-icon" />
              <div>
                <h1>{t('teamSelection.preseasonTitle', { team: selectedTeam?.name })}</h1>
                <p>{t('teamSelection.chooseFriendlyPackage')}</p>
              </div>
            </div>
            
            <div className="preseason-options">
              {preseasonOptions.map(option => {
                const avgOvr = option.matches.length > 0
                  ? Math.round(option.matches.reduce((s, m) => s + (m.opponent?.reputation || 0), 0) / option.matches.length)
                  : 0;
                return (
                  <div 
                    key={option.id}
                    className={`preseason-card ${selectedPreseason?.id === option.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPreseason(option)}
                  >
                    <div className="card-header">
                      <FootballIcon size={20} />
                      <h3>{option.name}</h3>
                      <span className="avg-ovr">{t('teamSelection.avgOvr')}: {avgOvr}</span>
                    </div>
                    
                    <div className="matches-preview">
                      <ul>
                        {option.matches.map((match, idx) => (
                          <li key={idx}>
                            <span className="match-location">
                              {match.isHome ? <Home size={14} /> : <Plane size={14} />}
                            </span>
                            <span className="opponent-name">{match.opponent?.name || 'TBD'}</span>
                            <span className="opponent-ovr">{match.opponent?.reputation || '??'} OVR</span>
                            {match.isPresentationMatch && (
                              <span className="presentation-badge">
                                <Sparkles size={12} /> {t('teamSelection.presentation')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="preseason-actions">
              <button 
                className="btn-back" 
                onClick={() => {
                  setShowPreseason(false);
                  setSelectedPreseason(null);
                }}
              >
                <ArrowLeft size={16} /> {t('common.back')}
              </button>
              <button 
                className="btn-confirm"
                onClick={handleStartGame}
                disabled={!selectedPreseason}
              >
                {t('teamSelection.startSeason')}
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
