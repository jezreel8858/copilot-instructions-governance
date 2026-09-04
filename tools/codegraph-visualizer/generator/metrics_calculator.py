#!/usr/bin/env python3
"""
Módulo de Métricas Arquiteturais e Análise de Acoplamento (Robert Martin Metrics)
================================================================================
Calcula métricas de acoplamento de Robert C. Martin (Clean Architecture):
- Ca (Afferent Coupling): Chamadores externos
- Ce (Efferent Coupling): Dependências externas
- I (Instabilidade): I = Ce / (Ca + Ce) [0 = Estável / 1 = Instável]
- A (Abstratilidade): A = Interfaces / Total de Classes
- D (Distância da Sequência Principal): D = |A + I - 1| [0 = Balanceado, >0.5 = Zona de Dor ou Inutilidade]
- Detecção determinística de Ciclos de Dependência (Tarjan's Strongly Connected Components).
"""

from collections import defaultdict
from typing import List, Dict, Any, Set, Tuple


class MetricsCalculator:
    """Calculador de métricas arquiteturais de pacote/módulo e detecção de ciclos."""

    @staticmethod
    def calculate_module_metrics(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calcula Ca, Ce, Instabilidade (I), Abstratilidade (A) e Distância (D) por pacote/módulo."""
        # Agrupa nós por projeto/pacote
        package_nodes = defaultdict(list)
        node_to_pkg = {}
        node_is_abstract = {}

        for n in nodes:
            nid = n["id"]
            proj = n.get("project", "default")
            file_path = n.get("file", "")
            # Extrai diretório pai como identificador do pacote
            pkg_dir = "/".join(file_path.replace("\\", "/").split("/")[:-1]) or "root"
            pkg_id = f"{proj}::{pkg_dir}"

            package_nodes[pkg_id].append(n)
            node_to_pkg[nid] = pkg_id
            node_is_abstract[nid] = (n.get("kind") in ("interface", "trait", "enum"))

        # Calcula Ca e Ce por pacote
        afferent_map = defaultdict(set)
        efferent_map = defaultdict(set)

        for e in edges:
            src = e["from"]
            tgt = e["to"]
            src_pkg = node_to_pkg.get(src)
            tgt_pkg = node_to_pkg.get(tgt)

            if src_pkg and tgt_pkg and src_pkg != tgt_pkg:
                efferent_map[src_pkg].add(tgt)
                afferent_map[tgt_pkg].add(src)

        module_metrics = []
        for pkg_id, p_nodes in package_nodes.items():
            total_classes = len(p_nodes)
            if total_classes == 0:
                continue

            abstract_classes = sum(1 for n in p_nodes if node_is_abstract.get(n["id"], False))
            ca = len(afferent_map.get(pkg_id, set()))
            ce = len(efferent_map.get(pkg_id, set()))

            # Instabilidade I = Ce / (Ca + Ce)
            total_coupling = ca + ce
            instability = round(ce / total_coupling, 3) if total_coupling > 0 else 0.5

            # Abstratilidade A = Na / Nc
            abstractness = round(abstract_classes / total_classes, 3) if total_classes > 0 else 0.0

            # Distância D = |A + I - 1|
            distance = round(abs(abstractness + instability - 1.0), 3)

            # Classificação da Zona de Martin
            if instability < 0.3 and abstractness < 0.3:
                zone = "Zona de Dor (Rígido / Difícil Manutenção)"
                zone_type = "pain"
            elif instability > 0.7 and abstractness > 0.7:
                zone = "Zona de Inutilidade (Abstração Sem Uso)"
                zone_type = "uselessness"
            elif distance <= 0.3:
                zone = "Sequência Principal (Balanceado)"
                zone_type = "balanced"
            else:
                zone = "Neutro"
                zone_type = "neutral"

            parts = pkg_id.split("::")
            proj_name = parts[0]
            pkg_path = parts[1] if len(parts) > 1 else "root"

            module_metrics.append({
                "packageId": pkg_id,
                "project": proj_name,
                "packagePath": pkg_path,
                "totalNodes": total_classes,
                "abstractNodes": abstract_classes,
                "ca": ca,
                "ce": ce,
                "instability": instability,
                "abstractness": abstractness,
                "distance": distance,
                "zone": zone,
                "zoneType": zone_type
            })

        # Ordena módulos pelos com maior acoplamento / instabilidade
        module_metrics.sort(key=lambda x: (x["ca"] + x["ce"], x["distance"]), reverse=True)
        return module_metrics

    @staticmethod
    def detect_dependency_cycles(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Tuple[List[List[str]], Set[str], Set[str]]:
        """Detecta ciclos de dependência utilizando o algoritmo de Tarjan para Componentes Fortemente Conectados."""
        adj = defaultdict(list)
        for e in edges:
            adj[e["from"]].append(e["to"])

        index = 0
        indices = {}
        lowlink = {}
        on_stack = set()
        stack = []
        cycles = []

        def strongconnect(v):
            nonlocal index
            indices[v] = index
            lowlink[v] = index
            index += 1
            stack.append(v)
            on_stack.add(v)

            for w in adj.get(v, []):
                if w not in indices:
                    strongconnect(w)
                    lowlink[v] = min(lowlink[v], lowlink[w])
                elif w in on_stack:
                    lowlink[v] = min(lowlink[v], indices[w])

            if lowlink[v] == indices[v]:
                scc = []
                while True:
                    w = stack.pop()
                    on_stack.remove(w)
                    scc.append(w)
                    if w == v:
                        break
                if len(scc) > 1:
                    cycles.append(scc)

        for n in nodes:
            nid = n["id"]
            if nid not in indices:
                strongconnect(nid)

        cycle_node_ids = set()
        cycle_edge_ids = set()

        for c in cycles:
            c_set = set(c)
            cycle_node_ids.update(c_set)
            for e in edges:
                if e["from"] in c_set and e["to"] in c_set:
                    cycle_edge_ids.add(e.get("id"))

        return cycles, cycle_node_ids, cycle_edge_ids

