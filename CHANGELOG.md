# CHANGELOG — Eco-Sistema Copilot (Governança de IA)

Todas as mudanças significativas nesta base de governança são documentadas aqui.

Formato: [Semantic Versioning](https://semver.org/) | [Conventional Commits](https://www.conventionalcommits.org/)

---

## [1.4.0] — 2026-08-29

### Adicionado
- **Agent `requirements-analyst`**: perfil de elicitação prospectiva para transformar pedido de negócio ambíguo em requisitos funcionais/não-funcionais estruturados e testáveis, com rastreabilidade da fonte; aplica mediação contra *solution-jumping* (Five Whys) antes de qualquer decisão técnica
- **Skill `requirements-engineering-patterns`** (Tier 2): base de conhecimento consolidada via pesquisa de mercado (ISO/IEC/IEEE 29148, EARS, INVEST, Gherkin/BDD, FURPS+, regra de singularidade INCOSE)
- **`docs/ai-context/routing-graph.yaml`**: novo nó + aresta `agent-router → requirements-analyst` (R-040), com `nao_confundir_com` cruzado para evitar colisão com `business-rules-extractor` e `impact-architect`
- **`docs/ai-context/evals/casos-roteamento.yaml`**: `canon-014` (roteamento correto para `requirements-analyst`), `regr-012` e `regr-013` (não-confusão `requirements-analyst` × `business-rules-extractor`) — suíte passa de 32 para 35 casos
- **`agent-router.agent.md`**: nova ramificação na Decision Tree para elicitação de requisito novo; bump `version: 1.3.0 → 1.4.0`

### Corrigido
- **SYNC de catálogos (R-015/R-040)**: atualização atômica de `agents/catalog.yaml` (23 → 24 agents), `skills/.index.json` (38 → 39 skills), `agents/README.md` e `skills/README.md` para refletir o novo perfil de requisitos
- **`README.md`** consolidado para refletir o estado real: 24 agents, 39 skills, 35 casos de roteamento e distinção explícita de escopo entre `requirements-analyst` (pedido → requisito) e `business-rules-extractor` (código → regra)

### Conformidade
- Mantida separação de responsabilidades sem duplicação (R-003): `requirements-analyst` opera em requisito **novo/prospectivo**; `business-rules-extractor` permanece no fluxo **reverso** (código existente)

---

## [1.3.0] — 2026-08-29

### Adicionado
- **Agent `docs-writer`**: Perfil documentador agnóstico de domínio — gera/atualiza documentação técnica em Markdown (Diátaxis, ADR/MADR, README, runbook, postmortem); produz exclusivamente arquivos `.md`; nunca alucina comportamento não verificado no código-fonte
- **Skill `documentation-writing-patterns`** (Tier 2): base de conhecimento consolidada via pesquisa de mercado (Diátaxis, Google/Microsoft Style Guide, MADR, standard-readme, `llms.txt`, anti-alucinação Anthropic/Copilot/Cursor) — base do `docs-writer`
- **`docs/ai-context/routing-graph.yaml`**: novo nó + aresta `agent-router → docs-writer` (R-040), com `nao_confundir_com` cruzado em relação a `docs-curator`
- **`docs/ai-context/evals/casos-roteamento.yaml`**: `canon-012` (roteamento correto para `docs-writer`), `regr-008` e `regr-009` (não-confusão `docs-writer` × `docs-curator`) — suíte passa de 23 para 29 casos
- **`agent-router.agent.md`**: nova ramificação na Decision Tree (escrita de doc nova vs. curadoria existente) — bump `version: 1.1.0 → 1.2.0`

### Corrigido
- **SYNC (auditoria de tools/perfis dos 21 agents)**: corrigido typo `@analysis-integration-architect` → `@analysis-architect` em 2 skills (`dependency-graph-mapping`, `integration-contract-analysis`) no `.index.json`
- **SYNC**: `related_agents` de `context-mode`, `tavily`, `code-tracing` e `prompt-engineering-patterns` expandidos no `.index.json` para refletir `tools:` reais declaradas em cada agent
- **SYNC**: seção "Docs Sempre Anexadas" (pre-fetch) completada em 8 agents (`research-router`, `agent-router`, `analysis-architect`, `impact-architect`, `refactor-planner`, `test-strategy`, `bug-triage`, `skill-factory`) — skills usadas nas `tools:` não estavam referenciadas no pre-fetch
- **SYNC**: `catalog.yaml` (`related_skills`) alinhado ao pre-fetch de `impact-architect`, `refactor-planner` e `test-strategy`
- **README.md**: consolidado para refletir estado real — 22 agents (antes citava 17), 37 skills (antes citava 29), remoção de referência ao agent já unificado `analysis-integration-architect`, contagem de casos de evals (23 → 29), diagrama Mermaid atualizado com `docs-writer`

### Conformidade
- Decisão de escopo registrada: **não** foi adicionado campo `profile:` no frontmatter dos agents — `agent-contracts/SKILL.md` § 8 já é fonte única de verdade para o mapeamento perfil → template de saída (evita duplicação — R-003)

---

## [1.2.0] — 2026-06-12

### Adicionado
- **Prompt `/commit`**: Gera mensagem Conventional Commits (PT-BR) sem executar git autonomamente
- **Prompt `/review`**: Revisão de código por qualidade, convenções e impacto com relatório por severidade
- **Prompt `/health`**: Health check completo da governança (binding, agents, skills, R-038)
- **Agent `skill-factory`**: Criar/revisar skills com padrão SKILL.md e atualização atômica do `.index.json`
- **Skill `git-governance`**: Convenções de branch naming, commit standards e PR guidelines
- **`docs/ai-context/catalog.yaml`**: Binding instanciado para o ecossistema
- **`docs/ai-context/binding.md`**: Documentação do binding ativo
- Diagrama Mermaid no README.md mostrando fluxo completo de agents

### Corrigido
- **SYNC**: `.index.json` com `total_agents: 10` (corrigido para 15) e 2 skills sem entrada (`project-scanner`, `project-context-builder`)
- **SYNC**: `copilot-instructions.md` § 4.1 ainda mencionava "5 perguntas" após simplificação para 1

### Conformidade R-038
- Todos os arquivos de governança agora seguem o padrão de genericidade obrigatória (R-038)
---

## [1.1.0] — 2026-06-11

### Adicionado
- **Prompt `/init-context` v1.1**: PASSO 2 informativo (não bloqueante), PASSO 3 condicional por sessão, PASSO 4 lista projetos por nome
- **Simplificação `binding-initializer`**: 5 perguntas → 1 pergunta (só nome do ecossistema)
- **Desacoplamento `adapter-generator`**: Removido auto-disparo pelo `binding-initializer` — apenas chamado por `/add-project-context`
- **Guardrail de confinamento**: Todos os arquivos gerados ficam exclusivamente no repositório de governança
- **Naming de adapters**: Padrão `<nome-projeto>.instructions.md` (sem sufixo de stack)
- Source_docs do `/init-context` agora inclui `docs/ai-context/catalog.yaml`
- PASSO 3 do `/init-context` condicional: sessão recorrente mostra top-5; primeira execução mostra todas

### Corrigido
- `add-project-context`: reduzido de 4 para 3 perguntas (Q2 tipo removida — inferida pelo scanner)
- `QUICK-START.md`: exemplos atualizados com caminhos corretos de projeto

---

## [1.0.0] — 2026-06-10

### Adicionado
- Estrutura inicial de governança (`CLAUDE.md`, `copilot-instructions.md`)
- 14 agents: `agent-router`, `bug-triage`, `test-strategy`, `test-implementation`, `refactor-planner`, `impact-architect`, `docs-curator`, `research-router`, `analysis-architect`, `agent-factory`, `context-builder`, `binding-initializer`, `adapter-generator`
- 17 skills: `context-mode`, `context-builder`, `context-compact`, `sonarqube-governance`, `tavily`, `mermaid-diagrams`, `agent-contracts`, `handoff-governance`, `confidence-fallback-policy`, `agent-safety-guardrails`, `agent-observability-otel`, `agent-evals-lab`, `yaml-governance`, `test-implementation-angular`, `test-implementation-backend`, `test-coverage-governance`
- Prompts de workflow: `/research`, `/plan`, `/implement`, `/validate` (renomeados de PT→EN em 2026-08-29)
- Prompts de Context Mode: `/ctx-checkpoint`, `/ctx-resume`, `/ctx-doctor`, `/ctx-insight`, `/ctx-status`
- Prompts de binding: `/init-context`, `/add-project-context`, `/del-project-context`
- Templates base: `catalog-base.yaml`, `binding-base.md`
- Adapters: `spring-boot-backend.instructions.md` (Java/Spring), `angular-v21-frontend.instructions.md` (Angular 21)
- Ferramentas: `binding-scaffolder/` (Python)
- Regras normativas R-001..R-039 em CLAUDE.md

