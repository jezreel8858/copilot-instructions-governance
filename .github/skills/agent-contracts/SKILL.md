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
| Router/Triagem | Bloco de decisão compacto: Rota·Delegado·Motivo·Confiança·Score·Nível Routing·Entradas·Lacunas·Próximo Passo | `agent-router`, `research-router`, `prompt-structuring` | Orchestrator decide, não narra (Product School: planner→executor) |
| Analista/Read-only | 5 seções: Abordagem·Componentes·Evidências·Riscos·Próximo Passo | `analysis-architect`, `impact-architect`, `bug-triage`, `business-rules-extractor` | "Data/Insight Agent" exige leitura humana rica — tabelas/bullets |
| Especialista de Recomendação | 5 seções + Trade-offs/Riscos explícitos, sem implementar | `angular`, `spring-boot`, `spring-reactive` | Mesma classe de Insight Agent, com recomendação técnica declarada |
| Operacional/Executor | Resultado·Evidências·Validações·Próximo Passo (compacto, checklist) | `test-implementation`, `agent-factory`, `skill-factory`, `binding-initializer`, `adapter-generator`, `docs-curator` | "Specialist Skills" tem output estreito e determinístico |

**Regra de ouro:** a Camada 1 nunca muda entre perfis. A Camada 2 pode e deve variar — forçar um router no template rico de 5 seções (ou um analista no bloco compacto de decisão) é *format mismatch* contra a pesquisa acima.

### Checklist ao Criar/Revisar Agent (agent-factory / skill-factory)

- [ ] Perfil identificado: Router | Analista | Especialista-Recomendação | Operacional.
- [ ] Camada 1 (universal) presente no "Formato de Saída" do agent.
- [ ] Camada 2 escolhida conforme a tabela acima — não inventar 5º template sem justificativa registrada aqui.
- [ ] Se o perfil não se encaixa nos 4 acima, documentar o novo perfil nesta tabela antes de usá-lo em produção.

### Referências

- Microsoft Learn, "Producing Structured Outputs with agents" (Agent Framework), 2026 — https://learn.microsoft.com/en-us/agent-framework/agents/structured-outputs
- Medium, "Configuration-Driven Agents: The Fastest Way to Build Enterprise AI Systems" (Output Reformatter pattern), 2026 — https://medium.com/@balajibal/configuration-driven-agents-the-fastest-way-to-build-enterprise-ai-systems-01356f805fb1
- JetBrains, "AI Agent Orchestration Explained" (handoff contracts), 2026 — https://www.jetbrains.com/pages/ai-agents/architecture/ai-agent-orchestration
- Agent.ai Docs, "How to Format Output for Better Readability", 2026 — https://docs.agent.ai/output-formatting
- Product School, "AI Agent Orchestration Patterns for Reliable Products", 2026 — https://productschool.com/blog/artificial-intelligence/ai-agent-orchestration-patterns
- arXiv:2506.12508, "Orchestrating Multi-Agent Intelligence..." (Reporter Agent normaliza outputs distintos em relatório final), 2025/2026.

