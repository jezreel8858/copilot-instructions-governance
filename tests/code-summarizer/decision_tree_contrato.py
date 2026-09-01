"""
decision_tree_contrato.py — funções PURAS que espelham, como máquina de estados
determinística, a Decision Tree e o cálculo de custo×economia DOCUMENTADOS em
`.github/agents/code-summarizer.agent.md` (seções "Decision Tree" e "Modo 2 — Fallback
LLM leve").

⚠️ LIMITAÇÃO CONHECIDA E ACEITA (trilha CI ≠ trilha Canary E2E — ver test-strategy):
Estas funções NÃO invocam o agent `code-summarizer` nem qualquer LLM real. Elas
validam que a LÓGICA/CONTRATO documentado é internamente consistente e sem
contradição (ex.: cache sempre precede determinístico; determinístico sempre
precede fallback), dado um input estruturado. Isto NÃO garante que o LLM real, em
runtime, de fato segue essa ordem — essa garantia só vem da trilha Canary E2E
(execução real via `run_subagent`), que é TODO explícito, fora de escopo desta
tarefa (ver `tests/code-summarizer/README.md` § "Trilha Canary E2E — TODO").

Reaproveitável por:
  - test_orquestracao_contrato.py (orq-002, rnf001-001, rnf001-002)
  - test_custo_contrato.py (rnf002-002)
"""
from __future__ import annotations

MODO_CACHE = "Cache"
MODO_DETERMINISTICO = "Determinístico"
MODO_FALLBACK_LLM = "Fallback LLM"


def decidir_modo(cache_hit: bool, atingiu_criterio_modo1: bool) -> str:
    """
    Máquina de estados PURA que espelha a ordem documentada na "Decision Tree" de
    `code-summarizer.agent.md`:

        1. Verificar cache (ctx_search)               → se hit, retorna cacheado.
        2. Tentar via determinística (ctx_execute*)     → se atinge critério objetivo
           (100% assinatura pública + >=80% blocos de decisão), encerra aqui.
        3. Somente se insuficiente, aciona fallback LLM (RNF-001).

    Não invoca LLM real nem o agent — é a especificação da ordem, testável de forma
    determinística e sem custo. `atingiu_criterio_modo1` é fornecido pelo chamador
    (pode vir de um resultado REAL de extract() contra golden fixtures — ver
    test_orquestracao_contrato.py — fechando o ciclo script→decisão sem imaginar LLM).

    :param cache_hit: True se já existe sumário cacheado para o hash do arquivo.
    :param atingiu_criterio_modo1: True se a via determinística atendeu à fidelidade
        mínima (100% assinatura pública + >=80% blocos de decisão, RF-004).
    :return: um de MODO_CACHE, MODO_DETERMINISTICO, MODO_FALLBACK_LLM.
    """
    if cache_hit:
        return MODO_CACHE
    if atingiu_criterio_modo1:
        return MODO_DETERMINISTICO
    return MODO_FALLBACK_LLM


def avaliar_custo_economia(custo_estimado_tokens: float, economia_projetada_tokens: float) -> dict:
    """
    Cálculo PURO (matemática simples, sem LLM) que espelha RNF-002: "Custo desta
    chamada deve ser medido e comparado à economia projetada — se não compensar,
    sinalizar no relatório, não bloquear."

    :return: {"sinalizar": bool, "mensagem": str}
        sinalizar=True quando custo_estimado_tokens > economia_projetada_tokens
        (sumário não compensa neste caso específico — apenas sinalização, a
        execução NUNCA é bloqueada por este cálculo, conforme documentado).
    """
    sinalizar = custo_estimado_tokens > economia_projetada_tokens
    if sinalizar:
        mensagem = (
            f"Sumário não compensa neste caso: custo estimado ({custo_estimado_tokens} "
            f"tokens) > economia projetada ({economia_projetada_tokens} tokens) — "
            "sinalizado no relatório, execução NÃO bloqueada (RNF-002)."
        )
    else:
        mensagem = (
            f"Custo estimado ({custo_estimado_tokens} tokens) dentro da economia "
            f"projetada ({economia_projetada_tokens} tokens) — não requer sinalização."
        )
    return {"sinalizar": sinalizar, "mensagem": mensagem}


def regra_negocio_cobertura(n_decisoes_extraidas: int, n_regras_esperadas: int) -> float:
    """Mesma definição operacional usada em test_extract_fidelidade.py (duplicada aqui
    de propósito — módulo de contrato não deve depender de arquivo de teste)."""
    if n_regras_esperadas == 0:
        return 1.0
    return min(1.0, n_decisoes_extraidas / n_regras_esperadas)

