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
| Agent | `prompt-structuring` | ⚠️ ***(NEW)*** Passo mandatório pós-`agent-router` (R-041) — refina o prompt em loop controlado (máx. 5 iterações) antes de retornar para classificação de intenção |
| Agent | `bug-triage` | Triagem de bugs/regressões com reprodução e severidade |
| Agent | `test-strategy` | Estratégia de testes, cobertura por risco e critérios de aceitação |
| Agent | `test-implementation` | ⭐ ***(NEW)*** Implementar suítes de testes unitários, integração e E2E com cobertura objetiva |
| Agent | `test-fix` | 🔧 ***(NEW)*** Corrigir testes quebrados a partir de relatório de falhas — opera somente nos testes identificados |
| Agent | `refactor-planner` | Planejamento de refatoração incremental com risco e rollback |
| Agent | `impact-architect` | Análise de impacto técnico local, dependências e mitigação |
| Agent | `docs-curator` | Curadoria e padronização de documentação/catálogo |
| Agent | `research-router` | Triagem de pesquisa e fallback para investigação externa |
| Agent | `analysis-architect` | Análise técnica unificada: impacto, risco, dependências, contratos e integrações cross-sistema (OpenAPI/AsyncAPI/gRPC/GraphQL) com metodologia B1/B2/B3 |
| Agent | `agent-factory` | Criação/revisão estrutural de agents e governança |
| Agent | `context-builder` | Coletar, condensar e persistir contexto técnico em `docs/context/` |
| Agent | `binding-initializer` | ⚡ ***(NEW)*** Criar `catalog.yaml` + `binding.md` para novo repositório (1 pergunta — Health Check R-034) |
| Agent | `adapter-generator` | ⚡ ***(NEW)*** Gerar automaticamente adapters em `.github/instructions/` via `/add-project-context` |
| Agent | `skill-factory` | ⭐ ***(NEW)*** Criar/revisar skills customizadas com padrão SKILL.md e `.index.json` atômico |
| Agent | `prompt-factory` | 📝 ***(NEW)*** Criar/revisar `.prompt.md` seguindo padrão canônico Copilot 2026: frontmatter correto, body estruturado e README atualizado |
| Agent | `business-rules-extractor` | 📋 ***(NEW)*** Extrair regras de negócio de código e documentar em `.md`; validar refatorações contra regras documentadas |
| Agent | `angular` | 🅰️ Especialista Angular **enterprise** para análise/recomendação (arquitetura moderna, RxJS+Signals, performance CWV/SSR, segurança, acessibilidade, testes e upgrades), carregando skills de componentização, patterns Angular e contratos de API de componentes para design system, sem implementação direta |
| Agent | `spring-boot` | ☕ ***(NEW)*** Especialista backend Spring Boot **enterprise** para análise/recomendação (arquitetura, versões Java/JDK, performance, observabilidade, segurança e migração), sem implementação direta |
| Agent | `spring-reactive` | ⚛️ ***(NEW)*** Especialista backend reativo Spring WebFlux/Reactor **enterprise** para análise/recomendação (capacidade, resiliência, backpressure, observabilidade, segurança e compatibilidade Java/JDK), sem implementação direta |
| Agent | `docs-writer` | 📝 ***(NEW)*** Perfil documentador agnóstico de domínio — gera/atualiza documentação técnica em Markdown (Diátaxis, ADR/MADR, README, runbook, postmortem), produz exclusivamente arquivos `.md` |
| Agent | `code-review` | 🔎 ***(NEW)*** Revisa código (diff/PR) antes do merge por correção, segurança, convenções, impacto, testes e performance; classifica achados por severidade; read-only; delega para `bug-triage`/`impact-architect`/`test-strategy`/`refactor-planner` |

## 3) Roteamento Rápido

| Cenário | Rota |
|---|---|
| Entrada padrão no chat | `agent-router` |
| ⚠️ Toda solicitação (pós Health Check R-034) | `prompt-structuring` (mandatório, retorna ao `agent-router`) |
| Bug, erro, regressão | `bug-triage` |
| Estratégia de testes | `test-strategy` |
| Implementação de testes (unit/integration/E2E) | `test-implementation` |
| Correção de testes quebrados (com relatório de falhas) | `test-fix` |
| Planejamento de refactor | `refactor-planner` |
| Impacto técnico local | `impact-architect` |
| Curadoria de documentação | `docs-curator` |
| Pesquisa externa/triagem de pesquisa | `research-router` |
| Análise técnica, impacto, contratos, integrações cross-sistema | `analysis-architect` |
| Criação/revisão de agents | `agent-factory` |
| Consolidação de contexto para execução posterior | `context-builder` |
| ⚡ Binding context faltando (Health Check) | `binding-initializer` |
| ⚡ Gerar adapters após /add-project-context | `adapter-generator` |
| ⭐ Criar/revisar skill customizada | `skill-factory` |
| 📝 Criar/revisar prompt `.prompt.md` | `prompt-factory` |
| 📋 Extrair/documentar/validar regras de negócio | `business-rules-extractor` |
| 🅰️ Análise e recomendação Angular | `angular` |
| ☕ Análise e recomendação backend Spring Boot | `spring-boot` |
| ⚛️ Análise e recomendação backend reativo WebFlux/Reactor | `spring-reactive` |
| 📝 Escrever/gerar documentação técnica em `.md` (qualquer domínio) | `docs-writer` |
| 🔎 Revisar código (diff/PR) antes do merge, por severidade | `code-review` |

## 4) Pre-fetch Recomendado

Antes de tarefas não triviais, anexar ao contexto:

- `../../CLAUDE.md`
- `../copilot-instructions.md`
- `./README.md`
- `./catalog.yaml`
- `../skills/README.md`
- `../../docs/ai-context/routing-graph.yaml` — grafo de roteamento estrutural (R-040)

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
- Todo handoff deve usar o schema formal v1.0 (`versao`, `para`, `emissor`, `contexto`) — ver `handoff-governance/SKILL.md` seção 2.1.
- Toda execução deve declarar **confidence score numérico** (0.00–1.00) **e nível de routing** (`rule-based|semantic|llm-based`) — não apenas `alta|média|baixa`.
- Toda decisão operacional deve seguir menor privilégio de tools.
- Todo agent deve preservar rastreabilidade (rota, evidências e próximo passo mínimo).
- Todo agent pode declarar `version:` no frontmatter para rastrear mudanças de comportamento.
- Nova rota de roteamento → atualizar `docs/ai-context/routing-graph.yaml` **antes** de editar a Decision Tree (R-040).

## 9) Skills-base por função

| Função de agent | Skills mínimas recomendadas |
|---|---|
| Router/triagem | `agent-contracts`, `handoff-governance`, `confidence-fallback-policy` |
| Análise/impacto | `agent-contracts`, `confidence-fallback-policy`, `agent-evals-lab` |
| Pesquisa | `agent-contracts`, `handoff-governance`, `tavily` |
| Curadoria/governança | `agent-contracts`, `agent-safety-guardrails`, `agent-evals-lab` |
| Operação com métricas | `agent-observability-otel` |
| Agents com memória adaptativa | `agent-memory-policy` (Tier 3 — experimental) |
| Documentação (escrita) | `documentation-writing-patterns`, `mermaid-diagrams`, `agent-contracts` |
| Revisão de código | `code-review-patterns`, `code-tracing`, `agent-contracts` |
