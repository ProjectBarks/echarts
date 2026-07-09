import type { EdgeMap, NodeLatMap } from '../common/types.js';

export function buildMermaid(nodeLat: NodeLatMap, cleanEdges: EdgeMap, critSet: Set<string>, units: string): string {
  let md = 'flowchart LR\n';
  for (const name of Object.keys(nodeLat)) {
    const lat = Math.round(nodeLat[name] || 0);
    const label = name.replace(/predicate$/, '(P)').replace(/dp$/, '');
    md += critSet.has(name)
      ? '  ' + name + '["' + label + ' ' + lat + ' ' + units + '"]:::crit\n'
      : '  ' + name + '["' + label + ' ' + lat + ' ' + units + '"]\n';
  }
  for (const key of Object.keys(cleanEdges)) {
    const [s, t] = key.split('__');
    md += critSet.has(s) && critSet.has(t) ? '  ' + s + ' ==> ' + t + '\n' : '  ' + s + ' --> ' + t + '\n';
  }
  md += '  classDef crit fill:#ff6b6b,stroke:#c00,color:#fff\n';
  return md;
}
