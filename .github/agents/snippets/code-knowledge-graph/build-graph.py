#!/usr/bin/env python3
"""
code-knowledge-graph — script de referencia unico de producao (R-026).
Substitui integralmente build-graph.js (regex) + poc-*.py/.js (POCs de lib).
Unica fonte de extracao: Semgrep CLI (semgrep-rules.yaml, RNF-008 - deterministico).

Uso:
  python build-graph.py <projectRoot1> [projectRoot2 ...]
  python build-graph.py <projectRoot1> [projectRoot2 ...] --semgrep <caminho-semgrep-bin>
  python build-graph.py <projectRoot1> [projectRoot2 ...] --cache <arquivo.json>  # reusa scan anterior (dev/iteracao)

Pre-requisito: Semgrep instalado em venv ISOLADO (nunca Python global - ver README.md).
  python -m venv .venv-semgrep && .venv-semgrep/Scripts/pip install semgrep

Saida: <out>/graph.json, <out>/graph.mmd, <out>/graph.html (out = diretorio atual)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

RULES_FILE = Path(__file__).parent / 'semgrep-rules.yaml'


def run_semgrep(project_roots: list[str], semgrep_bin: str, cache_file: str | None = None) -> list[dict]:
    """Invoca Semgrep via subprocess (unica fonte de extracao - RNF-008)."""
    if cache_file and Path(cache_file).exists():
        return json.loads(Path(cache_file).read_text(encoding='utf-8'))['results']
    cmd = [semgrep_bin, '--config', str(RULES_FILE), *project_roots,
           '--json', '--metrics=off', '--quiet']
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if proc.returncode not in (0, 1):  # 1 = findings com erros de parse parciais, ok
        print('ERRO semgrep:', proc.stderr[:2000], file=sys.stderr)
        sys.exit(1)
    if cache_file:
        Path(cache_file).write_text(proc.stdout, encoding='utf-8')
    return json.loads(proc.stdout)['results']


def extract_value(msg: str) -> str | None:
    """Extrai o valor apos os dois-pontos final da mensagem (com ou sem aspas)."""
    m = re.search(r':\s*"(.+)"\s*$', msg)
    if m:
        return m.group(1)
    m = re.search(r':\s*(\S+)\s*$', msg)
    return m.group(1) if m else None


def norm_path(p: str) -> str:
    return p.rstrip('/')


def path_depth(p: str) -> int:
    return len([seg for seg in p.split('/') if seg])


def project_id_for(file_path: str, project_roots: list[str]) -> str:
    for root in project_roots:
        root_norm = str(Path(root).resolve())
        if file_path.startswith(root_norm):
            return Path(root_norm).name
    return 'unknown'


def resolve_ts_import(from_file: str, spec: str) -> str | None:
    if not spec.startswith('.'):
        return None  # so imports locais (RF-004) - libs externas fora de escopo
    base = (Path(from_file).parent / spec).resolve()
    for candidate in (base.with_suffix('.ts'), base / 'index.ts'):
        if candidate.exists():
            return str(candidate)
    return str(base) + '.ts'  # melhor esforco


def build_import_graph(results: list[dict], project_roots: list[str]) -> dict:
    """Pass 1+2: nos (arquivo) + arestas (import) intra-repo, RF-004/RF-005."""
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    adjacency: dict[str, set] = {}

    def ensure_node(abs_path: str, language: str) -> str:
        pid = project_id_for(abs_path, project_roots)
        node_id = f'file::{pid}::{abs_path}'
        if node_id not in nodes:
            nodes[node_id] = {
                'id': node_id, 'type': 'file', 'projectId': pid,
                'name': Path(abs_path).name, 'filePath': abs_path,
                'language': language, 'metadata': {},
            }
            adjacency[node_id] = set()
        return node_id

    for r in results:
        if r['check_id'] != 'ts-import':
            continue
        from_file = r['path']
        spec = extract_value(r['extra']['message'])
        if not spec:
            continue
        target = resolve_ts_import(from_file, spec)
        if not target or not Path(target).exists():
            continue
        src_id = ensure_node(from_file, 'typescript')
        tgt_id = ensure_node(target, 'typescript')
        edge_id = f'import::{src_id}=>{tgt_id}'
        if edge_id not in edges:
            same_project = project_id_for(from_file, project_roots) == project_id_for(target, project_roots)
            edges[edge_id] = {
                'id': edge_id, 'type': 'import', 'sourceId': src_id, 'targetId': tgt_id,
                'confidence': 'exact', 'coupling': 'tight' if same_project else 'loose',
                'metadata': {},
            }
            adjacency[src_id].add(edge_id)

    return {'nodes': nodes, 'edges': edges, 'adjacency': adjacency}


def apply_framework_annotations(graph: dict, results: list[dict]) -> None:
    """Enriquece nos existentes com metadata.framework (Angular/Spring) - RF-002/RF-014."""
    framework_rules = {
        'angular-component-decorator': 'angular-component',
        'angular-injectable-decorator': 'angular-injectable',
        'spring-service-decorator': 'spring-service',
    }
    for r in results:
        cid = r['check_id']
        if cid not in framework_rules:
            continue
        f = r['path']
        for node_id, node in graph['nodes'].items():
            if node['filePath'] == f:
                node['metadata']['framework'] = framework_rules[cid]

    # Controllers Spring: cria nó mesmo se não capturado no import graph (Java não tem import-graph resolvido)
    for r in results:
        if r['check_id'] != 'spring-rest-controller-with-mapping':
            continue
        f = r['path']
        path_val = extract_value(r['extra']['message'])
        node_id = f'file::controller::{f}'
        if node_id not in graph['nodes']:
            graph['nodes'][node_id] = {
                'id': node_id, 'type': 'controller', 'projectId': None,
                'name': Path(f).name, 'filePath': f, 'language': 'java',
                'metadata': {'framework': 'spring-controller', 'restPath': path_val},
            }
            graph['adjacency'][node_id] = set()
        else:
            graph['nodes'][node_id]['metadata']['restPath'] = path_val
            graph['nodes'][node_id]['metadata']['framework'] = 'spring-controller'


def collect_integration_hits(results: list[dict]) -> list[dict]:
    """RF-013: HTTP client + direcao producer/consumer (RF-013 item 3)."""
    hits = []
    by_file_kind = set()
    for r in results:
        cid, f = r['check_id'], r['path']
        if cid == 'angular-http-client' and (f, 'http') not in by_file_kind:
            hits.append({'file': f, 'kind': 'http'})
            by_file_kind.add((f, 'http'))
        elif cid == 'angular-event-consumer' and (f, 'event-consumer') not in by_file_kind:
            hits.append({'file': f, 'kind': 'event', 'direction': 'consumer'})
            by_file_kind.add((f, 'event-consumer'))
        elif cid == 'angular-event-producer' and (f, 'event-producer') not in by_file_kind:
            hits.append({'file': f, 'kind': 'event', 'direction': 'producer'})
            by_file_kind.add((f, 'event-producer'))
    return hits


def build_architectural_edges(graph: dict, hits: list[dict], project_roots: list[str]) -> None:
    """RF-014: nos/arestas 'service' a partir de integrationHits."""
    for hit in hits:
        pid = project_id_for(hit['file'], project_roots)
        file_node_id = next((nid for nid, n in graph['nodes'].items() if n['filePath'] == hit['file']), None)
        if not file_node_id:
            continue
        dir_suffix = f"::{hit['direction']}" if hit.get('direction') else ''
        svc_id = f"{hit['kind']}{dir_suffix}::{hit['file']}"
        graph['nodes'][svc_id] = {
            'id': svc_id, 'type': 'service', 'projectId': pid,
            'name': 'external-http-endpoint' if hit['kind'] == 'http' else 'realtime-stream',
            'filePath': None, 'language': None,
            'metadata': {'direction': hit['direction']} if hit.get('direction') else {},
        }
        edge_id = f"{hit['kind']}{dir_suffix}::{file_node_id}=>{svc_id}"
        graph['edges'][edge_id] = {
            'id': edge_id, 'type': hit['kind'], 'sourceId': file_node_id, 'targetId': svc_id,
            'confidence': 'heuristic', 'coupling': 'loose' if hit['kind'] == 'http' else 'eventual',
            'metadata': {'direction': hit['direction']} if hit.get('direction') else {},
        }
        graph['adjacency'].setdefault(file_node_id, set()).add(edge_id)


def apply_data_sensitivity(graph: dict, results: list[dict]) -> list[dict]:
    """RF-018 item 8."""
    findings = []
    for r in results:
        cid = r['check_id']
        if cid not in ('ts-field-financeiro', 'ts-field-pii'):
            continue
        f = r['path']
        sensitivity = 'financeiro' if cid == 'ts-field-financeiro' else 'PII'
        findings.append({'file': f, 'dataSensitivity': sensitivity})
        for node in graph['nodes'].values():
            if node['filePath'] == f:
                node['metadata']['dataSensitivity'] = sensitivity
    return findings


def blast_radius(graph: dict, target_node_id: str) -> dict:
    """RF-015: BFS profundidade 1/2 sobre fan-in (quem aponta PARA o alvo)."""
    reverse_adj: dict[str, set] = {}
    for edge in graph['edges'].values():
        reverse_adj.setdefault(edge['targetId'], set()).add(edge['sourceId'])
    depth1 = reverse_adj.get(target_node_id, set())
    depth2 = set()
    for n in depth1:
        for p in reverse_adj.get(n, set()):
            if p != target_node_id and p not in depth1:
                depth2.add(p)
    return {'depth1': list(depth1), 'depth2': list(depth2)}


def detect_cycles(graph: dict) -> list[str]:
    """RF-016: DFS com pilha de recursao (WHITE/GRAY/BLACK)."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in graph['nodes']}
    cycle_edges = []

    def outgoing(node_id):
        return [graph['edges'][eid] for eid in graph['adjacency'].get(node_id, [])]

    def dfs(node_id):
        color[node_id] = GRAY
        for edge in outgoing(node_id):
            if color.get(edge['targetId']) == GRAY:
                cycle_edges.append(edge['id'])
                edge['coupling'] = 'circular'
            elif color.get(edge['targetId']) == WHITE:
                dfs(edge['targetId'])
        color[node_id] = BLACK

    for node_id in list(graph['nodes'].keys()):
        if color[node_id] == WHITE:
            dfs(node_id)
    return cycle_edges


def classify_risk(depth1_count: int) -> str:
    if depth1_count >= 4:
        return 'Alto'
    if depth1_count >= 1:
        return 'Médio'
    return 'Baixo'


# RF-021: matching cross-repo 1-para-N (corrige bug greedy 1-para-1 da rodada 3 - §16.4 do REQ)
def build_cross_repo_edges(graph: dict, results: list[dict], project_roots: list[str]) -> dict:
    if len(project_roots) < 2:
        return {'unmatchedAngular': [], 'unmatchedJava': []}

    angular_paths, java_paths, cross_repo_marker_files = {}, {}, set()
    for r in results:
        cid, f = r['check_id'], r['path']
        if cid == 'angular-api-url-path':
            v = extract_value(r['extra']['message'])
            if v:
                angular_paths[f] = v
        elif cid == 'spring-rest-controller-with-mapping':
            v = extract_value(r['extra']['message'])
            if v:
                java_paths[f] = v
        elif cid == 'angular-cross-repo-config-import':
            cross_repo_marker_files.add(f)

    matched_java_targets = set()
    unmatched_angular = []
    for ng_f, ng_p in angular_paths.items():
        if ng_f not in cross_repo_marker_files:
            continue
        ng_node = f'file::{project_id_for(ng_f, project_roots)}::{ng_f}'
        np_ = norm_path(ng_p)
        matches = []  # RF-021: coleta TODOS os matches, nao so o primeiro (1-para-N)
        for java_f, java_p in java_paths.items():
            jp = norm_path(java_p)
            if jp == np_:
                matches.append((java_f, java_p, 'exact'))
            elif path_depth(jp) >= 2 and path_depth(np_) >= 2 and (
                np_.startswith(jp + '/') or jp.startswith(np_ + '/')
            ):
                # guarda de profundidade minima (RF-021 fix real, rodada 4): paths
                # curtos tipo "/v1" (ex.: popularbase.service.ts) sao prefixo de
                # QUALQUER controller "/v1/*" e geravam falso-positivo em massa
                # (38 matches espurios confirmados empiricamente nesta rodada).
                matches.append((java_f, java_p, 'heuristic'))
        if not matches:
            unmatched_angular.append({'file': ng_f, 'path': ng_p})
            continue
        for java_f, java_p, confidence in matches:
            java_node = f'file::controller::{java_f}'
            matched_java_targets.add(java_node)
            edge_id = f'cross-repo::{ng_node}=>{java_node}'
            graph['edges'][edge_id] = {
                'id': edge_id, 'type': 'http', 'sourceId': ng_node, 'targetId': java_node,
                'confidence': confidence, 'coupling': 'loose',
                'metadata': {'ngPath': ng_p, 'javaPath': java_p},
            }
            graph['adjacency'].setdefault(ng_node, set()).add(edge_id)

    unmatched_java = [
        {'file': f, 'path': p} for f, p in java_paths.items()
        if f'file::controller::{f}' not in matched_java_targets
    ]
    return {'unmatchedAngular': unmatched_angular, 'unmatchedJava': unmatched_java}


def to_mermaid(graph: dict) -> str:
    color_by_coupling = {'tight': '#ff9999', 'loose': '#ffcc88', 'eventual': '#99ff99', 'circular': '#ccccff'}
    lines = ['flowchart LR']
    projects = sorted({n.get('projectId') or 'externo' for n in graph['nodes'].values()})
    for pid in projects:
        safe_pid = re.sub(r'[^a-zA-Z0-9]', '_', pid)
        lines.append(f'    subgraph {safe_pid}[{pid}]')
        for n in graph['nodes'].values():
            if (n.get('projectId') or 'externo') != pid:
                continue
            safe = re.sub(r'[^a-zA-Z0-9]', '_', n['id'])
            label_extra = n['metadata'].get('restPath') or n['metadata'].get('apiPath') or n['metadata'].get('framework') or ''
            lines.append(f'        {safe}["{n["name"]}<br/>{label_extra}"]')
        lines.append('    end')
    for e in graph['edges'].values():
        s = re.sub(r'[^a-zA-Z0-9]', '_', e['sourceId'])
        t = re.sub(r'[^a-zA-Z0-9]', '_', e['targetId'])
        style = '-->' if e['confidence'] == 'exact' else '-.->|heuristic|'
        lines.append(f'    {s} {style} {t}')
    for e in graph['edges'].values():
        if e['coupling'] == 'circular':
            t = re.sub(r'[^a-zA-Z0-9]', '_', e['targetId'])
            lines.append(f"    style {t} fill:{color_by_coupling['circular']},stroke:#0000ff")
    return '\n'.join(lines)


def to_html(mermaid: str, title: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>body{{font-family:sans-serif;padding:20px;background:#1e1e1e;color:#eee}}</style>
</head><body>
<h2>{title}</h2>
<div class="mermaid">
{mermaid}
</div>
<script>mermaid.initialize({{ startOnLoad: true, theme: 'dark' }});</script>
</body></html>"""


def main():
    args = sys.argv[1:]
    semgrep_bin = '.venv-semgrep/Scripts/semgrep.exe'
    cache_file = None
    if '--semgrep' in args:
        i = args.index('--semgrep')
        semgrep_bin = args[i + 1]
        del args[i:i + 2]
    if '--cache' in args:
        i = args.index('--cache')
        cache_file = args[i + 1]
        del args[i:i + 2]
    project_roots = args
    if not project_roots:
        print(__doc__)
        sys.exit(1)

    t0 = __import__('time').time()
    results = run_semgrep(project_roots, semgrep_bin, cache_file)
    graph = build_import_graph(results, project_roots)
    apply_framework_annotations(graph, results)
    hits = collect_integration_hits(results)
    build_architectural_edges(graph, hits, project_roots)
    sensitivity_findings = apply_data_sensitivity(graph, results)
    cross_repo = build_cross_repo_edges(graph, results, project_roots)
    cycles = detect_cycles(graph)
    elapsed_ms = int((__import__('time').time() - t0) * 1000)

    coupling_counts = {'tight': 0, 'loose': 0, 'eventual': 0, 'circular': 0}
    for e in graph['edges'].values():
        coupling_counts[e['coupling']] = coupling_counts.get(e['coupling'], 0) + 1

    # blast radius + risco para os 5 nos com maior fan-in (evita output gigante em repos grandes)
    fan_in = {}
    for e in graph['edges'].values():
        fan_in[e['targetId']] = fan_in.get(e['targetId'], 0) + 1
    top_targets = sorted(fan_in.items(), key=lambda kv: -kv[1])[:5]
    blast_report = {}
    for node_id, _ in top_targets:
        b = blast_radius(graph, node_id)
        name = graph['nodes'].get(node_id, {}).get('name', node_id)
        blast_report[name] = {
            'profundidade1': len(b['depth1']), 'profundidade2': len(b['depth2']),
            'risco': classify_risk(len(b['depth1'])),
        }

    summary = {
        'tempoMs': elapsed_ms,
        'nos': {
            'total': len(graph['nodes']),
            'file': len([n for n in graph['nodes'].values() if n['type'] == 'file']),
            'controller': len([n for n in graph['nodes'].values() if n['type'] == 'controller']),
            'service': len([n for n in graph['nodes'].values() if n['type'] == 'service']),
        },
        'arestas': {
            'total': len(graph['edges']),
            'import': len([e for e in graph['edges'].values() if e['type'] == 'import']),
            'http': len([e for e in graph['edges'].values() if e['type'] == 'http']),
            'event': len([e for e in graph['edges'].values() if e['type'] == 'event']),
        },
        'couplingCounts': coupling_counts,
        'ciclosDetectados': len(cycles),
        'sensibilidadeDadoEncontrada': sensitivity_findings,
        'crossRepo': {
            # so arestas com id "cross-repo::*" (path-matching entre projetos) - nao confundir
            # com arestas "http"/"event" arquiteturais intra-repo (RF-013/014), que tambem usam
            # confidence="heuristic" mas sao um conceito diferente (bug corrigido nesta rodada).
            'exact': len([e for e in graph['edges'].values() if e['id'].startswith('cross-repo::') and e['confidence'] == 'exact']),
            'heuristic': len([e for e in graph['edges'].values() if e['id'].startswith('cross-repo::') and e['confidence'] == 'heuristic']),
            'unmatchedAngular': len(cross_repo['unmatchedAngular']),
            'unmatchedJava': len(cross_repo['unmatchedJava']),
        },
        'blastRadiusTop5FanIn': blast_report,
    }

    print(json.dumps(summary, indent=2, ensure_ascii=False))

    out_nodes = list(graph['nodes'].values())
    out_edges = list(graph['edges'].values())
    json.dump({'nodes': out_nodes, 'edges': out_edges}, open('graph.json', 'w', encoding='utf-8'),
               indent=2, ensure_ascii=False)
    mermaid = to_mermaid(graph)
    Path('graph.mmd').write_text(mermaid, encoding='utf-8')
    Path('graph.html').write_text(to_html(mermaid, 'code-knowledge-graph — ' + ' + '.join(Path(p).name for p in project_roots)),
                                  encoding='utf-8')
    print('\nArquivos gerados: graph.json, graph.mmd, graph.html')


if __name__ == '__main__':
    main()

