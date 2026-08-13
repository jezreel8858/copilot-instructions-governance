---
name: context-mode
description: >
  Boas práticas de uso do context-mode MCP em ambientes multi-projeto para reduzir
  poluição de contexto, preservar memória de sessão e otimizar custo de créditos.
  Prioriza processamento em sandbox e busca indexada.
tier: 1
category: process
triggers:
  - "ctx"
  - "contexto"
  - "economizar tokens"
  - "reduzir custo"
  - "pesquisar no projeto"
  - "buscar no codigo"
  - "arquivo grande"
  - "ler logs"
  - "analisar classe"
  - "mapear repositorio"
  - "historico da sessao"
tools:
  - "context-mode"
source_docs:
  - "../../../CLAUDE.md"
  - "../../../.github/copilot-instructions.md"
---

# context-mode — Operação de alto rendimento

Skill para operar `ctx_*` com mínimo consumo de contexto: coletar em lote, processar em sandbox e responder apenas com sinal útil.

## 1) Objetivo

- Evitar flooding de contexto em tarefas de análise e investigação.
- Transformar saída bruta em resultado compacto e acionável.
- Preservar histórico consultável para sessões longas.
- Reduzir custo de créditos por chamada desnecessária ou redundante.

## 2) Ordem obrigatória de roteamento

| Ordem | Etapa | Tool | Resultado esperado |
|---|---|---|---|
| 0 | MEMORY | `ctx_search(..., sort: "timeline")` | retomada sem perguntar contexto já conhecido |
| 1 | GATHER | `ctx_batch_execute(commands, queries)` | coleta e resposta em uma única rodada |
| 2 | FOLLOW-UP | `ctx_search(queries: [...])` | perguntas adicionais sem releitura bruta |
| 3 | PROCESS | `ctx_execute` / `ctx_execute_file` | derivação com saída mínima |
| 4 | WEB | `ctx_fetch_and_index` → `ctx_search` | documentação externa sem HTML bruto no chat |
| 5 | INDEX | `ctx_index(path: ..., source: ...)` | base persistente para reuso |

## 3) Regras de substituição (mandatórias)

| Situação | Em vez de | Use |
|---|---|---|
| Releitura repetitiva | `read_file` várias vezes | `ctx_search` |
| Busca ampla em código | `grep_search` + múltiplos reads | `ctx_batch_execute` + `queries` |
| Arquivo grande para análise | `read_file` completo | `ctx_execute_file` |
| Docs/web externa | fetch/manual | `ctx_fetch_and_index` + `ctx_search` |
| Indexação de payload grande | `ctx_index(content: ...)` | `ctx_index(path: ...)` |

## 4) Guardrails de economia (token budget)

- Sempre agrupar perguntas no mesmo `queries: [...]`.
- Sempre informar `source` quando houver múltiplas fontes indexadas.
- Em `ctx_batch_execute`, preferir `query_scope: "batch"` quando o foco for apenas a coleta atual.
- Não imprimir JSON bruto no stdout; imprimir resumo, contagem, IDs e evidência objetiva.
- Persistir saída extensa em arquivo e retornar somente caminho + 1 linha de descrição.

## 5) Terminal e fallback

- Terminal só para: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`.
- Se MCP estiver indisponível: reportar falha compacta e aguardar aprovação antes de fallback amplo.

## 6) Anti-padrões (proibidos)

- Rodar comando verboso em terminal só para "ver rapidamente".
- Fazer várias chamadas `ctx_search` unitárias para perguntas relacionadas.
- Passar dados grandes em `ctx_index(content)`.
- Reindexar no `ctx_index(content)` uma resposta já recebida por outra tool.
- Ler arquivo grande com `read_file` quando a intenção é apenas analisar.

## 7) Playbooks curtos

**Retomada de sessão**

```javascript
ctx_search({
  queries: ["summary", "decision", "blocker"],
  sort: "timeline"
})
```

**Coleta + resposta em lote**

```javascript
ctx_batch_execute({
  commands: [{ label: "service", command: "rg -n \"class .*Service\" src" }],
  queries: ["serviços críticos", "pontos de risco"],
  query_scope: "batch"
})
```

**Análise de arquivo grande**

```javascript
ctx_execute_file({
  path: "logs/app.log",
  language: "javascript",
  code: "const errs=FILE_CONTENT.split('\\n').filter(l=>l.includes('ERROR')); console.log(errs.length);"
})
```

## 8) Comandos ctx (atalhos)

| Comando | Ação |
|---|---|
| `ctx stats` | chamar `ctx_stats` e exibir saída completa |
| `ctx doctor` | chamar `ctx_doctor`, executar comando retornado e reportar checklist |
| `ctx upgrade` | chamar `ctx_upgrade`, executar comando retornado e reportar checklist |
| `ctx purge` | chamar `ctx_purge(confirm: true)` com aviso explícito de destruição |

## 9) Recursos

- `./examples/hierarquia-ferramentas.md`
- `docs/agent-context/context-mode.md`
- Context Engineering (Sourcegraph, 2026): https://sourcegraph.com/blog/context-engineering
- Long Context Management (Zylos, 2026): https://zylos.ai/research/2026-01-19-llm-context-management
