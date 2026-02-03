// Quick scraper for Premier League using existing clawd browser
// We'll use web_fetch with a different approach - or just collect from the already-open browser
// Actually, let's just collect data from the browser snapshot we already have and save it

// This script will be used to save the collected data
const fs = require('fs');
const path = require('path');

// We'll collect data in stages and save
const OUTPUT = path.join(__dirname, 'sofifa-leagues', '13.json');

// Read existing partial data if any
let allPlayers = [];
const partialFile = path.join(__dirname, '_premier-partial.json');
if (fs.existsSync(partialFile)) {
  allPlayers = JSON.parse(fs.readFileSync(partialFile, 'utf8'));
  console.log(`Loaded ${allPlayers.length} existing players`);
}

// If called with --save and data on stdin, save it
if (process.argv[2] === '--save') {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    const newPlayers = JSON.parse(input);
    allPlayers.push(...newPlayers);
    fs.writeFileSync(partialFile, JSON.stringify(allPlayers, null, 2));
    console.log(`Saved ${allPlayers.length} total players (added ${newPlayers.length})`);
  });
} else if (process.argv[2] === '--finalize') {
  // Move partial to final
  if (fs.existsSync(partialFile)) {
    const data = JSON.parse(fs.readFileSync(partialFile, 'utf8'));
    fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
    fs.unlinkSync(partialFile);
    console.log(`Finalized ${data.length} players to ${OUTPUT}`);
    // Show unique teams
    const teams = [...new Set(data.map(p => p.team))].sort();
    console.log(`Teams (${teams.length}):`, teams);
  }
} else {
  console.log('Usage: node _scrape-premier.cjs --save < data.json');
  console.log('       node _scrape-premier.cjs --finalize');
}
