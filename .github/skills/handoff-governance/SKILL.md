---
name: handoff-governance
description: >
  Regras de delegação e handoff entre agents — payload mínimo, critérios de
  escalonamento, fluxos de delegação e rastreabilidade de contexto entre agents.
tier: 1
category: governance
triggers:
  - "handoff"
  - "delegação entre agents"
  - "delegar agent"
  - "escalar análise"
  - "roteamento downstream"
  - "transferir tarefa"
  - "agent delegation"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/agents/catalog.yaml
tools:
  - context-mode
---

# Handoff Governance

## 1) Quando Fazer Handoff

```
Agent DEVE delegar quando:
  ✅ Tarefa está fora do seu não-escopo declarado
  ✅ Requer especialização que outro agent tem
  ✅ Resultado do agent atual é pré-requisito para o próximo
  ✅ Complexidade excede capacidade de análise do agent atual

Agent NÃO DEVE delegar quando:
  ❌ A delegação é para evitar trabalho (lazy handoff)
  ❌ Agent downstream não tem o contexto necessário
  ❌ Seria mais eficiente o agent atual completar com esforço incremental
  ❌ Criaria loop (A → B → A)
```

---

## 2) Payload Mínimo de Handoff

```yaml
# Todo handoff deve incluir:

handoff_payload:
  para: "@nome-do-agent"             # agent receptor
  motivo: "<1 linha clara>"          # por que está delegando
  contexto:
    solicitacao_original: "<texto>"   # o que o usuário pediu
    trabalho_realizado: "<resumo>"    # o que foi feito até aqui
    descobertas_chave:               # achados relevantes
      - "<item 1>"
      - "<item 2>"
    artefatos:                        # arquivos/paths relevantes
      - "<path>"
    restricoes:                       # limitações identificadas
      - "<restrição>"
  proximos_passos_sugeridos:
    - "<passo 1>"
  nao_retornar_para: true            # evitar loop
```

**Exemplo real:**

```yaml
handoff_payload:
  para: "@test-implementation"
  motivo: "Estratégia mapeada — pronto para implementar suítes"
  contexto:
    solicitacao_original: "Testes para OrderService"
    trabalho_realizado: "Mapeamento de risco por método completado"
    descobertas_chave:
      - "OrderService tem 12 métodos públicos"
      - "processarPagamento() é risco crítico (dados financeiros)"
      - "Stack: Spring Boot + JUnit 5 + Mockito"
    artefatos:
      - "src/main/java/com/projeto/service/OrderService.java"
    restricoes:
      - "Não existe test slice configurado para repositório legado"
  proximos_passos_sugeridos:
    - "Implementar testes unitários com JUnit 5 + Mockito"
    - "Priorizar cobertura de processarPagamento() (90%+)"
```

---

## 3) Fluxos de Delegação Comuns

```
@agent-router (triagem)
       │
       ├──→ @bug-triage (bug reportado)
       │         └──→ @impact-architect (bug tem impacto sistêmico)
       │
       ├──→ @test-strategy (planejar testes)
       │         └──→ @test-implementation (executar suítes)
       │
       ├──→ @refactor-planner (planejar refatoração)
       │         └──→ @impact-architect (análise de impacto necessária antes)
       │
       ├──→ @research-router (pesquisa técnica)
       │         └──→ @analysis-architect (análise cross-projeto)
       │
       └──→ @docs-curator (documentar resultado)
```

---

## 4) Rastreabilidade de Contexto

```
Regra: contexto não se perde entre agents.

Agent emissor registra:
  - O que foi feito
  - Qual agent receptor
  - Motivo da delegação
  - Artefatos passados

Agent receptor confirma:
  - Recebeu o contexto
  - Entendeu os próximos passos
  - Tem os pré-requisitos necessários
```

---

## 5) Critérios de Escalonamento

| Situação | Escalonamento |
|---|---|
| Bug com impacto sistêmico desconhecido | `@bug-triage` → `@impact-architect` |
| Refatoração sem análise de dependências | `@refactor-planner` → `@impact-architect` |
| Implementação sem estratégia definida | `@test-implementation` → `@test-strategy` primeiro |
| Dúvida técnica que precisa de pesquisa | Qualquer agent → `@research-router` |
| Documentação a atualizar após mudança | Qualquer agent → `@docs-curator` |

---

## 6) Anti-padrões

- ❌ Handoff sem payload de contexto (downstream começa do zero)
- ❌ Delegar para evitar trabalho ("lazy handoff")
- ❌ Loop de delegação (A → B → A) — detectar e interromper
- ❌ Handoff sem motivo explícito (não rastreável)
- ❌ Múltiplos handoffs em sequência quando um agent pode fazer o trabalho todo
- ❌ Não registrar que houve handoff no output (invisível para o usuário)
