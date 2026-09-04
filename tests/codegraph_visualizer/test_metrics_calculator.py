"""
Testes Unitários para MetricsCalculator e Ciclos (Codegraph Visualizer)
"""

from metrics_calculator import MetricsCalculator


def test_calculate_module_metrics():
    sample_nodes = [
        {"id": "p1_n1", "label": "ClienteService", "project": "proj1", "kind": "class", "file": "src/app/cliente/cliente.service.ts"},
        {"id": "p1_n2", "label": "ClienteController", "project": "proj1", "kind": "class", "file": "src/app/cliente/cliente.controller.ts"},
        {"id": "p1_n3", "label": "ClienteModel", "project": "proj1", "kind": "interface", "file": "src/app/cliente/cliente.model.ts"},
        {"id": "p1_n4", "label": "AuthService", "project": "proj1", "kind": "class", "file": "src/app/auth/auth.service.ts"}
    ]

    sample_edges = [
        {"id": "e1", "from": "p1_n2", "to": "p1_n1", "kind": "calls"},
        {"id": "e2", "from": "p1_n1", "to": "p1_n3", "kind": "uses"},
        {"id": "e3", "from": "p1_n4", "to": "p1_n1", "kind": "calls"}  # auth -> cliente (afferent para cliente)
    ]

    metrics = MetricsCalculator.calculate_module_metrics(sample_nodes, sample_edges)
    assert len(metrics) >= 1

    cliente_pkg = next(m for m in metrics if "cliente" in m["packagePath"])
    assert cliente_pkg["totalNodes"] == 3
    assert cliente_pkg["abstractNodes"] == 1
    assert cliente_pkg["ca"] == 1  # 1 chamada externa vinda de auth
    assert "instability" in cliente_pkg
    assert "zone" in cliente_pkg


def test_detect_dependency_cycles_in_cycle():
    # Cria ciclo: A -> B -> C -> A
    sample_nodes = [
        {"id": "nodeA", "label": "A", "project": "p1", "file": "a.ts"},
        {"id": "nodeB", "label": "B", "project": "p1", "file": "b.ts"},
        {"id": "nodeC", "label": "C", "project": "p1", "file": "c.ts"},
        {"id": "nodeD", "label": "D", "project": "p1", "file": "d.ts"}
    ]

    sample_edges = [
        {"id": "e1", "from": "nodeA", "to": "nodeB", "kind": "calls"},
        {"id": "e2", "from": "nodeB", "to": "nodeC", "kind": "calls"},
        {"id": "e3", "from": "nodeC", "to": "nodeA", "kind": "calls"},
        {"id": "e4", "from": "nodeD", "to": "nodeA", "kind": "calls"}
    ]

    cycles, cycle_nodes, cycle_edges = MetricsCalculator.detect_dependency_cycles(sample_nodes, sample_edges)
    assert len(cycles) == 1
    assert set(cycles[0]) == {"nodeA", "nodeB", "nodeC"}
    assert "nodeD" not in cycle_nodes


def test_detect_dependency_cycles_acyclic():
    # DAG acíclico: A -> B -> C
    sample_nodes = [
        {"id": "nodeA", "label": "A", "project": "p1", "file": "a.ts"},
        {"id": "nodeB", "label": "B", "project": "p1", "file": "b.ts"},
        {"id": "nodeC", "label": "C", "project": "p1", "file": "c.ts"}
    ]
    sample_edges = [
        {"id": "e1", "from": "nodeA", "to": "nodeB", "kind": "calls"},
        {"id": "e2", "from": "nodeB", "to": "nodeC", "kind": "calls"}
    ]

    cycles, cycle_nodes, cycle_edges = MetricsCalculator.detect_dependency_cycles(sample_nodes, sample_edges)
    assert len(cycles) == 0
    assert len(cycle_nodes) == 0

