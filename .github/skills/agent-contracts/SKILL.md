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
tools:
  - context-mode
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

