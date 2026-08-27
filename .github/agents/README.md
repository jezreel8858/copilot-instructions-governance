# Agents — governança genérica

- Perfis especializados para tarefas com orquestração, triagem e execução guiada.

> Regras globais: consulte `../../CLAUDE.md`.
> Regras operacionais: consulte `../copilot-instructions.md`.

## 1) Agent vs Skill

- **Agent**: usado quando a tarefa exige decisão de rota, escopo e entrega estruturada.
- **Skill**: usado quando a tarefa é conhecimento pontual/checklist reutilizável.
- Regra prática: se precisa classificar intenção e escolher fluxo, use agent.

## 2) Catálogo Atual (estado verificado)

| Tipo | Nome | Quando usar |
|---|---|---|
| Agent | `agent-router` | Entry point obrigatório para classificar intenção e delegar para downstream |
| Agent | `bug-triage` | Triagem de bugs/regressões com reprodução e severidade |
| Agent | `test-strategy` | Estratégia de testes, cobertura por risco e critérios de aceitação |
| Agent | `test-implementation` | ⭐ ***(NEW)*** Implementar suítes de testes unitários, integração e E2E com cobertura objetiva |
| Agent | `test-fix` | 🔧 ***(NEW)*** Corrigir testes quebrados a partir de relatório de falhas — opera somente nos testes identificados |
| Agent | `refactor-planner` | Planejamento de refatoração incremental com risco e rollback |
| Agent | `impact-architect` | Análise de impacto técnico local, dependências e mitigação |
| Agent | `docs-curator` | Curadoria e padronização de documentação/catálogo |
| Agent | `research-router` | Triagem de pesquisa e fallback para investigação externa |
| Agent | `analysis-architect` | Análise cross-sistema de integração e impacto amplo |
| Agent | `analysis-integration-architect` | 🔗 ***(NEW)*** Análise de integrações cross-sistema: contratos (OpenAPI/AsyncAPI/gRPC/GraphQL), breaking changes, grafo de dependências e blast radius |
| Agent | `agent-factory` | Criação/revisão estrutural de agents e governança |
| Agent | `context-builder` | Coletar, condensar e persistir contexto técnico em `docs/context/` |
| Agent | `binding-initializer` | ⚡ ***(NEW)*** Criar `catalog.yaml` + `binding.md` para novo repositório (1 pergunta — Health Check R-034) |
| Agent | `adapter-generator` | ⚡ ***(NEW)*** Gerar automaticamente adapters em `.github/instructions/` via `/add-project-context` |
| Agent | `skill-factory` | ⭐ ***(NEW)*** Criar/revisar skills customizadas com padrão SKILL.md e `.index.json` atômico |
| Agent | `business-rules-extractor` | 📋 ***(NEW)*** Extrair regras de negócio de código e documentar em `.md`; validar refatorações contra regras documentadas |

## 3) Roteamento Rápido

| Cenário | Rota |
|---|---|
| Entrada padrão no chat | `agent-router` |
| Bug, erro, regressão | `bug-triage` |
| Estratégia de testes | `test-strategy` |
| Implementação de testes (unit/integration/E2E) | `test-implementation` |
| Correção de testes quebrados (com relatório de falhas) | `test-fix` |
| Planejamento de refactor | `refactor-planner` |
| Impacto técnico local | `impact-architect` |
| Curadoria de documentação | `docs-curator` |
| Pesquisa externa/triagem de pesquisa | `research-router` |
| Integração cross-sistema | `analysis-architect` |
| Criação/revisão de agents | `agent-factory` |
| Consolidação de contexto para execução posterior | `context-builder` |
| ⚡ Binding context faltando (Health Check) | `binding-initializer` |
| ⚡ Gerar adapters após /add-project-context | `adapter-generator` |
| ⭐ Criar/revisar skill customizada | `skill-factory` |
| 📋 Extrair/documentar/validar regras de negócio | `business-rules-extractor` |

## 4) Pre-fetch Recomendado

Antes de tarefas não triviais, anexar ao contexto:

- `../../CLAUDE.md`
- `../copilot-instructions.md`
- `./README.md`
- `./catalog.yaml`
- `../skills/README.md`

## 5) Regras de Catálogo

- Não listar agent inexistente.
- Mudou governança? Atualizar este arquivo e `catalog.yaml` na mesma entrega.
- Em conflito entre texto e YAML, corrigir ambos no mesmo commit.

## 6) Catálogo Estruturado

- Fonte estruturada: `.github/agents/catalog.yaml`.
- `metadata.total_agents` deve refletir exatamente os agents ativos.

## 7) Templates

- Template de pesquisa: `.github/agents/templates/research-agent.md`
- Template operacional: `.github/agents/templates/operational-agent.md`

## 8) Diretrizes Transversais (obrigatórias)

- Todo agent deve manter contrato explícito de entrada/saída e não-escopo.
- Todo handoff deve declarar motivo e payload mínimo (contexto, evidência, lacunas).
- Toda execução deve declarar confiança (`alta|média|baixa`) e fallback quando aplicável.
- Toda decisão operacional deve seguir menor privilégio de tools.
- Todo agent deve preservar rastreabilidade (rota, evidências e próximo passo mínimo).

## 9) Skills-base por função

| Função de agent | Skills mínimas recomendadas |
|---|---|
| Router/triagem | `agent-contracts`, `handoff-governance`, `confidence-fallback-policy` |
| Análise/impacto | `agent-contracts`, `confidence-fallback-policy`, `agent-evals-lab` |
| Pesquisa | `agent-contracts`, `handoff-governance`, `tavily` |
| Curadoria/governança | `agent-contracts`, `agent-safety-guardrails`, `agent-evals-lab` |
| Operação com métricas | `agent-observability-otel` |

