# Snippets — code-summarizer (Modo 1 Determinístico)

> Referenciado por [`../../code-summarizer.agent.md`](../../code-summarizer.agent.md) § "Libs de Parsing por Stack (Modo 1)".
> Conforme R-026: código com implementação > 8 linhas não fica inline no `.agent.md` — vive aqui.

## Status

Implementação de **referência inicial**, **validada via smoke test real** em 2026-08-31 contra os 4 golden fixtures em `docs/ai-context/evals/fixtures/code-summarizer/`, e **automatizada via pytest** por `@test-implementation` (ver [`../../../../tests/code-summarizer/README.md`](../../../../tests/code-summarizer/README.md)). Resultado (9 testes reais passed, 4 pending documentados — grupos que dependem de orquestração/runtime do agent):

| Stack | Script | Resultado do smoke test / suíte pytest |
|---|---|---|
| Java | `extract-treesitter.js` | ✅ **PASSOU** — assinatura pública 100% (classe/método/record), blocos de decisão 100% (2/2 regras), segredo detectado corretamente. Automatizado em `test_fid_001_java` / `test_sec_cs_001_java`. |
| Angular/TypeScript | `extract-treesitter.js` | ✅ **PASSOU** — assinatura pública 100%, blocos de decisão 100% via `binary_expression`+`ternary_expression` (confirma mitigação do Risco Alto de padrão Signals/`computed()`). Automatizado em `test_fid_002_angular` / `test_sec_cs_002_angular`. |
| Python | `extract-python-ast.py` | ✅ **PASSOU** — assinatura pública 100% (`calcular_desconto`), blocos de decisão 100% (6 nós cobrindo 2/2 regras), segredo detectado corretamente. Automatizado em `test_fid_003_python` / `test_sec_cs_003_python`. |
| SQL | `extract-sql.js` | ⚠️ **FALHA CONFIRMADA** — `node-sql-parser` não suporta `GENERATED ALWAYS AS (...) STORED` (Postgres); erro de parsing detectado corretamente (`parseErrorDetected: true`), aciona fallback Modo 2 via critério (iii) do threshold — comportamento **esperado e correto**, não é bug do script. Automatizado em `test_fid_004_sql_aciona_fallback_esperado` / `test_sec_cs_004_sql` (validam a sinalização de fallback, não fidelidade via Modo 1). |

Comando de reprodução manual (Java/TS/SQL): `npm install` nesta pasta, depois rodar via `node -e "..."` conforme exemplos no histórico de implementação. Python: qualquer interpretador 3.x, sem instalação. Comando de reprodução automatizado: `python -m pytest tests/code-summarizer/ -v` (a partir da raiz do repositório).

**Ação recomendada decorrente do achado SQL:** ao implementar o Modo 2 (fallback LLM) no `code-summarizer`, garantir que arquivos `.sql` com `GENERATED ALWAYS` cheguem lá automaticamente — não é necessário código adicional, o fallback já é o comportamento padrão do agent quando `parseErrorDetected: true`.

**Status atualizado:** a suíte completa `docs/ai-context/evals/casos-code-summarizer.yaml` já foi parcialmente automatizada — grupos `fidelidade_multistack` e `seguranca_rnf005` (8 de 8 casos aplicáveis) rodam via pytest real contra estes scripts. Grupos `orquestracao_rf008`, `custo_hibrido_rnf001`, `custo_economia_rnf002` e o caso `gov-cs-001` de `governanca_rnf007` seguem **pending** — dependem de orquestração completa do agent (run_subagent, cache, Decision Tree) ainda não implementada como harness executável. Ver `tests/code-summarizer/README.md` para detalhes e rastreabilidade por ID.

## Validação "no quente" (código de produção real, fora dos golden fixtures)

Em 2026-08-31, `extract-treesitter.js` foi testado manualmente contra arquivos reais do projeto externo `worship-scale-app` (Angular 20 + Capacitor + Firebase), sem qualquer alteração nesse projeto (apenas leitura):

| Arquivo real | Linhas/Bytes | Resultado |
|---|---|---|
| `escala-generator.service.ts` (serviço de geração/balanceamento de escalas) | 1.926 linhas / 77.353 bytes | ✅ 158ms de parsing · 84 assinaturas públicas · 215 blocos de decisão · 0 erros · 0 segredos · **economia de 67,6%** (77.353 → 25.064 bytes no JSON bruto, antes de qualquer condensação textual) |
| `MainActivity.java` (boilerplate Capacitor/Android) | 6 linhas | ✅ Caso trivial (classe vazia) sem falso positivo |

Confirma que a extração determinística generaliza de fixtures sintéticas para código de produção real, com economia de tokens consistente com a motivação original do requisito (RNF-002). Projeto não possui arquivos `.py`/`.sql` (usa Firestore/NoSQL), então esses 2 stacks não puderam ser validados "no quente" nesta rodada.

## Arquivos

| Arquivo | Stack | Lib | Executado via |
|---|---|---|---|
| [`extract-treesitter.js`](./extract-treesitter.js) | Java, Angular/TypeScript | `web-tree-sitter` | `ctx_execute_file(language:"javascript")` (produção) / `cli-runner.js` via subprocess (testes) |
| [`extract-python-ast.py`](./extract-python-ast.py) | Python | `ast` (stdlib nativo) | `ctx_execute_file(language:"python")` (produção) / import direto (testes) |
| [`extract-sql.js`](./extract-sql.js) | SQL | `node-sql-parser` | `ctx_execute_file(language:"javascript")` (produção) / `cli-runner.js` via subprocess (testes) |
| [`secret-redaction.js`](./secret-redaction.js) | Todas (cross-cutting) | heurística de regex | Importado pelos 3 scripts acima — garante RNF-005 (0% de reprodução de segredo) |
| [`cli-runner.js`](./cli-runner.js) | — (harness de teste) | — | Ponte criada por `@test-implementation` **somente** para permitir invocar `extract()` via subprocess a partir do pytest (`tests/code-summarizer/conftest.py`). Não usada em produção pelo agent; não altera lógica de extração. |

## Dependências (instalar no sandbox antes do primeiro uso — permitido por `context-mode/SKILL.md` §5/§6)

```bash
npm install web-tree-sitter tree-sitter-java tree-sitter-typescript node-sql-parser
```

> `ast` é módulo nativo do Python — nenhuma instalação necessária.

## Critérios de aceite aplicados por todos os scripts (não duplicar lógica fora daqui)

- Assinatura pública: meta **100%** dos símbolos exportados.
- Bloco de decisão: meta **≥ 80%** (definição por stack — ver tabela no `.agent.md`).
- Segredo/credencial: **0%** de reprodução — `secret-redaction.js` aplica antes de qualquer retorno.
- Se qualquer um dos 2 primeiros critérios não for atingido, OU o parser lançar erro de sintaxe/stack
  não suportada → o agent deve acionar o Modo 2 (Fallback LLM), não este script.
