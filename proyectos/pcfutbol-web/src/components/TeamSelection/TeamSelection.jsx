import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { saveGameToSlot } from '../../firebase/savesService';
import { getLeagueTier } from '../../game/leagueTiers';
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
  getJLeagueTeams
} from '../../data/teamsFirestore';
import { getStadiumInfo, getStadiumLevel } from '../../data/stadiumCapacities';
import { initializeLeague } from '../../game/leagueEngine';
import { initializeOtherLeagues, LEAGUE_CONFIG } from '../../game/multiLeagueEngine';
import { generateSeasonObjectives } from '../../game/objectivesEngine';
import { generatePreseasonOptions } from '../../game/seasonManager';
import { qualifyTeamsForEurope, LEAGUE_SLOTS, buildSeasonCalendar, remapFixturesForEuropean } from '../../game/europeanCompetitions';
import { initializeEuropeanCompetitions } from '../../game/europeanSeason';
import { isSouthAmericanLeague, qualifyTeamsForSouthAmerica, SA_LEAGUE_SLOTS } from '../../game/southAmericanCompetitions';
import { initializeSACompetitions } from '../../game/southAmericanSeason';
import { getCupTeams, generateCupBracket } from '../../game/cupSystem';
import { Calendar, Plane, Home, Sparkles, ChevronRight, Lock, Map, ClipboardList, Trophy, Building2, Users, DollarSign, Star } from 'lucide-react';
import FootballIcon from '../icons/FootballIcon';
import WorldMap from './WorldMap';
import './TeamSelection.scss';
import './WorldMap.scss';

const EUROPEAN_COUNTRIES = [
  { id: 'spain', name: 'España', flag: '🇪🇸', leagues: ['laliga', 'segunda', 'primeraRFEF', 'segundaRFEF'] },
  { id: 'england', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagues: ['premierLeague', 'championship'] },
  { id: 'italy', name: 'Italia', flag: '🇮🇹', leagues: ['serieA', 'serieB'] },
  { id: 'germany', name: 'Alemania', flag: '🇩🇪', leagues: ['bundesliga', 'bundesliga2'] },
  { id: 'france', name: 'Francia', flag: '🇫🇷', leagues: ['ligue1', 'ligue2'] },
  { id: 'netherlands', name: 'Países Bajos', flag: '🇳🇱', leagues: ['eredivisie'] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', leagues: ['primeiraLiga'] },
  { id: 'belgium', name: 'Bélgica', flag: '🇧🇪', leagues: ['belgianPro'] },
  { id: 'turkey', name: 'Turquía', flag: '🇹🇷', leagues: ['superLig'] },
  { id: 'scotland', name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', leagues: ['scottishPrem'] },
  { id: 'switzerland', name: 'Suiza', flag: '🇨🇭', leagues: ['swissSuperLeague'] },
  { id: 'austria', name: 'Austria', flag: '🇦🇹', leagues: ['austrianBundesliga'] },
  { id: 'greece', name: 'Grecia', flag: '🇬🇷', leagues: ['greekSuperLeague'] },
  { id: 'denmark', name: 'Dinamarca', flag: '🇩🇰', leagues: ['danishSuperliga'] },
  { id: 'croatia', name: 'Croacia', flag: '🇭🇷', leagues: ['croatianLeague'] },
  { id: 'czech', name: 'Chequia', flag: '🇨🇿', leagues: ['czechLeague'] },
];

const SOUTH_AMERICAN_COUNTRIES = [
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', leagues: ['argentinaPrimera'] },
  { id: 'brazil', name: 'Brasil', flag: '🇧🇷', leagues: ['brasileiraoA'] },
  { id: 'colombia', name: 'Colombia', flag: '🇨🇴', leagues: ['colombiaPrimera'] },
  { id: 'chile', name: 'Chile', flag: '🇨🇱', leagues: ['chilePrimera'] },
  { id: 'uruguay', name: 'Uruguay', flag: '🇺🇾', leagues: ['uruguayPrimera'] },
  { id: 'ecuador', name: 'Ecuador', flag: '🇪🇨', leagues: ['ecuadorLigaPro'] },
  { id: 'paraguay', name: 'Paraguay', flag: '🇵🇾', leagues: ['paraguayPrimera'] },
  { id: 'peru', name: 'Perú', flag: '🇵🇪', leagues: ['peruLiga1'] },
  { id: 'bolivia', name: 'Bolivia', flag: '🇧🇴', leagues: ['boliviaPrimera'] },
  { id: 'venezuela', name: 'Venezuela', flag: '🇻🇪', leagues: ['venezuelaPrimera'] },
];

const REST_OF_WORLD_COUNTRIES = [
  { id: 'usa', name: 'Estados Unidos', flag: '🇺🇸', leagues: ['mls'] },
  { id: 'saudiArabia', name: 'Arabia Saudí', flag: '🇸🇦', leagues: ['saudiPro'] },
  { id: 'mexico', name: 'México', flag: '🇲🇽', leagues: ['ligaMX'] },
  { id: 'japan', name: 'Japón', flag: '🇯🇵', leagues: ['jLeague'] },
];

const COUNTRIES = [...EUROPEAN_COUNTRIES, ...SOUTH_AMERICAN_COUNTRIES, ...REST_OF_WORLD_COUNTRIES];

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

const LEAGUE_NAMES = {
  laliga: 'La Liga EA Sports',
  segunda: 'La Liga Hypermotion',
  primeraRFEF: 'Primera Federación',
  segundaRFEF: 'Segunda Federación',
  premierLeague: 'Premier League',
  ligue1: 'Ligue 1',
  bundesliga: 'Bundesliga',
  serieA: 'Serie A',
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
  // South America
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
  // Rest of World
  mls: 'Major League Soccer',
  saudiPro: 'Saudi Pro League',
  ligaMX: 'Liga MX',
  jLeague: 'J1 League',
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
    setStep(2); // Ir a paso 2 (grupos o equipos)
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroup(groupId);
    // Se queda en step 2, pero ahora muestra equipos
  };

  const handleSelectTeam = (team) => {
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
    ...getMLSTeams(), ...getSaudiTeams(), ...getLigaMXTeams(), ...getJLeagueTeams()
  ];

  const handleShowPreseason = () => {
    if (!selectedTeam || !selectedLeague) return;
    
    // Generar opciones de pretemporada
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
    
    const leagueData = initializeLeague(leagueTeams, selectedTeam.id);
    
    // Obtener información del estadio real
    const stadiumInfo = getStadiumInfo(selectedTeam.id, selectedTeam.reputation);
    const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);
    
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
        preseasonPhase: true
      } 
    });
    
    dispatch({ type: 'SET_LEAGUE_TABLE', payload: leagueData.table });
    dispatch({ type: 'SET_FIXTURES', payload: leagueData.fixtures });
    dispatch({ type: 'SET_PLAYER_LEAGUE', payload: selectedLeague });
    
    // For group leagues, store the player's group ID
    if (hasGroups && selectedGroup) {
      dispatch({ type: 'SET_PLAYER_GROUP', payload: selectedGroup });
    }
    
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
    
    // Inicializar otras ligas para poder verlas en la clasificación
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
            copaLibertadores: 'Copa Libertadores',
            copaSudamericana: 'Copa Sudamericana'
          };
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + 50,
              type: 'southamerican',
              title: '¡Competición Continental!',
              content: `Tu equipo jugará la ${compNames[playerQualComp]} esta temporada.`,
              date: 'Semana 1'
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
            championsLeague: 'Champions League',
            europaLeague: 'Europa League',
            conferenceleague: 'Conference League'
          };
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now() + 50,
              type: 'european',
              title: '¡Competición Europea!',
              content: `Tu equipo jugará la ${compNames[playerQualComp]} esta temporada.`,
              date: 'Semana 1'
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
      const otherLeagues = state.otherLeagues || {};
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
        title: '¡Bienvenido al club!',
        content: `Has sido nombrado nuevo entrenador del ${selectedTeam.name}. La afición espera grandes cosas de ti.`,
        date: 'Semana 1'
      }
    });
    
    const criticalObj = objectives?.find(o => o.priority === 'critical');
    if (criticalObj) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 1,
          type: 'objectives',
          title: 'Objetivos de temporada',
          content: `La directiva espera: ${criticalObj.name}. ${criticalObj.description}.`,
          date: 'Semana 1'
        }
      });
    }

    if (cupBracket) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now() + 2,
          type: 'cup',
          title: `${cupBracket.config?.icon || '🏆'} ${cupBracket.config?.name || 'Copa'}`,
          content: `Tu equipo participará en la ${cupBracket.config?.name || 'Copa Nacional'} esta temporada. ${cupBracket.rounds.length} rondas hasta la final.`,
          date: 'Semana 1'
        }
      });
    }

    // Si hay un slot pendiente y usuario autenticado, guardar automáticamente
    const pendingSlot = localStorage.getItem('pcfutbol_pending_slot');
    if (pendingSlot !== null && isAuthenticated && user) {
      const slotIndex = parseInt(pendingSlot, 10);
      localStorage.removeItem('pcfutbol_pending_slot');
      
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
    if (!team?.budget) return { label: 'Normal', color: '#ffd60a', stars: 3 };
    if (team.budget >= 150000000) return { label: 'Fácil', color: '#30d158', stars: 1 };
    if (team.budget >= 80000000) return { label: 'Normal', color: '#ffd60a', stars: 2 };
    if (team.budget >= 40000000) return { label: 'Medio', color: '#ff9f0a', stars: 3 };
    if (team.budget >= 15000000) return { label: 'Difícil', color: '#ff6b35', stars: 4 };
    return { label: 'Muy difícil', color: '#ff453a', stars: 5 };
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
            ‹ {step === 1 ? (selectedCountry ? 'Países' : 'Menú') : 'Atrás'}
          </button>
        </div>
        <div className="header-center">
          <h1>SELECCIÓN DE EQUIPO</h1>
        </div>
        <div className="header-right">
          <div className="step-indicator">
            Paso {getVisualStep()} de {totalSteps}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR - Solo 2 pasos: País/Liga y Equipo */}
      <div className="pcf-ts-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-num">1</div>
          <div className="step-label">PAÍS / LIGA</div>
        </div>
        <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-num">2</div>
          <div className="step-label">EQUIPO</div>
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
                    <span className="flag">{selectedCountry.flag}</span>
                    {selectedCountry.name}
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
                                  ? `${numGroups} grupos • ${leagueTeams.length} equipos`
                                  : `${leagueTeams.length} equipos`
                                : 'Próximamente'
                              }
                            </div>
                          </div>
                          <span className="map-selection__league-arrow">
                            {leagueTeams.length > 0 ? <ChevronRight size={14} /> : <Lock size={14} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="map-selection__placeholder">
                  <div className="map-selection__placeholder-icon"><Map size={32} /></div>
                  <div className="map-selection__placeholder-text">
                    Selecciona un país en el mapa
                  </div>
                </div>
              )}
            </div>
            </div>{/* Cierre map-selection__row */}
          </div>
        )}

        {/* LIGAS */}
        {currentContent === 'leagues' && selectedCountry && (
          <div className="leagues-grid">
            <h2>{selectedCountry.flag} Ligas de {selectedCountry.name}</h2>
            <div className="leagues-list">
              {selectedCountry.leagues.map(leagueId => {
                const leagueTeams = getLeagueTeams(leagueId);
                const hasGroupsForLeague = LEAGUES_WITH_GROUPS.includes(leagueId);
                const groups = hasGroupsForLeague ? getLeagueGroups(leagueId) : null;
                const numGroups = groups ? Object.keys(groups).length : 0;
                
                return (
                  <button
                    key={leagueId}
                    className={`league-card ${leagueTeams.length === 0 ? 'disabled' : ''}`}
                    onClick={() => leagueTeams.length > 0 && handleSelectLeague(leagueId)}
                    disabled={leagueTeams.length === 0}
                  >
                    <div className="league-icon"><FootballIcon size={20} /></div>
                    <div className="info">
                      <span className="name">{LEAGUE_NAMES[leagueId]}</span>
                      <span className="meta">
                        {leagueTeams.length > 0 
                          ? hasGroupsForLeague 
                            ? `${numGroups} grupos • ${leagueTeams.length} equipos`
                            : `${leagueTeams.length} equipos disponibles`
                          : 'Próximamente'
                        }
                      </span>
                    </div>
                    <span className="arrow">{leagueTeams.length > 0 ? <ChevronRight size={14} /> : <Lock size={14} />}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GRUPOS */}
        {currentContent === 'groups' && selectedLeague && (
          <div className="groups-grid">
            <h2><ClipboardList size={20} /> {LEAGUE_NAMES[selectedLeague]} - Selecciona un grupo</h2>
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
                      {group.region ? `${group.region} • ` : ''}{group.teams.length} equipos
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
            {/* Panel izquierdo: Lista de equipos */}
            <div className="teams-panel">
              <div className="panel-header">
                <span className="league-name">
                  {selectedCountry?.flag} {LEAGUE_NAMES[selectedLeague]}
                  {selectedGroup && ` - ${getLeagueGroups(selectedLeague)?.[selectedGroup]?.name}`}
                </span>
                <span className="team-count">{teams.length} equipos</span>
              </div>
              
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar equipo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="teams-list">
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
                      <div 
                        className="team-badge"
                        style={{ 
                          background: team.colors?.primary || '#1a3a5a',
                          color: team.colors?.secondary || '#fff'
                        }}
                      >
                        {team.shortName?.slice(0, 3) || team.name?.slice(0, 3)}
                      </div>
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
            <div className="details-panel">
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
                      {selectedTeam.shortName || selectedTeam.name?.slice(0, 3)}
                    </div>
                    <div className="team-title">
                      <h2>{selectedTeam.name}</h2>
                      <p>{selectedTeam.city}, {selectedCountry?.name}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="icon"><Building2 size={16} /></span>
                      <span className="label">Estadio</span>
                      <span className="value">{selectedTeam.stadium || 'Municipal'}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon"><Users size={16} /></span>
                      <span className="label">Capacidad</span>
                      <span className="value">{(selectedTeam.stadiumCapacity || 15000).toLocaleString()}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon"><DollarSign size={16} /></span>
                      <span className="label">Presupuesto</span>
                      <span className="value highlight">{formatMoney(selectedTeam.budget)}</span>
                    </div>
                    <div className="stat-card">
                      <span className="icon"><Star size={16} /></span>
                      <span className="label">Reputación</span>
                      <span className="value">{selectedTeam.reputation || 70}/100</span>
                    </div>
                  </div>

                  {/* Dificultad */}
                  <div className="difficulty-bar">
                    <span className="label">Dificultad:</span>
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
                      <h3><Star size={16} /> Jugadores destacados</h3>
                      <div className="players-list">
                        {selectedTeam.players
                          .sort((a, b) => b.overall - a.overall)
                          .slice(0, 5)
                          .map((player, idx) => (
                            <div key={idx} className="player-row">
                              <span className="pos">{player.position}</span>
                              <span className="name">{player.name}</span>
                              <span className="ovr">{player.overall}</span>
                            </div>
                          ))}
                      </div>
                      <div className="squad-total">
                        <ClipboardList size={14} /> {selectedTeam.players.length} jugadores en plantilla
                      </div>
                    </div>
                  )}

                  {/* Botón comenzar */}
                  <button className="btn-start" onClick={handleShowPreseason}>
                    <FootballIcon size={16} /> COMENZAR CON {selectedTeam.name?.toUpperCase()}
                  </button>
                </div>
              ) : (
                <div className="no-selection">
                  <span className="icon"><ChevronRight size={24} style={{transform:'rotate(180deg)'}} /></span>
                  <p>Selecciona un equipo de la lista</p>
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
                <h1>Pretemporada {selectedTeam?.name}</h1>
                <p>Elige tu paquete de amistosos</p>
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
                      <span className="avg-ovr">Media: {avgOvr} OVR</span>
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
                                <Sparkles size={12} /> Presentación
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
                Volver
              </button>
              <button 
                className="btn-confirm"
                onClick={handleStartGame}
                disabled={!selectedPreseason}
              >
                Comenzar Temporada
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
