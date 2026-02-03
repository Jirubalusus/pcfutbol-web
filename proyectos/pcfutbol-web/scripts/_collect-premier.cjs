// Collect Premier League data page by page - saves incrementally
const fs = require('fs');
const path = require('path');

const pages = [];
const dir = path.join(__dirname, '_premier-pages');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

// Save data from stdin to a page file
if (process.argv[2] === '--page') {
  const pageNum = process.argv[3];
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    const file = path.join(dir, `page-${pageNum}.json`);
    fs.writeFileSync(file, input);
    const data = JSON.parse(input);
    console.log(`Page ${pageNum}: ${data.length} players saved`);
  });
} else if (process.argv[2] === '--combine') {
  // Combine all pages into final file
  const files = fs.readdirSync(dir).filter(f => f.startsWith('page-')).sort();
  let all = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    all.push(...data);
    console.log(`${f}: ${data.length} players`);
  }
  
  // Dedupe by name+team
  const seen = new Set();
  const deduped = [];
  for (const p of all) {
    const key = `${p.name}|${p.team}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }
  
  const output = path.join(__dirname, 'sofifa-leagues', '13.json');
  fs.writeFileSync(output, JSON.stringify(deduped, null, 2));
  console.log(`\nTotal: ${deduped.length} unique players saved to ${output}`);
  
  const teams = [...new Set(deduped.map(p => p.team))].sort();
  console.log(`Teams (${teams.length}):`, teams);
  
  // Cleanup
  for (const f of files) fs.unlinkSync(path.join(dir, f));
  fs.rmdirSync(dir);
  console.log('Cleaned up temp files');
}
