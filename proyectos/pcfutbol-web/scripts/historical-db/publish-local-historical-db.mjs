#!/usr/bin/env node
/** Copies generated historical datasets into public/ for local/Vite/Firebase Hosting. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(PROJECT_ROOT, 'artifacts', 'historical-db');
const DST = path.join(PROJECT_ROOT, 'public', 'historical-db');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(SRC)) throw new Error(`No existe ${SRC}`);
copyDir(SRC, DST);
console.log(`✅ Copiado historical-db a ${DST}`);
