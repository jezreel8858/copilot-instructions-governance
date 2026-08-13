# Hierarquia de Ferramentas — Exemplos Genéricos

Este arquivo mostra exemplos de uso do `context-mode` em qualquer codebase com foco em baixo consumo de contexto.

## Exemplo 1 — Coleta + resposta em lote

```js
ctx_batch_execute({
  commands: [
    { label: "services", command: "rg -n \"class .*Service\" src" },
    { label: "business-errors", command: "rg -n \"BusinessError|BusinessException\" src" }
  ],
  queries: ["serviços encontrados", "pontos de validação e erro"],
  query_scope: "batch"
})
```

## Exemplo 2 — Follow-up sem nova coleta

```js
ctx_search({
  source: "services",
  queries: ["métodos públicos", "dependências críticas", "riscos de regressão"]
})
```

## Exemplo 3 — Processar arquivo grande em sandbox

```js
ctx_execute_file({
  path: "logs/app.log",
  language: "javascript",
  code: "const e=FILE_CONTENT.split('\\n').filter(l=>l.includes('ERROR')); console.log(`erros=${e.length}`);"
})
```

## Exemplo 4 — Web docs sem HTML bruto no chat

```js
ctx_fetch_and_index({
  requests: [{ url: "https://angular.dev/guide/styleguide", source: "angular-styleguide" }],
  concurrency: 4
})
```

```js
ctx_search({
  source: "angular-styleguide",
  queries: ["change detection", "signals", "best practices"],
  limit: 5
})
```
