"""
conftest.py — Configuração de caminhos e fixtures compartilhadas para testes do Codegraph Visualizer.
"""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATOR_DIR = REPO_ROOT / "tools" / "codegraph-visualizer" / "generator"

if str(GENERATOR_DIR) not in sys.path:
    sys.path.insert(0, str(GENERATOR_DIR))

