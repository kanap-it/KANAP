#!/usr/bin/env node
/**
 * Token sync pipeline.
 *
 * Reads the app's design tokens from
 *   frontend/src/pages/tasks/theme/taskDetailTokens.ts
 * and emits CSS custom properties into
 *   marketing/web/src/styles/tokens.css
 *
 * The parser is intentionally narrow: it handles the specific shape of
 * `kanapPalette`, `taskDetailTokens.borderRadius`, and `STATUS_DOT_COLORS`
 * as used in the app. If the source structure changes materially,
 * update this script.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const SOURCE = resolve(REPO_ROOT, 'frontend/src/pages/tasks/theme/taskDetailTokens.ts');
const OUTPUT = resolve(__dirname, '..', 'src/styles/tokens.css');

const src = readFileSync(SOURCE, 'utf8');

/** Extract a top-level `export const NAME = { ... } as const;` block. */
function extractBlock(source, name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\{`);
  const m = re.exec(source);
  if (!m) throw new Error(`Block ${name} not found in source`);
  let i = m.index + m[0].length - 1; // position of opening {
  let depth = 0;
  let start = i;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Unterminated block for ${name}`);
}

/**
 * Parse a JSON-ish TS object literal into a nested plain object.
 * Handles:
 *   - string values with single or double quotes
 *   - number values
 *   - nested objects
 *   - identifier keys (unquoted)
 *   - trailing commas, line comments
 */
function parseObject(text) {
  let i = 0;
  const n = text.length;

  function skipWs() {
    while (i < n) {
      const c = text[i];
      if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === ',') {
        i++;
      } else if (c === '/' && text[i + 1] === '/') {
        while (i < n && text[i] !== '\n') i++;
      } else if (c === '/' && text[i + 1] === '*') {
        i += 2;
        while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i += 2;
      } else {
        break;
      }
    }
  }

  function readString() {
    const quote = text[i];
    i++;
    let out = '';
    while (i < n && text[i] !== quote) {
      if (text[i] === '\\') {
        out += text[i + 1];
        i += 2;
      } else {
        out += text[i++];
      }
    }
    i++; // closing quote
    return out;
  }

  function readIdent() {
    let out = '';
    while (i < n && /[A-Za-z0-9_$]/.test(text[i])) out += text[i++];
    return out;
  }

  function readNumber() {
    let out = '';
    while (i < n && /[0-9.\-]/.test(text[i])) out += text[i++];
    return Number(out);
  }

  function readValue() {
    skipWs();
    const c = text[i];
    if (c === '{') return readObject();
    if (c === "'" || c === '"') return readString();
    if (/[0-9\-]/.test(c)) return readNumber();
    // bare identifier (true/false/null)
    const id = readIdent();
    if (id === 'true') return true;
    if (id === 'false') return false;
    if (id === 'null') return null;
    return id;
  }

  function readObject() {
    const out = {};
    if (text[i] !== '{') throw new Error(`Expected { at ${i}`);
    i++;
    skipWs();
    while (i < n && text[i] !== '}') {
      skipWs();
      let key;
      if (text[i] === "'" || text[i] === '"') key = readString();
      else key = readIdent();
      skipWs();
      if (text[i] !== ':') throw new Error(`Expected : after key ${key} at ${i}`);
      i++;
      out[key] = readValue();
      skipWs();
    }
    i++; // closing }
    return out;
  }

  skipWs();
  return readObject();
}

/** Detect a leaf: { light: string, dark: string }. */
function isLeaf(val) {
  return (
    val &&
    typeof val === 'object' &&
    typeof val.light === 'string' &&
    typeof val.dark === 'string' &&
    Object.keys(val).length === 2
  );
}

/** Flatten a nested palette into [{ path, light, dark }, ...]. */
function flattenPalette(obj, prefix = []) {
  const out = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = [...prefix, key];
    if (isLeaf(val)) {
      out.push({ path, light: val.light, dark: val.dark });
    } else if (val && typeof val === 'object') {
      out.push(...flattenPalette(val, path));
    }
  }
  return out;
}

function kebab(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function varName(path) {
  return '--kanap-' + path.map(kebab).join('-');
}

/* --------------- Parse source --------------- */

const paletteText = extractBlock(src, 'kanapPalette');
const palette = parseObject(paletteText);
const leaves = flattenPalette(palette);

const statusText = extractBlock(src, 'STATUS_DOT_COLORS');
const statusObj = parseObject(statusText);
const statusLeaves = flattenPalette(statusObj, ['status']);

const priorityText = extractBlock(src, 'PRIORITY_DOT_COLORS');
const priorityObj = parseObject(priorityText);
const priorityLeaves = flattenPalette(priorityObj, ['priority']);

const tokensText = extractBlock(src, 'taskDetailTokens');
const tokens = parseObject(tokensText);

/* --------------- Emit CSS --------------- */

const lines = [];
lines.push('/**');
lines.push(' * KANAP design tokens — auto-generated from');
lines.push(' *   frontend/src/pages/tasks/theme/taskDetailTokens.ts');
lines.push(' *');
lines.push(' * Do NOT edit by hand. Regenerate with:  npm run tokens');
lines.push(' */');
lines.push('');
lines.push(':root {');
lines.push('  color-scheme: light;');
lines.push('');
lines.push('  /* Palette (light) */');
for (const leaf of [...leaves, ...statusLeaves, ...priorityLeaves]) {
  lines.push(`  ${varName(leaf.path)}: ${leaf.light};`);
}
lines.push('');
lines.push('  /* Border radius */');
for (const [key, val] of Object.entries(tokens.borderRadius || {})) {
  lines.push(`  --kanap-radius-${kebab(key)}: ${val};`);
}
lines.push('');
lines.push('  /* Marketing-only extensions (hero display type, layout) */');
lines.push('  --mk-hero-size: clamp(36px, 5vw, 60px);');
lines.push('  --mk-hero-lh: 1.08;');
lines.push('  --mk-section-size: clamp(26px, 3vw, 34px);');
lines.push('  --mk-section-lh: 1.18;');
lines.push('  --mk-eyebrow-size: 12px;');
lines.push('  --mk-body-size: 15px;');
lines.push('  --mk-body-lh: 1.6;');
lines.push('  --mk-small-size: 13px;');
lines.push('  --mk-max-content: 1200px;');
lines.push('  --mk-max-prose: 680px;');
lines.push('  --mk-nav-height: 60px;');
lines.push('  --mk-section-pad-y: clamp(40px, 5vw, 72px);');
lines.push('  --mk-section-pad-y-compact: clamp(28px, 3.5vw, 48px);');
lines.push('  --mk-gutter: clamp(20px, 4vw, 40px);');
lines.push('');
lines.push('  /* Motion */');
lines.push('  --mk-ease: cubic-bezier(0.2, 0, 0, 1);');
lines.push('  --mk-duration: 160ms;');
lines.push('}');
lines.push('');
lines.push(':root[data-theme="dark"] {');
lines.push('  color-scheme: dark;');
lines.push('');
lines.push('  /* Palette (dark) */');
for (const leaf of [...leaves, ...statusLeaves, ...priorityLeaves]) {
  lines.push(`  ${varName(leaf.path)}: ${leaf.dark};`);
}
lines.push('}');
lines.push('');
lines.push('/* System preference: dark mode when user has not set a preference */');
lines.push('@media (prefers-color-scheme: dark) {');
lines.push('  :root:not([data-theme]) {');
lines.push('    color-scheme: dark;');
for (const leaf of [...leaves, ...statusLeaves, ...priorityLeaves]) {
  lines.push(`    ${varName(leaf.path)}: ${leaf.dark};`);
}
lines.push('  }');
lines.push('}');
lines.push('');

writeFileSync(OUTPUT, lines.join('\n'));

const leafCount = leaves.length + statusLeaves.length + priorityLeaves.length;
console.log(`✓ Wrote ${leafCount} color tokens to ${OUTPUT}`);
