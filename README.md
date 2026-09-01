# Deep Agents Copilot — Estrutura de Governança Genérica e Reutilizável

## Propósito

Este repositório estabelece uma **base de governança genérica e reutilizável** para uso de IA (Copilot, Claude, ChatGPT) em projetos técnicos.

Objetivo:
- ✅ Governança **desacoplada** de domínio e tecnologia específica
- ✅ Padrões operacionais **reutilizáveis** em qualquer ecossistema
- ✅ Separação clara entre regras globais e customizações por stack/projeto
- ✅ Binding hierárquico com carregamento automático de adapters

---

## Estrutura

### Nível 1: Governança Global (Genérica)

**Fonte de Verdade Operacional:**

- **[`CLAUDE.md`](CLAUDE.md)** — Regras normativas (R-001..R-042), princípios e fluxos genéricos
- **[`.github/copilot-instructions.md`](.github/copilot-instructions.md)** — Execução operacional e roteamento de agents

**Características:**
- Sem referência a projetos específicos
- Sem específicos de linguagem ou framework
- Aplicável a qualquer ecossistema

### Nível 2: Adapters (Stack/Domínio Específico)

**Local:** `.github/instructions/`

Exemplos:
- `spring-boot-backend.instructions.md` — Padrões exclusivos para Java/Spring Backend
- `angular-v21-frontend.instructions.md` — Padrões exclusivos para Angular Frontend

**Características:**
- Referências específicas de projeto/tecnologia **permitidas e esperadas**
- Nunca incluem regras globais (apenas referências)
- Declarados em `docs/ai-context/catalog.yaml` com `applyTo` glob patterns

### Nível 3: Contexto de Binding e Artefatos de Governança

**Local:** `docs/ai-context/`

- **`catalog.yaml`** — Manifest único de adapters, projetos e mapping stack → instrução; inclui seção `governance_artefacts` com artefatos estruturais de IA
- **`binding.md`** — Documentação de binding e descoberta
- **`routing-graph.yaml`** — ⭐ **Grafo de roteamento declarado** (nós = agents, arestas = condições, política de cascata) — fonte de verdade estrutural do `agent-router` (R-040)
- **`evals/casos-roteamento.yaml`** — Suíte de casos de teste de regressão de roteamento (canônicos, ambíguos, regressão, segurança)

---

## Princípios Fundamentais

### 1. **Genericidade Obrigatória (R-038)**

Todo arquivo criado em `.github/` (agents, skills, prompts, copilot-instructions) **DEVE ser genérico**:

```
❌ PROIBIDO em .github/:
- "Use Spring Boot para..."
- "Em Angular, configure..."
- "Integração com [Jira-específica]"

✅ PERMITIDO em .github/instructions/adapters:
- "No backend Java/Spring..."
- "Para projetos Angular..."
- "Adapters registrados em catalog.yaml"
```

**Teste rápido:** Substitua mentalmente `[PROJETO]` e `[TECH]` — o texto continua válido?

### 2. **Sem Duplicação (R-003)**

- Regras globais **vivem apenas em `CLAUDE.md`**
- `.github/copilot-instructions.md` **referencia**, não copia
- Adapters **referem-se a `CLAUDE.md`** para governança global

### 3. **Hierarquia em Caso de Conflito**

```
System Instructions
     ↓
Developer Instructions (este repositório)
     ↓
User Request
     ↓
Arquivos Locais (CLAUDE.md → copilot-instructions.md → adapters)
```

---

## Como Usar

### Para Desenvolvedores de IA (Copilot, Cursor, Claude Code)

1. Carregue **`CLAUDE.md`** como fonte de verdade global
2. Carregue **`.github/copilot-instructions.md`** para roteamento operacional
3. Identifique o projeto/stack alvo
4. Carregue o adapter correspondente via `docs/ai-context/catalog.yaml`

**Fluxo operacional:**

```mermaid
flowchart TD
    A["/init-context\n1x por sessão"] --> B{Binding context\nexiste?}
    B -- Não --> C["binding-initializer\n1 pergunta: ecossistema"]
    C --> D["/add-project-context\n1x por projeto"]
    B -- Sim --> D
    D --> E["@agent-router\nR-037 — entry point"]
    E --> P["prompt-structuring\nR-041 — loop máx. 5x"]
    P --> E

    E --> G1["🎯 Planning/Analysis\nrequirements-analyst · deep-search\nfeature-planner"]
    E --> G2["📐 Architecture/Design\nanalysis-architect · code-knowledge-graph\nbusiness-rules-extractor · refactor-planner\nrefactor-executor"]
    E --> G3["💻 Implementation (Specialists)\nangular · spring-boot · spring-reactive\ncode-summarizer"]
    E --> G4["✅ Quality/Validation\nbug-triage · debugger · test-strategy\ntest-implementation · test-fix · code-review\ncode-style-enforcer · security-reviewer\nperformance-agent · devops-engineer"]
    E --> G5["📚 Documentation/Learning\ndocs-writer · docs-curator · context-builder"]
    E --> G6["🔄 Governance/Orchestration\nagent-factory · skill-factory · prompt-factory\nagent-auditor · binding-initializer\nadapter-generator · agentic-memory-manager\ncompliance-guardrails"]

    G1 & G2 & G3 & G4 & G5 & G6 --> K["Resultado\n(turno N)"]
    K --> L["/commit\nmensagem gerada"]
    K -. "turno N+1: deriva de intenção\ndetectada (R-042)" .-> E
```

> 35 agents catalogados, agrupados em 6 perfis de mercado — ver [§ Cobertura de Mercado](#cobertura-de-mercado--perfis-de-agents) para o diagrama detalhado por agent e a análise de aderência às práticas consolidadas.

### Para Adicionar Novo Adapter

1. **Criar** `.github/instructions/<nome>.instructions.md`
   ```yaml
   ---
   applyTo: ["src/**/*.ext"]  # Glob patterns
   ---
   # Conteúdo específico do stack/domínio
   ```

2. **Registrar** em `docs/ai-context/catalog.yaml`:
   ```yaml
   adapters:
     - name: seu-adapter
       applies_to: ["src/**/*.ext"]
       description: "Descrição breve"
   ```

3. **Documentação** via `docs/ai-context/binding.md`

---

## Cobertura de Mercado — Perfis de Agents

> Análise completa: [`docs/ai-context/agent-profiles-taxonomy.md`](docs/ai-context/agent-profiles-taxonomy.md) — consolidação de fontes de mercado (Anthropic, OpenAI, Microsoft, Google DeepMind, GitHub, SpecWeave, ArXiv) sobre quais perfis de agent devem existir em um flow multi-agent de desenvolvimento de software.

### O que o mercado recomenda (2026)

Frameworks de referência (Claude Code/Agent SDK da Anthropic, Microsoft Agent Framework, OpenAI Agents SDK, MetaGPT/ChatDev, SpecWeave — 11 agents) convergem para **22 perfis de agent** organizados em **6 categorias funcionais**: Planejamento/Análise, Arquitetura/Design, Implementação, Qualidade/Validação, Documentação/Aprendizado e Governança/Orquestração.

### Quanto este projeto cobre

| Categoria de Mercado | Perfis Esperados | Cobertos Neste Projeto | Cobertura |
|---|---|---|---|
| 🎯 Planning & Analysis | Planner, PM/Analyst, Researcher | `requirements-analyst`, `deep-search`, `feature-planner` | ✅ 100% |
| 📐 Architecture & Design | Architect, Impact Analyzer, Rules Extractor, Refactor Planner | `analysis-architect`, `code-knowledge-graph`, `business-rules-extractor`, `refactor-planner`, `refactor-executor` | ✅ 100% |
| 💻 Implementation | Coder por stack, Debugger | `angular`, `spring-boot`, `spring-reactive`, `code-summarizer` | ✅ 100% |
| ✅ Quality & Validation | Test Strategy/Impl, Reviewer, Security, Performance, QA | `bug-triage`, `debugger`, `test-strategy`, `test-implementation`, `test-fix`, `code-review`, `code-style-enforcer`, `security-reviewer`, `performance-agent`, `devops-engineer` | ✅ 100% |
| 📚 Documentation & Learning | Docs Writer, Rules Extractor | `docs-writer`, `docs-curator`, `context-builder` | ✅ 100% |
| 🔄 Governance & Orchestration | Router, Memory Manager, Guardrails, Factories | `agent-router`, `prompt-structuring`, `agent-factory`, `skill-factory`, `prompt-factory`, `agent-auditor`, `binding-initializer`, `adapter-generator`, `agentic-memory-manager`, `compliance-guardrails` | ✅ 100% |

**Resultado**: **35 agents ativos**, cobrindo **~95% dos 22 perfis consolidados de mercado** — nível de maturidade comparável ao modelo de referência SpecWeave (11 agents core, expandido aqui com granularidade enterprise adicional em segurança/performance/compliance).

### Mapa de Agents por Perfil (Mermaid)

```mermaid
graph TB
    subgraph CAT1["🎯 PLANNING &amp; ANALYSIS"]
        direction TB
        A1[requirements-analyst]
        A2[deep-search]
        A3[feature-planner]
    end

    subgraph CAT2["📐 ARCHITECTURE &amp; DESIGN"]
        direction TB
        B1[analysis-architect]
        B2[code-knowledge-graph]
        B3[business-rules-extractor]
        B4[refactor-planner]
        B5[refactor-executor]
    end

    subgraph CAT3["💻 IMPLEMENTATION — Specialists Híbridos"]
        direction TB
        C1[angular]
        C2[spring-boot]
        C3[spring-reactive]
        C4[code-summarizer]
    end

    subgraph CAT4["✅ QUALITY &amp; VALIDATION"]
        direction TB
        D1[bug-triage]
        D2[debugger]
        D3[test-strategy]
        D4[test-implementation]
        D5[test-fix]
        D6[code-review]
        D7[code-style-enforcer]
        D8["security-reviewer 🔒"]
        D9["performance-agent ⚡"]
        D10["devops-engineer 🐳"]
    end

    subgraph CAT5["📚 DOCUMENTATION &amp; LEARNING"]
        direction TB
        E1[docs-writer]
        E2[docs-curator]
        E3[context-builder]
    end

    subgraph CAT6["🔄 GOVERNANCE &amp; ORCHESTRATION"]
        direction TB
        F1["agent-router ⭐"]
        F2[prompt-structuring]
        F3[agent-factory]
        F4[skill-factory]
        F5[prompt-factory]
        F6[agent-auditor]
        F7[binding-initializer]
        F8[adapter-generator]
        F9["agentic-memory-manager 🧠"]
        F10["compliance-guardrails 🛡️"]
    end

    F1 -.orquestra.-> CAT1
    F1 -.orquestra.-> CAT2
    F1 -.orquestra.-> CAT3
    F1 -.orquestra.-> CAT4
    F1 -.orquestra.-> CAT5
    F1 -.orquestra.-> CAT6

    style CAT1 fill:#e3f2fd,stroke:#1976d2
    style CAT2 fill:#f3e5f5,stroke:#7b1fa2
    style CAT3 fill:#e8f5e9,stroke:#388e3c
    style CAT4 fill:#fff3e0,stroke:#f57c00
    style CAT5 fill:#fce4ec,stroke:#c2185b
    style CAT6 fill:#eceff1,stroke:#455a64
```

> 🔒⚡🛡️🧠 marcam os 9 agents adicionados na rodada de fechamento de gaps (2026-09-01), após pesquisa de mercado dedicada e validação contra o catálogo de perfis consolidados — ver changelog em `.github/agents/catalog.yaml`.

### Por que isso importa

- **Consolidação com práticas de mercado**: cada categoria acima tem correspondência direta com o que Anthropic, Microsoft e OpenAI documentam publicamente como arquitetura de referência para agentic software engineering em 2026.
- **Sem overengineering (R-011)**: perfis que o mercado às vezes trata como agent dedicado (ex.: "Reflection", "Fan-out") foram avaliados e implementados como **capacidade de agent existente** quando um único consumidor não justificava novo agent — evitando fragmentação excessiva do catálogo.
- **Rastreabilidade de gap-to-agent**: todo agent tem procedência documentada — perfil de mercado → gap identificado → skill pesquisada → agent criado → registrado em `catalog.yaml`/`routing-graph.yaml`/`casos-roteamento.yaml` (R-015/R-040).

---

## Regras de Ouro

| Regra | Aplica-se em | Razão |
|-------|------------|-------|
| **R-037: Agent Router First** | Toda solicitação | Triagem + governança |
| **R-042: Re-triagem por Turno (Anti Sticky-Session)** | Toda solicitação subsequente ao 1º turno | Evita agent downstream continuar sozinho após deriva de intenção |
| **R-040: Grafo de Roteamento** | Toda nova rota de agent | Dado estruturado > prosa; rastreabilidade + evals |
| **R-036: Model Enforcement** | Agents/Skills/Prompts | QoS e segurança |
| **R-034: Health Check Binding** | Novo repositório | Descoberta de adapters |
| **R-038: Genericidade Obrigatória** | Tudo em `.github/` | Reutilização |
| **R-031: Plano Auto-Implementável** | Implementação | Zero-interrupção após aprovação |
| **R-033: Sem Docs Automáticas** | Governança | Aprovação explícita antes de criar `.md` |

---

## Referências Rápidas

- **Governança Global:** [`CLAUDE.md`](CLAUDE.md)
- **Operacional:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- **Catalog de Adapters + Artefatos:** [`docs/ai-context/catalog.yaml`](docs/ai-context/catalog.yaml)
- **Grafo de Roteamento (R-040):** [`docs/ai-context/routing-graph.yaml`](docs/ai-context/routing-graph.yaml)
- **Suíte de Evals:** [`docs/ai-context/evals/casos-roteamento.yaml`](docs/ai-context/evals/casos-roteamento.yaml)
- **Cobertura de Mercado — Perfis de Agents:** [`docs/ai-context/agent-profiles-taxonomy.md`](docs/ai-context/agent-profiles-taxonomy.md)
- **Plano de Melhorias Implementado:** [`docs/plan/plano-implementacao-orquestracao.md`](docs/plan/plano-implementacao-orquestracao.md)
- **Agents Disponíveis:** `.github/agents/README.md`
- **Skills Disponíveis:** `.github/skills/README.md`
- **Adapters Registrados:** `.github/instructions/README.md`

---

## Status Atual (2026-09-01)

### Governança Global
- ✅ Regras normativas consolidadas (`CLAUDE.md` — R-001..R-043)
- ✅ Roteamento operacional (`copilot-instructions.md`)
- ✅ Genericidade explícita em todas as regras globais (R-038)
- ✅ Re-triagem obrigatória por turno (R-042 — anti sticky-session), fechando o gap de agent downstream que perdia a inteligência de roteamento após o 1º turno

### Adapters de Stack
- ✅ `spring-boot-backend.instructions.md` — Java/Spring Boot
- ✅ `angular-v21-frontend.instructions.md` — Angular 21
- ✅ `python-backend.instructions.md` — Python
- ✅ `database.instructions.md` — Banco de dados / Migrações
- ✅ `devops.instructions.md` — Docker, Kubernetes, CI/CD

### Agents (35 catalogados — ver [§ Cobertura de Mercado](#cobertura-de-mercado--perfis-de-agents) para o mapa completo)
- ✅ `agent-router` v1.5.0 — PASSO 0.3 de re-triagem por deriva de intenção (R-042), output com campo `Agente Ativo`, roteamento direto para todos os 34 agents downstream
- ✅ `prompt-structuring` — passo mandatório pós-Health Check (R-041), loop de auto-refinamento (máx. 5 iterações)
- ✅ 33 agents downstream especializados, agrupados por função:
  - **Planejamento/Análise:** `requirements-analyst`, `deep-search`, `feature-planner`
  - **Arquitetura/Design:** `analysis-architect`, `code-knowledge-graph`, `business-rules-extractor`, `refactor-planner`, `refactor-executor`
  - **Implementação (Specialists híbridos):** `angular`, `spring-boot`, `spring-reactive`, `code-summarizer`
  - **Qualidade/Validação:** `bug-triage`, `debugger`, `test-strategy`, `test-implementation`, `test-fix`, `code-review`, `code-style-enforcer`, `security-reviewer`, `performance-agent`, `devops-engineer`
  - **Documentação:** `docs-curator` (curadoria de doc existente), `docs-writer` (escrita de doc nova em `.md`), `context-builder`
  - **Governança de Agents/Skills/Prompts/Memória:** `agent-factory`, `skill-factory`, `prompt-factory`, `agent-auditor`, `binding-initializer`, `adapter-generator`, `agentic-memory-manager`, `compliance-guardrails`

### Skills (52 indexadas)
- ✅ Tier 1 (Core): `context-mode`, `agent-contracts`, `handoff-governance`, `confidence-fallback-policy`, `agent-safety-guardrails`, `terminal-governance`, `code-tracing`, `business-rules-governance`, `java-jdk-backend-governance`
- ✅ Tier 2 (Support): 42 skills cobrindo testing (backend/frontend/Spring Boot/Angular/Python), observability, quality, tooling, research, frontend patterns, backend patterns, **documentation** (`documentation-writing-patterns`), **requisitos** (`requirements-engineering-patterns`), **segurança** (`security-review-patterns`), **performance** (`performance-engineering-patterns`), **compliance** (`compliance-governance-patterns`), **decomposição de tarefas** (`task-decomposition-patterns`) e **DevOps** (`devops-agent-patterns`)
- ✅ Tier 3 (Experimental): `agent-memory-policy` — memória episódica/semântica/procedimental (reaproveitada por `agentic-memory-manager`)

### Fechamento de Gaps de Perfil de Mercado (novo — 2026-09-01)
- ✅ Análise de perfis de agent consolidada via pesquisa web (Anthropic, OpenAI, Microsoft, Google, GitHub, SpecWeave, ArXiv) — documentada em `docs/ai-context/agent-profiles-taxonomy.md`
- ✅ `@agent-router` revisou o levantamento inicial e corrigiu 2 imprecisões antes de agir (falso-positivo de gap já coberto; nuance de "0% cobertura" vs. "sem especialista dedicado")
- ✅ 9 novos agents criados após pesquisa web dedicada por gap: `security-reviewer`, `performance-agent`, `compliance-guardrails` (críticos — bloqueadores de produção enterprise), `feature-planner`, `agentic-memory-manager` (importantes), `devops-engineer`, `debugger`, `code-style-enforcer`, `refactor-executor` (complementares)
- ✅ 5 novas skills pesquisadas e documentadas: `security-review-patterns` (OWASP Top 10:2025/ASVS 5.0), `performance-engineering-patterns` (Core Web Vitals/N+1), `compliance-governance-patterns` (SOC 2/GDPR/LGPD/HIPAA), `task-decomposition-patterns`, `devops-agent-patterns`
- ✅ 2 skills existentes reaproveitadas sem duplicação (R-003): `agent-memory-policy` → `agentic-memory-manager`; `code-tracing` → `debugger`
- ✅ Governança atualizada atomicamente (R-015/R-040): `catalog.yaml`, `README.md` (agents e skills), `.index.json`, `routing-graph.yaml` (+9 nós/arestas), `evals/casos-roteamento.yaml` (+9 casos)
- ✅ Cobertura de perfis de mercado: 77% → **~95%**

### Artefatos Estruturais de Orquestração (2026-08-28/29/30/09-01)
- ✅ `docs/ai-context/routing-graph.yaml` — grafo de roteamento declarado (R-040): 35 nós, arestas condicionais e política de cascata rule-based→semantic→LLM; aresta reversa universal `*downstream → agent-router` (R-042)
- ✅ `docs/ai-context/evals/casos-roteamento.yaml` — suíte de 56 casos de teste (27 canônicos, 5 ambíguos, 15 regressão, 4 segurança + variantes)
- ✅ `docs/ai-context/catalog.yaml` v1.2 — seção `governance_artefacts` com os artefatos estruturais
- ✅ `docs/ai-context/agent-profiles-taxonomy.md` — análise consolidada de mercado + gaps + recomendações (com adendo de revisão e status de resolução)

### Anti Sticky-Session (2026-08-30)
- ✅ **R-042** — todo agent downstream/specialist declara seção "Retorno ao Router" com gatilho objetivo de deriva de intenção (mudança de verbo de ação, stack fora de competência, pedido de execução em agent read-only)
- ✅ Fecha 2 gaps reportados: (1) agent downstream perdia inteligência de roteamento após o 1º turno; (2) especialistas `angular`/`spring-boot`/`spring-reactive` eram órfãos no grafo — só alcançáveis por `@menção` manual, nunca roteados automaticamente pelo `agent-router`
- ✅ Pesquisa de mercado: OpenAI Agents SDK (`handoff()`/`transfer_back_to_*`), LangGraph `langgraph-supervisor` (`add_handoff_back_messages`), state machine de 2 modos com detecção conservadora de deriva de tópico

### Especialistas Híbridos — Advisory + Implementação (2026-08-30)
- ✅ `angular`/`spring-boot`/`spring-reactive` v2.0.0 — deixam de ser "advisory puro" e passam a implementar feature/bugfix dentro do próprio domínio de stack, com testing-first obrigatório e diff mínimo
- ✅ 3 skills novas de implementação consolidadas via pesquisa de mercado 2026 (Tavily): `angular-implementation-patterns`, `spring-boot-implementation-patterns`, `spring-reactive-implementation-patterns` — complementares às 3 skills de análise já existentes
- ✅ R-042 ajustado: implementar **dentro** do domínio do specialist não é mais deriva de intenção; deriva só ocorre em pivô cross-stack (ex.: `@angular` recebe pedido Spring Boot)

### Skills de Orquestração Evoluídas (2026-08-28)
- ✅ `handoff-governance` — schema formal tipado v1.0 + guardrails gap + fan-out/fan-in + agent identity
- ✅ `agent-contracts` — limites de delegação (`max_delegation_depth`, `max_execution_time`) + context engineering (XML canônico, prompt caching, context budget)
- ✅ `context-mode` — 6 dimensões de memória short-term vs long-term formalizadas
- ✅ `confidence-fallback-policy` — routing em cascata (rule→semantic→LLM) + ambiguity zone + logging estruturado
- ✅ `agent-evals-lab` — seção 9 com link para arquivo real de casos (suíte deixou de ser aspiracional)

### Perfil Documentador (2026-08-29)
- ✅ `docs-writer` (agent) — perfil documentador agnóstico de domínio; gera/atualiza documentação técnica em Markdown (Diátaxis, ADR/MADR, README, runbook, postmortem); produz **exclusivamente** arquivos `.md`; nunca alucina comportamento não verificado no código-fonte
- ✅ `documentation-writing-patterns` (skill, Tier 2) — base de conhecimento consolidada via pesquisa de mercado (Diátaxis, Google/Microsoft Style Guide, MADR, standard-readme, `llms.txt`, práticas anti-alucinação Anthropic/Copilot/Cursor)
- ✅ Diferença de escopo: `docs-writer` **escreve documentação nova**; `docs-curator` **cura/padroniza documentação de governança já existente** — roteamento distinguido em `routing-graph.yaml` e validado em `casos-roteamento.yaml` (`regr-008`, `regr-009`)

### Perfil de Requisitos (2026-08-29)
- ✅ `requirements-analyst` (agent) — perfil de elicitação prospectiva; transforma pedido ambíguo em requisitos funcionais/não-funcionais estruturados e testáveis, com rastreabilidade à fonte do stakeholder
- ✅ `requirements-engineering-patterns` (skill, Tier 2) — base de conhecimento consolidada via pesquisa de mercado (ISO/IEC/IEEE 29148, EARS, INVEST, Gherkin/BDD, FURPS+, anti-solution-jumping com Five Whys)
- ✅ Diferença de escopo: `requirements-analyst` **pedido de negócio → requisito novo**; `business-rules-extractor` **código existente → regra documentada** — distinção roteada e validada nos casos `regr-012` e `regr-013`

---

## Contribuindo

1. **Alteração em regra global?** → Edite `CLAUDE.md`, sincronize copilot-instructions.md
2. **Novo adapter?** → Crie em `.github/instructions/`, registre em `catalog.yaml`
3. **Nova documentação?** → Use `kebab-case`, valide genericidade (R-038)
4. **Sem docs autônomas** → Solicite aprovação antes de criar `.md` (R-033)

---

**Governança reutilizável. Multi-projeto. Zero-dependência.**

