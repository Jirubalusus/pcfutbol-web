/**
 * Script to analyze all ADD_MESSAGE payloads in GameContext.jsx
 * and show what needs to be converted
 */
const fs = require('fs');
const path = require('path');

const file = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'GameContext.jsx'), 'utf8');
const lines = file.split('\n');

const messages = [];
let inMessage = false;
let currentMsg = {};
let startLine = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Find title lines with hardcoded Spanish
  if (line.includes("title:") && line.includes("'") && !line.includes("titleKey")) {
    const titleMatch = line.match(/title:\s*[`'"](.*?)[`'"]/);
    const titleTemplateMatch = line.match(/title:\s*`(.*?)`/);
    if (titleMatch || titleTemplateMatch) {
      const title = (titleMatch || titleTemplateMatch)[1];
      // Check if it's Spanish (contains Spanish characters or common Spanish words)
      if (/[áéíóúñ¡¿]|Semana|Oferta|Nuevo|Nueva|cantera|Lesión|Fichaje|Temporada|jugador|Préstamo|Pretemporada|Renovación|copa|europeo/.test(title)) {
        messages.push({ line: i + 1, type: 'title', text: title, raw: lines[i] });
      }
    }
  }
  
  // Find content lines with hardcoded Spanish
  if (line.includes("content:") && (line.includes("`") || line.includes("'"))) {
    const contentMatch = line.match(/content:\s*[`'"](.*?)[`'"]/);
    if (contentMatch) {
      const content = contentMatch[1];
      if (/[áéíóúñ¡¿]|ofrece|ficha|cantera|promocionado|salario|contrato|semana|jugador/.test(content)) {
        messages.push({ line: i + 1, type: 'content', text: content.substring(0, 80), raw: lines[i] });
      }
    }
  }
  
  // Find date lines with "Semana" or "Pretemporada"
  if (line.includes("date:") && (line.includes("Semana") || line.includes("Pretemporada") || line.includes("Fin Temporada"))) {
    messages.push({ line: i + 1, type: 'date', text: line, raw: lines[i] });
  }
}

console.log(`Found ${messages.length} hardcoded Spanish strings in messages:\n`);
messages.forEach(m => {
  console.log(`  L${m.line} [${m.type}]: ${m.text.substring(0, 100)}`);
});

// Count unique titles
const titles = messages.filter(m => m.type === 'title').map(m => m.text);
const uniqueTitles = [...new Set(titles)];
console.log(`\n=== Unique titles (${uniqueTitles.length}) ===`);
uniqueTitles.forEach(t => console.log(`  "${t}"`));
