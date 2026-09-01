"""
test_pending_suites.py — registra explicitamente como PENDING/SKIPPED os casos do
contrato de evals que ainda dependem de orquestração completa do agent em runtime
(run_subagent real, cache real, contagem real de chamadas LLM) e NÃO possuem harness
de execução disponível nesta base — trilha Canary E2E, fora de escopo desta rodada
(ver `docs-strategy` / README.md deste diretório).

Isto NÃO é falha de teste — é rastreabilidade: cada caso do YAML aparece na coleção
pytest com motivo explícito de skip, em vez de silenciosamente ausente.

Atualização (trilha CI híbrida — ver test-strategy):
  - orquestracao_rf008 (orq-001, orq-002), custo_hibrido_rnf001 (rnf001-001,
    rnf001-002) e gov-cs-001 foram PROMOVIDOS de pending para teste de CONTRATO real
    (grep estático em .agent.md e/ou máquina de estados pura) — ver
    test_orquestracao_contrato.py e test_gov_cs_001 abaixo. Isso valida a
    LÓGICA/GOVERNANÇA DOCUMENTADA, não o comportamento do LLM real em runtime (essa
    garantia continua sendo da trilha Canary E2E, TODO explícito, não implementado
    aqui).
  - custo_economia_rnf002: rnf002-002 foi promovido (ver test_custo_contrato.py).
    rnf002-001 permanece pending abaixo — prioridade "Could" (test-strategy), sem
    urgência nesta rodada.

Exceção: gov-cs-002 É executável hoje (é um grep estático em arquivos .agent.md, não
depende de runtime) — foi implementado como teste real, não pending.
"""
from __future__ import annotations

import re

import pytest

from conftest import REPO_ROOT

# Padrões de nomes de tooling de parsing "de tool interna" do code-summarizer,
# reaproveitados por gov-cs-001 e gov-cs-002.
_PADROES_PARSING_PROIBIDO = re.compile(
    r"tree-sitter|node-sql-parser|extract-treesitter\.js|extract-sql\.js|"
    r"extract-python-ast\.py",
    re.IGNORECASE,
)
# Palavras que, na mesma linha de uma menção à tooling de parsing, indicam PROIBIÇÃO
# (não instrução de bypass) — ex.: "NÃO ... diretamente", "nunca exposta", "bloqueado".
_PADRAO_NEGACAO = re.compile(
    r"n[ãa]o\b|nunca|proibid|bloque|redirecion|recus|exclusiv|viola\b|anti-padr",
    re.IGNORECASE,
)
# gov-cs-001: instrução de BYPASS = menção à tooling de parsing PRÓXIMA (mesma linha)
# de uma palavra que sugira invocação direta pelo agent solicitante (não uma proibição).
_PADRAO_BYPASS_DIRETO = re.compile(
    r"(tree-sitter|node-sql-parser).{0,80}(diretamente|sem passar por code-summarizer)"
    r"|(diretamente|sem passar por code-summarizer).{0,80}(tree-sitter|node-sql-parser)",
    re.IGNORECASE,
)


def _casos_do_grupo(casos: dict, grupo: str) -> list[dict]:
    return casos.get(grupo, [])


def test_rnf002_001_pendente_documentado(casos):
    """
    rnf002-001 — custo MENOR que economia projetada (não sinaliza, mas reporta
    métricas). Prioridade "Could" definida por @test-strategy: aceitável ficar só
    como contrato simples, sem urgência nesta rodada (diferente de rnf002-002,
    priorizado como "Should" e já implementado em test_custo_contrato.py).
    Mantido como TODO explícito, não implementado — não é bloqueante.
    """
    caso = next(c for c in casos["custo_economia_rnf002"] if c["id"] == "rnf002-001")
    pytest.skip(
        f"PENDING (prioridade Could, sem urgência) — {caso['id']}: {caso['descricao']}. "
        "Reutilizar decision_tree_contrato.avaliar_custo_economia() quando priorizado; "
        "cálculo é trivial (mesma função de rnf002-002), só falta o teste dedicado."
    )


def test_gov_cs_001_bypass_por_agent_solicitante(casos):
    """
    gov-cs-001 — RNF-007: um agent SOLICITANTE (ex.: spring-boot) NÃO deve ter
    instrução escrita para chamar lib de parsing diretamente, contornando
    code-summarizer.

    Mesma técnica de gov-cs-002 (grep estático em `.github/agents/*.agent.md`), com
    escopo ajustado para capturar o cenário de gov-cs-001 (o AGENT SOLICITANTE, não o
    code-summarizer): em vez de checar apenas a PRESENÇA do nome da tooling (que
    code-summarizer.agent.md legitimamente documenta sobre si mesmo — ver linhas de
    "Libs de Parsing por Stack (Modo 1)"), procura por um PADRÃO COMPOSTO — nome da
    tooling PRÓXIMO (mesma linha) de uma frase de invocação direta ("diretamente" /
    "sem passar por code-summarizer") — que indicaria uma instrução de BYPASS
    realmente escrita em algum agent, não apenas uma referência descritiva.

    ⚠️ LIMITAÇÃO DOCUMENTADA E ACEITA: isto é uma verificação ESTÁTICA de texto. Não
    impede um agent de tentar o bypass em RUNTIME (ex.: um LLM ignorando sua própria
    instrução) — apenas garante que NENHUM agent do catálogo tem instrução ESCRITA
    para fazer esse bypass. A garantia de bloqueio em runtime é da trilha Canary E2E
    (execução real via run_subagent), que é TODO explícito, fora de escopo aqui.
    """
    caso = next(c for c in casos["governanca_rnf007"] if c["id"] == "gov-cs-001")

    agents_dir = REPO_ROOT / ".github" / "agents"
    instrucoes_de_bypass = []
    for agent_file in agents_dir.glob("*.agent.md"):
        conteudo = agent_file.read_text(encoding="utf-8", errors="ignore")
        for linha_num, linha in enumerate(conteudo.splitlines(), start=1):
            match = _PADRAO_BYPASS_DIRETO.search(linha)
            if not match:
                continue
            if _PADRAO_NEGACAO.search(linha):
                # Linha proíbe/bloqueia o bypass (ex.: "NÃO ... diretamente") —
                # comportamento correto documentado, não é uma instrução de bypass.
                continue
            instrucoes_de_bypass.append(f"{agent_file.name}:{linha_num}: {linha.strip()}")

    assert not instrucoes_de_bypass, (
        f"Encontrada(s) {len(instrucoes_de_bypass)} linha(s) em .agent.md combinando "
        f"tooling de parsing + invocação direta SEM negação/proibição associada — "
        f"possível instrução de bypass escrita (viola {caso['id']}: {caso['descricao']}): "
        f"{instrucoes_de_bypass}"
    )


def test_gov_cs_002_grep_estatico_real(casos):
    """
    RNF-007 — gov-cs-002 É executável: verificação estática de que nenhuma ferramenta
    de parsing (tree-sitter / node-sql-parser / ast nativo específico de code-summarizer)
    é referenciada em tools[] ou corpo de outro agent .agent.md, fora de
    code-summarizer.agent.md. Implementado como grep real (não mock), conforme o próprio
    caso do YAML descreve ("grep em .github/agents/*.agent.md").
    """
    caso = next(c for c in casos["governanca_rnf007"] if c["id"] == "gov-cs-002")

    agents_dir = REPO_ROOT / ".github" / "agents"

    ocorrencias_fora = []
    for agent_file in agents_dir.glob("*.agent.md"):
        if agent_file.name == "code-summarizer.agent.md":
            continue
        conteudo = agent_file.read_text(encoding="utf-8", errors="ignore")
        for match in _PADROES_PARSING_PROIBIDO.finditer(conteudo):
            linha = conteudo.count("\n", 0, match.start()) + 1
            ocorrencias_fora.append(f"{agent_file.name}:{linha}: {match.group(0)}")

    esperado = caso["expected"]["ocorrencias_fora_code_summarizer"]
    assert len(ocorrencias_fora) == esperado, (
        f"Esperava {esperado} ocorrência(s) de tooling de parsing fora de "
        f"code-summarizer.agent.md, encontrado {len(ocorrencias_fora)}: {ocorrencias_fora}"
    )
