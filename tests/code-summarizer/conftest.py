"""
conftest.py — fixtures compartilhadas para a suíte pytest do code-summarizer.

Carrega o contrato de casos (.github/agents/evals/casos-code-summarizer.yaml) e expõe
helpers para invocar os scripts de extração reais em
.github/agents/snippets/code-summarizer/ via subprocess (JS) ou import direto (Python).

Convenção de caminhos: todos resolvidos a partir da raiz do repositório (REPO_ROOT),
para que a suíte rode de qualquer diretório de trabalho.
"""
from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
SNIPPETS_DIR = REPO_ROOT / ".github" / "agents" / "snippets" / "code-summarizer"
FIXTURES_DIR = REPO_ROOT / ".github" / "agents" / "evals" / "fixtures" / "code-summarizer"
CASOS_YAML = REPO_ROOT / ".github" / "agents" / "evals" / "casos-code-summarizer.yaml"

CLI_RUNNER = SNIPPETS_DIR / "cli-runner.js"
JAVA_WASM = SNIPPETS_DIR / "node_modules" / "tree-sitter-java" / "tree-sitter-java.wasm"
TS_WASM = SNIPPETS_DIR / "node_modules" / "tree-sitter-typescript" / "tree-sitter-typescript.wasm"

# extract-python-ast.py usa a variável FILE_CONTENT injetada pelo sandbox
# (ctx_execute_file). Para rodar via subprocess "puro" com python.exe, chamamos com
# -c executando a função extract() diretamente, sem depender de FILE_CONTENT/__main__.
PYTHON_EXTRACT_SCRIPT = SNIPPETS_DIR / "extract-python-ast.py"


@dataclass(frozen=True)
class GoldenFile:
    id: str
    stack: str
    path: Path
    assinatura_publica_esperada: list[str]
    regras_de_negocio_esperadas: list[str]
    segredo_hardcoded: str


def _load_casos() -> dict:
    with open(CASOS_YAML, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.fixture(scope="session")
def casos() -> dict:
    """Contrato completo do YAML de casos de avaliação (fonte única de verdade)."""
    return _load_casos()


@pytest.fixture(scope="session")
def golden_files(casos) -> dict[str, GoldenFile]:
    result = {}
    for gf in casos["golden_files"]:
        result[gf["id"]] = GoldenFile(
            id=gf["id"],
            stack=gf["stack"],
            path=REPO_ROOT / gf["path"],
            assinatura_publica_esperada=gf["assinatura_publica_esperada"],
            regras_de_negocio_esperadas=gf["regras_de_negocio_esperadas"],
            segredo_hardcoded=gf["segredo_hardcoded"],
        )
    return result


def _node_modules_ready() -> bool:
    return (SNIPPETS_DIR / "node_modules" / "web-tree-sitter").exists()


@pytest.fixture(scope="session")
def require_node_modules():
    if not _node_modules_ready():
        pytest.skip(
            "node_modules ausente em .github/agents/snippets/code-summarizer — "
            "rode `npm install` nessa pasta antes de executar os testes JS "
            "(node_modules está no .gitignore local)."
        )


def run_treesitter(arquivo: Path, stack: str) -> dict:
    """Invoca extract-treesitter.js via cli-runner.js (subprocess) e retorna o dict resultante."""
    wasm = JAVA_WASM if stack == "java" else TS_WASM
    proc = subprocess.run(
        ["node", str(CLI_RUNNER), "treesitter", str(arquivo), stack, str(wasm)],
        cwd=str(SNIPPETS_DIR),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"cli-runner.js (treesitter/{stack}) falhou (exit={proc.returncode}): {proc.stderr}"
        )
    return json.loads(proc.stdout)


def run_sql(arquivo: Path, dialect: str = "postgresql") -> dict:
    """Invoca extract-sql.js via cli-runner.js (subprocess) e retorna o dict resultante."""
    proc = subprocess.run(
        ["node", str(CLI_RUNNER), "sql", str(arquivo), dialect],
        cwd=str(SNIPPETS_DIR),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"cli-runner.js (sql) falhou (exit={proc.returncode}): {proc.stderr}")
    return json.loads(proc.stdout)


def run_python_ast(arquivo: Path) -> dict:
    """Importa extract-python-ast.py diretamente (stdlib, sem subprocess) e chama extract()."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "extract_python_ast_under_test", PYTHON_EXTRACT_SCRIPT
    )
    module = importlib.util.module_from_spec(spec)
    # O script usa `FILE_CONTENT` só dentro do bloco __main__ (guardado por
    # `if __name__ == "__main__"`), então exec_module não dispara essa referência.
    spec.loader.exec_module(module)
    source_text = arquivo.read_text(encoding="utf-8")
    return module.extract(source_text)

