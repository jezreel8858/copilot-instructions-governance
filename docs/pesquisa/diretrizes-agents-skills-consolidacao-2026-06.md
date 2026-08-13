# Pesquisa — Diretrizes para Agents e Skills (Consolidação)

**Data**: 2026-06-10  
**Escopo**: analisar os agents atuais, pesquisar diretrizes adicionais e consolidar uma estrutura de skills para a arquitetura agent-first.

---

## 1) Inventário analisado

### Agents atuais (`.github/agents`)
- `agent-router`
- `bug-triage`
- `test-strategy`
- `refactor-planner`
- `impact-architect`
- `docs-curator`
- `research-router`
- `analysis-architect`
- `agent-factory`
- `context-builder`

### Skills atuais (`.github/skills`)
- `context-mode`
- `context-builder`
- `context-compact`
- `sonarqube-governance`
- `tavily`
- `mermaid-diagrams`

---

## 2) Diretrizes consolidadas da pesquisa

### Must-have
- Contrato operacional explícito por agent (entrada, saída, não-escopo, evidências).
- Handoff governado por critério objetivo e payload mínimo.
- Política de confiança e fallback (`alta|média|baixa`).
- Guardrails de segurança com menor privilégio de tools.
- Observabilidade mínima (rota, latência, fallback, erro).
- Evals contínuos para evitar regressão de roteamento.

### Should-have
- Versionamento da taxonomia de intenções.
- Rubricas de qualidade por tipo de agent.
- Runbook de incidentes (loop, reroute excessivo, baixa confiança).

### Optional
- A/B de prompts de roteamento.
- Ajuste dinâmico de limiar de confiança por histórico.
- Painel executivo de métricas de governança.

---

## 3) Mapa recomendado `agent -> skills`

| Agent | Skills recomendadas |
|---|---|
| `agent-router` | `agent-contracts`, `handoff-governance`, `confidence-fallback-policy`, `agent-observability-otel` |
| `bug-triage` | `agent-contracts`, `confidence-fallback-policy`, `agent-evals-lab` |
| `test-strategy` | `agent-contracts`, `agent-evals-lab` |
| `refactor-planner` | `agent-contracts`, `confidence-fallback-policy` |
| `impact-architect` | `agent-contracts`, `handoff-governance`, `agent-evals-lab`, `agent-observability-otel` |
| `docs-curator` | `agent-contracts`, `agent-evals-lab`, `agent-safety-guardrails` |
| `research-router` | `agent-contracts`, `handoff-governance`, `confidence-fallback-policy`, `tavily` |
| `analysis-architect` | `agent-contracts`, `handoff-governance`, `agent-evals-lab`, `agent-observability-otel`, `agent-safety-guardrails` |
| `agent-factory` | `agent-contracts`, `handoff-governance`, `agent-evals-lab`, `agent-safety-guardrails` |
| `context-builder` | `agent-contracts`, `confidence-fallback-policy`, `agent-observability-otel` |

---

## 4) Skills novas propostas e criadas

| Skill | Objetivo |
|---|---|
| `agent-contracts` | Padronizar contrato de entrada/saída e não-escopo de agents |
| `handoff-governance` | Padronizar delegação entre agents com payload mínimo |
| `confidence-fallback-policy` | Padronizar score de confiança e fallback |
| `agent-safety-guardrails` | Aplicar regras de segurança e compliance |
| `agent-observability-otel` | Padronizar métricas e rastreabilidade operacional |
| `agent-evals-lab` | Estruturar avaliação contínua e regressão de agents |

---

## 5) Ajustes aplicados para consolidação

- Templates de agents atualizados com diretrizes transversais:
  - `.github/agents/templates/operational-agent.md`
  - `.github/agents/templates/research-agent.md`
- Catálogo de agents reforçado com diretrizes transversais:
  - `.github/agents/README.md`
  - `.github/agents/catalog.yaml`
- Catálogo de skills expandido e sincronizado:
  - `.github/skills/README.md`
  - `.github/skills/.index.json`
- Skills criadas:
  - `.github/skills/agent-contracts/SKILL.md`
  - `.github/skills/handoff-governance/SKILL.md`
  - `.github/skills/confidence-fallback-policy/SKILL.md`
  - `.github/skills/agent-safety-guardrails/SKILL.md`
  - `.github/skills/agent-observability-otel/SKILL.md`
  - `.github/skills/agent-evals-lab/SKILL.md`

---

## 6) Riscos e mitigação

| Risco | Nível | Mitigação |
|---|---|---|
| Drift entre README e índices estruturados | Médio | Atualização atômica de catálogo textual + JSON/YAML |
| Roteamento com baixa confiança sem clarificação | Alto | Aplicar `confidence-fallback-policy` com gate obrigatório |
| Delegações sem contexto suficiente | Médio | Forçar `handoff-governance` com payload mínimo |
| Perda de rastreabilidade operacional | Médio | Aplicar `agent-observability-otel` em fases de rollout |
| Regressão de qualidade após ajustes de prompt | Médio | Rodar suíte de `agent-evals-lab` em mudanças relevantes |

---

## 7) Referências oficiais utilizadas

1. OpenAI — Prompt Engineering: https://developers.openai.com/api/docs/guides/prompt-engineering
2. OpenAI — Prompt Guidance: https://developers.openai.com/api/docs/guides/prompt-guidance
3. OpenAI — Agents Guide: https://developers.openai.com/api/docs/guides/agents
4. OpenAI Agents SDK — Handoffs: https://openai.github.io/openai-agents-python/handoffs
5. OpenAI Agents SDK — Guardrails: https://openai.github.io/openai-agents-python/guardrails
6. OpenAI Agents SDK — Tracing: https://openai.github.io/openai-agents-python/tracing
7. Anthropic — Tool Use Overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
8. Anthropic — Prompting Best Practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
9. GitHub Copilot — Custom instructions in IDE: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions-in-your-ide/add-repository-instructions-in-your-ide
10. GitHub Copilot — Custom instruction support: https://docs.github.com/en/copilot/reference/custom-instructions-support
11. Microsoft Semantic Kernel — Plugins: https://learn.microsoft.com/en-us/semantic-kernel/concepts/plugins
12. Microsoft Semantic Kernel — Agent functions: https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-functions
13. LangChain — Multi-agent: https://docs.langchain.com/oss/python/langchain/multi-agent
14. LangChain — Router pattern: https://docs.langchain.com/oss/python/langchain/multi-agent/router
15. OpenTelemetry — GenAI semantic conventions: https://opentelemetry.io/docs/specs/semconv/gen-ai

---

## 8) Próximo passo mínimo

- Aplicar as novas skills no fluxo de revisão dos agents downstream em ciclos curtos (MVP -> validação -> rollout), medindo acurácia de roteamento e taxa de fallback.

