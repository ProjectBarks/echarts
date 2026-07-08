import { describe, test, expect } from 'vitest';
import { buildLinks, buildTransitiveHoverEdges } from '../../graphs/flow-graph/links.js';
import { buildAdjacency } from '../../graphs/common/graph.js';

describe('buildLinks', () => {
  test('creates a visible link per edge and marks critical edges', () => {
    const links = buildLinks({ a__b: 10, b__c: 5 }, new Set(['a', 'b']));
    expect(links).toHaveLength(2);
    const ab = links.find((l) => l.source === 'a' && l.target === 'b');
    expect(ab.lineStyle.width).toBeGreaterThan(1); // critical styling
  });
});

describe('buildTransitiveHoverEdges', () => {
  test('adds zero-width edges for non-adjacent ancestor/descendant pairs', () => {
    const clean = { a__b: 1, b__c: 1 };
    const { fwd, bwd } = buildAdjacency(Object.keys(clean));
    const nodeLat = { a: 1, b: 1, c: 1 };
    const extra = buildTransitiveHoverEdges(nodeLat, fwd, bwd, clean);
    // a<->c is transitive (not a direct edge) -> at least one hidden link
    expect(extra.some((l) => (l.lineStyle.width === 0 || l.lineStyle.opacity === 0))).toBe(true);
  });
});
