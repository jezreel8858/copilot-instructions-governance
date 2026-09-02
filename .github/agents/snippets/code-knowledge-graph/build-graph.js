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
 *
 * Filas RabbitMQ (Spring AMQP): nomes de fila/exchange frequentemente sao
 *   referenciados via constante Java ("Classe.CONST" ou bare-name no mesmo
 *   arquivo), nao string literal direta — resolvidos via pre-scan de
 *   `static final String` (ver resolveJavaRef). Gera no type:"queue" e
 *   aresta type:"queue"/coupling:"eventual" (consumidor: fila->arquivo;
 *   produtor: arquivo->fila).
 *
 * No orfao: no sem nenhuma aresta (nem entrada nem saida) apos o grafo
 *   completo construido — reportado agregado + amostra, nao tratado como
 *   erro por padrao (pode ser comportamento legitimo do framework, ex.:
 *   @Configuration descoberta so via component-scan).
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
  function ensureQueueNode(queueName, projectId) {
    const id = `queue::${projectId}::${queueName}`;
    if (!nodes[id]) {
      nodes[id] = { id, type: 'queue', projectId, name: queueName, filePath: null, language: null, metadata: { broker: 'rabbitmq' } };
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

  // Pre-scan de constantes Java (necessario pois referencias a fila/exchange em
  // @RabbitListener/convertAndSend/new Queue() frequentemente usam uma constante
  // ("RabbitConfig.QUEUE" ou "QUEUE" no mesmo arquivo) em vez de string literal.
  // Sem esta resolucao, o motor perderia 100% das filas reais que seguem esse
  // idioma comum em Spring AMQP (evidencia real: soma-vistoria-app).
  const javaConstantsQualified = {}; // "ClassName.CONST" -> "valor"
  const javaConstantsByName = {};    // "CONST" -> "valor" (fallback ambiguo, ultimo arquivo vence)
  if (JAVA_ROOTS.length) {
    const constDeclRe = /(?:public\s+)?static\s+final\s+String\s+(\w+)\s*=\s*"([^"]*)"\s*;/g;
    const classDeclRe = /(?:public\s+|final\s+)*class\s+(\w+)/;
    for (const f of files) {
      if (f.lang !== 'java') continue;
      let content;
      try { content = fs.readFileSync(f.abs, 'utf8'); } catch (e) { continue; }
      const classMatch = content.match(classDeclRe);
      const className = classMatch ? classMatch[1] : path.basename(f.abs, '.java');
      let cm;
      constDeclRe.lastIndex = 0;
      while ((cm = constDeclRe.exec(content))) {
        javaConstantsQualified[`${className}.${cm[1]}`] = cm[2];
        javaConstantsByName[cm[1]] = cm[2];
      }
    }
  }
  function resolveJavaRef(token, currentClassName) {
    if (!token) return { value: null, resolved: false };
    token = token.trim();
    const strMatch = token.match(/^"([^"]*)"$/);
    if (strMatch) return { value: strMatch[1], resolved: true };
    const qualified = token.match(/^(\w+)\.(\w+)$/);
    if (qualified && javaConstantsQualified[token] !== undefined) {
      return { value: javaConstantsQualified[token], resolved: true };
    }
    if (currentClassName && javaConstantsQualified[`${currentClassName}.${token}`] !== undefined) {
      return { value: javaConstantsQualified[`${currentClassName}.${token}`], resolved: true };
    }
    if (/^\w+$/.test(token) && javaConstantsByName[token] !== undefined) {
      return { value: javaConstantsByName[token], resolved: true };
    }
    // token nao resolvido (ex.: variavel de instancia, config externa) — usa o
    // proprio token bruto como nome best-effort, marcado heuristic.
    return { value: token, resolved: false };
  }

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
        const ctrlId = ensureFileNode(f.abs, 'java');
        nodes[ctrlId].type = 'controller';
        nodes[ctrlId].metadata.framework = 'spring-controller';
        nodes[ctrlId].metadata.restPath = restPath;
        if (restPath) javaControllerPaths[f.abs] = restPath;
      }
      const gm = content.match(/@GetMapping\s*\(/g); if (gm) rawCounts['spring-get-mapping'] = (rawCounts['spring-get-mapping'] || 0) + gm.length;
      const pm = content.match(/@PostMapping\s*\(/g); if (pm) rawCounts['spring-post-mapping'] = (rawCounts['spring-post-mapping'] || 0) + pm.length;
      const tm = content.match(/@Transactional\b/g); if (tm) rawCounts['spring-transactional-method'] = (rawCounts['spring-transactional-method'] || 0) + tm.length;
      const am = content.match(/@Autowired\b/g); if (am) rawCounts['spring-autowired-field'] = (rawCounts['spring-autowired-field'] || 0) + am.length;
      const ejbInj = content.match(/@EJB\b/g); if (ejbInj) rawCounts['ejb-injection-field'] = (rawCounts['ejb-injection-field'] || 0) + ejbInj.length;

      // RabbitMQ (RF-013 extensao — filas/eventos, item 3 do Gate de Paridade
      // Funcional). Resolve referencias via constante (idioma comum em Spring
      // AMQP: "new Queue(RabbitConfig.QUEUE, ...)", "@RabbitListener(queues =
      // RabbitConfig.QUEUE)") usando resolveJavaRef/javaConstantsQualified.
      const classMatchLocal = content.match(/(?:public\s+|final\s+)*class\s+(\w+)/);
      const currentClassName = classMatchLocal ? classMatchLocal[1] : path.basename(f.abs, '.java');
      const pid = projectIdFor(f.abs);

      const exchangeRe = /new\s+(?:Direct|Topic|Fanout|Headers)Exchange\s*\(\s*([\w.]+|"[^"]*")/g;
      let em;
      while ((em = exchangeRe.exec(content))) {
        bump('rabbit-exchange-declared');
      }

      const queueDeclRe = /new\s+Queue\s*\(\s*([\w.]+|"[^"]*")/g;
      let qdm;
      while ((qdm = queueDeclRe.exec(content))) {
        bump('rabbit-queue-declared');
        const resolved = resolveJavaRef(qdm[1], currentClassName);
        ensureQueueNode(resolved.value, pid);
      }

      const listenerRe = /@RabbitListener\s*\(([^)]*)\)/g;
      let lm;
      while ((lm = listenerRe.exec(content))) {
        const attrs = lm[1];
        const queuesAttr = attrs.match(/queues\s*=\s*(\{[^}]*\}|"[^"]*"|[\w.]+)/);
        if (!queuesAttr) continue;
        bump('rabbit-listener');
        const raw = queuesAttr[1];
        const tokens = raw.startsWith('{')
          ? raw.slice(1, -1).split(',').map((t) => t.trim()).filter(Boolean)
          : [raw];
        const fileId = ensureFileNode(f.abs, 'java');
        for (const tok of tokens) {
          const resolved = resolveJavaRef(tok, currentClassName);
          const queueId = ensureQueueNode(resolved.value, pid);
          addEdge(`queue::${queueId}=>${fileId}`, 'queue', queueId, fileId, resolved.resolved ? 'exact' : 'heuristic', 'eventual', { role: 'consumer', broker: 'rabbitmq' });
        }
      }

      const producerRe = /\.convertAndSend\s*\(\s*([\w.]+|"[^"]*")\s*,\s*([\w.]+|"[^"]*")/g;
      let pdm;
      while ((pdm = producerRe.exec(content))) {
        bump('rabbit-producer');
        const arg1 = resolveJavaRef(pdm[1], currentClassName);
        const fileId = ensureFileNode(f.abs, 'java');
        const queueId = ensureQueueNode(arg1.value, pid);
        addEdge(`queue::${fileId}=>${queueId}::${pdm.index}`, 'queue', fileId, queueId, arg1.resolved ? 'exact' : 'heuristic', 'eventual', { role: 'producer', broker: 'rabbitmq' });
      }
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
        const javaId = ensureFileNode(javaFile, 'java');
        matchedJavaTargets.add(javaId);
        addEdge(`cross-repo::${ngId}=>${javaId}`, 'http', ngId, javaId, confidence, 'loose', { ngPath, javaPath });
        if (confidence === 'exact') crossRepoExact++; else crossRepoHeuristic++;
      }
    }
    if (!matched) unmatchedAngular.push({ file: ngFile, path: ngPath });
  }
  const unmatchedJava = Object.keys(javaControllerPaths).filter((f) => !matchedJavaTargets.has(`file::${projectIdFor(f)}::${f}`));

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

  // Deteccao de nos orfaos (RF-015 extensao, a pedido do usuario): no sem
  // NENHUMA aresta (nem entrada nem saida) — sinal de arquivo morto, import
  // nao detectado pelo motor (falso-negativo de cobertura), ou fila/servico
  // declarado mas nunca referenciado. Reporta agregado + amostra acionavel.
  const orphanIds = Object.keys(nodes).filter((id) => {
    const outDeg = (adjacency[id] || new Set()).size;
    const inDeg = (reverseAdj[id] || new Set()).size;
    return outDeg === 0 && inDeg === 0;
  });
  const orphanByType = {}, orphanByProject = {};
  for (const id of orphanIds) {
    const n = nodes[id];
    orphanByType[n.type] = (orphanByType[n.type] || 0) + 1;
    orphanByProject[n.projectId] = (orphanByProject[n.projectId] || 0) + 1;
  }
  const orphanSamples = orphanIds.slice(0, 30).map((id) => ({
    id, type: nodes[id].type, projectId: nodes[id].projectId, name: nodes[id].name, filePath: nodes[id].filePath,
  }));

  return {
    nodes: Object.values(nodes), edges: Object.values(edges),
    filesRead, rawCounts, cyclesFound, couplingCounts,
    crossRepo: { exact: crossRepoExact, heuristic: crossRepoHeuristic, unmatchedAngular, unmatchedJava },
    sensitivityFindings, blastReport,
    orphans: { total: orphanIds.length, byType: orphanByType, byProject: orphanByProject, samples: orphanSamples },
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

  const nodesIndex = {};
  for (const n of result.nodes) nodesIndex[n.id] = n;
  const importEdgesTs = result.edges.filter((e) => e.type === 'import' && nodesIndex[e.sourceId] && nodesIndex[e.sourceId].language === 'typescript').length;
  const importEdgesJava = result.edges.filter((e) => e.type === 'import' && nodesIndex[e.sourceId] && nodesIndex[e.sourceId].language === 'java').length;
  const queueEdges = result.edges.filter((e) => e.type === 'queue');

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
      queue: result.nodes.filter((n) => n.type === 'queue').length,
    },
    arestas: {
      total: result.edges.length,
      import: result.edges.filter((e) => e.type === 'import').length,
      http: result.edges.filter((e) => e.type === 'http').length,
      queue: result.edges.filter((e) => e.type === 'queue').length,
    },
    couplingCounts: result.couplingCounts,
    ciclosDetectados: result.cyclesFound,
    crossRepo: {
      exact: result.crossRepo.exact, heuristic: result.crossRepo.heuristic,
      unmatchedAngular: result.crossRepo.unmatchedAngular.length, unmatchedJava: result.crossRepo.unmatchedJava.length,
    },
    rabbitmq: {
      filasDeclaradas: result.rawCounts['rabbit-queue-declared'] || 0,
      exchangesDeclarados: result.rawCounts['rabbit-exchange-declared'] || 0,
      listeners: result.rawCounts['rabbit-listener'] || 0,
      producers: result.rawCounts['rabbit-producer'] || 0,
      nosFila: result.nodes.filter((n) => n.type === 'queue').length,
      arestasConsumidor: queueEdges.filter((e) => e.metadata && e.metadata.role === 'consumer').length,
      arestasProdutor: queueEdges.filter((e) => e.metadata && e.metadata.role === 'producer').length,
    },
    sensibilidadeDado: result.sensitivityFindings.length,
    blastRadiusTop5FanIn: result.blastReport,
    rawFindingsPorRegra: result.rawCounts,
    gapCobertura: {
      tsImportBruto: result.rawCounts['ts-import'] || 0,
      tsImportResolvidoComoAresta: importEdgesTs,
      javaImportBruto: result.rawCounts['java-import'] || 0,
      javaImportResolvidoComoAresta: importEdgesJava,
    },
    orfaos: {
      total: result.orphans.total,
      porTipo: result.orphans.byType,
      porProjeto: result.orphans.byProject,
      amostra: result.orphans.samples,
    },
    arquivosGerados: ['graph.json'],
    proximoPasso: 'node render-viewer.js --in ' + graphPath + ' --out ' + outDir,
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nArquivo gerado em ${outDir}: graph.json`);
  console.log('Para visualizar interativamente: node render-viewer.js --in "' + graphPath + '" --out "' + outDir + '"');
}

if (require.main === module) main();

module.exports = { buildGraph };
