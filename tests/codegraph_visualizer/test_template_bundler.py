"""
Testes Unitários para TemplateBundler (Codegraph Visualizer)
"""

import os
import tempfile
from pathlib import Path
from template_bundler import TemplateBundler


def test_bundle_standalone_html():
    template_dir = Path(__file__).resolve().parent.parent.parent / "tools" / "codegraph-visualizer" / "template"
    assert template_dir.exists(), "Diretório de template deve existir"

    sample_projects = [{"id": "proj1", "name": "Projeto 1", "type": "Frontend"}]
    sample_nodes = [{"id": "n1", "label": "Node1", "project": "proj1", "kind": "class", "file": "src/app.ts"}]
    sample_edges = [{"id": "e1", "from": "n1", "to": "n1", "kind": "calls"}]
    sample_metrics = [{"packageId": "proj1::src", "project": "proj1", "packagePath": "src", "totalNodes": 1, "abstractNodes": 0, "ca": 0, "ce": 0, "instability": 0.5, "abstractness": 0.0, "distance": 0.5, "zone": "Neutro", "zoneType": "neutral"}]
    sample_cycles = []
    sample_violations = []

    bundled_html = TemplateBundler.bundle_standalone_html(
        template_dir=template_dir,
        active_projects=sample_projects,
        valid_classes=sample_nodes,
        final_edges=sample_edges,
        module_metrics=sample_metrics,
        detected_cycles=sample_cycles,
        boundary_violations=sample_violations
    )

    assert "<!DOCTYPE html>" in bundled_html
    assert "<style>" in bundled_html
    assert "<script>" in bundled_html
    assert "styles/main.css" in bundled_html
    assert "styles/controls.css" in bundled_html
    assert "styles/inspector.css" in bundled_html
    assert "styles/modal.css" in bundled_html
    assert "scripts/state.js" in bundled_html
    assert "scripts/network-2d.js" in bundled_html
    assert "scripts/network-3d.js" in bundled_html
    assert "scripts/filters.js" in bundled_html
    assert "scripts/inspector.js" in bundled_html
    assert "scripts/modal-metrics.js" in bundled_html
    assert '"id": "proj1"' in bundled_html
    assert '"id": "n1"' in bundled_html
    # Validação dos elementos do Angular Material CDK Overlay
    assert "cdkOverlayContainer" in bundled_html
    assert "cdkOverlayBackdrop" in bundled_html
    assert "cdkOverlayPane" in bundled_html
    assert "mat-mdc-select-trigger" in bundled_html
    assert "mat-mdc-form-field" in bundled_html
    assert "SELECT_DEFINITIONS" in bundled_html
    # Validação do toggle e alinhamento da barra de controle
    assert "matControlBar" in bundled_html
    assert "btnToggleControlBar" in bundled_html
    assert "toggleControlBar" in bundled_html
    assert "mat-control-actions" in bundled_html
    # Validação dos chips com cores distintas e toggle
    assert "mat-chip-project" in bundled_html
    assert "chip-color-dot" in bundled_html
    assert "toggleConnectivityChip" in bundled_html
    assert "--proj-color" in bundled_html

