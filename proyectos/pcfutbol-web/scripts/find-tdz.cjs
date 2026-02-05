/**
 * Find temporal dead zone issues in ADVANCE_WEEK case block
 * Look for variables used before their let/const declaration
 */
const fs = require('fs');
const path = require('path');

const file = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'GameContext.jsx'), 'utf8');
const lines = file.split('\n');

// Find the ADVANCE_WEEK block
let startLine = -1;
let endLine = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("case 'ADVANCE_WEEK':")) {
    startLine = i;
    braceCount = 0;
  }
  if (startLine >= 0 && i > startLine) {
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    if (braceCount < 0 || (lines[i].trim().startsWith('case ') && i > startLine + 5)) {
      endLine = i;
      break;
    }
  }
}

console.log(`ADVANCE_WEEK block: lines ${startLine + 1} to ${endLine + 1}`);

// Collect all let/const declarations with their line numbers
const declarations = [];
const usages = {};

for (let i = startLine; i < endLine; i++) {
  const line = lines[i];
  // Find let/const declarations
  const letMatch = line.match(/\b(let|const)\s+(\w+)\s*=/);
  if (letMatch) {
    declarations.push({ name: letMatch[2], line: i + 1, type: letMatch[1] });
  }
  // Also find destructuring
  const destructMatch = line.match(/\b(let|const)\s+\{([^}]+)\}\s*=/);
  if (destructMatch) {
    destructMatch[2].split(',').forEach(v => {
      const name = v.trim().split(':')[0].trim();
      if (name) declarations.push({ name, line: i + 1, type: destructMatch[1] });
    });
  }
}

// Check for potential TDZ issues
console.log(`\nFound ${declarations.length} declarations in ADVANCE_WEEK block\n`);

// Look for specific patterns: variables used BEFORE their declaration
for (const decl of declarations) {
  // Search for uses of this variable BEFORE its declaration line
  for (let i = startLine; i < decl.line - 1; i++) {
    const line = lines[i];
    // Simple check: does this variable name appear on this line?
    const regex = new RegExp(`\\b${decl.name}\\b`);
    if (regex.test(line) && !line.includes(`${decl.type} ${decl.name}`) && !line.trim().startsWith('//')) {
      console.log(`⚠️  TDZ: '${decl.name}' used at line ${i + 1} but declared at line ${decl.line}`);
      console.log(`   Usage: ${lines[i].trim().substring(0, 100)}`);
      console.log(`   Decl:  ${lines[decl.line - 1].trim().substring(0, 100)}\n`);
    }
  }
}
