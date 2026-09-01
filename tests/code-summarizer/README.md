# Testes automatizados — code-summarizer

Suíte pytest que transforma o contrato de evals
[`docs/ai-context/evals/casos-code-summarizer.yaml`](../../docs/ai-context/evals/casos-code-summarizer.yaml)
em testes executáveis contra os scripts de referência do Modo 1 (Determinístico) do
agent `code-summarizer`, em
[`.github/agents/snippets/code-summarizer/`](../../.github/agents/snippets/code-summarizer/).

## Escopo cobrido nesta rodada

| Grupo do YAML | Arquivo | Status |
|---|---|---|
| `fidelidade_multistack` (4 casos) | `test_extract_fidelidade.py` | ✅ Executável (4 golden files reais) |
| `seguranca_rnf005` (4 casos) | `test_extract_seguranca.py` | ✅ Executável (0% tolerância a segredo) |
| `governanca_rnf007` → `gov-cs-002` | `test_pending_suites.py` | ✅ Executável (grep estático real) |
| `governanca_rnf007` → `gov-cs-001` | `test_pending_suites.py` | ✅ Contrato validado (grep estático de bypass — não é E2E real) |
| `orquestracao_rf008` (orq-001, orq-002) | `test_orquestracao_contrato.py` | ✅ Contrato validado (grep estático + máquina de estados pura — não é E2E real) |
| `custo_hibrido_rnf001` (rnf001-001, rnf001-002) | `test_orquestracao_contrato.py` | ✅ Contrato validado (máquina de estados pura + extract() real — não é E2E real) |
| `custo_economia_rnf002` → `rnf002-002` | `test_custo_contrato.py` | ✅ Contrato validado (cálculo puro custo×economia — não é E2E real) |
| `custo_economia_rnf002` → `rnf002-001` | `test_pending_suites.py` | ⏭️ Pending (prioridade "Could", sem urgência — test-strategy) |

### Trilha CI (contrato) × Trilha Canary E2E (real) — abordagem HÍBRIDA

Por decisão de `@test-strategy`, os grupos `orquestracao_rf008`, `custo_hibrido_rnf001`,
`custo_economia_rnf002` e o caso `gov-cs-001` foram cobertos em DUAS trilhas distintas:

- **Trilha CI (implementada nesta rodada)** — valida a LÓGICA/CONTRATO/GOVERNANÇA
  DOCUMENTADA em `code-summarizer.agent.md`, de forma 100% determinística e sem custo
  de LLM: (a) grep estático confirmando que o `.agent.md` DECLARA as exigências
  (orq-001, gov-cs-001); (b) uma máquina de estados PURA
  (`decision_tree_contrato.py::decidir_modo`) que espelha a ordem
  cache → determinístico → fallback, testada tanto com cenários sintéticos quanto
  alimentada por resultados REAIS de `extract-python-ast.py`/`extract-sql.js` contra
  os golden fixtures (orq-002, rnf001-001, rnf001-002); (c) uma função de cálculo pura
  custo×economia (`decision_tree_contrato.py::avaliar_custo_economia`, rnf002-002).
  Ver `test_orquestracao_contrato.py`, `test_custo_contrato.py` e
  `test_pending_suites.py::test_gov_cs_001_bypass_por_agent_solicitante`.
- **Trilha Canary E2E (TODO — NÃO implementada nesta rodada)** — execução REAL do
  agent `code-summarizer` via `run_subagent`, com cache real (`ctx_search`/`ctx_index`)
  e contagem real de chamadas LLM. Requer harness de execução de agent fora do
  pytest local, não disponível nesta sessão. Quando disponível, promover os mesmos
  casos para um teste que invoque o agent de fato (não apenas a máquina de estados
  que modela sua lógica).

⚠️ **Limitação aceita**: os testes de contrato acima NÃO comprovam que o LLM real, em
runtime, de fato segue a Decision Tree — apenas que ela está documentada de forma
correta, sem contradição interna, e que a governança de bypass não está escrita em
nenhum agent do catálogo. Essa é uma limitação conhecida e aceita pela estratégia
híbrida (trilha CI ≠ trilha Canary E2E), não um bug desta suíte.

`rnf002-001` permanece como skip individual (prioridade "Could" — sem urgência nesta
rodada), reaproveitando a mesma função pura de `rnf002-002` quando priorizado.

## Pré-requisitos

```bash
# 1. Dependências Python (pytest + PyYAML)
python -m pip install -r tests/requirements.txt

# 2. Dependências JS dos scripts de extração (node_modules está no .gitignore local)
cd .github/agents/snippets/code-summarizer && npm install
```

## Rodar a suíte

```bash
# da raiz do repositório
python -m pytest tests/code-summarizer/ -v
```

## Arquitetura dos testes

- `conftest.py` — carrega o YAML de casos (fonte única de verdade), expõe fixtures
  `casos`, `golden_files`, `require_node_modules`, e os helpers `run_treesitter()`,
  `run_sql()` (via subprocess, chamando `cli-runner.js`), `run_python_ast()` (import
  direto, stdlib apenas).
- `cli-runner.js` (em `.github/agents/snippets/code-summarizer/`) — ponte mínima
  criada **somente para viabilizar automação de teste** via subprocess, já que
  `extract-treesitter.js`/`extract-sql.js` expõem apenas uma função de módulo
  (`extract()`), sem CLI própria (são pensados para `ctx_execute_file`). Não altera a
  lógica de extração nem os critérios de aceite documentados nos scripts originais.
- Nenhum script de extração foi modificado.

## Critério de fidelidade aplicado

Igual ao documentado nos próprios scripts (`extract-*.js`/`.py`) e no
`code-summarizer.agent.md`:
- **Assinatura pública**: 100% dos identificadores esperados (`output_contains` do
  YAML) devem aparecer literalmente em algum nó de assinatura extraído.
- **Regra de negócio**: cobertura ≥ 80%, calculada como
  `min(1.0, nº_blocos_de_decisão_extraídos / nº_regras_de_negócio_esperadas)` — mesma
  definição operacional dos scripts (contagem de nós de decisão, não comparação
  textual das descrições narrativas do YAML).
- **Segredo**: 0% de tolerância — bloqueante, checado tanto na serialização agregada
  do resultado quanto em cada campo textual individual (recursivo).

## Limitação conhecida herdada do smoke test manual (não é bug desta suíte)

O golden file SQL (`V1__create_orders.sql`) usa `GENERATED ALWAYS AS (...) STORED`
(sintaxe DDL do Postgres), que `node-sql-parser` não suporta — `parseErrorDetected`
vem `True`. Isto é o **comportamento esperado**: aciona o critério (iii) do threshold
de fallback (Modo 2/LLM) no agent. Os testes de SQL (`test_fid_004_sql_aciona_fallback_esperado`,
`test_sec_cs_004_sql`) validam justamente essa sinalização correta — não são testes de
fidelidade via Modo 1 para SQL, que é impossível aqui por limitação de biblioteca.

## Última execução

Ver evidência reportada por `@test-implementation` no changelog/resumo da tarefa que
gerou esta suíte (data da execução, contagem de passed/skipped, ambiente Python/Node
usado).

