"""
test_extract_seguranca.py — Suíte 5 do contrato de evals (seguranca_rnf005).

RNF-005 é bloqueante: 0% de tolerância a reprodução literal de segredo no resultado
gerado pelos scripts de Modo 1 (Determinístico). Cobre os 4 casos "sec-cs-00X-*" de
.github/agents/evals/casos-code-summarizer.yaml contra os 4 golden files reais.

Diferente de test_extract_fidelidade.py (que valida fidelidade + segurança juntas),
este arquivo isola e reforça SOMENTE o critério de segurança, incluindo verificação
carácter-a-carácter em cada campo textual do resultado (não apenas na serialização
JSON agregada), para reduzir falso-negativo por normalização de encoding/escaping.
"""
from __future__ import annotations

import json

import pytest

from conftest import run_python_ast, run_sql, run_treesitter


def _todos_os_textos(result: dict) -> list[str]:
    """Extrai toda string textual do resultado, recursivamente, para checagem exaustiva."""
    textos: list[str] = []

    def _walk(obj):
        if isinstance(obj, str):
            textos.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                _walk(v)
        elif isinstance(obj, list):
            for v in obj:
                _walk(v)

    _walk(result)
    return textos


def _caso_seguranca(casos: dict, case_id: str) -> dict:
    for caso in casos["seguranca_rnf005"]:
        if caso["id"] == case_id:
            return caso
    raise KeyError(f"Caso {case_id} não encontrado em seguranca_rnf005")


def _assert_segredo_nao_vaza(result: dict, segredo: str) -> None:
    serializado = json.dumps(result, ensure_ascii=False)
    assert segredo not in serializado, f"Segredo vazado na serialização completa: {segredo!r}"
    for texto in _todos_os_textos(result):
        assert segredo not in texto, f"Segredo vazado em campo textual individual: {texto!r}"


@pytest.mark.usefixtures("require_node_modules")
def test_sec_cs_001_java(casos, golden_files):
    caso = _caso_seguranca(casos, "sec-cs-001-java")
    golden = golden_files["golden-java"]
    result = run_treesitter(golden.path, "java")

    segredo = caso["nao_deve"]["output_contains"]
    _assert_segredo_nao_vaza(result, segredo)
    assert result["segredoDetectadoNoFonte"] is True, (
        "Segredo deveria ter sido DETECTADO no fonte (para auditoria), mesmo sem vazar."
    )


@pytest.mark.usefixtures("require_node_modules")
def test_sec_cs_002_angular(casos, golden_files):
    caso = _caso_seguranca(casos, "sec-cs-002-angular")
    golden = golden_files["golden-angular"]
    result = run_treesitter(golden.path, "typescript")

    segredo = caso["nao_deve"]["output_contains"]
    _assert_segredo_nao_vaza(result, segredo)
    assert result["segredoDetectadoNoFonte"] is True


def test_sec_cs_003_python(casos, golden_files):
    caso = _caso_seguranca(casos, "sec-cs-003-python")
    golden = golden_files["golden-python"]
    result = run_python_ast(golden.path)

    segredo = caso["nao_deve"]["output_contains"]
    _assert_segredo_nao_vaza(result, segredo)
    assert result["segredoDetectadoNoFonte"] is True


@pytest.mark.usefixtures("require_node_modules")
def test_sec_cs_004_sql(casos, golden_files):
    caso = _caso_seguranca(casos, "sec-cs-004-sql")
    golden = golden_files["golden-sql"]
    result = run_sql(golden.path, "postgresql")

    segredo = caso["nao_deve"]["output_contains"]
    _assert_segredo_nao_vaza(result, segredo)
    # SQL falha no parsing (limitação conhecida — ver test_extract_fidelidade.py), mas
    # a detecção de segredo roda ANTES/independente do parsing (redactSecrets é chamado
    # sobre sourceText bruto), então segredoDetectadoNoFonte deve continuar True mesmo
    # com parseErrorDetected=True.
    assert result["segredoDetectadoNoFonte"] is True
    assert result["parseErrorDetected"] is True

