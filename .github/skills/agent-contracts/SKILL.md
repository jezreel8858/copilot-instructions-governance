---
name: agent-contracts
description: >
  Diretrizes para padronizar contratos operacionais de agents — entrada mínima,
  saída esperada, não-escopo e critérios de evidência. Garante interoperabilidade
  entre agents no ecossistema multi-projeto.
tier: 1
category: governance
triggers:
  - "contrato de agent"
  - "agent contract"
  - "entrada agent"
  - "saída agent"
  - "não-escopo"
  - "padronizar agent"
  - "interface agent"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
tools: []
---

# Agent Contracts

## 0) Banner Universal de Identidade (Visibilidade de Fluxo — R-042)

### Problema de Mercado

Em fluxos multi-agent com handoff (R-042 — Anti Sticky-Session), o usuário perde a visibilidade de **qual agent está respondendo** assim que a conversa deixa de passar pelo `@agent-router` a cada turno — especialmente quando um agent downstream permanece ativo em `task_mode` por vários turnos consecutivos. Pesquisa de mercado 2026 confirma o padrão consolidado para resolver isso:

- **LangGraph** ("Stream the Active Agent"): inclui `active_agent` no state compartilhado e o transmite em toda atualização de stream; frontend exibe indicador tipo *"Currently active: Agent C"* e mostra a transição visualmente a cada handoff.
- **OpenAI Agents SDK**: rastreia `current_agent = result.last_agent` entre turnos; cada item de saída carrega `agent_name`; todo handoff gera um evento explícito e visível — `HandoffOutputItem` imprime literalmente **"Handed off from X to Y"**.

### Regra de Ouro

**Toda resposta de TODO agent — sem exceção, inclusive downstream em `task_mode` — abre com a linha `Agente Ativo: <name-do-agent>` antes de qualquer outro conteúdo.** Isso vale mesmo quando não há handoff neste turno (o agent apenas continua respondendo). Se a resposta é resultado de um handoff/re-triagem recebido neste turno, uma segunda linha declara a transição: `Handoff: <agent-origem> → <agent-atual> (motivo: <motivo>)` — equivalente direto ao `HandoffOutputItem` do OpenAI Agents SDK.

```markdown
Agente Ativo: test-implementation
Handoff: test-strategy → test-implementation (motivo: estratégia mapeada — pronto para implementar)

[... restante da resposta no formato de saída do perfil do agent ...]
```

Quando **não** há handoff neste turno (agent continua em `task_mode`), a linha de handoff é omitida — apenas `Agente Ativo:` é obrigatória:

```markdown
Agente Ativo: spring-boot

[... restante da resposta ...]
```

### Por que isso não é opcional

- Sem o banner, o usuário fica "no escuro" sobre se o fluxo de roteamento está ocorrendo como previsto (R-042 só é auditável se visível a cada resposta, não apenas na primeira delegação do `@agent-router`).
- O `@agent-router` já declara `Agente Ativo` + `Transição` no seu próprio Formato de Saída (ver `agent-router.agent.md`) — mas isso só cobre o turno em que o router responde. Nos turnos seguintes, quando o downstream responde sozinho em `task_mode` (R-042), é o **próprio downstream** quem precisa reafirmar o banner.
- Um agent sem essa linha quebra a paridade com o padrão de mercado (OpenAI Agents SDK, LangGraph) e torna o fluxo indistinguível de um "black box" de agent único.

### Checklist de Conformidade

- [ ] Toda resposta abre com `Agente Ativo: <name>` — sem exceção, mesmo sem handoff.
- [ ] Handoff/re-triagem recebido neste turno → segunda linha `Handoff: <origem> → <destino> (motivo: ...)`.
- [ ] `<name>` corresponde exatamente ao campo `name:` do frontmatter do agent.
- [ ] Seção "Retorno ao Router" de cada agent referencia este banner (ver `agents/templates/operational-agent.md` e `agents/templates/research-agent.md`).

### Anti-padrões

- ❌ Declarar `Agente Ativo` só na primeira resposta da conversa e omitir nas seguintes.
- ❌ Confundir o banner com o campo `Motivo`/`Confiança` do Formato de Saída por perfil (Camada 2) — o banner é sempre a **primeira linha**, antes de qualquer outro conteúdo.
- ❌ Omitir a linha `Handoff:` quando a resposta é claramente resultado de uma re-triagem (R-042).

---

## 1) Estrutura de Contrato Padrão

Todo agent deve declarar seu contrato operacional em 4 seções:

```yaml
# Exemplo de contrato — agent test-implementation

entrada_minima:
  obrigatorio:
    - estrategia: "matriz de cenários do test-strategy"
    - escopo: "lista de arquivos/classes a testar"
    - stack: "backend | frontend | fullstack"
  opcional:
    - framework: "junit5 | jasmine | vitest | pytest"
    - conversa_anterior: "referência a plano ou bug-triage"

saida_esperada:
  formato: markdown
  secoes:
    - resultado: "X testes implementados (Y unitários, Z integração/E2E)"
    - cobertura: "XX% linhas, XX% ramos"
    - status: "SUCESSO | BLOQUEANTE"
    - evidencias: "lista de arquivos criados/editados"
    - bloqueantes: "causa + local + ação sugerida (formato 3 linhas)"

nao_escopo:
  - alterar lógica de negócio (reportar bug, não corrigir)
  - definir estratégia de testes (usar @test-strategy antes)
  - ignorar testes falhando
  - instalar dependências sem confirmação

criterios_de_evidencia:
  - caminhos dos arquivos criados/editados
  - comando de coverage executado e resultado
  - link para relatório de cobertura gerado
```
---

## 2) Checklist Mínimo de Contrato

Antes de finalizar a implementação de um agent, verificar:

### Entrada
- [ ] Campos obrigatórios declarados com tipo e exemplo
- [ ] Campos opcionais com defaults documentados
- [ ] Pré-requisitos explícitos (ex: "requer @test-strategy antes")

### Saída
- [ ] Formato de saída definido (markdown, yaml, json)
- [ ] Seções mínimas da resposta especificadas
- [ ] Formato de erro/bloqueante padronizado (3 linhas: Causa / Local / Ação)

### Não-Escopo
- [ ] O que o agent explicitamente NÃO faz (pelo menos 3 itens)
- [ ] Quando transferir para outro agent (handoff conditions)

### Evidência
- [ ] Pelo menos 1 artefato rastreável (arquivo, comando, relatório)
- [ ] Próximo passo mínimo sempre presente no output

---

## 3) Contrato de Erro / Bloqueante

Toda falha deve seguir o formato compacto de 3 linhas (R-020):

```markdown
Bloqueante:
- Causa: <descrição em ≤ 1 linha>
- Local: <arquivo:linha ou comando>
- Ação sugerida: <o que fazer; aguarda aprovação>
```

**Exemplo:**
```
Bloqueante:
- Causa: Arquivo de teste não encontrado para UserService
- Local: src/main/java/com/projeto/service/UserService.java
- Ação sugerida: Criar src/test/java/com/projeto/service/UserServiceTest.java; aguarda aprovação
```

---

## 4) Contrato de Handoff

Quando um agent delega para outro, o payload mínimo é:

```yaml
handoff:
  para: "@test-strategy"
  motivo: "Escopo de testes não definido antes de implementar"
  contexto_preservado:
    - arquivos_identificados: ["src/service/UserService.java"]
    - stack: "Java Spring Boot"
  nao_transferir:
    - estado parcial de implementação
    - outputs incompletos
```

---

## 5) Anti-padrões

- ❌ Agent sem não-escopo declarado (scope creep implícito)
- ❌ Saída sem evidência rastreável (difícil auditar)
- ❌ Bloqueante reportado sem ação sugerida (paralisa o usuário)
- ❌ Entrada mínima sem exemplos (difícil invocar corretamente)
- ❌ Agent faz handoff sem payload de contexto (downstream começa do zero)

## 6) Limites de Delegação e Execução

Todo agent pode declarar limites opcionais de execução para prevenir loops e recursão não controlada:

```yaml
limites_execucao:
  max_delegation_depth: 2          # int — máx. camadas de delegação antes de parar
  max_execution_time_min: 15       # int — tempo máximo em minutos por execução
  allow_redelegation: false        # bool — agent receptor pode redelegar?
  circuit_breaker:
    trigger: "2 falhas consecutivas de tool"
    acao: "parar e reportar estado ao usuário"
```

**Defaults recomendados** (quando não declarado explicitamente):

| Campo | Default | Justificativa |
|---|---|---|
| `max_delegation_depth` | 3 | router → agent → subagent: profundidade típica |
| `max_execution_time_min` | 30 | margem para análise + implementação simples |
| `allow_redelegation` | false | previne loops por padrão |
| `circuit_breaker` | ativo após 3 falhas | interrompe antes de esgotar token budget |

**Anti-padrões:**
- ❌ Loop de delegação (A → B → A) sem circuit breaker declarado
- ❌ `allow_redelegation: true` sem `max_delegation_depth` (recursão irrestrita)
- ❌ Agent que chama ferramentas externas sem `max_execution_time_min`

---

## 7) Context Engineering por Agent

Todo agent deve seguir política de context assembly para otimizar custo, latência e qualidade:

**Estrutura XML canônica de system prompt** (Anthropic 2025):

```
<instructions>
  Regras operacionais e não-escopo do agent
</instructions>
<context>
  Documentos de referência e estado atual do repositório
</context>
<examples>
  Exemplos few-shot de entrada → saída esperada (se aplicável)
</examples>
<input>
  {solicitação_do_usuário}
</input>
```

**Política de prompt caching** — conteúdo estático deve preceder o variável:

| Ordem | Tipo | Exemplo |
|---|---|---|
| 1º (mais cacheável) | System instructions fixas | Regras do agent, não-escopo |
| 2º | Tools definitions | Lista de tools com schemas |
| 3º | Few-shot examples | Casos canônicos de I/O |
| 4º (menos cacheável) | User message | Solicitação atual |

**Context budget máximo por tier de agent:**

| Tier | Budget máximo | Justificativa |
|---|---|---|
| Roteamento (router, triagem) | 8K tokens | Decisão rápida, contexto mínimo |
| Análise / pesquisa | 32K tokens | Contexto amplo do repositório |
| Implementação | 64K tokens | Arquivos + histórico + decisões |

**Regra mínima**: conteúdo estático deve sempre preceder conteúdo variável — habilita prompt caching nativo dos providers (redução de custo de até 90%, latência de até 85% conforme Anthropic 2025).

---

## 8) Camadas de Formato de Saída (Universal vs por Perfil)

### Modelo de 2 Camadas

**Camada 1 — Contrato Universal (obrigatório em TODO agent, nunca varia):**
Já normatizado por R-016/R-020 e pelas seções 1-4 desta skill: confiança declarada, evidências rastreáveis (arquivo/símbolo/comando) e próximo passo mínimo. Esta camada é o que garante interoperabilidade — evita o risco de "handoff incompatível" documentado pelo JetBrains.

**Camada 2 — Template Narrativo por Perfil (varia conforme o papel do agent):**

| Perfil | Template | Agents exemplo | Racional (pesquisa) |
|---|---|---|---|
| Router/Triagem | Bloco de decisão compacto: Rota·Delegado·Motivo·Confiança·Score·Nível Routing·Entradas·Lacunas·Próximo Passo | `agent-router`, `prompt-structuring` | Orchestrator decide, não narra (Product School: planner→executor) |
| Analista/Read-only | 5 seções: Abordagem·Componentes·Evidências·Riscos·Próximo Passo | `analysis-architect`, `impact-architect`, `bug-triage`, `business-rules-extractor` | "Data/Insight Agent" exige leitura humana rica — tabelas/bullets |
| Especialista de Recomendação | 5 seções + Trade-offs/Riscos explícitos, sem implementar | `angular`, `spring-boot`, `spring-reactive` | Mesma classe de Insight Agent, com recomendação técnica declarada |
| Operacional/Executor | Resultado·Evidências·Validações·Próximo Passo (compacto, checklist) | `test-implementation`, `agent-factory`, `skill-factory`, `binding-initializer`, `adapter-generator`, `docs-curator` | "Specialist Skills" tem output estreito e determinístico |

**Regra de ouro:** a Camada 1 nunca muda entre perfis. A Camada 2 pode e deve variar — forçar um router no template rico de 5 seções (ou um analista no bloco compacto de decisão) é *format mismatch* contra a pesquisa acima.

### Checklist ao Criar/Revisar Agent (agent-factory / skill-factory)

- [ ] Perfil identificado: Router | Analista | Especialista-Recomendação | Operacional.
- [ ] Camada 1 (universal) presente no "Formato de Saída" do agent.
- [ ] Camada 2 escolhida conforme a tabela acima — não inventar 5º template sem justificativa registrada aqui.
- [ ] Se o perfil não se encaixa nos 4 acima, documentar o novo perfil nesta tabela antes de usá-lo em produção.

## 9) Ferramentas Mínimas por Agent (Tooling Baseline — R-042)

### Regra de Ouro

**Todo agent do catálogo — sem exceção — DEVE declarar `run_subagent` no frontmatter `tools:`.** Sem essa tool, o agent não consegue **executar** o handoff de retorno exigido por R-042 (Anti Sticky-Session): descrever o handoff em texto/markdown **não é suficiente** — o retorno a `@agent-router` só é efetivo quando materializado via chamada real da tool `run_subagent(agentName: "agent-router", ...)`. Um agent sem `run_subagent` no frontmatter fica estruturalmente incapaz de cumprir R-042, mesmo declarando a seção "Retorno ao Router" em prosa.

### Tools Mínimas por Perfil (baseline obrigatório)

| Perfil | Tools mínimas obrigatórias | Tools adicionais conforme necessidade |
|---|---|---|
| **Todos os perfis (baseline universal)** | `read_file`, `grep_search`, `file_search`, `run_subagent` | — |
| Router/Triagem | baseline + `list_dir` | `ask_questions` |
| Analista/Read-only (pesquisa) | baseline + `list_dir` | `context-mode/ctx_search`, `context-mode/ctx_batch_execute` |
| Especialista de Recomendação | baseline + `list_dir`, `get_errors` | `context-mode/*`, ferramentas de pesquisa externa |
| Operacional/Executor (cria/edita arquivos) | baseline + `insert_edit_into_file`, `create_file`, `list_dir`, `get_errors` | `ask_questions`, `run_in_terminal`, `context-mode/*` |

### Checklist de Conformidade (aplicar em toda criação/revisão de agent)

- [ ] `run_subagent` presente no frontmatter `tools:` — **bloqueante**, sem exceção.
- [ ] `read_file`, `grep_search`, `file_search` presentes (leitura mínima de contexto).
- [ ] Se o agent cria/edita arquivos: `create_file`/`insert_edit_into_file` + `get_errors` presentes.
- [ ] Seção "Retorno ao Router (R-042)" declarada em prosa **e** consistente com a presença de `run_subagent` no frontmatter.
- [ ] Nenhuma tool supérflua fora do necessário para o perfil (menor privilégio, R-024).

### Anti-padrões

- ❌ Agent com seção "Retorno ao Router" em prosa mas **sem `run_subagent`** no frontmatter — handoff nunca é executável.
- ❌ Copiar `tools:` de outro agent sem revisar se `run_subagent` foi preservado.
- ❌ Templates (`templates/research-agent.md`, `templates/operational-agent.md`) desatualizados sem `run_subagent` — todo novo agent herda o gap.
- ❌ Adicionar `run_subagent` sem declarar a seção "Retorno ao Router" correspondente (tool presente mas sem gatilho de uso documentado).

### Referências

- Microsoft Learn, "Producing Structured Outputs with agents" (Agent Framework), 2026 — https://learn.microsoft.com/en-us/agent-framework/agents/structured-outputs
- Medium, "Configuration-Driven Agents: The Fastest Way to Build Enterprise AI Systems" (Output Reformatter pattern), 2026 — https://medium.com/@balajibal/configuration-driven-agents-the-fastest-way-to-build-enterprise-ai-systems-01356f805fb1
- JetBrains, "AI Agent Orchestration Explained" (handoff contracts), 2026 — https://www.jetbrains.com/pages/ai-agents/architecture/ai-agent-orchestration
- Agent.ai Docs, "How to Format Output for Better Readability", 2026 — https://docs.agent.ai/output-formatting
- Product School, "AI Agent Orchestration Patterns for Reliable Products", 2026 — https://productschool.com/blog/artificial-intelligence/ai-agent-orchestration-patterns
- arXiv:2506.12508, "Orchestrating Multi-Agent Intelligence..." (Reporter Agent normaliza outputs distintos em relatório final), 2025/2026.

