"""
test_orquestracao_contrato.py — trilha CI (contrato/lógica documentada) para os grupos
`orquestracao_rf008` (orq-001, orq-002) e `custo_hibrido_rnf001` (rnf001-001, rnf001-002)
de docs/ai-context/evals/casos-code-summarizer.yaml.

⚠️ LIMITAÇÃO CONHECIDA E ACEITA (decisão de @test-strategy — abordagem HÍBRIDA):
Nenhum teste aqui invoca o agent `code-summarizer` real nem qualquer LLM. Eles validam
DUAS coisas, sempre de forma determinística:

  1. Que a Decision Tree documentada em `.github/agents/code-summarizer.agent.md`
     DECLARA explicitamente as exigências de RF-008 (orq-001 — teste estático de
     conteúdo do .agent.md).
  2. Que a LÓGICA da Decision Tree (ordem cache → determinístico → fallback), quando
     modelada como máquina de estados pura (`decision_tree_contrato.decidir_modo`), é
     internamente consistente e sem contradição — inclusive quando alimentada com
     resultados REAIS de extract() contra os golden fixtures (orq-002, rnf001-001,
     rnf001-002), fechando o ciclo script→decisão sem imaginar um LLM.

Isto NÃO comprova que o LLM real, em runtime, de fato segue essa ordem — essa garantia
é da trilha Canary E2E (execução real via `run_subagent`), que permanece como TODO
explícito e documentado (ver README.md deste diretório), fora do escopo desta tarefa.
"""
from __future__ import annotations

import re

import pytest

from conftest import REPO_ROOT, run_python_ast, run_sql
from decision_tree_contrato import (
    MODO_CACHE,
    MODO_DETERMINISTICO,
    MODO_FALLBACK_LLM,
    decidir_modo,
    regra_negocio_cobertura,
)

CODE_SUMMARIZER_AGENT_MD = REPO_ROOT / ".github" / "agents" / "code-summarizer.agent.md"


def _caso(casos: dict, grupo: str, case_id: str) -> dict:
    for c in casos[grupo]:
        if c["id"] == case_id:
            return c
    raise KeyError(f"Caso {case_id} não encontrado em {grupo}")


def _atingiu_criterio_modo1_python(casos, golden) -> tuple[bool, dict]:
    """
    Roda extract-python-ast.py real sobre o golden Python e calcula
    `atingiu_criterio_modo1` usando os identificadores curtos de
    `fid-003-python.expected.output_contains` (mesma convenção de
    test_extract_fidelidade.py — o campo `name` do extrator é o identificador puro,
    não a assinatura completa documentada em `golden_files` do YAML).
    """
    fid_caso = _caso(casos, "fidelidade_multistack", "fid-003-python")
    resultado = run_python_ast(golden.path)
    todos_nomes = " ".join(s["name"] for s in resultado["assinaturaPublica"])
    assinatura_ok = all(nome in todos_nomes for nome in fid_caso["expected"]["output_contains"])
    cobertura = regra_negocio_cobertura(
        len(resultado["blocosDecisao"]), len(golden.regras_de_negocio_esperadas)
    )
    atingiu_criterio_modo1 = (
        assinatura_ok and cobertura >= fid_caso["expected"]["regra_negocio_cobertura_minima"]
    )
    return atingiu_criterio_modo1, {"assinatura_ok": assinatura_ok, "cobertura": cobertura}


# ─────────────────────────────────────────────
# orq-001 — RF-008: solicitação deve chegar via run_subagent, nunca lib direta.
# Teste de CONTRATO: valida que o .agent.md DECLARA essa exigência por escrito.
# Não valida comportamento do LLM em runtime (isso é a trilha Canary E2E, TODO).
# ─────────────────────────────────────────────
def test_orq_001_agent_md_declara_exigencia_run_subagent(casos):
    caso = _caso(casos, "orquestracao_rf008", "orq-001")
    conteudo = CODE_SUMMARIZER_AGENT_MD.read_text(encoding="utf-8")

    # (a) Seção "CRÍTICO: ESCOPO DO AGENT" proíbe expor a lib de parsing a outro agent.
    assert re.search(
        r"N[ÃA]O permitir que outro agent chame lib de parsing.*diretamente",
        conteudo,
        re.IGNORECASE,
    ), (
        "code-summarizer.agent.md deveria declarar, na seção 'CRÍTICO: ESCOPO DO "
        f"AGENT', a proibição de outro agent chamar a lib de parsing diretamente "
        f"(RF-008/RNF-007) — caso {caso['id']}."
    )

    # (b) Decision Tree exige explicitamente chegada via run_subagent e redireciona
    #     quem pedir para "usar a lib diretamente".
    assert "run_subagent" in conteudo, (
        "code-summarizer.agent.md deveria referenciar 'run_subagent' como único "
        f"caminho de entrada — caso {caso['id']}."
    )
    assert re.search(
        r"nunca aceitar chamada que pe[çc]a para.{0,5}usar a lib diretamente",
        conteudo,
        re.IGNORECASE,
    ), (
        "code-summarizer.agent.md deveria declarar, na Decision Tree, a recusa "
        f"explícita de chamada que peça para usar a lib diretamente — caso {caso['id']}."
    )

    assert caso["expected"]["comportamento"].startswith("recusado/redirecionado")


# ─────────────────────────────────────────────
# orq-002 — RF-008: ordem cache → determinístico → fallback (máquina de estados pura).
# ─────────────────────────────────────────────
@pytest.mark.parametrize(
    ("cache_hit", "atingiu_criterio_modo1", "modo_esperado"),
    [
        (True, True, MODO_CACHE),
        (True, False, MODO_CACHE),
        (False, True, MODO_DETERMINISTICO),
        (False, False, MODO_FALLBACK_LLM),
    ],
    ids=["cache-hit_criterio-ok", "cache-hit_criterio-falho", "sem-cache_determ-ok", "sem-cache_fallback"],
)
def test_orq_002_ordem_decision_tree_sem_contradicao(cache_hit, atingiu_criterio_modo1, modo_esperado):
    """
    Valida que a máquina de estados PURA (não é o LLM) nunca inverte a ordem
    documentada: cache sempre precede determinístico, que sempre precede fallback.
    """
    assert decidir_modo(cache_hit, atingiu_criterio_modo1) == modo_esperado


def test_orq_002_cenario_do_yaml_sem_cache_previo(casos, golden_files):
    """
    Cenário concreto do YAML (orq-002): cache_previo=False sobre o golden Python.
    Alimenta a máquina de estados com o resultado REAL de extract() para fechar
    script→decisão sem LLM.
    """
    caso = _caso(casos, "orquestracao_rf008", "orq-002")
    assert caso["input"]["cache_previo"] is False

    golden = golden_files["golden-python"]
    atingiu_criterio_modo1, detalhes = _atingiu_criterio_modo1_python(casos, golden)

    modo = decidir_modo(cache_hit=caso["input"]["cache_previo"], atingiu_criterio_modo1=atingiu_criterio_modo1)

    # Passo 1 do ordem_esperada ("Verificar cache") já foi respeitado — cache_previo
    # é False, então NUNCA deveria retornar MODO_CACHE aqui.
    assert modo != MODO_CACHE
    # Passo 2 ("tentar via determinística") deve ser tentado antes do 3 (fallback) —
    # como o Python real atinge o critério (ver test_extract_fidelidade fid-003-python),
    # o modo correto é Determinístico, nunca Fallback LLM direto.
    assert modo == MODO_DETERMINISTICO, (
        f"Esperava Determinístico (via real atingiu critério {detalhes}), obteve "
        f"{modo!r} — isso violaria 'nao_deve: acionar fallback LLM antes de tentar "
        "via determinístico' do caso orq-002."
    )


# ─────────────────────────────────────────────
# rnf001-001 — via determinística suficiente NÃO deve acionar LLM.
# Conecta resultado REAL de extract-python-ast.py (pricing.py) à máquina de estados.
# ─────────────────────────────────────────────
def test_rnf001_001_deterministico_suficiente_nao_aciona_llm(casos, golden_files):
    caso = _caso(casos, "custo_hibrido_rnf001", "rnf001-001")
    golden = golden_files["golden-python"]

    atingiu_criterio_modo1, detalhes = _atingiu_criterio_modo1_python(casos, golden)
    assert atingiu_criterio_modo1, (
        "Pré-condição do caso rnf001-001 (via determinística suficiente) não se "
        f"confirmou contra o golden real: {detalhes}"
    )

    modo = decidir_modo(cache_hit=False, atingiu_criterio_modo1=atingiu_criterio_modo1)
    chamadas_llm = 0 if modo != MODO_FALLBACK_LLM else 1

    assert modo == caso["expected"]["modo_usado"] == MODO_DETERMINISTICO
    assert chamadas_llm == caso["expected"]["chamadas_llm_esperadas"] == 0


# ─────────────────────────────────────────────
# rnf001-002 — via determinística insuficiente aciona fallback LLM leve.
# Conecta o resultado REAL de extract-sql.js (golden-sql, que falha no parsing —
# limitação conhecida e documentada em test_extract_fidelidade.py) à máquina de estados.
# ─────────────────────────────────────────────
@pytest.mark.usefixtures("require_node_modules")
def test_rnf001_002_deterministico_insuficiente_aciona_fallback(casos, golden_files):
    caso = _caso(casos, "custo_hibrido_rnf001", "rnf001-002")
    golden = golden_files["golden-sql"]

    resultado = run_sql(golden.path, "postgresql")
    # Critério (iii) do threshold fechado: erro de parsing → NÃO atinge critério do Modo 1.
    atingiu_criterio_modo1 = not resultado["parseErrorDetected"]
    assert resultado["parseErrorDetected"] is True, (
        "Pré-condição do caso rnf001-002 (via determinística insuficiente) depende do "
        "erro de parsing conhecido em GENERATED ALWAYS AS...STORED — ver "
        "test_extract_fidelidade.py::test_fid_004_sql_aciona_fallback_esperado."
    )

    modo = decidir_modo(cache_hit=False, atingiu_criterio_modo1=atingiu_criterio_modo1)
    chamadas_llm = 0 if modo != MODO_FALLBACK_LLM else 1

    assert modo == caso["expected"]["modo_usado"] == MODO_FALLBACK_LLM
    assert chamadas_llm == caso["expected"]["chamadas_llm_esperadas"] == 1

