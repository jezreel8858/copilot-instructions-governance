---
name: governance-audit-patterns
description: >
  Catálogo consolidado de "agent/governance smells" — anti-padrões estruturais,
  gaps de perfil, gaps de diretriz, diretrizes redundantes e gaps de cobertura
  de categoria — detectáveis em artefatos .agent.md/SKILL.md/.prompt.md, com
  sintoma, forma de detecção, severidade e remediação. Base de conhecimento do
  agent agent-auditor.
tier: 1
category: governance
triggers:
  - "auditoria de governança"
  - "agent smell"
  - "anti-padrão de agent"
  - "gap de perfil"
  - "diretriz redundante"
  - "cobertura de categoria"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/skills/agent-contracts/SKILL.md
  - .github/skills/code-review-patterns/SKILL.md
  - .github/skills/agent-safety-guardrails/SKILL.md
  - docs/plan/categorizacao-agents-mercado.md
tools: []
---

# Governance Audit Patterns

## 0) Propósito

Consolida, a partir de pesquisa de mercado (2026), um catálogo objetivo de "cheiros" (smells) de governança detectáveis em artefatos `.agent.md`, `SKILL.md` e `.prompt.md` — evita que uma auditoria de catálogo (ex.: agent `agent-auditor`) invente critérios ad-hoc. Cada smell é definido por: **nome · sintoma observável · como detectar · severidade · remediação (agent a acionar)**.

## 1) Fundamentação de Mercado (Resumo)

| Fonte | O que aporta |
|---|---|
| `SpecDetect4LLM` (arXiv:2512.18020, 2026) | Padrão de catalogar "cheiros" de forma estática: nome, sintoma, efeito na qualidade, remediação — adaptado aqui de código-fonte para artefatos de governança |
| Prompt Pattern Catalog (EmergentMind) | Baseline de "como um prompt/agent bem estruturado se parece", usado como vara de medir para comparação |
| TrustAgent taxonomy (KDD 2025) | Classifica origem do gap: **intrínseco** (brain/memory/tool do próprio agent) vs. **extrínseco** (user/other agents/environment) |
| OWASP Top 10 for Agentic Applications (2026) | Cross-check de segurança — referenciado via `agent-safety-guardrails` (não duplicado aqui) |
| `code-review-patterns` (já existente) | Taxonomia de severidade (Bloqueador/Alto/Sugestão) — reaproveitada nesta skill, não recriada |
| `agent-contracts/SKILL.md` §8-9 | Baseline de "formato de saída por perfil" e "tooling mínimo por perfil" — critério objetivo de gap de perfil |

## 2) Catálogo de Smells

### 2.1 — Anti-padrão Estrutural (Duplicação sem Skill Equivalente)

| Campo | Conteúdo |
|---|---|
| Sintoma | Bloco de conteúdo quase idêntico (>70% de sobreposição textual/estrutural) repetido em 3+ arquivos `.agent.md`/`SKILL.md` |
| Como detectar | `grep_search` por trechos característicos (títulos de seção, frases-chave) em `.github/agents/*.agent.md`; comparar contagem de ocorrências × ausência de skill equivalente em `.index.json` |
| Origem (TrustAgent) | Intrínseco — falta de reuso de "memory"/conhecimento compartilhado entre agents |
| Severidade | Alta (custo de manutenção cresce linearmente com nº de agents afetados) |
| Remediação | Extrair para nova skill via `@skill-factory`; atualizar os agents consumidores para referenciar a skill (não duplicar) |

### 2.2 — Gap de Perfil (Agent Incompleto)

| Campo | Conteúdo |
|---|---|
| Sintoma | Agent sem `run_subagent` no frontmatter `tools:` (R-042); sem seção "Retorno ao Router"; sem banner "Agente Ativo" no Formato de Saída; sem "Docs Sempre Anexadas"; sem `version` quando outros agents do mesmo tier já declaram |
| Como detectar | Checklist de `agent-contracts/SKILL.md` §9 aplicado **retroativamente** a todo `.agent.md` existente (hoje só validado por `agent-factory` em criação nova) |
| Origem (TrustAgent) | Intrínseco — componente "tool"/"brain" do agent incompleto |
| Severidade | Bloqueador (se falta `run_subagent` — R-042 estruturalmente inviável) / Alta (demais gaps) |
| Remediação | `@agent-factory` revisa e completa o agent afetado |

### 2.3 — Gap de Diretriz (Regra Não Referenciada ou Sem Enforcement)

| Campo | Conteúdo |
|---|---|
| Sintoma | Regra normativa `R-001..R-042` declarada em `CLAUDE.md` mas nunca referenciada por nenhum agent/skill; ou referenciada em prosa mas sem nenhum checklist/mecanismo que a torne verificável |
| Como detectar | `grep_search` de cada `R-0XX` em `.github/agents/` + `.github/skills/`; contagem zero ou "referência solta sem checklist correspondente" |
| Origem (TrustAgent) | Extrínseco — desalinhamento entre política declarada (environment/governance) e comportamento do agent |
| Severidade | Alta (regra sem enforcement é regra decorativa) |
| Remediação | `@docs-curator` avalia se a regra deve ganhar checklist explícito em skill/agent relevante, ou ser removida de `CLAUDE.md` por obsolescência |

### 2.4 — Diretriz Redundante (Duplicação entre Camadas de Governança)

| Campo | Conteúdo |
|---|---|
| Sintoma | Mesma regra/conteúdo normativo duplicado em `CLAUDE.md` **e** `copilot-instructions.md` **e/ou** uma skill — viola R-003 (sem duplicação entre camadas) |
| Como detectar | Comparação textual entre os 3 arquivos-fonte de governança global + skills candidatas; sobreposição >50% de uma seção inteira é sinal forte |
| Origem (TrustAgent) | Extrínseco — múltiplas fontes de verdade para a mesma política |
| Severidade | Média (risco de drift quando só 1 das cópias é atualizada) |
| Remediação | `@docs-curator` consolida em 1 única fonte de verdade e substitui as demais por referência |

### 2.5 — Gap de Cobertura de Categoria (Taxonomia)

| Campo | Conteúdo |
|---|---|
| Sintoma | Grupo taxonômico de `categorizacao-agents-mercado.md` §2 sem nenhum agent correspondente no catálogo real; **ou** 2+ agents ocupando o mesmo papel taxonômico sem distinção clara de escopo (sobreposição funcional) |
| Como detectar | Cruzar `docs/plan/categorizacao-agents-mercado.md` §2 (grupos mapeados) contra `.github/agents/catalog.yaml` (agents reais); mesmo método já aplicado nas Partes A/B deste projeto (`impact-architect` vs `analysis-architect`, `research-router` vs `deep-search`) |
| Origem (TrustAgent) | Extrínseco — desenho do sistema multi-agent (arquitetura de orquestração) |
| Severidade | Alta se sobreposição ativa (2 agents competindo pelo mesmo papel); Sugestão se é apenas um gap de categoria intencionalmente não coberta (ver `categorizacao-agents-mercado.md` §5) |
| Remediação | Propor fusão/substituição (via `@agent-factory` + atualização de `agent-router`) ou registrar como gap intencional em `categorizacao-agents-mercado.md` §5 |

### 2.6 — Vazamento de Evidência Real (R-044)

| Campo | Conteúdo |
|---|---|
| Sintoma | Arquivo commitado sob `.github/**` (exceto `local/`), `CLAUDE.md` ou `docs/ai-context/catalog.yaml` contém nome de repositório/classe/método/pacote/namespace/caminho de arquivo REAL derivado de análise de projeto do usuário (changelog, seção de validação, exemplo "evidência real") — típico de agents analíticos (`code-knowledge-graph`, `business-rules-extractor`, `context-builder`, `project-scanner`) que documentam achados reais como prova de funcionamento |
| Como detectar | `grep_search` por padrões de caminho absoluto (`[A-Za-z]:\\`, `/home/`, `/Users/`) e por nomes próprios de empresa/produto conhecidos nos arquivos de governança recém-alterados; comparar com o checklist de `CLAUDE.md` § R-044 |
| Origem (TrustAgent) | Intrínseco — agent confunde "evidência útil na resposta ao chat" (efêmera) com "evidência persistível em arquivo compartilhado" |
| Severidade | Bloqueador (mesma severidade de R-038 — vazamento de dado de projeto real para repositório compartilhado) |
| Remediação | Genericizar in-place (repositório → `[PROJETO-X]`, classe/método → `ServicoExemploX`/`operacaoExemploX`, pacote → `com.exemplo.*`, caminho → `<workspace>\[PROJETO-X]`) — métricas numéricas agregadas podem permanecer reais; se o agent de origem não tem guardrail explícito de R-044, acionar `@agent-factory` para adicioná-lo |


## 3) Severidade — Reaproveitamento da Taxonomia Existente

Esta skill **reaproveita** (não recria) a taxonomia de `code-review-patterns`:

| Severidade | Critério |
|---|---|
| **Bloqueador** | Gap que impede o funcionamento correto do agent/skill (ex.: falta `run_subagent`) |
| **Alto** | Gap que gera duplicação de manutenção, risco de drift ou sobreposição funcional ativa |
| **Sugestão** | Melhoria não urgente (ex.: gap de categoria intencional já documentado) |

## 4) Cross-check de Segurança (Referência, Não Duplicação)

Para riscos de segurança (excessive agency, tool sprawl, goal hijacking), referenciar diretamente `agent-safety-guardrails/SKILL.md` — esta skill **não duplica** aquele conteúdo, apenas sinaliza quando um smell estrutural (ex.: agent com tools muito além do necessário para seu escopo declarado) deve ser cruzado com o checklist de segurança daquela skill.

## 5) Formato de Saída Recomendado (para o agent consumidor)

```markdown
## Relatório de Auditoria de Governança

| Smell | Local(is) afetado(s) | Severidade | Remediação sugerida | Agent a acionar |
|---|---|---|---|---|
| <2.1..2.6> | <arquivo(s)> | Bloqueador/Alto/Sugestão | <ação objetiva> | <@agent-factory/@skill-factory/@docs-curator> |

## Resumo por Severidade
- Bloqueador: N
- Alto: N
- Sugestão: N

## Próximo Passo Mínimo
<aguardar aprovação item a item antes de qualquer remediação — R-033/R-031>
```

## 6) Checklist de Conformidade da Auditoria

- [ ] Todo achado classificado em uma das 6 categorias de smell (§2) — não inventar 7ª categoria sem justificar aqui primeiro.
- [ ] Severidade reaproveitada de `code-review-patterns` (Bloqueador/Alto/Sugestão).
- [ ] Origem classificada como intrínseca ou extrínseca (TrustAgent) quando relevante.
- [ ] Remediação aponta agent executor real do catálogo (nunca "corrigir diretamente" — agent de auditoria é read-only).
- [ ] Achados de segurança cruzados com `agent-safety-guardrails`, não recriados.

## 7) Anti-padrões

- ❌ Agent de auditoria aplicar a correção diretamente (deve ser read-only — só análise e recomendação).
- ❌ Inventar categoria de smell fora das 6 listadas sem atualizar esta skill primeiro.
- ❌ Duplicar taxonomia de severidade ou checklist de segurança já existentes em outras skills.
- ❌ Reportar achado sem apontar agent executor de remediação (relatório inacionável).

## 8) Consumidor Mapeado

- `agent-auditor` (único consumidor inicial — Critic/Analyst de meta-nível sobre o próprio catálogo de governança).

## 9) Referências

- arXiv:2512.18020, "Specification and Detection of LLM Code Smells" (2026).
- EmergentMind, "Prompt Pattern Catalog".
- KDD 2025, "A Survey on Trustworthy LLM Agents" (TrustAgent taxonomy).
- OWASP GenAI Security Project, "Top 10 for Agentic Applications" (2026).
- Lumenova AI, "Governance Frameworks for Multi-Agent Systems" (2026).
- `docs/plan/plano-otimizacao-catalogo-agents.md` §D — origem desta skill.

