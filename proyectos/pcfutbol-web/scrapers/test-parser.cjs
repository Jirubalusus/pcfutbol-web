// Test del parser v2 - enfoque diferente
const fs = require('fs');
const html = fs.readFileSync('C:/Users/Pablo/clawd/proyectos/pcfutbol-web/scraped-data/test-html.html', 'utf-8');

function decodeHTML(text) {
  return text.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€').trim();
}

const positionMap = {
  'bg_Torwart': 'Portero',
  'bg_Abwehr': 'Defensa', 
  'bg_Mittelfeld': 'Centrocampista',
  'bg_Sturm': 'Delantero'
};

const players = [];

// Dividir por filas de jugador (cada fila empieza con <tr class="odd"> o <tr class="even">)
// y termina justo antes de la siguiente fila
const parts = html.split(/<tr class="(?:odd|even)">/);

for (let i = 1; i < parts.length; i++) {
  const part = parts[i];
  
  // Verificar que es una fila de jugador
  if (!part.includes('rueckennummer')) continue;
  
  // Cortar hasta el final de esta fila (antes de la siguiente tr o el cierre tbody)
  const endIndex = part.indexOf('</tr>\n<tr');
  const rowHtml = endIndex > 0 ? part.substring(0, endIndex + 5) : part.split('</tbody>')[0];
  
  const player = {};
  
  // 1. Dorsal
  const dorsalMatch = rowHtml.match(/class=rn_nummer>(\d+)<\/div>/);
  if (dorsalMatch) player.dorsal = parseInt(dorsalMatch[1]);
  
  // 2. Posicion general
  for (const [cssClass, pos] of Object.entries(positionMap)) {
    if (rowHtml.includes(cssClass)) { player.posicion = pos; break; }
  }
  
  // 3. Nombre e ID
  const playerMatch = rowHtml.match(/\/profil\/spieler\/(\d+)"[^>]*>\s*([^<]+)</);
  if (playerMatch) {
    player.id = playerMatch[1];
    player.nombre = decodeHTML(playerMatch[2]);
  }
  
  if (!player.id) continue;
  
  // 4. Edad - está en <td class="zentriert">XX</td> donde XX es 2 dígitos
  // Buscar después del cierre de inline-table
  const afterTable = rowHtml.split('</table>').pop() || rowHtml;
  const ageMatch = afterTable.match(/<td class="zentriert">(\d{2})<\/td>/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 15 && age <= 50) player.edad = age;
  }
  
  // 5. Nacionalidad - del title de la bandera
  const natMatch = rowHtml.match(/title="([^"]+)"[^>]*alt="[^"]*"[^>]*class="flaggenrahmen"/);
  if (natMatch) {
    player.nacionalidad = decodeHTML(natMatch[1]);
  }
  
  // 6. Fin de contrato - formato DD/MM/YYYY
  const contractMatch = rowHtml.match(/<td class="zentriert">(\d{2}\/\d{2}\/\d{4})<\/td>/);
  if (contractMatch) {
    player.finContrato = contractMatch[1];
  }
  
  // 7. Valor de mercado
  const valueMatch = rowHtml.match(/marktwertverlauf\/spieler\/\d+">([^<]+)</);
  if (valueMatch) {
    const valueText = valueMatch[1];
    const numMatch = valueText.match(/([\d,\.]+)\s*(mill|mil)/i);
    if (numMatch) {
      let val = parseFloat(numMatch[1].replace(',', '.'));
      if (numMatch[2].toLowerCase().startsWith('mill')) val *= 1000000;
      else val *= 1000;
      player.valorMercado = val;
    }
  }
  
  players.push(player);
}

console.log('Jugadores encontrados:', players.length);
console.log('\nEjemplos completos:');
console.log(JSON.stringify(players.slice(0, 3), null, 2));

// Verificar campos completos
const withAge = players.filter(p => p.edad).length;
const withValue = players.filter(p => p.valorMercado).length;
const withNat = players.filter(p => p.nacionalidad).length;
console.log(`\nEstadísticas:`);
console.log(`  Con edad: ${withAge}/${players.length}`);
console.log(`  Con valor: ${withValue}/${players.length}`);
console.log(`  Con nacionalidad: ${withNat}/${players.length}`);
