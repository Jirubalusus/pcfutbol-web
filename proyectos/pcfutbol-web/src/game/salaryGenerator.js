// ============================================================
// SALARY GENERATOR
// Genera salarios semanales realistas basados en overall + edad
// ============================================================

// Hash determinista basado en nombre del jugador
function nameHash(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Genera salario SEMANAL realista para un jugador
 * 
 * Curva exponencial: cada 5 OVR ≈ x2 salario
 * 
 * Ejemplos (LaLiga):
 *   60 OVR → ~€4K/sem (€200K/año)
 *   65 OVR → ~€8K/sem (€400K/año)
 *   70 OVR → ~€15K/sem (€800K/año)
 *   75 OVR → ~€30K/sem (€1.5M/año)
 *   80 OVR → ~€60K/sem (€3.1M/año)
 *   85 OVR → ~€120K/sem (€6.2M/año)
 *   90 OVR → ~€250K/sem (€13M/año)
 * 
 * @param {object} player - { overall, age, name, potential }
 * @returns {number} Salario semanal en €
 */
export function generateSalary(player) {
  const ovr = player.overall || 65;
  const age = player.age || 25;
  
  // Base exponencial por overall
  const baseSalary = 2000 * Math.pow(2, (ovr - 55) / 5);
  
  // Modificador por edad
  let ageMod = 1.0;
  if (age <= 21) ageMod = 0.7;       // Joven promesa, contrato bajo
  else if (age <= 23) ageMod = 0.85;  // En desarrollo
  else if (age <= 29) ageMod = 1.0;   // Plenitud
  else if (age <= 32) ageMod = 1.05;  // Veterano experimentado
  else if (age <= 35) ageMod = 0.85;  // En declive
  else ageMod = 0.6;                  // Final de carrera
  
  // Variación determinista ±12% basada en nombre
  const hash = nameHash(player.name || 'Player');
  const variation = 0.88 + (hash % 250) / 1000; // 0.88 a 1.13
  
  // Salario semanal final (mínimo €1.5K/sem ≈ €78K/año)
  return Math.max(1500, Math.round(baseSalary * ageMod * variation));
}

/**
 * Aplica salarios generados a un array de jugadores
 * Solo sobrescribe si el salario actual parece un placeholder (20000 o no definido)
 * 
 * @param {array} players - Array de jugadores
 * @returns {array} Jugadores con salarios actualizados
 */
export function applyGeneratedSalaries(players) {
  return (players || []).map(player => {
    // Si el salario parece placeholder (todos iguales a 20000) o no existe, generar uno
    const currentSalary = player.salary || 0;
    const isPlaceholder = currentSalary === 0 || currentSalary === 20000;
    
    return {
      ...player,
      salary: isPlaceholder ? generateSalary(player) : currentSalary
    };
  });
}

/**
 * Aplica salarios a todos los jugadores de un array de equipos
 * 
 * @param {array} teams - Array de equipos con .players
 * @returns {array} Equipos con jugadores actualizados
 */
export function applyTeamsSalaries(teams) {
  return (teams || []).map(team => ({
    ...team,
    players: applyGeneratedSalaries(team.players || [])
  }));
}
