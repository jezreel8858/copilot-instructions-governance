---
name: review
description:
  Orquestra revisão de código com foco em qualidade, impacto e aderência às convenções.
  Analisa diff ou arquivo alvo, classifica achados por severidade e gera relatório compacto.
  Roteie automaticamente para @bug-triage (bugs) ou @impact-architect (impacto).
model: "claude-sonnet-4.6"
tools: ['read_file', 'grep_search', 'file_search', 'run_in_terminal']
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - docs/ai-context/catalog.yaml
---

# `/review`

Revisão de código orientada por qualidade, convenções e impacto técnico.

> **PROPÓSITO**: Analisar código (diff, PR ou arquivo) contra as convenções do projeto e identificar bugs, riscos, melhorias e gaps de teste.
>
> **NÃO executa alterações** — apenas analisa e reporta.

---

## 🎯 Uso

```bash
/review                          → revisa mudanças não commitadas (git diff HEAD)
/review <arquivo>                → revisa arquivo específico
/review <arquivo> <outro>        → revisa múltiplos arquivos
```

---

## 📋 Fluxo em 4 Passos

### PASSO 1 — Coletar mudanças

```bash
# Diff não commitado (padrão)
git --no-pager diff HEAD

# Ou ler arquivo alvo diretamente
```

### PASSO 2 — Identificar convenções aplicáveis

- Ler `docs/ai-context/catalog.yaml` para identificar projeto e adapter
- Carregar adapter correspondente (`.github/instructions/<projeto>.instructions.md`)
- Usar adapter + CLAUDE.md como régua de qualidade

### PASSO 3 — Analisar por dimensão

| Dimensão | O que verificar |
|----------|----------------|
| **Bugs / Erros** | NPE, off-by-one, condições de corrida, typos críticos |
| **Segurança** | Exposição de dados, injeção, autenticação bypassada |
| **Convenções** | Aderência às regras do adapter (naming, logging, exceptions) |
| **Impacto** | Mudanças que quebram contratos, dependências afetadas |
| **Testes** | Cobertura insuficiente, cenários não cobertos |
| **Performance** | N+1, queries sem índice, loops desnecessários |

### PASSO 4 — Gerar relatório compacto

```
📋 REVISÃO DE CÓDIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivo(s): <lista>
Convenções aplicadas: <adapter usado>

🔴 BLOQUEADORES (requer correção antes do merge):
  - [BUG] <descrição> → <arquivo:linha>
  - [SEC] <descrição> → <arquivo:linha>

🟠 RECOMENDAÇÕES (alta prioridade):
  - [CONV] <descrição> → <arquivo:linha>
  - [TESTE] <cobertura faltando> → <cenário>

🟡 SUGESTÕES (baixa prioridade):
  - [PERF] <otimização opcional> → <arquivo:linha>
  - [STYLE] <ajuste de estilo>

✅ APROVAÇÕES:
  - <o que está bem feito>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resultado: <APROVADO | APROVADO COM RESSALVAS | BLOQUEADO>
Próximo passo: <ação mínima se houver bloqueador>
```

---

## 🔀 Roteamento Automático

| Achado | Ação |
|--------|------|
| Bug crítico encontrado | Reportar no relatório + sugerir `@bug-triage` |
| Impacto em dependências | Reportar + sugerir `@impact-architect` |
| Falta de testes | Reportar + sugerir `@test-strategy` |
| Apenas convenção | Incluir no relatório, sem escalação |

---

## 🚨 Regras de Autonomia

- ❌ **NUNCA** alterar o código sendo revisado
- ❌ **NUNCA** criar commits ou arquivos derivados da revisão
- ✅ **APENAS** analisar e reportar achados
- ✅ Se achado exige ação complexa → sugira o agent correto via `@agent-router`

---

*v1.0 — review prompt — 2026-06-12*

