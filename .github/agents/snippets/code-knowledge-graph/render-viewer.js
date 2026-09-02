#!/usr/bin/env node
/**
 * render-viewer.js — gera visualizador HTML interativo a partir de graph.json.
 *
 * Motivo: Mermaid tem limite pratico de ~500 nos/linhas para renderizar um
 * diagrama legivel — o grafo produzido por build-graph.js tem milhares de
 * nos (2400+) e nao pode mais usar Mermaid (decisao 2026-09-01). Este script
 * substitui a antiga geracao de graph.mmd/graph.html dentro de build-graph.js.
 *
 * Lib escolhida: Cytoscape.js (carregada via CDN, client-side, sem instalar
 * nada) — suporta milhares de nos com layout `fcose`, tem API rica para
 * clique em no -> painel de detalhes, busca por nome/id, filtro por
 * tipo/projeto, destaque de vizinhanca (BFS 1 nivel) e realce de arestas
 * circulares. Superior a Mermaid para navegacao; mais simples que
 * Sigma.js/Cosmograph para o caso de uso "detalhes + navegacao", que exige
 * interatividade rica e nao so performance bruta de renderizacao.
 *
 * Uso:
 *   node render-viewer.js --in <caminho/graph.json> [--out <diretorio-saida>]
 *
 * Pre-requisito: NENHUM (apenas Node.js). O HTML gerado usa Cytoscape.js e
 * cytoscape-fcose via CDN (jsdelivr) — requer conexao internet ao ABRIR o
 * HTML no navegador (nao ao gerar). Dados do grafo sao embutidos inline no
 * HTML (evita CORS de fetch() em file://).
 *
 * Saida: <out>/graph-viewer.html (out = mesma pasta de --in por padrao).
 * Nao versionado (.gitignore) — artefato reproduzivel.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  let inPath = null, outDir = null;
  const inIdx = args.indexOf('--in');
  if (inIdx !== -1) { inPath = path.resolve(args[inIdx + 1]); }
  const outIdx = args.indexOf('--out');
  if (outIdx !== -1) { outDir = path.resolve(args[outIdx + 1]); }
  if (!inPath) inPath = path.resolve(process.cwd(), 'graph.json');
  if (!outDir) outDir = path.dirname(inPath);
  return { inPath, outDir };
}

function renderHtml(graphData, title) {
  const dataJson = JSON.stringify(graphData);
  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="https://cdn.jsdelivr.net/npm/cytoscape@3.30.2/dist/cytoscape.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/layout-base@2.0.1/layout-base.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cose-base@2.2.0/cose-base.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cytoscape-fcose@2.2.0/cytoscape-fcose.min.js"></script>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #1e1e1e; color: #ddd; }
  #app { display: flex; height: 100vh; }
  #sidebar { width: 340px; flex-shrink: 0; background: #252526; padding: 12px; overflow-y: auto; border-right: 1px solid #444; }
  #cy { flex: 1; height: 100%; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  h3 { font-size: 12px; margin: 14px 0 6px; color: #9cdcfe; text-transform: uppercase; letter-spacing: .05em; }
  input[type=text] { width: 100%; padding: 6px 8px; background: #333; border: 1px solid #555; color: #eee; border-radius: 4px; margin-bottom: 8px; }
  label { display: block; font-size: 12px; margin: 4px 0; cursor: pointer; }
  .stat { font-size: 12px; color: #aaa; margin: 2px 0; }
  .stat b { color: #ddd; }
  #details { font-size: 12px; line-height: 1.5; word-break: break-all; }
  #details .row { margin-bottom: 6px; }
  #details .k { color: #9cdcfe; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px; }
  .b-file { background: #3794ff; }
  .b-controller { background: #ff9d00; color: #1e1e1e; }
  .b-service { background: #4ec9b0; color: #1e1e1e; }
  .b-tight { background: #f14c4c; }
  .b-loose { background: #cca700; color: #1e1e1e; }
  .b-circular { background: #c586c0; color: #1e1e1e; }
  button { background: #0e639c; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 4px; margin-top: 4px; }
  button:hover { background: #1177bb; }
  #empty-hint { font-size: 12px; color: #888; }
</style>
</head>
<body>
<div id="app">
  <div id="sidebar">
    <h2>🔎 code-knowledge-graph</h2>
    <input type="text" id="search" placeholder="Buscar por nome ou id...">
    <h3>Estatísticas</h3>
    <div id="stats"></div>
    <h3>Filtrar por tipo</h3>
    <div id="filter-type"></div>
    <h3>Filtrar por projeto</h3>
    <div id="filter-project"></div>
    <h3>Ações</h3>
    <button id="btn-reset">Resetar visão</button>
    <button id="btn-cycles">Só ciclos</button>
    <h3>Detalhes do nó selecionado</h3>
    <div id="details"><span id="empty-hint">Clique em um nó para ver detalhes, vizinhos e arestas.</span></div>
  </div>
  <div id="cy"></div>
</div>
<script>
const GRAPH = ${dataJson};
const typeClass = { file: 'b-file', controller: 'b-controller', service: 'b-service' };
const couplingClass = { tight: 'b-tight', loose: 'b-loose', circular: 'b-circular', eventual: 'b-loose' };

const elements = [];
for (const n of GRAPH.nodes) {
  elements.push({ data: { id: n.id, label: n.name || n.id, type: n.type, projectId: n.projectId, filePath: n.filePath, language: n.language, metadata: n.metadata || {} } });
}
for (const e of GRAPH.edges) {
  elements.push({ data: { id: e.id, source: e.sourceId, target: e.targetId, type: e.type, confidence: e.confidence, coupling: e.coupling, metadata: e.metadata || {} } });
}

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements,
  style: [
    { selector: 'node', style: {
      'label': 'data(label)', 'font-size': 8, 'color': '#ddd', 'text-valign': 'bottom', 'text-margin-y': 4,
      'width': 14, 'height': 14, 'background-color': '#3794ff',
    }},
    { selector: 'node[type = "controller"]', style: { 'background-color': '#ff9d00', shape: 'diamond' } },
    { selector: 'node[type = "service"]', style: { 'background-color': '#4ec9b0', shape: 'round-triangle' } },
    { selector: 'edge', style: {
      'width': 1, 'line-color': '#666', 'target-arrow-color': '#666', 'target-arrow-shape': 'triangle',
      'curve-style': 'bezier', 'opacity': 0.55, 'arrow-scale': 0.6,
    }},
    { selector: 'edge[coupling = "loose"]', style: { 'line-color': '#cca700', 'target-arrow-color': '#cca700', 'line-style': 'dashed' } },
    { selector: 'edge[coupling = "circular"]', style: { 'line-color': '#c586c0', 'target-arrow-color': '#c586c0', 'width': 2.5, 'opacity': 1 } },
    { selector: '.faded', style: { opacity: 0.06 } },
    { selector: '.highlighted', style: { opacity: 1, 'z-index': 999 } },
    { selector: 'node.highlighted', style: { 'border-width': 2, 'border-color': '#fff' } },
    { selector: '.hidden', style: { display: 'none' } },
  ],
  layout: { name: 'fcose', quality: 'draft', animate: false, nodeRepulsion: 4500, idealEdgeLength: 60, randomize: true },
  minZoom: 0.05, maxZoom: 6,
});

// --- Stats ---
const projects = [...new Set(GRAPH.nodes.map(n => n.projectId || 'externo'))].sort();
const types = [...new Set(GRAPH.nodes.map(n => n.type))].sort();
document.getElementById('stats').innerHTML =
  '<div class="stat"><b>' + GRAPH.nodes.length + '</b> nós</div>' +
  '<div class="stat"><b>' + GRAPH.edges.length + '</b> arestas</div>' +
  '<div class="stat"><b>' + projects.length + '</b> projetos</div>';

// --- Filtro por tipo ---
const typeFilterDiv = document.getElementById('filter-type');
const activeTypes = new Set(types);
for (const t of types) {
  const lbl = document.createElement('label');
  lbl.innerHTML = '<input type="checkbox" checked data-type="' + t + '"> ' + t + ' <span class="badge ' + (typeClass[t] || '') + '">' + GRAPH.nodes.filter(n=>n.type===t).length + '</span>';
  typeFilterDiv.appendChild(lbl);
}
typeFilterDiv.addEventListener('change', (ev) => {
  const t = ev.target.getAttribute('data-type');
  if (ev.target.checked) activeTypes.add(t); else activeTypes.delete(t);
  applyFilters();
});

// --- Filtro por projeto ---
const projFilterDiv = document.getElementById('filter-project');
const activeProjects = new Set(projects);
for (const p of projects) {
  const lbl = document.createElement('label');
  lbl.innerHTML = '<input type="checkbox" checked data-proj="' + p + '"> ' + p + ' <span class="badge">' + GRAPH.nodes.filter(n=>(n.projectId||'externo')===p).length + '</span>';
  projFilterDiv.appendChild(lbl);
}
projFilterDiv.addEventListener('change', (ev) => {
  const p = ev.target.getAttribute('data-proj');
  if (ev.target.checked) activeProjects.add(p); else activeProjects.delete(p);
  applyFilters();
});

function applyFilters() {
  cy.nodes().forEach(n => {
    const visible = activeTypes.has(n.data('type')) && activeProjects.has(n.data('projectId') || 'externo');
    n.toggleClass('hidden', !visible);
  });
  cy.edges().forEach(e => {
    const visible = !e.source().hasClass('hidden') && !e.target().hasClass('hidden');
    e.toggleClass('hidden', !visible);
  });
}

// --- Busca ---
document.getElementById('search').addEventListener('input', (ev) => {
  const q = ev.target.value.trim().toLowerCase();
  cy.elements().removeClass('highlighted faded');
  if (!q) return;
  const matched = cy.nodes().filter(n => (n.data('label')||'').toLowerCase().includes(q) || (n.id()||'').toLowerCase().includes(q));
  if (matched.length === 0) return;
  cy.elements().addClass('faded');
  matched.removeClass('faded').addClass('highlighted');
  cy.animate({ fit: { eles: matched, padding: 80 } }, { duration: 300 });
});

// --- Clique em nó: detalhes + destaque de vizinhança ---
cy.on('tap', 'node', (ev) => {
  const n = ev.target;
  const neighborhood = n.closedNeighborhood();
  cy.elements().removeClass('highlighted faded').addClass('faded');
  neighborhood.removeClass('faded').addClass('highlighted');

  const meta = n.data('metadata') || {};
  const incoming = n.incomers('edge');
  const outgoing = n.outgoers('edge');
  let html = '';
  html += '<div class="row"><span class="k">id:</span> ' + n.id() + '</div>';
  html += '<div class="row"><span class="k">nome:</span> ' + n.data('label') + '</div>';
  html += '<div class="row"><span class="k">tipo:</span> <span class="badge ' + (typeClass[n.data('type')]||'') + '">' + n.data('type') + '</span></div>';
  html += '<div class="row"><span class="k">projeto:</span> ' + (n.data('projectId')||'externo') + '</div>';
  if (n.data('filePath')) html += '<div class="row"><span class="k">arquivo:</span> ' + n.data('filePath') + '</div>';
  if (n.data('language')) html += '<div class="row"><span class="k">linguagem:</span> ' + n.data('language') + '</div>';
  if (meta.framework) html += '<div class="row"><span class="k">framework:</span> ' + meta.framework + '</div>';
  if (meta.restPath) html += '<div class="row"><span class="k">restPath:</span> ' + meta.restPath + '</div>';
  if (meta.dataSensitivity) html += '<div class="row"><span class="k">sensibilidade:</span> ' + meta.dataSensitivity + '</div>';
  html += '<div class="row"><span class="k">fan-in (entrada):</span> ' + incoming.length + '</div>';
  html += '<div class="row"><span class="k">fan-out (saída):</span> ' + outgoing.length + '</div>';
  if (incoming.length) {
    html += '<h3>Depende deste nó (' + incoming.length + ')</h3>';
    incoming.forEach(e => { html += '<div class="row">← ' + e.source().data('label') + ' <span class="badge ' + (couplingClass[e.data('coupling')]||'') + '">' + e.data('coupling') + '</span></div>'; });
  }
  if (outgoing.length) {
    html += '<h3>Este nó depende de (' + outgoing.length + ')</h3>';
    outgoing.forEach(e => { html += '<div class="row">→ ' + e.target().data('label') + ' <span class="badge ' + (couplingClass[e.data('coupling')]||'') + '">' + e.data('coupling') + '</span></div>'; });
  }
  document.getElementById('details').innerHTML = html;
});

cy.on('tap', (ev) => { if (ev.target === cy) { cy.elements().removeClass('highlighted faded'); } });

document.getElementById('btn-reset').addEventListener('click', () => {
  cy.elements().removeClass('highlighted faded hidden');
  document.getElementById('search').value = '';
  document.querySelectorAll('#filter-type input, #filter-project input').forEach(c => c.checked = true);
  activeTypes.clear(); types.forEach(t => activeTypes.add(t));
  activeProjects.clear(); projects.forEach(p => activeProjects.add(p));
  cy.fit(undefined, 40);
});

document.getElementById('btn-cycles').addEventListener('click', () => {
  const circularEdges = cy.edges('[coupling = "circular"]');
  if (circularEdges.length === 0) { alert('Nenhum ciclo detectado no grafo.'); return; }
  const involved = circularEdges.connectedNodes().union(circularEdges);
  cy.elements().addClass('faded').removeClass('highlighted');
  involved.removeClass('faded').addClass('highlighted');
  cy.animate({ fit: { eles: involved, padding: 80 } }, { duration: 300 });
});
</script>
</body>
</html>`;
}

function main() {
  const { inPath, outDir } = parseArgs(process.argv);
  if (!fs.existsSync(inPath)) {
    console.error('Arquivo nao encontrado: ' + inPath);
    console.error('Uso: node render-viewer.js --in <caminho/graph.json> [--out <diretorio-saida>]');
    process.exit(1);
  }
  const graphData = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const title = 'code-knowledge-graph viewer (' + graphData.nodes.length + ' nós, ' + graphData.edges.length + ' arestas)';
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'graph-viewer.html');
  fs.writeFileSync(outPath, renderHtml(graphData, title), 'utf8');
  console.log(JSON.stringify({ arquivoGerado: outPath, nos: graphData.nodes.length, arestas: graphData.edges.length }, null, 2));
  console.log('\nAbra o arquivo no navegador: ' + outPath);
}

if (require.main === module) main();

module.exports = { renderHtml };

