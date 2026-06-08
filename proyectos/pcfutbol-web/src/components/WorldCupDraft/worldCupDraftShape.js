// Pure (no Firebase, no DOM) helpers that describe the World Cup Draft data
// shape and how the Firestore-sharded model reassembles into the exact raw
// `{ editions: [...] }` document the game already understood. Keeping these
// pure lets the offline audit validate the assembly without a live Firebase.

export const WORLD_CUP_DRAFT_EDITIONS_COLLECTION = 'world_cup_draft_editions';
export const WORLD_CUP_DRAFT_TEAMS_SUBCOLLECTION = 'teams';
export const WORLD_CUP_DRAFT_METADATA_DOC = 'world_cup_draft';

// Fields the upload script adds to team docs purely to make the sharded model
// reassemble deterministically. They are stripped on read so the reconstructed
// raw shape matches the original bundled JSON exactly.
const TEAM_HELPER_FIELDS = ['order', 'editionId'];

export function editionDocId(year) {
  return `worldcup-${year}`;
}

// Turn an edition into the slimmed metadata doc (no teams/players) that lives in
// `world_cup_draft_editions/{id}`.
export function editionToDoc(edition) {
  const teams = Array.isArray(edition.teams) ? edition.teams : [];
  const playerCount = teams.reduce((sum, team) => sum + (team.players?.length || 0), 0);
  return {
    id: editionDocId(edition.year),
    year: Number(edition.year),
    source: edition.source || null,
    teamCount: teams.length,
    playerCount,
  };
}

// Turn a team into its subcollection doc, tagging it with helper fields so the
// edition + index ordering survives the round trip through Firestore.
export function teamToDoc(team, editionId, order) {
  return { ...team, editionId, order };
}

function stripTeamHelperFields(teamDoc) {
  const team = { ...teamDoc };
  for (const field of TEAM_HELPER_FIELDS) delete team[field];
  return team;
}

// Reassemble the raw `{ editions: [...] }` shape from the sharded Firestore docs.
// `editionDocs` is the flat list of edition metadata docs; `teamDocsByEditionId`
// maps an edition doc id to its array of team docs.
export function assembleRawFromFirestore(editionDocs, teamDocsByEditionId) {
  const editions = [...editionDocs]
    .sort((a, b) => Number(a.year) - Number(b.year))
    .map((editionDoc) => {
      const id = editionDoc.id || editionDocId(editionDoc.year);
      const teamDocs = teamDocsByEditionId.get(id) || [];
      const teams = [...teamDocs]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(stripTeamHelperFields);
      return {
        year: Number(editionDoc.year),
        source: editionDoc.source || undefined,
        teams,
      };
    });
  return { editions };
}

// Normalize the raw database into the flattened shape the UI consumes. This is
// the exact logic that previously lived inline in WorldCupDraft.jsx.
export function normalizeDatabase(raw) {
  const editions = Array.isArray(raw?.editions) ? raw.editions : [];
  const teams = editions.flatMap((edition) => {
    const year = Number(edition.year);
    return (edition.teams || []).map((team) => ({
      ...team,
      year,
      rating: Number(team.rating || 70),
      attack: Number(team.attack || team.rating || 70),
      midfield: Number(team.midfield || team.rating || 70),
      defense: Number(team.defense || team.rating || 70),
      players: (team.players || []).map((player) => ({
        ...player,
        id: player.id || `${team.id}-${player.name}`,
        year,
        teamId: team.id,
        tournamentTeam: team.countryEs || team.country,
        rating: Number(player.rating || 60),
      })),
    }));
  });
  return {
    editions,
    teams,
    players: teams.flatMap((team) => team.players),
  };
}
