// Local-only utility: run against the (gitignored) real captures to emit
// committable anonymized fixtures. Node ESM, no dependencies.
//
// Usage: node scripts/anonymize-fixtures.mjs <in.json> <out.json>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SUFFIXES = ['predicate', 'dp', 'da']; // preserve node-type semantics

// Stable per-map alias. The number is derived from the map size so the mapping
// is deterministic without any shared module state.
export function aliasToken(token, map) {
  if (map.has(token)) return map.get(token);
  const suffix = SUFFIXES.find((s) => token.endsWith(s)) || '';
  const n = map.size + 1;
  const alias = 'task' + String(n).padStart(2, '0') + suffix;
  map.set(token, alias);
  return alias;
}

export function anonymizeSeries(series, map = new Map()) {
  return series.map((s) => ({
    name: (s.name || '')
      .split('_')
      .map((t) => aliasToken(t, map))
      .join('_'),
    fields: s.fields,
  }));
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error('usage: node scripts/anonymize-fixtures.mjs <in.json> <out.json>');
    process.exit(1);
  }
  const out = anonymizeSeries(JSON.parse(readFileSync(inPath, 'utf8')));
  const dir = outPath.replace(/\/[^/]+$/, '');
  if (dir && dir !== outPath) mkdirSync(dir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log('wrote', outPath, '(', out.length, 'series )');
}
