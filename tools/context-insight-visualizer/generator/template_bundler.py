#!/usr/bin/env python3
"""
template_bundler.py — Compilador Modular do Dashboard Standalone
================================================================
Concatena e empacota os módulos CSS (styles/*.css) e JS (scripts/*.js)
juntamente com o esqueleto HTML (template/index.html) e dados de métricas injetados
em um único arquivo HTML standalone de alta performance para execução offline (file://).
"""

import json
from pathlib import Path
from typing import Any, Dict


class TemplateBundler:
    """Empacotador modular de templates HTML, CSS e JavaScript."""

    @staticmethod
    def bundle_standalone_html(template_dir: Path, data_payload: Dict[str, Any]) -> str:
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
            style_order = ["tokens.css", "main.css", "views.css", "cards.css", "charts.css", "table.css"]
            for css_name in style_order:
                css_path = styles_dir / css_name
                if css_path.exists():
                    with open(css_path, "r", encoding="utf-8") as cf:
                        css_blocks.append(f"/* === styles/{css_name} === */\n" + cf.read())
            # Inclui quaisquer outros CSS adicionais
            for css_path in sorted(styles_dir.glob("*.css")):
                if css_path.name not in style_order:
                    with open(css_path, "r", encoding="utf-8") as cf:
                        css_blocks.append(f"/* === styles/{css_path.name} === */\n" + cf.read())

        combined_css = "\n\n".join(css_blocks)

        # 2. Concatena todos os arquivos JavaScript de scripts/
        scripts_dir = template_dir / "scripts"
        js_blocks = []
        if scripts_dir.exists():
            script_order = [
                "state.js",
                "charts.js",
                "insights.js",
                "knowledge.js",
                "sessions-view.js",
                "search-view.js",
                "executive.js",
                "table.js",
                "app.js",
            ]
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

        # 3. Injeta CSS combinado substituindo tag <!-- __INJECT_BUNDLE_STYLES__ --> ou no </head>
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

        # 4. Injeta JS combinado substituindo tag <!-- __INJECT_BUNDLE_SCRIPTS__ --> ou no </body>
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

        # 5. Injeta os dados brutos calculados (payload do contrato)
        json_payload_str = json.dumps(data_payload, ensure_ascii=False)
        html_content = html_content.replace("/* __INJECT_RAW_INSIGHTS__ */ {}", json_payload_str)

        return html_content

