export function renderFlowGraph(context, opts = {}) {
  const ROOT = opts.root || 'FLOW_START';
  const SINK = opts.sink || 'setresults';
  const NODE_SPACING = opts.nodeSpacing || 52;
  const NODE_SIZE = opts.nodeSize || 18;
  const pctlVar = opts.percentileVar || '$percentile';

  const replaceVariables = context.grafana.replaceVariables || context.panel.replaceVariables || ((s) => s);
  const pctl = replaceVariables(pctlVar) || '95';

  const panelData = context.panel.data;
  const seriesList = panelData ? (panelData.series || []) : [];

  const paths = [];
  const taskDurations = {};
  for (const series of seriesList) {
    const pathName = series.name || '';
    if (!pathName) continue;
    const vf = series.fields.find(f => f.type === 'number');
    if (!vf) continue;
    const vals = (vf.values.toArray ? vf.values.toArray() : Array.from(vf.values)).filter(v => v != null);
    if (!vals.length) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (pathName.includes('_')) {
      paths.push({ path: pathName, p95: avg });
    } else {
      taskDurations[pathName] = Math.max(taskDurations[pathName] || 0, avg);
    }
  }
  if (!paths.length) {
    return { title: { text: 'No data', left: 'center', top: 'center', textStyle: { color: '#ccc' } } };
  }
  const hasTaskDurations = Object.keys(taskDurations).length > 0;

  const nodeLat = {};
  const edgeMap = {};
  for (const { path, p95 } of paths) {
    const toks = path.split('_');
    const chain = [ROOT, ...toks];
    for (let i = 0; i < chain.length - 1; i++) {
      const key = chain[i] + '__' + chain[i + 1];
      edgeMap[key] = Math.max(edgeMap[key] || 0, p95);
    }
    for (const t of toks) { if (!(t in nodeLat)) nodeLat[t] = 0; }
  }
  if (hasTaskDurations) {
    for (const [name, lat] of Object.entries(taskDurations)) {
      if (name in nodeLat) nodeLat[name] = lat;
    }
  } else {
    const pathLat = {};
    for (const { path, p95 } of paths) { pathLat[path] = Math.max(pathLat[path] || 0, p95); }
    for (const { path } of paths) {
      const toks = path.split('_');
      for (let i = 0; i < toks.length; i++) {
        const subPath = toks.slice(0, i + 1).join('_');
        const parentPath = toks.slice(0, i).join('_');
        const subLat = pathLat[subPath] || 0;
        const parentLat = parentPath ? (pathLat[parentPath] || 0) : 0;
        if (subLat > 0) {
          const indiv = Math.max(0, subLat - parentLat);
          nodeLat[toks[i]] = Math.max(nodeLat[toks[i]] || 0, indiv);
        }
      }
    }
  }
  nodeLat[ROOT] = 0;

  const crit = paths.reduce((mx, p) => p.p95 > mx.p95 ? p : mx, paths[0]);
  const critNodesList = crit.path.split('_');
  const critSet = new Set([ROOT, ...critNodesList]);
  const critTotal = critNodesList.reduce((sum, n) => sum + (nodeLat[n] || 0), 0);

  const dropNodes = new Set();
  for (const [name, lat] of Object.entries(nodeLat)) {
    if (name.endsWith('predicate') && lat === 0) dropNodes.add(name);
  }
  for (const n of dropNodes) delete nodeLat[n];

  const cleanEdges = {};
  for (const [key, lat] of Object.entries(edgeMap)) {
    const [src, tgt] = key.split('__');
    if (dropNodes.has(src) || dropNodes.has(tgt)) continue;
    cleanEdges[key] = Math.max(cleanEdges[key] || 0, lat);
  }
  for (const { path, p95 } of paths) {
    const chain = [ROOT, ...path.split('_')].filter(n => !dropNodes.has(n));
    for (let i = 0; i < chain.length - 1; i++) {
      const key = chain[i] + '__' + chain[i + 1];
      cleanEdges[key] = Math.max(cleanEdges[key] || 0, p95);
    }
  }

  const fwd = {}, bwd = {};
  for (const key of Object.keys(cleanEdges)) {
    const [src, tgt] = key.split('__');
    if (!fwd[src]) fwd[src] = new Set(); fwd[src].add(tgt);
    if (!bwd[tgt]) bwd[tgt] = new Set(); bwd[tgt].add(src);
  }

  const cumulLat = {};
  for (const { path } of paths) {
    const chain = [ROOT, ...path.split('_')].filter(n => !dropNodes.has(n));
    let cumul = 0;
    for (const n of chain) {
      cumul += nodeLat[n] || 0;
      cumulLat[n] = Math.max(cumulLat[n] || 0, cumul);
    }
  }
  const maxCumul = Math.max(...Object.values(cumulLat), 1);
  const maxLat = Math.max(...Object.values(nodeLat), 1);

  const depth = { [ROOT]: 0 };
  const queue = [ROOT];
  while (queue.length) {
    const n = queue.shift();
    for (const c of (fwd[n] || [])) {
      const d = (depth[n] || 0) + 1;
      if (depth[c] === undefined || d > depth[c]) { depth[c] = d; queue.push(c); }
    }
  }

  const layers = {};
  for (const name of Object.keys(nodeLat)) {
    const d = depth[name] !== undefined ? depth[name] : 0;
    if (!layers[d]) layers[d] = [];
    layers[d].push(name);
  }
  const maxDepth = Math.max(...Object.keys(layers).map(Number));

  function median(vals) {
    if (!vals.length) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function countReachable(node, adj, memo) {
    if (memo[node] !== undefined) return memo[node];
    const kids = [...(adj[node] || [])];
    let total = kids.length;
    for (const kid of kids) total += countReachable(kid, adj, memo);
    memo[node] = total;
    return total;
  }

  function semanticBand(name) {
    if (name === ROOT) return 0;
    if (name === SINK) return 3;
    if (name.endsWith('predicate')) return 1;
    return 2;
  }

  // Barycenter ordering with semantic bands
  const reach = {};
  for (let d = 0; d <= maxDepth; d++)
    for (const n of (layers[d] || [])) countReachable(n, fwd, reach);

  for (let d = 0; d <= maxDepth; d++) {
    layers[d] = [...(layers[d] || [])].sort((a, b) => {
      const bandDiff = semanticBand(a) - semanticBand(b);
      if (bandDiff) return bandDiff;
      const critDiff = (critSet.has(b) ? 1 : 0) - (critSet.has(a) ? 1 : 0);
      if (critDiff) return critDiff;
      return (reach[b] || 0) - (reach[a] || 0) || (nodeLat[b] || 0) - (nodeLat[a] || 0) || a.localeCompare(b);
    });
  }

  for (let iter = 0; iter < 8; iter++) {
    for (let d = 1; d <= maxDepth; d++) {
      const layer = layers[d] || [];
      const prevLayer = layers[d - 1] || [];
      const prevIdx = {};
      prevLayer.forEach((n, i) => { prevIdx[n] = i; });
      layers[d] = [...layer].sort((a, b) => {
        const ap = [...(bwd[a] || [])].filter(p => prevIdx[p] !== undefined);
        const bp = [...(bwd[b] || [])].filter(p => prevIdx[p] !== undefined);
        const am = median(ap.map(p => prevIdx[p]));
        const bm = median(bp.map(p => prevIdx[p]));
        const as = am == null ? layer.indexOf(a) : am;
        const bs = bm == null ? layer.indexOf(b) : bm;
        return as !== bs ? as - bs : (critSet.has(b) ? 1 : 0) - (critSet.has(a) ? 1 : 0) || a.localeCompare(b);
      });
    }
    for (let d = maxDepth - 1; d >= 0; d--) {
      const layer = layers[d] || [];
      const nextLayer = layers[d + 1] || [];
      const nextIdx = {};
      nextLayer.forEach((n, i) => { nextIdx[n] = i; });
      layers[d] = [...layer].sort((a, b) => {
        const ac = [...(fwd[a] || [])].filter(c => nextIdx[c] !== undefined);
        const bc = [...(fwd[b] || [])].filter(c => nextIdx[c] !== undefined);
        const am = median(ac.map(c => nextIdx[c]));
        const bm = median(bc.map(c => nextIdx[c]));
        const as = am == null ? layer.indexOf(a) : am;
        const bs = bm == null ? layer.indexOf(b) : bm;
        return as !== bs ? as - bs : (critSet.has(b) ? 1 : 0) - (critSet.has(a) ? 1 : 0) || a.localeCompare(b);
      });
    }
  }

  const W = context.panel.width || 1200;
  const tallestLayer = Math.max(...Object.values(layers).map(l => l.length));
  const H = Math.max(context.panel.height || 700, tallestLayer * NODE_SPACING + 160);
  const padX = 60, padY = 40, titleH = 55;
  const totalCols = maxDepth + 1;

  const nodePos = {};
  for (let d = 0; d <= maxDepth; d++) {
    const layer = layers[d] || [];
    const usableH = H - titleH - 2 * padY;
    const x = padX + (d / Math.max(totalCols - 1, 1)) * (W - 2 * padX);
    const spacing = layer.length > 1 ? Math.min(NODE_SPACING, usableH / (layer.length - 1)) : 0;
    const blockH = spacing * Math.max(layer.length - 1, 0);
    const startY = titleH + padY + (usableH - blockH) / 2;
    layer.forEach((name, i) => { nodePos[name] = { x, y: startY + i * spacing }; });
  }

  function getAll(node, adj, visited) {
    if (visited.has(node)) return;
    visited.add(node);
    for (const nb of (adj[node] || [])) getAll(nb, adj, visited);
  }

  const colCrit = '#ff6b6b', colDP = '#ffa94d', colGate = '#74c0fc', colMeta = '#69db7c';
  const colDark = 'rgba(30,33,40,0.85)';

  function nodeColor(name) {
    if (name === ROOT || name === SINK) return colMeta;
    if (critSet.has(name) && (nodeLat[name] || 0) > 0) return colCrit;
    if (name.endsWith('predicate')) return colGate;
    return colDP;
  }

  const nodes = Object.entries(nodeLat)
    .sort((a, b) => b[1] - a[1])
    .map(([name, lat]) => {
      const pos = nodePos[name] || { x: 0, y: 0 };
      const col = nodeColor(name);
      const cumul = cumulLat[name] || 0;
      const pct = Math.min(0.98, Math.max(0.03, cumul / maxCumul));
      const isCrit = critSet.has(name) && lat > 0;
      let cat = name === ROOT ? 0 : name === SINK ? 3 : isCrit ? 4 : name.endsWith('predicate') ? 1 : 2;
      let displayName = name.replace(/predicate$/, '(P)').replace(/dp$/, '');

      return {
        name, x: pos.x, y: pos.y, fixed: true,
        value: Math.round(lat * 10) / 10,
        symbolSize: NODE_SIZE,
        category: cat,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 1, x2: 0, y2: 0,
            colorStops: [
              { offset: 0, color: col },
              { offset: Math.min(pct, 0.99), color: col },
              { offset: Math.min(pct + 0.005, 1.0), color: colDark },
              { offset: 1, color: colDark },
            ],
          },
          borderColor: col, borderWidth: 2.5, shadowBlur: 0, shadowColor: 'transparent',
        },
        label: {
          show: true, fontSize: 10, position: 'right', distance: 8, color: '#ddd',
          formatter: () => {
            const ms = lat > 0 ? '  {val| ' + Math.round(lat) + ' ms}' : '';
            return '{name|' + displayName + '}' + ms;
          },
          rich: {
            name: { fontSize: 10, color: '#ddd' },
            val: { fontSize: 10, fontWeight: 'bold', color: col, padding: [0, 0, 0, 4] },
          },
        },
      };
    });

  const links = Object.entries(cleanEdges).map(([key, lat]) => {
    const [src, tgt] = key.split('__');
    const isCrit = critSet.has(src) && critSet.has(tgt);
    return {
      source: src, target: tgt, value: Math.round(lat),
      lineStyle: {
        width: isCrit ? 2.5 : 1,
        color: isCrit ? 'rgba(255,107,107,0.7)' : 'rgba(150,150,160,0.35)',
        type: isCrit ? 'solid' : 'dashed',
        curveness: 0,
      },
    };
  });

  // Invisible transitive edges for full-chain hover
  for (const name of Object.keys(nodeLat)) {
    const anc = new Set(); getAll(name, bwd, anc); anc.delete(name);
    const desc = new Set(); getAll(name, fwd, desc); desc.delete(name);
    const allConn = new Set([...anc, ...desc]);
    for (const other of allConn) {
      const k1 = name + '__' + other, k2 = other + '__' + name;
      if (!cleanEdges[k1] && !cleanEdges[k2]) {
        links.push({
          source: name, target: other,
          symbol: ['none', 'none'],
          lineStyle: { width: 0, opacity: 0, color: 'rgba(0,0,0,0)' },
          emphasis: { lineStyle: { width: 0, opacity: 0 } },
        });
      }
    }
  }

  const cats = [
    { name: 'flow start', itemStyle: { color: colMeta } },
    { name: 'predicate', itemStyle: { color: colGate } },
    { name: 'data provider', itemStyle: { color: colDP } },
    { name: 'sink', itemStyle: { color: colMeta } },
    { name: 'critical', itemStyle: { color: colCrit } },
  ];

  const critChain = crit.path.split('_').join(' → ');

  // --- Interactive features ---
  function buildMermaid() {
    let md = 'flowchart LR\n';
    for (const name of Object.keys(nodeLat)) {
      const lat = Math.round(nodeLat[name] || 0);
      const label = name.replace(/predicate$/, '(P)').replace(/dp$/, '');
      md += critSet.has(name)
        ? '  ' + name + '["' + label + ' ' + lat + 'ms"]:::crit\n'
        : '  ' + name + '["' + label + ' ' + lat + 'ms"]\n';
    }
    for (const key of Object.keys(cleanEdges)) {
      const [s, t] = key.split('__');
      md += (critSet.has(s) && critSet.has(t)) ? '  ' + s + ' ==> ' + t + '\n' : '  ' + s + ' --> ' + t + '\n';
    }
    md += '  classDef crit fill:#ff6b6b,stroke:#c00,color:#fff\n';
    return md;
  }

  let critOnly = false;
  const fullNodes = nodes;
  const fullLinks = links;
  const critOnlyNodes = nodes.filter(n => critSet.has(n.name));
  const critOnlyLinks = links.filter(l => critSet.has(l.source) && critSet.has(l.target) && (l.lineStyle || {}).width > 0);
  const chart = context.panel.chart;
  const icoS = 22, icoGap = 6;

  function showToast(msg) {
    const container = chart.getDom();
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'absolute', bottom: '40px', right: '8px', zIndex: '9999',
      padding: '6px 14px', borderRadius: '4px', fontSize: '11px',
      color: '#fff', background: 'rgba(40,167,69,0.9)',
      pointerEvents: 'none', transition: 'opacity 0.3s',
    });
    container.style.position = 'relative';
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 1000);
    setTimeout(() => { toast.remove(); }, 1400);
  }

  function setupSlider() {
    const container = chart.getDom();
    if (container.querySelector('.lat-slider')) return;
    const wrap = document.createElement('div');
    wrap.className = 'lat-slider';
    Object.assign(wrap.style, {
      position: 'absolute', bottom: '36px', right: '8px', zIndex: '9999',
      display: 'none', alignItems: 'center', gap: '6px',
      background: 'rgba(30,33,40,0.95)', padding: '6px 10px', borderRadius: '6px',
      border: '1px solid rgba(150,150,160,0.3)',
    });
    const label = document.createElement('span');
    Object.assign(label.style, { color: '#999', fontSize: '10px', whiteSpace: 'nowrap' });
    label.textContent = 'Min: 0%';
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0'; slider.max = '50'; slider.value = '0';
    Object.assign(slider.style, { width: '100px', accentColor: '#ffa94d', cursor: 'pointer' });
    slider.addEventListener('input', () => {
      const pctVal = parseInt(slider.value) / 100;
      const threshold = pctVal * maxLat;
      label.textContent = 'Min: ' + slider.value + '%';
      const keepSet = new Set();
      for (const n of fullNodes) {
        const l = nodeLat[n.name] || 0;
        if (n.name === ROOT || n.name === SINK || critSet.has(n.name) || l >= threshold) keepSet.add(n.name);
      }
      const filtered = fullNodes.map(n => Object.assign({}, n, {
        itemStyle: Object.assign({}, n.itemStyle, { opacity: keepSet.has(n.name) ? 1 : 0.08 }),
        label: Object.assign({}, n.label, { show: keepSet.has(n.name) }),
      }));
      const filteredLinks = fullLinks.map(l => Object.assign({}, l, {
        lineStyle: Object.assign({}, l.lineStyle, {
          opacity: (keepSet.has(l.source) && keepSet.has(l.target)) ? (l.lineStyle || {}).opacity || 0.8 : 0.03,
        }),
      }));
      chart.setOption({ series: [{ data: filtered, links: filteredLinks }] });
    });
    wrap.appendChild(label);
    wrap.appendChild(slider);
    container.style.position = 'relative';
    container.appendChild(wrap);
    return wrap;
  }
  const sliderPopover = setupSlider();

  return {
    backgroundColor: 'transparent',
    title: {
      text: '',
      subtext: 'Critical path ≤ ' + Math.round(critTotal) + ' ms p' + pctl + ' — ' + critChain,
      left: 'center', top: 4,
      textStyle: { fontSize: 15, color: '#eee', fontWeight: 600 },
      subtextStyle: { fontSize: 11, color: colCrit, fontWeight: 500 },
    },
    graphic: [
      {
        type: 'group', right: icoS * 2 + icoGap * 2 + 8, bottom: 8, z: 100,
        onclick: function() { navigator.clipboard.writeText(buildMermaid()); showToast('Mermaid copied'); },
        children: [
          { type: 'rect', shape: { width: icoS, height: icoS, r: 4 }, style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 }, z2: 1 },
          { type: 'text', style: { text: '📋', x: icoS / 2, y: icoS / 2, fill: '#aaa', fontSize: 12, textAlign: 'center', textVerticalAlign: 'middle' }, z2: 2 },
        ],
      },
      {
        type: 'group', right: icoS + icoGap + 8, bottom: 8, z: 100,
        onclick: function() {
          critOnly = !critOnly;
          chart.setOption({ series: [{ data: critOnly ? critOnlyNodes : fullNodes, links: critOnly ? critOnlyLinks : fullLinks }] });
        },
        children: [
          { type: 'rect', shape: { width: icoS, height: icoS, r: 4 }, style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 }, z2: 1 },
          { type: 'text', style: { text: '⚡', x: icoS / 2, y: icoS / 2, fill: '#ff6b6b', fontSize: 13, textAlign: 'center', textVerticalAlign: 'middle' }, z2: 2 },
        ],
      },
      {
        type: 'group', right: 8, bottom: 8, z: 100,
        onclick: function() { if (sliderPopover) sliderPopover.style.display = sliderPopover.style.display === 'none' ? 'flex' : 'none'; },
        children: [
          { type: 'rect', shape: { width: icoS, height: icoS, r: 4 }, style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 }, z2: 1 },
          { type: 'text', style: { text: '◔', x: icoS / 2, y: icoS / 2, fill: '#ffa94d', fontSize: 14, textAlign: 'center', textVerticalAlign: 'middle' }, z2: 2 },
        ],
      },
    ],
    tooltip: {
      confine: true,
      backgroundColor: 'rgba(20,22,28,0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#ddd', fontSize: 12 },
      formatter: (p) => {
        if (p.dataType === 'edge') {
          return '<b>' + p.data.source + ' → ' + p.data.target + '</b><br/>' + p.data.value + ' ms';
        }
        const name = p.name;
        const lat = nodeLat[name] || 0;
        const cumul = cumulLat[name] || 0;
        const role = name === ROOT ? 'flow start' : name === SINK ? 'sink' : name.endsWith('predicate') ? 'predicate' : 'data provider';
        const critPct = critTotal > 0 ? Math.round((lat / critTotal) * 100) : 0;
        const onCrit = critSet.has(name);
        return '<b style="font-size:13px">' + name + '</b>'
          + '<br/><span style="color:#888">' + role + '</span>'
          + '<br/><br/>p' + pctl + ' execution: <b>' + Math.round(lat) + ' ms</b>'
          + (onCrit ? '<br/>% of critical path: <b>' + critPct + '%</b>' : '')
          + '<br/>Cumulative: <b>' + Math.round(cumul) + ' ms</b>'
          + (hasTaskDurations ? '<br/><span style="color:#666">Source: task.duration histogram</span>' : '');
      },
    },
    legend: {
      data: cats.map(c => c.name),
      bottom: 4, left: 'center',
      textStyle: { color: '#aaa', fontSize: 10 },
      itemWidth: 14, itemHeight: 14, itemGap: 20,
    },
    animationDuration: 800,
    animationEasing: 'cubicOut',
    series: [{
      type: 'graph',
      layout: 'none',
      data: nodes,
      links,
      categories: cats,
      roam: true,
      emphasis: {
        focus: 'adjacency',
        itemStyle: { borderWidth: 4, borderColor: '#fff' },
        lineStyle: { width: 3.5 },
        label: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
      },
      blur: {
        itemStyle: { opacity: 0.12 },
        lineStyle: { opacity: 0.05 },
        label: { opacity: 0.1 },
      },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 7,
      lineStyle: { opacity: 0.8 },
    }],
  };
}
