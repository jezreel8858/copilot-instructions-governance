---
name: confidence-fallback-policy
description: >
  Política de confiança e fallback para decisões de roteamento e execução de agents.
  Define escala de score (0-1), thresholds de ação, estratégias de escalonamento e
  exemplos concretos de aplicação por agent.
tier: 1
category: governance
triggers:
  - "confiança"
  - "confianca"
  - "fallback"
  - "incerteza"
  - "baixa confiança"
  - "score de roteamento"
  - "escalonamento"
  - "ambiguidade"
  - "re-roteamento"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/agents/README.md
tools:
  - context-mode
  - tavily
---

# Confidence & Fallback Policy

## 1) Escala de Confiança (0.0 – 1.0)

| Score | Nível | Ação do Agent |
|---|---|---|
| **0.90 – 1.00** | 🟢 Alta | Prosseguir diretamente — intenção clara |
| **0.70 – 0.89** | 🟡 Moderada | Prosseguir com aviso inline do que foi assumido |
| **0.50 – 0.69** | 🟠 Baixa | `ask_questions` com 2-3 opções antes de agir |
| **0.00 – 0.49** | 🔴 Crítica | Parar + `ask_questions` + não agir até confirmação |

**Regra de ouro**: em dúvida, `ask_questions`. Inferir silenciosamente é proibido (R-027).

---

## 2) Como Calcular o Score

```
Score = (sinal_de_intenção × 0.4) + (contexto_suficiente × 0.4) + (ausência_de_ambiguidade × 0.2)

Sinal de intenção:
  0.0 → nenhuma ação identificável ("melhore o código")
  0.5 → ação identificável mas scope vago ("refatore")
  1.0 → ação + escopo + contexto claros ("implemente testes unitários para UserService")

Contexto suficiente:
  0.0 → zero contexto técnico fornecido
  0.5 → stack ou projeto identificado
  1.0 → stack + arquivo + regra de negócio presentes

Ausência de ambiguidade:
  0.0 → múltiplas interpretações conflitantes
  0.5 → uma interpretação dominante, mas incerta
  1.0 → sem ambiguidade interpretável
```

---

## 3) Estratégias de Fallback por Cenário

### 3.1) Input ambíguo — múltiplas intenções

```
Cenário: "Teste e documente o serviço de pagamentos"
Score: 0.55 (duas intenções)

Fallback:
  → ask_questions:
    "Qual é a prioridade?"
    A) Testes primeiro → @test-strategy → @test-implementation
    B) Documentação primeiro → @docs-curator
    C) Ambos em sequência → plano dividido em fases
```

### 3.2) Contexto insuficiente

```
Cenário: "Corrige o bug"
Score: 0.30 (sem reprodução, sem arquivo, sem stack)

Fallback obrigatório:
  → ask_questions:
    P1: Qual é o comportamento atual vs. esperado?
    P2: Em qual arquivo/endpoint ocorre?
    P3: Qual ambiente/stack?
```

### 3.3) Escopo irrecuperável

```
Cenário: Solicitação contradiz R-031 (commit autônomo solicitado explicitamente)
Score: irrelevante

Fallback absoluto:
  → Reportar conflito com normativa
  → Não prosseguir
  → Aguardar revisão do usuário
```

### 3.4) Tool com falha repetida

```
Cenário: ctx_search retorna 0 resultados por 2+ tentativas
Score: 0.60 → rebaixa para 0.40 após N tentativas

Fallback:
  → Tentar ferramenta alternativa (grep_search como fallback de ctx_search)
  → Se ainda falhar → reportar estado e aguardar orientação
```

---

## 4) Re-roteamento

Quando o agent downstream identifica que a tarefa pertence a outro agent:

```yaml
# Contrato de re-roteamento
roteamento_de_volta:
  quando: agent identifica tarefa fora do seu não-escopo
  acao: reportar ao usuário com sugestão de agent correto
  formato: |
    ⚠️ Esta tarefa está fora do escopo de [agent-atual].
    → Sugestão: invocar @[agent-correto]
    Motivo: [1 linha explicando por quê]
  proibido: executar tarefa fora do escopo silenciosamente
```

---

## 5) Anti-padrões

- ❌ Inferir intenção silenciosamente quando score < 0.70
- ❌ Prosseguir com score crítico sem `ask_questions`
- ❌ Re-rotear sem explicar o motivo ao usuário
- ❌ Usar fallback de tool sem registrar que ocorreu
- ❌ Escalar para modelo mais caro sem tentar ferramentas MCP primeiro
- ❌ Bloquear execução por ambiguidade que o downstream pode resolver iterativamente
