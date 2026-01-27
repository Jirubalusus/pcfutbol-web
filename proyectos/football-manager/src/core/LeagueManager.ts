/**
 * LeagueManager - Manages leagues, fixtures, and standings
 */

import { GameState, Match, Team, Season } from '../types';

export class LeagueManager {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  /**
   * Get matches scheduled for a specific date
   */
  getMatchesForDate(date: Date): Match[] {
    const dateStr = date.toISOString().split('T')[0];
    const matches: Match[] = [];

    for (const league of Object.values(this.state.currentSeason.leagues)) {
      for (const group of Object.values(league.groups)) {
        for (const match of group.fixtures) {
          if (match.date.startsWith(dateStr) && !match.played) {
            matches.push(match);
          }
        }
      }
    }

    return matches;
  }

  /**
   * Get next match for a team
   */
  getNextMatchForTeam(teamId: string): Match | null {
    const now = new Date(this.state.currentDate);
    let nextMatch: Match | null = null;

    for (const league of Object.values(this.state.currentSeason.leagues)) {
      for (const group of Object.values(league.groups)) {
        for (const match of group.fixtures) {
          if (!match.played && (match.homeTeamId === teamId || match.awayTeamId === teamId)) {
            const matchDate = new Date(match.date);
            if (!nextMatch || matchDate < new Date(nextMatch.date)) {
              nextMatch = match;
            }
          }
        }
      }
    }

    return nextMatch;
  }

  /**
   * Get upcoming matches for a team
   */
  getUpcomingMatches(teamId: string, count: number = 5): Match[] {
    const matches: Match[] = [];

    for (const league of Object.values(this.state.currentSeason.leagues)) {
      for (const group of Object.values(league.groups)) {
        for (const match of group.fixtures) {
          if (!match.played && (match.homeTeamId === teamId || match.awayTeamId === teamId)) {
            matches.push(match);
          }
        }
      }
    }

    return matches
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, count);
  }

  /**
   * Get recent results for a team
   */
  getRecentResults(teamId: string, count: number = 5): Match[] {
    const matches: Match[] = [];

    for (const league of Object.values(this.state.currentSeason.leagues)) {
      for (const group of Object.values(league.groups)) {
        for (const match of group.fixtures) {
          if (match.played && (match.homeTeamId === teamId || match.awayTeamId === teamId)) {
            matches.push(match);
          }
        }
      }
    }

    return matches
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }

  /**
   * Record a match result
   */
  recordResult(match: Match): void {
    // Update team stats
    const homeTeam = this.state.teams[match.homeTeamId];
    const awayTeam = this.state.teams[match.awayTeamId];

    if (homeTeam) {
      homeTeam.seasonStats.played++;
      homeTeam.seasonStats.goalsFor += match.homeScore || 0;
      homeTeam.seasonStats.goalsAgainst += match.awayScore || 0;

      if (match.homeScore! > match.awayScore!) {
        homeTeam.seasonStats.won++;
        homeTeam.seasonStats.points += 3;
        this.updateForm(homeTeam, 'W');
      } else if (match.homeScore! < match.awayScore!) {
        homeTeam.seasonStats.lost++;
        this.updateForm(homeTeam, 'L');
      } else {
        homeTeam.seasonStats.drawn++;
        homeTeam.seasonStats.points += 1;
        this.updateForm(homeTeam, 'D');
      }
    }

    if (awayTeam) {
      awayTeam.seasonStats.played++;
      awayTeam.seasonStats.goalsFor += match.awayScore || 0;
      awayTeam.seasonStats.goalsAgainst += match.homeScore || 0;

      if (match.awayScore! > match.homeScore!) {
        awayTeam.seasonStats.won++;
        awayTeam.seasonStats.points += 3;
        this.updateForm(awayTeam, 'W');
      } else if (match.awayScore! < match.homeScore!) {
        awayTeam.seasonStats.lost++;
        this.updateForm(awayTeam, 'L');
      } else {
        awayTeam.seasonStats.drawn++;
        awayTeam.seasonStats.points += 1;
        this.updateForm(awayTeam, 'D');
      }
    }

    // Update player stats from events
    if (match.events) {
      for (const event of match.events) {
        const player = this.state.players[event.playerId];
        if (!player) continue;

        switch (event.type) {
          case 'goal':
            player.seasonStats.goals++;
            break;
          case 'assist':
            player.seasonStats.assists++;
            break;
          case 'yellow':
            player.seasonStats.yellowCards++;
            break;
          case 'red':
            player.seasonStats.redCards++;
            player.suspended = true;
            player.suspendedMatches = 1;
            break;
        }
      }
    }

    // Update positions
    this.updatePositions(match.league, match.group);
  }

  /**
   * Get league table
   */
  getTable(leagueId: string, groupId: string): Team[] {
    const leagueData = this.state.leagues[leagueId];
    if (!leagueData) return [];

    const groupData = leagueData.groups[groupId];
    if (!groupData) return [];

    return groupData.teamIds
      .map(id => this.state.teams[id])
      .filter(Boolean)
      .sort((a, b) => {
        // Points
        if (b.seasonStats.points !== a.seasonStats.points) {
          return b.seasonStats.points - a.seasonStats.points;
        }
        // Goal difference
        const gdA = a.seasonStats.goalsFor - a.seasonStats.goalsAgainst;
        const gdB = b.seasonStats.goalsFor - b.seasonStats.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        // Goals scored
        return b.seasonStats.goalsFor - a.seasonStats.goalsFor;
      });
  }

  /**
   * Generate fixtures for a new season
   */
  generateFixtures(): void {
    for (const [leagueId, league] of Object.entries(this.state.leagues)) {
      for (const [groupId, group] of Object.entries(league.groups)) {
        const teamIds = group.teamIds;
        const fixtures = this.generateRoundRobin(teamIds, leagueId, groupId);
        
        if (!this.state.currentSeason.leagues[leagueId]) {
          this.state.currentSeason.leagues[leagueId] = { groups: {} };
        }
        this.state.currentSeason.leagues[leagueId].groups[groupId] = {
          teamIds,
          fixtures,
        };
      }
    }
  }

  /**
   * Process end of season (promotion/relegation)
   */
  processSeasonEnd(): void {
    // For Primera Federación - top 4 could promote
    // Bottom 4 relegate
    // This is simplified - real rules are more complex
    
    for (const [leagueId, league] of Object.entries(this.state.leagues)) {
      for (const [groupId] of Object.entries(league.groups)) {
        const table = this.getTable(leagueId, groupId);
        
        // Mark promotion/relegation (would need actual league structure)
        if (table.length >= 4) {
          console.log(`${leagueId} ${groupId}:`);
          console.log(`  Promotion zone: ${table.slice(0, 4).map(t => t.name).join(', ')}`);
          console.log(`  Relegation zone: ${table.slice(-4).map(t => t.name).join(', ')}`);
        }
      }
    }
  }

  private updateForm(team: Team, result: 'W' | 'D' | 'L'): void {
    team.seasonStats.form.push(result);
    if (team.seasonStats.form.length > 5) {
      team.seasonStats.form.shift();
    }
  }

  private updatePositions(leagueId: string, groupId: string): void {
    const table = this.getTable(leagueId, groupId);
    table.forEach((team, index) => {
      team.seasonStats.position = index + 1;
    });
  }

  private generateRoundRobin(teamIds: string[], leagueId: string, groupId: string): Match[] {
    const fixtures: Match[] = [];
    const teams = [...teamIds];
    
    // Ensure even number of teams
    if (teams.length % 2 !== 0) {
      teams.push('BYE');
    }

    const numTeams = teams.length;
    const numRounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    // Start date (August 15)
    const startDate = new Date(this.state.currentDate);
    startDate.setMonth(7, 15); // August 15

    let matchday = 1;

    // First half of season
    for (let round = 0; round < numRounds; round++) {
      const roundDate = new Date(startDate);
      roundDate.setDate(roundDate.getDate() + round * 7);

      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (numTeams - 1);
        let away = (numTeams - 1 - match + round) % (numTeams - 1);
        
        if (match === 0) {
          away = numTeams - 1;
        }

        if (teams[home] !== 'BYE' && teams[away] !== 'BYE') {
          fixtures.push({
            id: `${leagueId}_${groupId}_${matchday}_${match}`,
            homeTeamId: teams[home],
            awayTeamId: teams[away],
            date: roundDate.toISOString(),
            league: leagueId,
            group: groupId,
            matchday,
            played: false,
          });
        }
      }
      matchday++;
    }

    // Second half (reverse fixtures)
    const secondHalfStart = new Date(startDate);
    secondHalfStart.setDate(secondHalfStart.getDate() + numRounds * 7 + 14); // 2 week break

    for (let round = 0; round < numRounds; round++) {
      const roundDate = new Date(secondHalfStart);
      roundDate.setDate(roundDate.getDate() + round * 7);

      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (numTeams - 1);
        let away = (numTeams - 1 - match + round) % (numTeams - 1);
        
        if (match === 0) {
          away = numTeams - 1;
        }

        if (teams[home] !== 'BYE' && teams[away] !== 'BYE') {
          fixtures.push({
            id: `${leagueId}_${groupId}_${matchday}_${match}`,
            homeTeamId: teams[away], // Reversed
            awayTeamId: teams[home],
            date: roundDate.toISOString(),
            league: leagueId,
            group: groupId,
            matchday,
            played: false,
          });
        }
      }
      matchday++;
    }

    return fixtures;
  }
}
