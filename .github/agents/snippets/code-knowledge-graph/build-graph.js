#!/usr/bin/env node
/**
 * code-knowledge-graph — script de referencia UNICO de producao (R-026).
 * Motor UNICO: pattern-matching via regex (TypeScript + Java), 100% Node.js
 * built-ins (fs/path/crypto) — SEM dependencia externa, SEM subprocess, SEM
 * venv isolado, SEM instalacao de qualquer tipo.
 *
 * Uso:
 *   node build-graph.js <projectRoot1> [projectRoot2 ...]
 *   node build-graph.js <projectRoot1> [projectRoot2 ...] --out <diretorio-saida>
 *
 * Pre-requisito: NENHUM (apenas Node.js, ja presente em qualquer ambiente
 * com Angular/TypeScript). Nao instala nada, nao usa venv, nao usa pip.
 *
 * Saida: <out>/graph.json (out = cwd por padrao). Nao versionado (.gitignore)
 * — artefato reproduzivel. Para visualizacao interativa (sem limite pratico
 * de nos), use render-viewer.js (gera graph-viewer.html com Cytoscape.js)
 * apos este script.
 *
 * Convencao de resolucao de import:
 *   - TypeScript: import relativo ("./foo", "../bar/baz") resolvido para
 *     <dir-do-arquivo>/foo.ts ou foo/index.ts. Imports de pacote (sem ".")
 *     sao ignorados (libs externas fora de escopo, RF-004).
 *   - Java: import fully-qualified (import a.b.C;) resolvido via convencao
 *     Maven padrao: a.b.C -> <root>/a/b/C.java, relativo a cada projectRoot
 *     passado (assume-se que o root e a pasta src/main/java ou equivalente).
 *     Imports de biblioteca externa (java.*, javax.*, org.springframework.*,
 *     etc.) nao resolvem contra nenhum root e sao descartados — mesmo
 *     criterio de "so imports locais" aplicado ao TypeScript.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'dist', 'build', 'coverage', '.angular']);

function parseArgs(argv) {
  const args = argv.slice(2);
  let outDir = process.cwd();
  const outIdx = args.indexOf('--out');
  if (outIdx !== -1) {
    outDir = path.resolve(args[outIdx + 1]);
    args.splice(outIdx, 2);
  }
  const projectRoots = args.map((p) => path.resolve(p));
  return { projectRoots, outDir };
}

function detectLang(root) {
  // heuristica simples: presenca de arquivos .java vs .ts no root (top-level scan raso)
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.java')) return 'java';
      if (e.isFile() && e.name.endsWith('.ts')) return 'typescript';
    }
  } catch (e) { /* ignore */ }
  // fallback: assume typescript se caminho contem 'src/app' ou 'src\app', java se contem 'java'
  if (/src[\\/]app/.test(root)) return 'typescript';
  if (/java/i.test(root)) return 'java';
  return 'typescript';
}

function walk(dir, ext, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, ext, out);
    else if (e.isFile() && e.name.endsWith(ext)) out.push(full);
  }
}

function buildGraph(rootsConfig) {
  const JAVA_ROOTS = rootsConfig.filter((r) => r.lang === 'java').map((r) => r.root);

  function projectIdFor(absPath) {
    for (const r of rootsConfig) if (absPath.startsWith(r.root)) return r.project;
    return 'unknown';
  }

  const files = [];
  for (const r of rootsConfig) {
    const ext = r.lang === 'java' ? '.java' : '.ts';
    const list = [];
    walk(r.root, ext, list);
    for (const f of list) files.push({ abs: f, project: r.project, lang: r.lang });
  }

  const nodes = {}, edges = {}, adjacency = {};
  function ensureFileNode(absPath, lang) {
    const pid = projectIdFor(absPath);
    const id = `file::${pid}::${absPath}`;
    if (!nodes[id]) {
      nodes[id] = { id, type: 'file', projectId: pid, name: path.basename(absPath), filePath: absPath, language: lang, metadata: {} };
      adjacency[id] = new Set();
    }
    return id;
  }
  function addEdge(id, type, sourceId, targetId, confidence, coupling, metadata) {
    if (edges[id]) return;
    edges[id] = { id, type, sourceId, targetId, confidence, coupling, metadata: metadata || {} };
    adjacency[sourceId] = adjacency[sourceId] || new Set();
    adjacency[sourceId].add(id);
  }
  function resolveTsImport(fromFile, spec) {
    if (!spec.startsWith('.')) return null;
    const base = path.resolve(path.dirname(fromFile), spec);
    const c1 = base + '.ts', c2 = path.join(base, 'index.ts');
    if (fs.existsSync(c1)) return c1;
    if (fs.existsSync(c2)) return c2;
    return null;
  }
  function resolveJavaImport(spec) {
    const rel = spec.replace(/\./g, path.sep) + '.java';
    for (const root of JAVA_ROOTS) {
      const candidate = path.join(root, rel);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  const rawCounts = {};
  const bump = (k) => { rawCounts[k] = (rawCounts[k] || 0) + 1; };
  const angularApiPaths = {}, javaControllerPaths = {}, crossRepoMarkerFiles = new Set();
  const httpHits = [], sensitivityFindings = [];
  let filesRead = 0;

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f.abs, 'utf8'); } catch (e) { continue; }
    filesRead++;

    if (f.lang === 'typescript') {
      const importRe = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = importRe.exec(content))) {
        bump('ts-import');
        const target = resolveTsImport(f.abs, m[1]);
        if (target) {
          const srcId = ensureFileNode(f.abs, 'typescript');
          const tgtId = ensureFileNode(target, 'typescript');
          const sameProj = projectIdFor(f.abs) === projectIdFor(target);
          addEdge(`import::${srcId}=>${tgtId}`, 'import', srcId, tgtId, 'exact', sameProj ? 'tight' : 'loose');
        }
      }
      const decorators = [
        [/@Component\s*\(/, 'angular-component'], [/@Injectable\s*\(/, 'angular-injectable'],
        [/@NgModule\s*\(/, 'angular-ngmodule'], [/@Directive\s*\(/, 'angular-directive'],
        [/@Pipe\s*\(/, 'angular-pipe'],
      ];
      for (const [re, tag] of decorators) {
        if (re.test(content)) {
          bump(tag);
          const id = ensureFileNode(f.abs, 'typescript');
          nodes[id].metadata.framework = tag;
        }
      }
      if (/this\.http\.(get|post|put|delete)\(/.test(content) || /\bfetch\(/.test(content)) { bump('angular-http-client'); httpHits.push(f.abs); }
      if (/import\s*\{\s*\w*Configuration\w*\s*\}\s*from/.test(content)) { crossRepoMarkerFiles.add(f.abs); bump('angular-cross-repo-config-import'); }
      const apiUrlMatch = content.match(/get\s+apiUrl\s*\(\s*\)\s*:\s*string\s*\{[^}]*return\s*`\$\{super\.apiUrl\}([^`]*)`/s);
      if (apiUrlMatch) { bump('angular-api-url-path'); angularApiPaths[f.abs] = apiUrlMatch[1]; }
      if (/\b(cpf|rg|email|telefone)\s*:\s*string\b/i.test(content)) {
        bump('ts-field-pii'); sensitivityFindings.push({ file: f.abs, dataSensitivity: 'PII' });
        const id = ensureFileNode(f.abs, 'typescript'); nodes[id].metadata.dataSensitivity = 'PII';
      }
      if (/\b(valor|preco|salario)\s*:\s*number\b/i.test(content)) {
        bump('ts-field-financeiro'); sensitivityFindings.push({ file: f.abs, dataSensitivity: 'financeiro' });
        const id = ensureFileNode(f.abs, 'typescript'); nodes[id].metadata.dataSensitivity = 'financeiro';
      }
    } else if (f.lang === 'java') {
      const importRe = /^import\s+([\w.]+)\s*;/gm;
      let m;
      while ((m = importRe.exec(content))) {
        bump('java-import');
        const target = resolveJavaImport(m[1]);
        if (target) {
          const srcId = ensureFileNode(f.abs, 'java');
          const tgtId = ensureFileNode(target, 'java');
          const sameProj = projectIdFor(f.abs) === projectIdFor(target);
          addEdge(`import::${srcId}=>${tgtId}`, 'import', srcId, tgtId, 'exact', sameProj ? 'tight' : 'loose');
        }
      }
      const decorators = [
        [/@Service\b/, 'spring-service'], [/@Repository\b/, 'spring-repository'],
        [/interface\s+\w+\s+extends\s+(?:JpaRepository|CrudRepository)\s*</, 'spring-repository'],
        [/@Entity\b/, 'spring-entity'], [/@Configuration\b/, 'spring-configuration'],
        [/Mono<[^>]+>\s+\w+\s*\(/, 'reactive-mono'], [/Flux<[^>]+>\s+\w+\s*\(/, 'reactive-flux'],
        [/@Stateless\b/, 'ejb-stateless'], [/@Stateful\b/, 'ejb-stateful'], [/@Singleton\b/, 'ejb-singleton'],
        [/@MessageDriven\s*\(/, 'ejb-messagedriven'],
      ];
      for (const [re, tag] of decorators) {
        if (re.test(content)) {
          bump(tag);
          const id = ensureFileNode(f.abs, 'java');
          nodes[id].metadata.framework = tag;
        }
      }
      if (/@RestController\b/.test(content)) {
        bump('spring-rest-controller-with-mapping');
        const rm = content.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/);
        const restPath = rm ? rm[1] : null;
        const id = `controller::${f.abs}`;
        nodes[id] = { id, type: 'controller', projectId: projectIdFor(f.abs), name: path.basename(f.abs), filePath: f.abs, language: 'java', metadata: { framework: 'spring-controller', restPath } };
        adjacency[id] = adjacency[id] || new Set();
        if (restPath) javaControllerPaths[f.abs] = restPath;
      }
      const gm = content.match(/@GetMapping\s*\(/g); if (gm) rawCounts['spring-get-mapping'] = (rawCounts['spring-get-mapping'] || 0) + gm.length;
      const pm = content.match(/@PostMapping\s*\(/g); if (pm) rawCounts['spring-post-mapping'] = (rawCounts['spring-post-mapping'] || 0) + pm.length;
      const tm = content.match(/@Transactional\b/g); if (tm) rawCounts['spring-transactional-method'] = (rawCounts['spring-transactional-method'] || 0) + tm.length;
      const am = content.match(/@Autowired\b/g); if (am) rawCounts['spring-autowired-field'] = (rawCounts['spring-autowired-field'] || 0) + am.length;
      const ejbInj = content.match(/@EJB\b/g); if (ejbInj) rawCounts['ejb-injection-field'] = (rawCounts['ejb-injection-field'] || 0) + ejbInj.length;
    }
  }

  for (const file of httpHits) {
    const srcId = ensureFileNode(file, 'typescript');
    const svcId = `service::http::${file}`;
    nodes[svcId] = { id: svcId, type: 'service', projectId: projectIdFor(file), name: 'external-http-endpoint', filePath: null, language: null, metadata: {} };
    addEdge(`http::${srcId}=>${svcId}`, 'http', srcId, svcId, 'heuristic', 'loose');
  }

  const pathDepth = (p) => p.split('/').filter(Boolean).length;
  const normPath = (p) => p.replace(/\/$/, '');
  const unmatchedAngular = [], matchedJavaTargets = new Set();
  let crossRepoExact = 0, crossRepoHeuristic = 0;
  for (const [ngFile, ngPath] of Object.entries(angularApiPaths)) {
    if (!crossRepoMarkerFiles.has(ngFile)) continue;
    const ngId = ensureFileNode(ngFile, 'typescript');
    const np_ = normPath(ngPath);
    let matched = false;
    for (const [javaFile, javaPath] of Object.entries(javaControllerPaths)) {
      const jp = normPath(javaPath);
      let confidence = null;
      if (jp === np_) confidence = 'exact';
      else if (pathDepth(jp) >= 2 && pathDepth(np_) >= 2 && (np_.startsWith(jp + '/') || jp.startsWith(np_ + '/'))) confidence = 'heuristic';
      if (confidence) {
        matched = true;
        const javaId = `controller::${javaFile}`;
        matchedJavaTargets.add(javaId);
        addEdge(`cross-repo::${ngId}=>${javaId}`, 'http', ngId, javaId, confidence, 'loose', { ngPath, javaPath });
        if (confidence === 'exact') crossRepoExact++; else crossRepoHeuristic++;
      }
    }
    if (!matched) unmatchedAngular.push({ file: ngFile, path: ngPath });
  }
  const unmatchedJava = Object.keys(javaControllerPaths).filter((f) => !matchedJavaTargets.has(`controller::${f}`));

  const WHITE = 0, GRAY = 1, BLACK = 2, color = {};
  for (const id of Object.keys(nodes)) color[id] = WHITE;
  let cyclesFound = 0;
  function dfs(id) {
    color[id] = GRAY;
    for (const eid of adjacency[id] || []) {
      const e = edges[eid];
      if (color[e.targetId] === GRAY) { e.coupling = 'circular'; cyclesFound++; }
      else if (color[e.targetId] === WHITE) dfs(e.targetId);
    }
    color[id] = BLACK;
  }
  for (const id of Object.keys(nodes)) if (color[id] === WHITE) dfs(id);

  const reverseAdj = {};
  for (const e of Object.values(edges)) { reverseAdj[e.targetId] = reverseAdj[e.targetId] || new Set(); reverseAdj[e.targetId].add(e.sourceId); }
  const fanIn = {};
  for (const e of Object.values(edges)) fanIn[e.targetId] = (fanIn[e.targetId] || 0) + 1;
  const top5 = Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const classifyRisk = (d1) => (d1 >= 4 ? 'Alto' : d1 >= 1 ? 'Médio' : 'Baixo');
  const blastReport = {};
  for (const [nodeId] of top5) {
    const d1 = reverseAdj[nodeId] || new Set();
    const d2 = new Set();
    for (const n of d1) for (const p of (reverseAdj[n] || [])) if (p !== nodeId && !d1.has(p)) d2.add(p);
    const name = (nodes[nodeId] || {}).name || nodeId;
    blastReport[name] = { profundidade1: d1.size, profundidade2: d2.size, risco: classifyRisk(d1.size) };
  }
  const couplingCounts = { tight: 0, loose: 0, eventual: 0, circular: 0 };
  for (const e of Object.values(edges)) couplingCounts[e.coupling] = (couplingCounts[e.coupling] || 0) + 1;

  return {
    nodes: Object.values(nodes), edges: Object.values(edges),
    filesRead, rawCounts, cyclesFound, couplingCounts,
    crossRepo: { exact: crossRepoExact, heuristic: crossRepoHeuristic, unmatchedAngular, unmatchedJava },
    sensitivityFindings, blastReport,
  };
}


function main() {
  const { projectRoots, outDir } = parseArgs(process.argv);
  if (projectRoots.length === 0) {
    console.error(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(1, 25).join('\n'));
    process.exit(1);
  }
  const rootsConfig = projectRoots.map((root) => ({ root, project: path.basename(root), lang: detectLang(root) }));

  const t0 = Date.now();
  const result = buildGraph(rootsConfig);
  const elapsedMs = Date.now() - t0;

  fs.mkdirSync(outDir, { recursive: true });
  const graphPath = path.join(outDir, 'graph.json');
  fs.writeFileSync(graphPath, JSON.stringify({ nodes: result.nodes, edges: result.edges }, null, 2), 'utf8');
  const hash = crypto.createHash('sha1').update(fs.readFileSync(graphPath)).digest('hex').slice(0, 10);

  const summary = {
    motor: 'pattern-matching (regex puro, Node.js built-ins) — motor unico, sem subprocess/venv/dependencia externa',
    hash,
    tempoMs: elapsedMs,
    arquivosProcessados: result.filesRead,
    nos: {
      total: result.nodes.length,
      file: result.nodes.filter((n) => n.type === 'file').length,
      controller: result.nodes.filter((n) => n.type === 'controller').length,
      service: result.nodes.filter((n) => n.type === 'service').length,
    },
    arestas: {
      total: result.edges.length,
      import: result.edges.filter((e) => e.type === 'import').length,
      http: result.edges.filter((e) => e.type === 'http').length,
    },
    couplingCounts: result.couplingCounts,
    ciclosDetectados: result.cyclesFound,
    crossRepo: {
      exact: result.crossRepo.exact, heuristic: result.crossRepo.heuristic,
      unmatchedAngular: result.crossRepo.unmatchedAngular.length, unmatchedJava: result.crossRepo.unmatchedJava.length,
    },
    sensibilidadeDado: result.sensitivityFindings.length,
    blastRadiusTop5FanIn: result.blastReport,
    rawFindingsPorRegra: result.rawCounts,
    arquivosGerados: ['graph.json'],
    proximoPasso: 'node render-viewer.js --in ' + graphPath + ' --out ' + outDir,
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nArquivo gerado em ${outDir}: graph.json`);
  console.log('Para visualizar interativamente: node render-viewer.js --in "' + graphPath + '" --out "' + outDir + '"');
}

if (require.main === module) main();

module.exports = { buildGraph };
