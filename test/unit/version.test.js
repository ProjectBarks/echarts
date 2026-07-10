import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEMVER, VERSION } from '../../graphs/common/version.js';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));

describe('version', () => {
  test('SEMVER is locked to package.json "version"', () => {
    // These must never drift: the console line logged on every render claims
    // this is the package version, so a mismatch would report a lie.
    expect(SEMVER).toBe(pkg.version);
  });

  test('VERSION embeds SEMVER', () => {
    expect(VERSION.startsWith(SEMVER)).toBe(true);
  });
});
