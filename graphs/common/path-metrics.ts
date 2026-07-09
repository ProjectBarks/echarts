import type { EdgeMap, NodeLatMap, DataFrame, FieldValues, Path, ParsedData, CritInfo } from './types.js';

function fieldValues(values: FieldValues | unknown[]): unknown[] {
  const v = values as FieldValues;
  return v.toArray ? v.toArray() : Array.from(values as ArrayLike<unknown>);
}

export function parseSeries(seriesList: DataFrame[], root: string): ParsedData {
  const paths: Path[] = [];
  const taskDurations: NodeLatMap = {};
  for (const series of seriesList) {
    const pathName = series.name || '';
    if (!pathName) continue;
    const vf = series.fields.find((f) => f.type === 'number');
    if (!vf) continue;
    const vals = fieldValues(vf.values).filter((v): v is number => v != null) as number[];
    if (!vals.length) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (pathName.includes('_')) {
      paths.push({ path: pathName, p95: avg });
    } else {
      taskDurations[pathName] = Math.max(taskDurations[pathName] || 0, avg);
    }
  }
  const hasTaskDurations = Object.keys(taskDurations).length > 0;
  return { paths, taskDurations, hasTaskDurations };
}

export function buildLatencyAndEdges(
  parsed: ParsedData,
  root: string,
): { nodeLat: NodeLatMap; edgeMap: EdgeMap } {
  const { paths, taskDurations, hasTaskDurations } = parsed;
  const nodeLat: NodeLatMap = {};
  const edgeMap: EdgeMap = {};
  for (const { path, p95 } of paths) {
    const toks = path.split('_');
    const chain = [root, ...toks];
    for (let i = 0; i < chain.length - 1; i++) {
      const key = chain[i] + '__' + chain[i + 1];
      edgeMap[key] = Math.max(edgeMap[key] || 0, p95);
    }
    for (const t of toks) {
      if (!(t in nodeLat)) nodeLat[t] = 0;
    }
  }
  if (hasTaskDurations) {
    for (const [name, lat] of Object.entries(taskDurations)) {
      if (name in nodeLat) nodeLat[name] = lat;
    }
  } else {
    const pathLat: Record<string, number> = {};
    for (const { path, p95 } of paths) {
      pathLat[path] = Math.max(pathLat[path] || 0, p95);
    }
    for (const { path } of paths) {
      const toks = path.split('_');
      for (let i = 0; i < toks.length; i++) {
        const subPath = toks.slice(0, i + 1).join('_');
        const parentPath = toks.slice(0, i).join('_');
        const subLat = pathLat[subPath] || 0;
        const parentLat = parentPath ? pathLat[parentPath] || 0 : 0;
        if (subLat > 0) {
          const indiv = Math.max(0, subLat - parentLat);
          nodeLat[toks[i]] = Math.max(nodeLat[toks[i]] || 0, indiv);
        }
      }
    }
  }
  nodeLat[root] = 0;
  return { nodeLat, edgeMap };
}

export function findCriticalPath(paths: Path[], nodeLat: NodeLatMap, root: string): CritInfo {
  const crit = paths.reduce((mx, p) => (p.p95 > mx.p95 ? p : mx), paths[0]);
  const critNodesList = crit.path.split('_');
  const critSet = new Set([root, ...critNodesList]);
  const critTotal = critNodesList.reduce((sum, n) => sum + (nodeLat[n] || 0), 0);
  return { crit, critNodesList, critSet, critTotal };
}

export function dropZeroPredicates(nodeLat: NodeLatMap): Set<string> {
  const dropNodes = new Set<string>();
  for (const [name, lat] of Object.entries(nodeLat)) {
    if (name.endsWith('predicate') && lat === 0) dropNodes.add(name);
  }
  for (const n of dropNodes) delete nodeLat[n];
  return dropNodes;
}

export function computeCleanEdges(
  edgeMap: EdgeMap,
  paths: Path[],
  dropNodes: Set<string>,
  root: string,
): EdgeMap {
  const cleanEdges: EdgeMap = {};
  for (const [key, lat] of Object.entries(edgeMap)) {
    const [src, tgt] = key.split('__');
    if (dropNodes.has(src) || dropNodes.has(tgt)) continue;
    cleanEdges[key] = Math.max(cleanEdges[key] || 0, lat);
  }
  for (const { path, p95 } of paths) {
    const chain = [root, ...path.split('_')].filter((n) => !dropNodes.has(n));
    for (let i = 0; i < chain.length - 1; i++) {
      const key = chain[i] + '__' + chain[i + 1];
      cleanEdges[key] = Math.max(cleanEdges[key] || 0, p95);
    }
  }
  return cleanEdges;
}

export function computeCumulativeLatency(
  paths: Path[],
  nodeLat: NodeLatMap,
  dropNodes: Set<string>,
  root: string,
): { cumulLat: NodeLatMap; maxCumul: number; maxLat: number } {
  const cumulLat: NodeLatMap = {};
  for (const { path } of paths) {
    const chain = [root, ...path.split('_')].filter((n) => !dropNodes.has(n));
    let cumul = 0;
    for (const n of chain) {
      cumul += nodeLat[n] || 0;
      cumulLat[n] = Math.max(cumulLat[n] || 0, cumul);
    }
  }
  const maxCumul = Math.max(...Object.values(cumulLat), 1);
  const maxLat = Math.max(...Object.values(nodeLat), 1);
  return { cumulLat, maxCumul, maxLat };
}
