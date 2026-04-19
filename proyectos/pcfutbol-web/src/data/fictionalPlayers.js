/**
 * Fictional Players — Fixed roster for Glory Mode user team
 * PES/ISS style invented players. Always the same 20.
 */

const GLORY_SQUAD = [
  // Goalkeepers (2) — specialists, no secondary positions
  { id: 'gl_01', name: 'Castolo', position: 'GK', secondaryPositions: [], overall: 61, potential: 74, age: 22, speed: 45, defense: 35, attack: 12, passing: 44, goalkeeping: 66, stamina: 78 },
  { id: 'gl_02', name: 'Madariaga', position: 'GK', secondaryPositions: [], overall: 56, potential: 70, age: 20, speed: 40, defense: 30, attack: 10, passing: 40, goalkeeping: 60, stamina: 74 },

  // Centre-backs (3)
  { id: 'gl_03', name: 'Minanda', position: 'CB', secondaryPositions: ['CDM'], overall: 62, potential: 76, age: 21, speed: 62, defense: 68, attack: 22, passing: 48, goalkeeping: 5, stamina: 80 },
  { id: 'gl_04', name: 'Barragán', position: 'CB', secondaryPositions: [], overall: 59, potential: 73, age: 23, speed: 58, defense: 64, attack: 20, passing: 44, goalkeeping: 4, stamina: 76 },
  { id: 'gl_05', name: 'Piedrahita', position: 'CB', secondaryPositions: ['LB'], overall: 56, potential: 70, age: 22, speed: 55, defense: 60, attack: 18, passing: 42, goalkeeping: 4, stamina: 74 },

  // Full-backs (2)
  { id: 'gl_06', name: 'Celades', position: 'LB', secondaryPositions: ['LM'], overall: 60, potential: 74, age: 21, speed: 72, defense: 58, attack: 40, passing: 54, goalkeeping: 3, stamina: 82 },
  { id: 'gl_07', name: 'Esnaola', position: 'RB', secondaryPositions: ['RM'], overall: 58, potential: 72, age: 22, speed: 70, defense: 56, attack: 38, passing: 50, goalkeeping: 3, stamina: 80 },

  // Defensive midfielder (1)
  { id: 'gl_08', name: 'Guerrero', position: 'CDM', secondaryPositions: ['CM'], overall: 59, potential: 73, age: 23, speed: 56, defense: 62, attack: 30, passing: 56, goalkeeping: 3, stamina: 82 },

  // Central midfielders (3)
  { id: 'gl_09', name: 'Olarticoechea', position: 'CM', secondaryPositions: ['CDM', 'CAM'], overall: 62, potential: 76, age: 21, speed: 64, defense: 46, attack: 48, passing: 64, goalkeeping: 3, stamina: 84 },
  { id: 'gl_10', name: 'Arconada', position: 'CM', secondaryPositions: ['CAM'], overall: 59, potential: 74, age: 20, speed: 60, defense: 44, attack: 44, passing: 60, goalkeeping: 2, stamina: 80 },
  { id: 'gl_11', name: 'Samaniego', position: 'CM', secondaryPositions: ['CDM'], overall: 56, potential: 71, age: 22, speed: 58, defense: 42, attack: 42, passing: 56, goalkeeping: 2, stamina: 78 },

  // Attacking midfielder (1)
  { id: 'gl_12', name: 'Orsini', position: 'CAM', secondaryPositions: ['CM', 'CF'], overall: 63, potential: 78, age: 20, speed: 66, defense: 22, attack: 56, passing: 64, goalkeeping: 2, stamina: 78 },

  // Wingers (2)
  { id: 'gl_13', name: 'Castañeda', position: 'LW', secondaryPositions: ['LM'], overall: 61, potential: 76, age: 21, speed: 76, defense: 20, attack: 54, passing: 52, goalkeeping: 1, stamina: 80 },
  { id: 'gl_14', name: 'Zubeldia', position: 'RW', secondaryPositions: ['RM'], overall: 59, potential: 74, age: 20, speed: 78, defense: 18, attack: 52, passing: 50, goalkeeping: 1, stamina: 78 },

  // Wide midfielders (2)
  { id: 'gl_15', name: 'Garmendia', position: 'LM', secondaryPositions: ['LW'], overall: 57, potential: 72, age: 22, speed: 68, defense: 34, attack: 48, passing: 54, goalkeeping: 2, stamina: 80 },
  { id: 'gl_16', name: 'Zaldivar', position: 'RM', secondaryPositions: ['RW'], overall: 55, potential: 70, age: 23, speed: 66, defense: 32, attack: 46, passing: 52, goalkeeping: 2, stamina: 78 },

  // Strikers (4)
  { id: 'gl_17', name: 'Donadoni', position: 'ST', secondaryPositions: ['CF'], overall: 64, potential: 79, age: 21, speed: 74, defense: 14, attack: 66, passing: 46, goalkeeping: 1, stamina: 80 },
  { id: 'gl_18', name: 'Espíndola', position: 'ST', secondaryPositions: ['RW'], overall: 61, potential: 76, age: 22, speed: 70, defense: 12, attack: 62, passing: 44, goalkeeping: 1, stamina: 78 },
  { id: 'gl_19', name: 'Maradei', position: 'ST', secondaryPositions: ['LW'], overall: 57, potential: 74, age: 19, speed: 72, defense: 12, attack: 56, passing: 42, goalkeeping: 1, stamina: 82 },
  { id: 'gl_20', name: 'Goicoechea', position: 'ST', secondaryPositions: [], overall: 54, potential: 70, age: 23, speed: 68, defense: 10, attack: 52, passing: 40, goalkeeping: 1, stamina: 76 },
];

/**
 * Get the full glory squad with game-ready fields
 */
export function getGlorySquad() {
  return GLORY_SQUAD.map(p => ({
    ...p,
    salary: Math.round((p.overall * 600 + 3000) / 1000) * 1000,
    injured: false,
    injuryWeeks: 0,
    yellowCards: 0,
    redCards: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    morale: 75,
    contract: 2,
    contractYears: 2,
    role: p.overall >= 52 ? 'starter' : 'rotation',
    form: 70,
  }));
}

export default GLORY_SQUAD;
