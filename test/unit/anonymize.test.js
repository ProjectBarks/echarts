import { describe, test, expect } from 'vitest';
import { anonymizeSeries, aliasToken } from '../../scripts/anonymize-fixtures.mjs';

test('aliasToken preserves the type suffix, is stable, and leaks no original text', () => {
  const m = new Map();
  expect(aliasToken('csscomplementsdppredicate', m)).toBe('task01predicate');
  expect(aliasToken('csscomplementsdp', m)).toBe('task02dp');
  expect(aliasToken('somethingda', m)).toBe('task03da');
  expect(aliasToken('plainnode', m)).toBe('task04');
  expect(aliasToken('csscomplementsdppredicate', m)).toBe('task01predicate'); // stable
});

test('anonymizeSeries keeps path structure, suffixes, and field values; drops original tokens', () => {
  const src = [
    { name: 'alpha_betapredicate', fields: [ { type: 'time', values: [1, 2] }, { type: 'number', values: [5, 6] } ] },
    { name: 'alpha_gammadp', fields: [ { type: 'time', values: [3] }, { type: 'number', values: [7] } ] },
  ];
  const out = anonymizeSeries(src);
  expect(out[0].name.split('_').length).toBe(2);
  expect(out[0].name.endsWith('predicate')).toBe(true);
  expect(out[1].name.endsWith('dp')).toBe(true);
  // 'alpha' is the same token in both series -> same alias in both
  const a0 = out[0].name.split('_')[0];
  const a1 = out[1].name.split('_')[0];
  expect(a0).toBe(a1);
  // field values untouched
  expect(out[0].fields[1].values).toEqual([5, 6]);
  // no original token survives
  const blob = JSON.stringify(out);
  expect(blob).not.toContain('alpha');
  expect(blob).not.toContain('beta');
  expect(blob).not.toContain('gamma');
});
