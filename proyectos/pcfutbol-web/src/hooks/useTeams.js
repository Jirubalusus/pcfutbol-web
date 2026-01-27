// ============================================================
// PC FÚTBOL WEB - useTeams Hook
// Hook para cargar y manejar datos de equipos desde Firestore
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import teamsService from '../firebase/teamsService';

// Hook para cargar ligas
export function useLeagues() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await teamsService.getLeagues();
        setLeagues(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { leagues, loading, error };
}

// Hook para cargar equipos de una liga
export function useTeamsByLeague(leagueId) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leagueId) {
      setTeams([]);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const data = await teamsService.getTeamsByLeague(leagueId);
        setTeams(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leagueId]);

  return { teams, loading, error };
}

// Hook para cargar un equipo específico
export function useTeam(teamId) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const data = await teamsService.getTeam(teamId);
        setTeam(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId]);

  return { team, loading, error };
}

// Hook para buscar equipos
export function useTeamSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (term, leagueFilter = null) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await teamsService.searchTeams(term, leagueFilter);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

// Hook para buscar jugadores en el mercado
export function usePlayerSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (term, filters = {}) => {
    try {
      setLoading(true);
      const data = await teamsService.searchPlayers(term, filters);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

// Hook para cargar todas las ligas españolas (para selección de equipo)
export function useSpanishLeagues() {
  const [data, setData] = useState({
    laliga: [],
    laliga2: [],
    primeraRfef: [],
    segundaRfef: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [laliga, laliga2, primeraRfef, segundaRfef] = await Promise.all([
          teamsService.getTeamsByLeague('laliga'),
          teamsService.getTeamsByLeague('laliga2'),
          teamsService.getTeamsByLeague('primera-rfef'),
          teamsService.getTeamsByLeague('segunda-rfef')
        ]);
        setData({ laliga, laliga2, primeraRfef, segundaRfef });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { ...data, loading, error };
}

// Hook para cargar todos los equipos (mercado de fichajes)
export function useAllTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await teamsService.loadAllTeams();
        setTeams(data.all);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { teams, loading, error };
}

export default {
  useLeagues,
  useTeamsByLeague,
  useTeam,
  useTeamSearch,
  usePlayerSearch,
  useSpanishLeagues,
  useAllTeams
};
