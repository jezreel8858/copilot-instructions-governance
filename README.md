# Eco-Sistema Copilot — Estrutura de Governança de IA Reutilizável

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

- **[`CLAUDE.md`](CLAUDE.md)** — Regras normativas (R-001..R-040), princípios e fluxos genéricos
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
    E --> F["bug-triage"]
    E --> G["test-strategy\ntest-implementation"]
    E --> H["refactor-planner\nimpact-architect"]
    E --> I["docs-curator\nresearch-router"]
    E --> J["analysis-architect\n"]
    F & G & H & I & J --> K["Resultado"]
    K --> L["/commit\nmensagem gerada"]
```

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

## Regras de Ouro

| Regra | Aplica-se em | Razão |
|-------|------------|-------|
| **R-037: Agent Router First** | Toda solicitação | Triagem + governança |
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
- **Plano de Melhorias Implementado:** [`docs/plan/plano-implementacao-orquestracao.md`](docs/plan/plano-implementacao-orquestracao.md)
- **Agents Disponíveis:** `.github/agents/README.md`
- **Skills Disponíveis:** `.github/skills/README.md`
- **Adapters Registrados:** `.github/instructions/README.md`

---

## Status Atual (2026-08-29)

### Governança Global
- ✅ Regras normativas consolidadas (`CLAUDE.md` — R-001..R-040)
- ✅ Roteamento operacional (`copilot-instructions.md`)
- ✅ Genericidade explícita em todas as regras globais (R-038)

### Adapters de Stack
- ✅ `spring-boot-backend.instructions.md` — Java/Spring Boot
- ✅ `angular-v21-frontend.instructions.md` — Angular 21
- ✅ `python-backend.instructions.md` — Python
- ✅ `database.instructions.md` — Banco de dados / Migrações
- ✅ `devops.instructions.md` — Docker, Kubernetes, CI/CD

### Agents (17 catalogados)
- ✅ `agent-router` v1.1.0 — com `version:` no frontmatter, confidence score numérico e nível de routing no output
- ✅ 16 agents downstream especializados (bug-triage, test-*, refactor-planner, impact-architect, docs-curator, research-router, analysis-architect, analysis-integration-architect, agent-factory, skill-factory, business-rules-extractor, context-builder, binding-initializer, adapter-generator)

### Skills (29 indexadas)
- ✅ Tier 1 (Core): context-mode, agent-contracts, handoff-governance, confidence-fallback-policy, agent-safety-guardrails, terminal-governance, code-tracing, business-rules-governance
- ✅ Tier 2 (Support): 20 skills cobrindo testing, observability, quality, tooling, research, documentation
- ✅ Tier 3 (Experimental): `agent-memory-policy` — memória episódica/semântica/procedimental

### Artefatos Estruturais de Orquestração (novo — 2026-08-28/29)
- ✅ `docs/ai-context/routing-graph.yaml` — grafo de roteamento declarado (R-040): nós, arestas, condições e política de cascata rule-based→semantic→LLM
- ✅ `docs/ai-context/evals/casos-roteamento.yaml` — suíte de 23 casos de teste (canônicos, ambíguos, regressão, segurança)
- ✅ `docs/ai-context/catalog.yaml` v1.2 — seção `governance_artefacts` com os novos artefatos

### Skills de Orquestração Evoluídas (2026-08-28)
- ✅ `handoff-governance` — schema formal tipado v1.0 + guardrails gap + fan-out/fan-in + agent identity
- ✅ `agent-contracts` — limites de delegação (`max_delegation_depth`, `max_execution_time`) + context engineering (XML canônico, prompt caching, context budget)
- ✅ `context-mode` — 6 dimensões de memória short-term vs long-term formalizadas
- ✅ `confidence-fallback-policy` — routing em cascata (rule→semantic→LLM) + ambiguity zone + logging estruturado
- ✅ `agent-evals-lab` — seção 9 com link para arquivo real de casos (suíte deixou de ser aspiracional)

---

## Contribuindo

1. **Alteração em regra global?** → Edite `CLAUDE.md`, sincronize copilot-instructions.md
2. **Novo adapter?** → Crie em `.github/instructions/`, registre em `catalog.yaml`
3. **Nova documentação?** → Use `kebab-case`, valide genericidade (R-038)
4. **Sem docs autônomas** → Solicite aprovação antes de criar `.md` (R-033)

---

**Governança reutilizável. Multi-projeto. Zero-dependência.**

