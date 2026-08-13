# CHANGELOG — Eco-Sistema Copilot (Governança de IA)

Todas as mudanças significativas nesta base de governança são documentadas aqui.

Formato: [Semantic Versioning](https://semver.org/) | [Conventional Commits](https://www.conventionalcommits.org/)

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
- Prompts de workflow: `/pesquisar`, `/plano`, `/implementar`, `/validar`
- Prompts de Context Mode: `/ctx-checkpoint`, `/ctx-resume`, `/ctx-doctor`, `/ctx-insight`, `/ctx-status`
- Prompts de binding: `/init-context`, `/add-project-context`, `/del-project-context`
- Templates base: `catalog-base.yaml`, `binding-base.md`
- Adapters: `spring-boot-backend.instructions.md` (Java/Spring), `angular-v21-frontend.instructions.md` (Angular 21)
- Ferramentas: `binding-scaffolder/` (Python)
- Regras normativas R-001..R-039 em CLAUDE.md

