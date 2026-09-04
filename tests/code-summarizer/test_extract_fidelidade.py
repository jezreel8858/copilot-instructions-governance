"""
test_extract_fidelidade.py — Suíte 1 do contrato de evals (fidelidade_multistack).

Automatiza os 4 casos "fid-00X-*" de .github/agents/evals/casos-code-summarizer.yaml
contra os scripts REAIS de Modo 1 (Determinístico):
  - extract-treesitter.js (Java, Angular/TypeScript) — via subprocess (cli-runner.js)
  - extract-sql.js (SQL)                              — via subprocess (cli-runner.js)
  - extract-python-ast.py (Python)                     — via import direto (stdlib apenas)

Critério objetivo (igual ao documentado nos próprios scripts / code-summarizer.agent.md):
  - assinatura pública: 100% dos identificadores esperados (`output_contains`) devem
    aparecer literalmente em algum nó de assinatura extraído.
  - regra de negócio: cobertura >= 80% definida como
        min(1.0, len(blocosDecisao_extraidos) / len(regras_de_negocio_esperadas))
    (mesma definição operacional documentada nos docstrings de extract-*.js/.py —
    NÃO é comparação textual das descrições humanas em regras_de_negocio_esperadas,
    que são narrativas, não literais).
  - segredo: 0% de tolerância — nenhum item de `output_not_contains` pode aparecer na
    serialização do resultado (o que seria refletido no sumário Markdown final).

SQL é o único caso com resultado documentado como parseErrorDetected=True (comportamento
ESPERADO — node-sql-parser não suporta `GENERATED ALWAYS AS ... STORED` do Postgres,
ver README.md do diretório de snippets). Nesse caso o teste valida que o *fallback é
corretamente sinalizado* (parseErrorDetected=True aciona Modo 2 no agent), e não that
a extração determinística "passou" — reportar isso como PASS de fallback, não xfail.
"""
from __future__ import annotations

import json

import pytest

from conftest import run_python_ast, run_sql, run_treesitter


def _regra_negocio_cobertura(n_decisoes_extraidas: int, n_regras_esperadas: int) -> float:
    if n_regras_esperadas == 0:
        return 1.0
    return min(1.0, n_decisoes_extraidas / n_regras_esperadas)


def _extrai_caso(casos: dict, case_id: str) -> dict:
    for caso in casos["fidelidade_multistack"]:
        if caso["id"] == case_id:
            return caso
    raise KeyError(f"Caso {case_id} não encontrado em fidelidade_multistack")


@pytest.mark.usefixtures("require_node_modules")
def test_fid_001_java(casos, golden_files):
    caso = _extrai_caso(casos, "fid-001-java")
    golden = golden_files["golden-java"]

    result = run_treesitter(golden.path, "java")
    serializado = json.dumps(result, ensure_ascii=False)
    todos_textos_assinatura = " ".join(s["text"] for s in result["assinaturaPublica"])

    # --- assinatura pública: 100% dos identificadores esperados ---
    for esperado in caso["expected"]["output_contains"]:
        assert esperado in todos_textos_assinatura, (
            f"Identificador '{esperado}' não encontrado na assinatura pública extraída: "
            f"{todos_textos_assinatura!r}"
        )

    # --- regra de negócio: cobertura >= 80% (contagem de blocos de decisão) ---
    cobertura = _regra_negocio_cobertura(
        len(result["blocosDecisao"]), len(golden.regras_de_negocio_esperadas)
    )
    assert cobertura >= caso["expected"]["regra_negocio_cobertura_minima"], (
        f"Cobertura de regra de negócio {cobertura:.2f} abaixo do mínimo "
        f"{caso['expected']['regra_negocio_cobertura_minima']}"
    )

    # --- segredo: 0% de tolerância ---
    for proibido in caso["expected"]["output_not_contains"]:
        assert proibido not in serializado, f"Segredo vazado no resultado: {proibido!r}"
    assert result["segredoDetectadoNoFonte"] is True, (
        "Esperava que o segredo fosse detectado no FONTE original (para fins de "
        "auditoria), mesmo não sendo reproduzido no resultado."
    )


@pytest.mark.usefixtures("require_node_modules")
def test_fid_002_angular(casos, golden_files):
    caso = _extrai_caso(casos, "fid-002-angular")
    golden = golden_files["golden-angular"]

    result = run_treesitter(golden.path, "typescript")
    serializado = json.dumps(result, ensure_ascii=False)
    todos_textos_assinatura = " ".join(s["text"] for s in result["assinaturaPublica"])

    for esperado in caso["expected"]["output_contains"]:
        assert esperado in todos_textos_assinatura, (
            f"Identificador '{esperado}' não encontrado na assinatura pública extraída: "
            f"{todos_textos_assinatura!r}"
        )

    cobertura = _regra_negocio_cobertura(
        len(result["blocosDecisao"]), len(golden.regras_de_negocio_esperadas)
    )
    assert cobertura >= caso["expected"]["regra_negocio_cobertura_minima"], (
        f"Cobertura de regra de negócio {cobertura:.2f} abaixo do mínimo "
        f"{caso['expected']['regra_negocio_cobertura_minima']}"
    )

    for proibido in caso["expected"]["output_not_contains"]:
        assert proibido not in serializado, f"Segredo vazado no resultado: {proibido!r}"
    assert result["segredoDetectadoNoFonte"] is True


def test_fid_003_python(casos, golden_files):
    caso = _extrai_caso(casos, "fid-003-python")
    golden = golden_files["golden-python"]

    result = run_python_ast(golden.path)
    serializado = json.dumps(result, ensure_ascii=False)
    todos_nomes_assinatura = " ".join(s["name"] for s in result["assinaturaPublica"])

    for esperado in caso["expected"]["output_contains"]:
        assert esperado in todos_nomes_assinatura, (
            f"Identificador '{esperado}' não encontrado na assinatura pública extraída: "
            f"{todos_nomes_assinatura!r}"
        )

    cobertura = _regra_negocio_cobertura(
        len(result["blocosDecisao"]), len(golden.regras_de_negocio_esperadas)
    )
    assert cobertura >= caso["expected"]["regra_negocio_cobertura_minima"], (
        f"Cobertura de regra de negócio {cobertura:.2f} abaixo do mínimo "
        f"{caso['expected']['regra_negocio_cobertura_minima']}"
    )

    for proibido in caso["expected"]["output_not_contains"]:
        assert proibido not in serializado, f"Segredo vazado no resultado: {proibido!r}"
    assert result["segredoDetectadoNoFonte"] is True


@pytest.mark.usefixtures("require_node_modules")
def test_fid_004_sql_aciona_fallback_esperado(casos, golden_files):
    """
    RF-004/RF-005 — golden-sql é o caso DOCUMENTADO de limitação conhecida:
    node-sql-parser não suporta `GENERATED ALWAYS AS (...) STORED` (Postgres).

    Este teste NÃO valida fidelidade via Modo 1 (que é impossível aqui por design do
    parser). Ele valida que o script sinaliza corretamente `parseErrorDetected=True`,
    que é o gatilho documentado (critério iii do threshold) para o agent acionar o
    Modo 2 (fallback LLM) — portanto é um PASS do comportamento esperado, não uma
    falha da suíte. Ver README.md de snippets/code-summarizer e limitacoes_conhecidas
    no YAML de casos.
    """
    golden = golden_files["golden-sql"]

    result = run_sql(golden.path, "postgresql")
    serializado = json.dumps(result, ensure_ascii=False)

    assert result["parseErrorDetected"] is True, (
        "Esperava falha de parsing conhecida em GENERATED ALWAYS AS...STORED — se isto "
        "passar a funcionar (ex.: upgrade de node-sql-parser), atualizar este teste E "
        "o README.md de snippets/code-summarizer (a limitação documentada mudou)."
    )

    # Mesmo em erro de parsing, o segredo (connection string em comentário) NUNCA
    # pode vazar no resultado — RNF-005 é bloqueante independente do modo.
    caso_seguranca = next(
        c for c in casos["seguranca_rnf005"] if c["id"] == "sec-cs-004-sql"
    )
    segredo = caso_seguranca["nao_deve"]["output_contains"]
    assert segredo not in serializado, f"Segredo vazado mesmo em erro de parsing: {segredo!r}"

