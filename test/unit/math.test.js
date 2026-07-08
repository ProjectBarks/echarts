import { describe, test, expect } from 'vitest';
import { median } from '../../graphs/common/math.js';

describe('median', () => {
  test('returns null for empty input', () => {
    expect(median([])).toBe(null);
  });
  test('returns the middle value for odd length', () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  test('averages the two middles for even length', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  test('does not mutate its input', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
