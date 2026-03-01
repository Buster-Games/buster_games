#!/usr/bin/env node
/**
 * check-assets.js
 *
 * Validates that no asset file is over its permitted size limit.
 * Run manually: node scripts/check-assets.js
 * Hooked into: npm run build (via prebuild script)
 *
 * Limits (tunable below):
 *   sprites/   → 200 KB  (pixel art — should be tiny)
 *   items/     → 100 KB  (small UI icons)
 *   backgrounds/ → 1 MB  (full-screen court images)
 *   audio/sfx/ → 300 KB
 *   audio/music/ → 3 MB  (chiptune tracks)
 *   everything else → 500 KB
 */

const fs = require('fs');
const path = require('path');

// ─── Configurable limits (bytes) ────────────────────────────────────────────
const LIMITS = [
  { pattern: /^assets[\\/]sprites[\\/]/,        maxBytes: 200 * 1024,  label: 'sprites (200 KB)' },
  { pattern: /^assets[\\/]items[\\/]/,           maxBytes: 100 * 1024,  label: 'items (100 KB)' },
  { pattern: /^assets[\\/]backgrounds[\\/]/,     maxBytes: 1024 * 1024, label: 'backgrounds (1 MB)' },
  { pattern: /^assets[\\/]audio[\\/]sfx[\\/]/,   maxBytes: 300 * 1024,  label: 'audio/sfx (300 KB)' },
  { pattern: /^assets[\\/]audio[\\/]music[\\/]/, maxBytes: 3 * 1024 * 1024, label: 'audio/music (3 MB)' },
];
const DEFAULT_MAX_BYTES = 500 * 1024; // 500 KB for anything else in assets/

// Ignore these files entirely (gitkeep, palette swatches, metadata, etc.)
const IGNORE_EXTENSIONS = new Set(['.gitkeep', '.hex', '.md', '.json', '.aseprite', '.ase', '.lua']);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '..');

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function limitForPath(relPath) {
  for (const { pattern, maxBytes, label } of LIMITS) {
    if (pattern.test(relPath)) return { maxBytes, label };
  }
  return { maxBytes: DEFAULT_MAX_BYTES, label: 'default (500 KB)' };
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const assetsDir = path.join(REPO_ROOT, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.log('No assets/ directory found — skipping check.');
  process.exit(0);
}

const violations = [];
const warnings = [];

for (const fullPath of walk(assetsDir)) {
  const ext = path.extname(fullPath).toLowerCase();
  if (IGNORE_EXTENSIONS.has(ext)) continue;

  const relPath = path.relative(REPO_ROOT, fullPath).replace(/\\/g, '/');
  const { size } = fs.statSync(fullPath);
  const { maxBytes, label } = limitForPath(relPath);

  if (size > maxBytes) {
    violations.push({ relPath, size, maxBytes, label });
  } else if (size > maxBytes * 0.8) {
    // Warn when within 20% of the limit
    warnings.push({ relPath, size, maxBytes, label });
  }
}

if (warnings.length) {
  console.warn('\n⚠️  Asset size warnings (approaching limit):');
  for (const { relPath, size, maxBytes, label } of warnings) {
    console.warn(`   ${relPath}`);
    console.warn(`     ${formatBytes(size)} / ${formatBytes(maxBytes)}  [limit: ${label}]`);
  }
}

if (violations.length) {
  console.error('\n❌ Asset size violations — build blocked:\n');
  for (const { relPath, size, maxBytes, label } of violations) {
    console.error(`   ${relPath}`);
    console.error(`     ${formatBytes(size)} exceeds ${formatBytes(maxBytes)}  [limit: ${label}]`);
  }
  console.error('\n  Resize or compress these files before committing.');
  console.error('  For pixel art, target sprites at their actual in-game pixel size (e.g. 64–128 px).');
  console.error('  For backgrounds, a 390×844 court image rarely needs to be larger than ~500 KB.\n');
  process.exit(1);
}

console.log(`✅ Asset sizes OK (checked ${[...walk(assetsDir)].filter(f => !IGNORE_EXTENSIONS.has(path.extname(f).toLowerCase())).length} files)`);
