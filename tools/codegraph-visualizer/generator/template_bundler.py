#!/usr/bin/env python3
"""
Template Bundler — Compilador Modular de Visualização
=====================================================
Concatena e empacota os módulos CSS (styles/*.css) e JS (scripts/*.js)
juntamente com o esqueleto HTML (template/index.html) e dados de grafo injetados
em um único arquivo HTML standalone de alta performance para execução offline (file://).
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional


class TemplateBundler:
    """Empacotador modular de templates HTML, CSS e JavaScript."""

    @staticmethod
    def bundle_standalone_html(
        template_dir: Path,
        active_projects: List[Dict[str, Any]],
        valid_classes: List[Dict[str, Any]],
        final_edges: List[Dict[str, Any]],
        module_metrics: List[Dict[str, Any]],
        detected_cycles: List[List[str]],
        boundary_violations: List[Dict[str, Any]]
    ) -> str:
        """Lê os arquivos modulares de CSS, JS e HTML e monta o documento standalone final."""
        index_file = template_dir / "index.html"
        if not index_file.exists():
            raise FileNotFoundError(f"Template base não encontrado em: {index_file}")

        with open(index_file, "r", encoding="utf-8") as f:
            html_content = f.read()

        # 1. Concatena todos os arquivos CSS de styles/
        styles_dir = template_dir / "styles"
        css_blocks = []
        if styles_dir.exists():
            # Ordem de inclusão: main -> controls -> inspector -> modal
            style_order = ["main.css", "controls.css", "inspector.css", "modal.css"]
            for css_name in style_order:
                css_path = styles_dir / css_name
                if css_path.exists():
                    with open(css_path, "r", encoding="utf-8") as cf:
                        css_blocks.append(f"/* === styles/{css_name} === */\n" + cf.read())
            # Inclui quaisquer outros CSS adicionais não listados na ordem fixa
            for css_path in sorted(styles_dir.glob("*.css")):
                if css_path.name not in style_order:
                    with open(css_path, "r", encoding="utf-8") as cf:
                        css_blocks.append(f"/* === styles/{css_path.name} === */\n" + cf.read())

        combined_css = "\n\n".join(css_blocks)

        # 2. Concatena todos os arquivos JavaScript de scripts/
        scripts_dir = template_dir / "scripts"
        js_blocks = []
        if scripts_dir.exists():
            # Ordem de inclusão: state -> network-2d -> network-3d -> filters -> inspector -> modal-metrics
            script_order = ["state.js", "network-2d.js", "network-3d.js", "filters.js", "inspector.js", "modal-metrics.js"]
            for js_name in script_order:
                js_path = scripts_dir / js_name
                if js_path.exists():
                    with open(js_path, "r", encoding="utf-8") as jf:
                        js_blocks.append(f"// === scripts/{js_name} ===\n" + jf.read())
            # Inclui quaisquer outros scripts adicionais
            for js_path in sorted(scripts_dir.glob("*.js")):
                if js_path.name not in script_order:
                    with open(js_path, "r", encoding="utf-8") as jf:
                        js_blocks.append(f"// === scripts/{js_path.name} ===\n" + jf.read())

        combined_js = "\n\n".join(js_blocks)

        # 3. Injeta CSS combinado substituindo tag <!-- __INJECT_BUNDLE_STYLES__ --> ou <style>...</style>
        if "<!-- __INJECT_BUNDLE_STYLES__ -->" in html_content:
            html_content = html_content.replace(
                "<!-- __INJECT_BUNDLE_STYLES__ -->",
                f"<style>\n{combined_css}\n</style>"
            )
        elif combined_css:
            html_content = html_content.replace(
                "</head>",
                f"<style>\n{combined_css}\n</style>\n</head>"
            )

        # 4. Injeta JS combinado substituindo tag <!-- __INJECT_BUNDLE_SCRIPTS__ --> ou no final do body
        if "<!-- __INJECT_BUNDLE_SCRIPTS__ -->" in html_content:
            html_content = html_content.replace(
                "<!-- __INJECT_BUNDLE_SCRIPTS__ -->",
                f"<script>\n{combined_js}\n</script>"
            )
        elif combined_js:
            html_content = html_content.replace(
                "</body>",
                f"<script>\n{combined_js}\n</script>\n</body>"
            )

        # 5. Injeta os dados brutos calculados
        html_content = html_content.replace("/* __INJECT_RAW_PROJECTS__ */ []", json.dumps(active_projects))
        html_content = html_content.replace("/* __INJECT_RAW_NODES__ */ []", json.dumps(valid_classes))
        html_content = html_content.replace("/* __INJECT_RAW_EDGES__ */ []", json.dumps(final_edges))
        html_content = html_content.replace("/* __INJECT_RAW_METRICS__ */ []", json.dumps(module_metrics))
        html_content = html_content.replace("/* __INJECT_RAW_CYCLES__ */ []", json.dumps(detected_cycles))
        html_content = html_content.replace("/* __INJECT_RAW_VIOLATIONS__ */ []", json.dumps(boundary_violations))

        return html_content

