"""
extract-python-ast.py
Modo 1 (Determinístico) — Python via módulo `ast` nativo da stdlib (decisão fechada por
@analysis-architect, 2026-08-31: supera tree-sitter-python neste sandbox — sem custo de
download/init de WASM, roda nativamente sob ctx_execute(language="python")).

Executado via ctx_execute_file(language="python", path="<arquivo-alvo>", code=<este script>).
Nenhuma instalação necessária — `ast` é módulo padrão do Python.

Critérios de aceite (ver code-summarizer.agent.md secao "Criterios Objetivos e Mensuraveis"):
  - assinatura_publica_cobertura >= 1.00 (100%)
  - regra_de_negocio_cobertura   >= 0.80 (80%)
Se qualquer um nao for atingido, OU o parser lancar SyntaxError -> agent deve acionar
Modo 2 (fallback LLM).

Nos de bloco de decisao contados (definicao operacional fechada por @analysis-architect):
  If, IfExp (ternario), Compare, Raise
"""

import ast
import re

# Mesmos padroes de secret-redaction.js, reimplementados em Python para evitar
# dependencia cross-linguagem dentro do sandbox (RNF-005/R-010).
SECRET_PATTERNS = [
    r"sk-live-[A-Za-z0-9]+",
    r"sk_test_[A-Za-z0-9_]+",
    r"ff_test_fixture_[A-Za-z0-9_]+",
    r"(postgres|mysql|mongodb)://[^:]+:[^@]+@\S+",
    r"(?i)(api[_-]?key|token|secret|password|senha)\s*[:=]\s*['\"][^'\"]{8,}['\"]",
]


def redact_secrets(source_text: str) -> tuple[str, bool]:
    redacted = source_text
    had_secret = False
    for pattern in SECRET_PATTERNS:
        if re.search(pattern, redacted):
            had_secret = True
            redacted = re.sub(pattern, "[REDACTED]", redacted)
    return redacted, had_secret


def extract(source_text: str) -> dict:
    signatures: list[dict] = []
    decisions: list[dict] = []
    parse_error = None

    try:
        tree = ast.parse(source_text)
    except SyntaxError as exc:
        return {
            "modo": "Determinístico",
            "stack": "python",
            "assinaturaPublica": [],
            "blocosDecisao": [],
            "parseErrorDetected": True,
            "parseErrorDetail": str(exc),
            "segredoDetectadoNoFonte": False,
        }

    for node in ast.walk(tree):
        # Assinatura pública: funções/classes que não começam com "_" (convenção Python)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if not node.name.startswith("_"):
                signatures.append({"type": type(node).__name__, "name": node.name})

        # Blocos de decisão fechados por @analysis-architect: If, IfExp, Compare, Raise
        if isinstance(node, (ast.If, ast.IfExp, ast.Compare, ast.Raise)):
            decisions.append({"type": type(node).__name__, "lineno": getattr(node, "lineno", None)})

    _, had_secret = redact_secrets(source_text)

    return {
        "modo": "Determinístico",
        "stack": "python",
        "assinaturaPublica": signatures,
        "blocosDecisao": decisions,
        "parseErrorDetected": False,
        "segredoDetectadoNoFonte": had_secret,
    }


# Ponto de entrada esperado pelo ctx_execute_file: usa a variável FILE_CONTENT
# injetada pelo sandbox (mesmo padrão do playbook em context-mode/SKILL.md §7).
if __name__ == "__main__":
    result = extract(FILE_CONTENT)  # noqa: F821 - injetado pelo sandbox
    print(result)

