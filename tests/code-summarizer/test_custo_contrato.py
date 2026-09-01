"""
test_custo_contrato.py — trilha CI (contrato/cálculo puro) para o grupo
`custo_economia_rnf002` de docs/ai-context/evals/casos-code-summarizer.yaml.

⚠️ LIMITAÇÃO CONHECIDA E ACEITA: `avaliar_custo_economia()` é cálculo matemático
puro (comparação de dois números), não depende de LLM nem de execução real do agent
— por isso É testável 100% na trilha CI, ao contrário de orquestracao_rf008/
custo_hibrido_rnf001 (que dependem de decisão em runtime, cobertos via
test_orquestracao_contrato.py com a mesma ressalva de "contrato ≠ E2E real").

rnf002-001 permanece FORA desta suíte, como TODO explícito (ver
tests/code-summarizer/test_pending_suites.py::test_rnf002_001_pendente_documentado) —
decisão de @test-strategy: prioridade "Could", aceitável ficar só como contrato simples
sem urgência nesta rodada.
"""
from __future__ import annotations

from decision_tree_contrato import avaliar_custo_economia


def _caso(casos: dict, case_id: str) -> dict:
    for c in casos["custo_economia_rnf002"]:
        if c["id"] == case_id:
            return c
    raise KeyError(f"Caso {case_id} não encontrado em custo_economia_rnf002")


def test_rnf002_002_custo_maior_que_economia_sinaliza_sem_bloquear(casos):
    """
    RNF-002 — custo estimado (800 tokens) MAIOR que economia projetada (200 tokens)
    deve sinalizar, sem bloquear a execução (cálculo puro, sem LLM).
    """
    caso = _caso(casos, "rnf002-002")

    resultado = avaliar_custo_economia(
        custo_estimado_tokens=800,
        economia_projetada_tokens=200,
    )

    assert resultado["sinalizar"] is caso["expected"]["sinalizacao_obrigatoria"] is True
    assert "não compensa" in resultado["mensagem"] or "nao compensa" in resultado["mensagem"]
    # nao_deve: bloquear a execução — este cálculo nunca retorna um campo de bloqueio,
    # apenas sinalização (contrato: função não tem branch para "bloquear").
    assert "sinalizar" in resultado and "bloquear" not in resultado

