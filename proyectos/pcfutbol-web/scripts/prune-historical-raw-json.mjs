#!/usr/bin/env node
// Remove redundant raw historical JSON from dist when the matching .json.gz exists.

import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const HISTORICAL_DB = join(ROOT, 'dist', 'historical-db');
const WORLD_CUP_DRAFT_FALLBACK = join(ROOT, 'dist', 'data', 'world-cup-draft-database.json');
const KEEP_WORLD_CUP_DRAFT_FALLBACK = process.env.KEEP_WORLD_CUP_DRAFT_FALLBACK === '1';

const PRESERVE_NAME_RE = /(?:manifest|index|metadata)/i;

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

function isPrunableRawJson(file) {
  const name = file.split(/[\\/]/).pop() || '';
  if (!name.endsWith('.json')) return false;
  if (PRESERVE_NAME_RE.test(name)) return false;
  return existsSync(`${file}.gz`);
}

let removedCount = 0;
let removedBytes = 0;

if (existsSync(WORLD_CUP_DRAFT_FALLBACK)) {
  if (KEEP_WORLD_CUP_DRAFT_FALLBACK) {
    console.log('historical-db prune: preserved World Cup Draft local fallback JSON (KEEP_WORLD_CUP_DRAFT_FALLBACK=1).');
  } else {
    const size = statSync(WORLD_CUP_DRAFT_FALLBACK).size;
    unlinkSync(WORLD_CUP_DRAFT_FALLBACK);
    removedCount += 1;
    removedBytes += size;
    console.log('historical-db prune: removed disabled World Cup Draft local fallback JSON from dist/data.');
  }
}

if (!existsSync(HISTORICAL_DB)) {
  console.log(`historical-db prune: removed ${removedCount} redundant file(s), ${fmt(removedBytes)}.`);
  process.exit(0);
}

for (const file of walk(HISTORICAL_DB)) {
  if (!isPrunableRawJson(file)) continue;

  const size = statSync(file).size;
  unlinkSync(file);
  removedCount += 1;
  removedBytes += size;
}

console.log(
  `historical-db prune: removed ${removedCount} redundant raw JSON file(s), ${fmt(removedBytes)}.`
);

if (removedCount) {
  console.log('Removed files only when a sibling .json.gz existed; metadata/index/manifest JSON was preserved.');
}

