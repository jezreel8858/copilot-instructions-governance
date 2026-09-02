#!/usr/bin/env node
/**
 * code-knowledge-graph — script de referencia UNICO de producao (R-026).
 * Motor UNICO: pattern-matching via regex (TypeScript + Java), 100% Node.js
 * built-ins (fs/path/crypto) — SEM dependencia externa, SEM subprocess, SEM
 * venv isolado, SEM instalacao de qualquer tipo.
 *
 * Uso:
 *   node build-graph.js <repoRoot1> [repoRoot2 ...]
 *   node build-graph.js <repoRoot1> [repoRoot2 ...] --out <diretorio-saida>
 *
 * Descoberta automatica de source roots (RF-023): cada argumento pode ser um
 *   repo INTEIRO (single ou multi-modulo Maven, ex.: monorepo `[PROJETO-B]` com 6
 *   modulos EJB/JPA/Web/WS) OU um source root ja explicito (`src/main/java`,
 *   `src/app`). O script varre recursivamente e atribui `project` UNICO por
 *   modulo (`repo/modulo`), nunca `path.basename(root)` cru (bug real da v3.0
 *   corrigido: colapsava todo projeto Java em `projectId: "java"`).
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
 *     Maven padrao: a.b.C -> <root>/a/b/C.java, relativo aos source roots do
 *     MESMO REPOSITORIO (repoRoot) do arquivo importador — nunca busca em
 *     outro repo (bug real corrigido: classes utilitarias duplicadas entre
 *     microservicos, ex.: `BusinessException`, resolviam para o repo errado
 *     quando a busca era global). Cross-modulo DENTRO do mesmo repo Maven
 *     multi-modulo conta como "tight" (mesmo repositorio). Imports de
 *     biblioteca externa (java.*, javax.*, org.springframework.*, etc.) nao
 *     resolvem e sao descartados — mesmo criterio de "so imports locais"
 *     aplicado ao TypeScript.
 *   - Java (same-package): classes no MESMO pacote NAO exigem `import` (regra
 *     da linguagem) — detectado por seguindo referencia de nome de classe
 *     (\bClassName\b, min. 4 chars) entre arquivos do mesmo diretorio, sem
 *     I/O extra. Aresta `confidence: "heuristic"`, `coupling: "tight"`,
 *     `metadata.samePackage: true` — EXCLUIDA da deteccao de ciclos (DFS usa
 *     grafo separado `cycleAdjacency`) pois referencias same-package sao
 *     tipicamente bidirecionais e inflam ciclos falso-positivo.
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
  // RF-026: por padrao, arquivos de TESTE (qualquer framework/linguagem) sao
  // ignorados no grafo — a pedido do usuario apos evidencia real: 31% dos
  // nos e 35% das arestas em um projeto Angular real eram de arquivos
  // `.spec.ts`/`.test.ts`, distorcendo blast-radius/fan-in de componentes
  // (um componente com 50 specs parecia "alto risco" sem ter 50 dependentes
  // de PRODUCAO reais). `--include-tests` reverte para o comportamento
  // anterior (inclui tudo).
  let includeTests = false;
  const includeTestsIdx = args.indexOf('--include-tests');
  if (includeTestsIdx !== -1) {
    includeTests = true;
    args.splice(includeTestsIdx, 1);
  }
  const projectRoots = args.map((p) => path.resolve(p));
  return { projectRoots, outDir, includeTests };
}

// RF-026 — deteccao de arquivo de teste, agnostica de framework/linguagem.
// Heuristica por convencao de nome/diretorio (regex puro, RNF-008/RNF-011,
// sem AST): cobre Jest/Jasmine/Vitest/Mocha (`.spec.ts`/`.test.ts` e afins),
// JUnit/TestNG (`FooTest.java`, `FooTests.java`, `TestFoo.java`, Failsafe
// `FooIT.java`) e diretorios de teste bem conhecidos (`__tests__`,
// `__mocks__`, `e2e`, `cypress`). Java `src/test/java` ja e estruturalmente
// excluido por `discoverSourceRoots` (so caminha `src/main/java`) — este
// filtro cobre o caso TypeScript (specs co-localizados em `src/app`, unico
// vetor real de clutter observado) e reforca Java para nomenclaturas atipicas.
const TEST_DIR_NAMES = new Set(['__tests__', '__mocks__', '__snapshots__', 'e2e', 'e2e-playwright', 'cypress']);
function isTestFile(absPath) {
  const base = path.basename(absPath);
  const segments = absPath.split(/[\\/]/);
  if (segments.some((s) => TEST_DIR_NAMES.has(s.toLowerCase()))) return true;
  if (/\.(spec|test)\.[cm]?[jt]sx?$/i.test(base)) return true; // Component.spec.ts, foo.test.tsx
  if (/^Test[A-Z0-9_]\w*\.java$/.test(base)) return true; // TestFoo.java (JUnit legado)
  if (/\w+Tests?\.java$/.test(base)) return true; // FooTest.java, FooTests.java
  if (/\w+IT\.java$/.test(base)) return true; // FooIT.java (Failsafe integration test)
  return false;
}

function normalizeRepoRoot(rawRoot) {
  const abs = path.resolve(rawRoot);
  const sMainJava = path.join('src', 'main', 'java');
  const sApp = path.join('src', 'app');
  if (abs.toLowerCase().endsWith(sMainJava.toLowerCase())) return path.resolve(abs, '..', '..', '..');
  if (abs.toLowerCase().endsWith(sApp.toLowerCase())) return path.resolve(abs, '..', '..');
  return abs;
}

function sourceRootKind(sourceRoot) {
  return sourceRoot.toLowerCase().endsWith(path.join('src', 'app').toLowerCase()) ? 'typescript' : 'java';
}

function projectIdFromSourceRoot(repoRoot, sourceRoot) {
  const repoName = path.basename(repoRoot);
  const rel = path.relative(repoRoot, sourceRoot).split(path.sep).filter(Boolean);
  if (rel.length >= 3 && rel[rel.length - 3].toLowerCase() === 'src' && rel[rel.length - 2] === 'main' && rel[rel.length - 1] === 'java') {
    const moduleParts = rel.slice(0, -3);
    return moduleParts.length ? `${repoName}/${moduleParts.join('/')}` : repoName;
  }
  if (rel.length >= 2 && rel[rel.length - 2].toLowerCase() === 'src' && rel[rel.length - 1] === 'app') {
    const moduleParts = rel.slice(0, -2);
    return moduleParts.length ? `${repoName}/${moduleParts.join('/')}` : repoName;
  }
  return path.basename(sourceRoot) || repoName;
}

function discoverSourceRoots(rawRoot) {
  const repoRoot = normalizeRepoRoot(rawRoot);
  const found = [];
  const seen = new Set();
  const add = (sourceRoot) => {
    const normalized = path.resolve(sourceRoot);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    found.push({ repoRoot, sourceRoot: normalized, project: projectIdFromSourceRoot(repoRoot, normalized), lang: sourceRootKind(normalized) });
  };

  const directJava = path.join(repoRoot, 'src', 'main', 'java');
  const directTs = path.join(repoRoot, 'src', 'app');
  if (fs.existsSync(directJava)) add(directJava);
  if (fs.existsSync(directTs)) add(directTs);

  const stack = [{ dir: repoRoot, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > 6) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
    const maybeJava = path.join(dir, 'src', 'main', 'java');
    const maybeTs = path.join(dir, 'src', 'app');
    if (fs.existsSync(maybeJava)) add(maybeJava);
    if (fs.existsSync(maybeTs)) add(maybeTs);
    if (depth >= 6) continue;
    for (const e of entries) {
      if (e.isDirectory() && !SKIP_DIRS.has(e.name)) stack.push({ dir: path.join(dir, e.name), depth: depth + 1 });
    }
  }

  if (!found.length) {
    if (repoRoot.toLowerCase().endsWith(path.join('src', 'main', 'java').toLowerCase())) add(repoRoot);
    else if (repoRoot.toLowerCase().endsWith(path.join('src', 'app').toLowerCase())) add(repoRoot);
  }
  return found;
}

function expandInputRoots(inputRoots) {
  return inputRoots.flatMap((r) => discoverSourceRoots(r));
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

function buildGraph(rootsConfig, options) {
  const includeTests = !!(options && options.includeTests);
  // JAVA_ROOTS agrupado POR REPOSITORIO (repoRoot) — nunca global. Bug real
  // corrigido: antes, resolveJavaImport buscava em TODOS os roots de TODOS
  // os repos passados; classes utilitarias duplicadas entre microservicos
  // (ex.: `com.exemplo.pacote.exceptions.BusinessException`, comum em copy-
  // paste entre repos Spring Boot deste ecossistema) resolviam para o repo
  // ERRADO sempre que o primeiro root da lista global continha um arquivo
  // de mesmo pacote/nome — inflando falsamente arestas `loose`/cross-repo
  // inexistentes (Java nao tem import cross-repo real, so cross-modulo
  // dentro do MESMO repo Maven multi-modulo, ex.: `[PROJETO-B]/[MODULO-WEB]`
  // -> `[PROJETO-B]/[MODULO-JPA]`).
  const javaRootsByRepo = {};
  for (const r of rootsConfig) {
    if (r.lang !== 'java') continue;
    (javaRootsByRepo[r.repoRoot] = javaRootsByRepo[r.repoRoot] || []).push(r.root);
  }

  function projectIdFor(absPath) {
    for (const r of rootsConfig) if (absPath.startsWith(r.root)) return r.project;
    return 'unknown';
  }
  function repoRootFor(absPath) {
    for (const r of rootsConfig) if (absPath.startsWith(r.root)) return r.repoRoot;
    return null;
  }

  const files = [];
  let testFilesSkipped = 0;
  for (const r of rootsConfig) {
    const ext = r.lang === 'java' ? '.java' : '.ts';
    const list = [];
    walk(r.root, ext, list);
    for (const f of list) {
      if (!includeTests && isTestFile(f)) { testFilesSkipped++; continue; }
      files.push({ abs: f, project: r.project, lang: r.lang });
    }
  }

  // Referencias same-package Java (RF-024): classes no MESMO pacote NAO
  // exigem `import` (regra da linguagem) — o motor baseado so em `import`
  // e estruturalmente cego a isso, gerando falso-positivo de no orfao para
  // enums/DTOs usados apenas por vizinhos de pacote (evidencia real:
  // [EnumDominioExemplo1]/[EnumDominioExemplo2]/[EnumDominioExemplo3] em [PROJETO-D]).
  // Agrupado por diretorio uma vez; usado durante o loop principal sem I/O
  // extra (conteudo do arquivo ja esta em memoria naquele ponto).
  const javaFilesByDir = {};
  for (const f of files) {
    if (f.lang !== 'java') continue;
    const dir = path.dirname(f.abs);
    const className = path.basename(f.abs, '.java');
    if (className.length < 4) continue; // evita nomes curtos/genericos demais
    (javaFilesByDir[dir] = javaFilesByDir[dir] || []).push({ abs: f.abs, className });
  }

  // Path alias por projeto TypeScript (tsconfig.json `paths`) — resolvido uma
  // vez por root, reaproveitado para todos os arquivos daquele projeto.
  const aliasMapsByRoot = {};
  for (const r of rootsConfig) {
    if (r.lang !== 'typescript') continue;
    aliasMapsByRoot[r.root] = findTsconfigAliasMap(r.root);
  }
  function aliasMapFor(absPath) {
    for (const r of rootsConfig) if (absPath.startsWith(r.root)) return aliasMapsByRoot[r.root] || [];
    return [];
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
  const cycleAdjacency = {};
  function addEdge(id, type, sourceId, targetId, confidence, coupling, metadata) {
    if (edges[id]) return;
    edges[id] = { id, type, sourceId, targetId, confidence, coupling, metadata: metadata || {} };
    adjacency[sourceId] = adjacency[sourceId] || new Set();
    adjacency[sourceId].add(id);
    // Deteccao de ciclo (DFS abaixo) usa grafo SEPARADO sem arestas
    // `samePackage` (RF-024) — referencias same-package Java sao tipicamente
    // BIDIRECIONAIS (classe A menciona B, B menciona A de volta em outro
    // metodo/campo), o que inflava ciclos de 28 para 1058 (quase todos
    // falso-positivo de "A<->B mencionam nomes um do outro", nao dependencia
    // circular arquitetural real). Arestas samePackage continuam contando
    // para orfaos/blast-radius (esse e o proposito real delas).
    if (!(metadata && metadata.samePackage)) {
      cycleAdjacency[sourceId] = cycleAdjacency[sourceId] || new Set();
      cycleAdjacency[sourceId].add(id);
    }
  }
  function tryResolveTs(base) {
    const c1 = base + '.ts', c2 = path.join(base, 'index.ts');
    if (fs.existsSync(c1)) return c1;
    if (fs.existsSync(c2)) return c2;
    return null;
  }
  function resolveTsImport(fromFile, spec, aliasMap) {
    if (spec.startsWith('.')) {
      return tryResolveTs(path.resolve(path.dirname(fromFile), spec));
    }
    // Path alias (tsconfig.json `compilerOptions.paths`, ex.: "@core/*" ->
    // "src/app/core/*") — comum em Angular (@app/@core/@shared/@store/@pages).
    // Sem isso, todo import por alias era descartado como "lib externa",
    // gerando falso-negativo de cobertura e falso-positivo de no orfao.
    if (aliasMap && aliasMap.length) {
      const match = aliasMap.find((m) => spec === m.aliasPrefix.replace(/\/$/, '') || spec.startsWith(m.aliasPrefix));
      if (match) {
        const rest = spec.slice(match.aliasPrefix.length);
        return tryResolveTs(path.join(match.absDir, rest));
      }
    }
    return null;
  }
  function stripJsonComments(str) {
    return str.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }
  function findTsconfigAliasMap(startDir) {
    let dir = startDir;
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(dir, 'tsconfig.json');
      if (fs.existsSync(candidate)) {
        try {
          const json = JSON.parse(stripJsonComments(fs.readFileSync(candidate, 'utf8')));
          const co = json.compilerOptions || {};
          if (co.paths) {
            const baseDir = path.resolve(dir, co.baseUrl || '.');
            const map = [];
            for (const [alias, targets] of Object.entries(co.paths)) {
              if (!targets || !targets[0]) continue;
              map.push({
                aliasPrefix: alias.replace(/\*$/, ''),
                absDir: path.resolve(baseDir, targets[0].replace(/\*$/, '')),
              });
            }
            return map;
          }
        } catch (e) { /* tsconfig invalido/nao-JSON-puro — ignora, sem alias */ }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return [];
  }
  function resolveJavaImport(spec, repoRoot) {
    const rel = spec.replace(/\./g, path.sep) + '.java';
    const scopedRoots = javaRootsByRepo[repoRoot] || [];
    for (const root of scopedRoots) {
      const candidate = path.join(root, rel);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  const rawCounts = {};
  const bump = (k) => { rawCounts[k] = (rawCounts[k] || 0) + 1; };
  const angularApiPaths = {}, javaControllerPaths = {}, crossRepoMarkerFiles = new Set();
  const httpHits = [], sensitivityFindings = [];
  // Endpoints SOAP/JAX-WS (RF-025): cada entrada e { file, role: 'client'|'server',
  // namespace, operations: [nomes] }. Populado durante o loop principal (branch
  // Java), consumido no passo de cross-repo matching apos o loop (ver mais abaixo).
  const soapEndpoints = [];
  let filesRead = 0;

  // Pre-scan de constantes Java (necessario pois referencias a fila/exchange em
  // @RabbitListener/convertAndSend/new Queue() frequentemente usam uma constante
  // ("RabbitConfig.QUEUE" ou "QUEUE" no mesmo arquivo) em vez de string literal.
  // Sem esta resolucao, o motor perderia 100% das filas reais que seguem esse
  // idioma comum em Spring AMQP (evidencia real: [PROJETO-C]).
  const javaConstantsQualified = {}; // "ClassName.CONST" -> "valor"
  const javaConstantsByName = {};    // "CONST" -> "valor" (fallback ambiguo, ultimo arquivo vence)
  if (Object.keys(javaRootsByRepo).length) {
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
      const aliasMap = aliasMapFor(f.abs);
      const importRe = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = importRe.exec(content))) {
        bump('ts-import');
        const target = resolveTsImport(f.abs, m[1], aliasMap);
        if (target) {
          const srcId = ensureFileNode(f.abs, 'typescript');
          const tgtId = ensureFileNode(target, 'typescript');
          const sameProj = projectIdFor(f.abs) === projectIdFor(target);
          addEdge(`import::${srcId}=>${tgtId}`, 'import', srcId, tgtId, 'exact', sameProj ? 'tight' : 'loose');
        }
      }
      // Re-export de barrel file ("export * from './x'", "export { A } from './x'")
      // — padrao extremamente comum em Angular (ex.: store/effects/index.ts).
      // Sem isso, arquivos so registrados via barrel (nunca importados
      // diretamente) ficavam permanentemente orfaos no grafo (falso-positivo).
      const reexportRe = /export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]/g;
      let rm;
      while ((rm = reexportRe.exec(content))) {
        bump('ts-reexport');
        const target = resolveTsImport(f.abs, rm[1], aliasMap);
        if (target) {
          const srcId = ensureFileNode(f.abs, 'typescript');
          const tgtId = ensureFileNode(target, 'typescript');
          const sameProj = projectIdFor(f.abs) === projectIdFor(target);
          addEdge(`reexport::${srcId}=>${tgtId}`, 'import', srcId, tgtId, 'exact', sameProj ? 'tight' : 'loose', { reexport: true });
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
      // Referencias same-package (RF-024) — ver setup de javaFilesByDir acima.
      // Roda ANTES do loop de import para nao competir por `m`/lastIndex.
      const dir = path.dirname(f.abs);
      const pkgSiblings = javaFilesByDir[dir] || [];
      for (const sib of pkgSiblings) {
        if (sib.abs === f.abs) continue;
        const re = new RegExp('\\b' + sib.className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (re.test(content)) {
          bump('java-same-package-ref');
          const srcId = ensureFileNode(f.abs, 'java');
          const tgtId = ensureFileNode(sib.abs, 'java');
          addEdge(`samepkg::${srcId}=>${tgtId}`, 'import', srcId, tgtId, 'heuristic', 'tight', { samePackage: true });
        }
      }

      const importRe = /^import\s+([\w.]+)\s*;/gm;
      let m;
      while ((m = importRe.exec(content))) {
        bump('java-import');
        const target = resolveJavaImport(m[1], repoRootFor(f.abs));
        if (target) {
          const srcId = ensureFileNode(f.abs, 'java');
          const tgtId = ensureFileNode(target, 'java');
          // "tight" = mesmo REPOSITORIO (mesmo repoRoot), mesmo se modulo Maven
          // diferente (ex.: [PROJETO-B]/[MODULO-WEB] -> .../JPA); "loose"
          // reservado para import cross-repo real (nao existe em Java puro,
          // mas mantido por simetria com o modelo cross-repo do TS/http).
          const sameProj = repoRootFor(f.abs) === repoRootFor(target);
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

      // Endpoints SOAP/JAX-WS (RF-025): descoberto apos falha real do motor em
      // ligar '[PROJETO-A]'.ServicoExemploWeb.operacaoExemploA
      // ao EJB implementado no monorepo '[PROJETO-B]' — ate aqui o motor so detectava
      // cross-repo via REST (Angular apiUrl <-> @RequestMapping); contratos
      // SOAP/EJB (client stub JAX-WS RI gerado <-> classe @WebService de
      // implementacao) eram estruturalmente invisiveis. Interface anotada
      // @WebService = client stub (contem @RequestWrapper com o nome exato da
      // operacao); classe anotada @WebService = implementacao server-side
      // (metodo real apos @WebMethod). Casamento por targetNamespace+operacao.
      const webServiceDeclRe = /@WebService\s*(\(([^)]*)\))?[\s\S]{0,300}?public\s+(interface|class)\s+(\w+)/;
      const wsDecl = webServiceDeclRe.exec(content);
      if (wsDecl) {
        const kind = wsDecl[3];
        const argsStr = wsDecl[2] || '';
        const nsMatch = argsStr.match(/targetNamespace\s*=\s*"([^"]+)"/);
        const namespace = nsMatch ? nsMatch[1] : null;
        const operations = [];
        if (kind === 'interface') {
          bump('jaxws-client-stub');
          const rwRe = /@RequestWrapper\(\s*localName\s*=\s*"([^"]+)"/g;
          let rm2;
          while ((rm2 = rwRe.exec(content))) operations.push(rm2[1]);
          const id = ensureFileNode(f.abs, 'java');
          nodes[id].metadata.framework = 'jaxws-client-stub';
        } else {
          bump('jaxws-server-impl');
          const webMethodRe = /@WebMethod\b/g;
          let wm2;
          while ((wm2 = webMethodRe.exec(content))) {
            let slice = content.slice(wm2.index, wm2.index + 600);
            slice = slice.replace(/@\w+\s*\([^()]*\)/g, ' ').replace(/@WebMethod\b/, ' ');
            const sigRe = /(?:public\s+)?(?:static\s+)?[\w.<>\[\],\s]+?\s+(\w+)\s*\(/;
            const sm = sigRe.exec(slice);
            if (sm) operations.push(sm[1]);
          }
          const id = ensureFileNode(f.abs, 'java');
          nodes[id].metadata.framework = 'jaxws-server-impl';
        }
        if (operations.length) {
          soapEndpoints.push({ file: f.abs, role: kind === 'interface' ? 'client' : 'server', namespace, operations, repoRoot: repoRootFor(f.abs) });
        }
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
        // So cria no quando o nome resolve para um valor estatico real (literal
        // ou constante). Nomes dinamicos em runtime (ex.: `new Queue(queueName,
        // ...)` onde `queueName` vem de `service.create()`) sao IMPOSSIVEIS de
        // resolver por qualquer analise estatica — criar o no mesmo assim so
        // produz "no fantasma" com nome de variavel local, sem valor de sinal.
        if (resolved.resolved) ensureQueueNode(resolved.value, pid);
        else bump('rabbit-queue-dynamic-unresolved');
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
          if (!resolved.resolved) { bump('rabbit-queue-dynamic-unresolved'); continue; }
          const queueId = ensureQueueNode(resolved.value, pid);
          addEdge(`queue::${queueId}=>${fileId}`, 'queue', queueId, fileId, 'exact', 'eventual', { role: 'consumer', broker: 'rabbitmq' });
        }
      }

      const producerRe = /\.convertAndSend\s*\(\s*([\w.]+|"[^"]*")\s*,\s*([\w.]+|"[^"]*")/g;
      let pdm;
      while ((pdm = producerRe.exec(content))) {
        bump('rabbit-producer');
        const arg1 = resolveJavaRef(pdm[1], currentClassName);
        if (!arg1.resolved) { bump('rabbit-queue-dynamic-unresolved'); continue; }
        const fileId = ensureFileNode(f.abs, 'java');
        const queueId = ensureQueueNode(arg1.value, pid);
        addEdge(`queue::${fileId}=>${queueId}::${pdm.index}`, 'queue', fileId, queueId, 'exact', 'eventual', { role: 'producer', broker: 'rabbitmq' });
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

  // Cross-repo matching SOAP/JAX-WS (RF-025): casa client stub (interface
  // @WebService, ver `soapEndpoints`) com implementacao server-side (classe
  // @WebService) pela chave `namespace::operacao`. So cria aresta quando os
  // dois lados estao em repositorios DIFERENTES (repoRoot distinto) — dentro
  // do mesmo repo isso ja seria coberto por `java-import`/same-package.
  let soapMatched = 0;
  const soapUnmatchedClientOps = [];
  const soapClients = soapEndpoints.filter((e) => e.role === 'client');
  const soapServers = soapEndpoints.filter((e) => e.role === 'server');
  for (const client of soapClients) {
    for (const op of client.operations) {
      const key = `${client.namespace || ''}::${op}`;
      const servers = soapServers.filter((s) => (s.namespace || '') === (client.namespace || '') && s.operations.includes(op) && s.repoRoot !== client.repoRoot);
      if (servers.length === 0) { soapUnmatchedClientOps.push({ file: client.file, namespace: client.namespace, operation: op }); continue; }
      for (const server of servers) {
        const srcId = ensureFileNode(client.file, 'java');
        const tgtId = ensureFileNode(server.file, 'java');
        addEdge(`soap::${srcId}=>${tgtId}::${op}`, 'soap', srcId, tgtId, client.namespace ? 'exact' : 'heuristic', 'loose', { operation: op, namespace: client.namespace });
        soapMatched++;
      }
    }
  }

  const WHITE = 0, GRAY = 1, BLACK = 2, color = {};
  for (const id of Object.keys(nodes)) color[id] = WHITE;
  let cyclesFound = 0;
  function dfs(id) {
    color[id] = GRAY;
    for (const eid of cycleAdjacency[id] || []) {
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
    soap: { endpointsDetectados: soapEndpoints.length, clients: soapClients.length, servers: soapServers.length, arestasCriadas: soapMatched, operacoesClienteSemServidor: soapUnmatchedClientOps },
    testFiles: { ignorados: testFilesSkipped, includeTests },
    sensitivityFindings, blastReport,
    orphans: { total: orphanIds.length, byType: orphanByType, byProject: orphanByProject, samples: orphanSamples },
  };
}


function main() {
  const { projectRoots, outDir, includeTests } = parseArgs(process.argv);
  if (projectRoots.length === 0) {
    console.error(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(1, 25).join('\n'));
    process.exit(1);
  }
  // Descoberta automatica de source roots (RF-023): cada argumento pode ser
  // um repo inteiro (multi-modulo, ex.: monorepo `java-legado` com 6 modulos Maven)
  // OU um source root ja explicito (`src/main/java`/`src/app`). O script
  // varre o repo procurando TODOS os `src/main/java`/`src/app` existentes,
  // atribuindo `project` unico por modulo (`repo/moduloA`, `repo/moduloB`),
  // em vez de colapsar tudo em `projectId: 'java'` (bug que distorcia
  // orfaos/blast-radius ao misturar modulos nao-relacionados no mesmo id).
  const rootsConfig = expandInputRoots(projectRoots).map((r) => ({ root: r.sourceRoot, project: r.project, lang: r.lang, repoRoot: r.repoRoot }));
  if (rootsConfig.length === 0) {
    console.error('Nenhum source root (src/main/java ou src/app) encontrado nos argumentos informados.');
    process.exit(1);
  }

  const t0 = Date.now();
  const result = buildGraph(rootsConfig, { includeTests });
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
    testFiles: { ignorados: result.testFiles.ignorados, includeTests: result.testFiles.includeTests },
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
      soap: result.edges.filter((e) => e.type === 'soap').length,
    },
    couplingCounts: result.couplingCounts,
    ciclosDetectados: result.cyclesFound,
    crossRepo: {
      exact: result.crossRepo.exact, heuristic: result.crossRepo.heuristic,
      unmatchedAngular: result.crossRepo.unmatchedAngular.length, unmatchedJava: result.crossRepo.unmatchedJava.length,
    },
    soap: {
      endpointsDetectados: result.soap.endpointsDetectados,
      clients: result.soap.clients,
      servers: result.soap.servers,
      arestasCriadas: result.soap.arestasCriadas,
      operacoesClienteSemServidor: result.soap.operacoesClienteSemServidor.length,
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

module.exports = { buildGraph, discoverSourceRoots, expandInputRoots, isTestFile };
