# context-mode — Otimização de Contexto para IA

> Guia operacional para uso do [`context-mode`](https://github.com/mksglu/context-mode).
> MCP server que reduz **~98%** do consumo de contexto de agentes IA (Copilot, Claude, Codex, Gemini, Cursor).

---

## 🎯 Por que usamos

Toda chamada de ferramenta de um agente IA (ler arquivo, listar diretório, grep, web fetch, snapshot de browser) **despeja a saída crua** na janela de contexto. Em 30 minutos, ~40% do contexto pode estar consumido por output que não será reaproveitado.

O `context-mode`:

1. **Intercepta** a saída de tools via hooks (`PreToolUse` / `PostToolUse`)
2. **Indexa** localmente em SQLite + FTS5 (busca BM25)
3. **Devolve** ao agente apenas uma referência compacta + resumo
4. Em **compactação**, injeta um snapshot priorizado (<2 KB) do que importa: arquivos editados, tarefas em andamento, decisões, último pedido

**Ganho prático**: sessões longas (>2h) mantêm coerência em vez de "esquecer" o que o usuário pediu há 30 min.

---

## ⚙️ Instalação (uma vez por desenvolvedor)

### Pré-requisitos

- **Node.js >= 22.5** (`node -v`)
- Bun como alternativa também funciona

### Passos

```bash
npm install -g context-mode
```

Reinicie o JetBrains IDE / VS Code após instalar.

### Verificação

No Copilot Chat, digite:

```
ctx stats
```

Se retornar estatísticas de tokens economizados, está funcionando. Se nada acontecer:

```
ctx doctor
```

---

## 📁 Arquivos já versionados no repo

| Arquivo | Função |
|---|---|
| `.vscode/mcp.json` | Registra `context-mode` como MCP server para Copilot (VS Code + JetBrains) |
| `.github/hooks/context-mode.json` | Hooks `PreToolUse`, `PostToolUse`, `SessionStart`, `PreCompact`, `Stop` |
| `.gitignore` | Ignora `.context-mode/` e `*.context-mode.db` (DB local por dev) |

Você **não precisa criar nada** — apenas instalar o binário global.

---

## 🛠️ Comandos disponíveis

Digite no chat do Copilot — o agente invoca o MCP tool automaticamente.

| Comando | Quando usar |
|---|---|
| `ctx stats` | Saber quanto contexto está sendo economizado na sessão atual |
| `ctx doctor` | Diagnóstico: Node, hooks, permissões, MCP conectado |
| `ctx search <query>` | Buscar conteúdo já indexado (mais barato que reler arquivos) |
| `ctx insight` | Snapshot priorizado do estado da sessão (útil antes de compactar) |
| `ctx index <path>` | Indexar arquivo/pasta manualmente |
| `ctx upgrade` | Atualizar para versão mais recente do context-mode |

---

## ✅ Boas práticas

### Para o desenvolvedor

1. **Instale e esqueça.** Após o setup global, funciona em background.
2. **Antes de pedir refatoração grande**, rode `ctx insight` para o agente ter snapshot fresco.
3. **Em sessões longas**, `ctx stats` periodicamente para ver economia (deve ficar >70%).
4. **Não comite o DB.** Já está no `.gitignore`. Cada dev tem o próprio histórico.

### Para o agente IA

Em vez de reler arquivos grandes várias vezes na mesma sessão, prefira:

```
ctx search "ExemploServiceImpl findById"
```

ao invés de `read_file` no mesmo arquivo. O retorno é uma referência compacta com matches BM25.

Exemplos de queries úteis para este projeto:

```
ctx search "BusinessException validar"
```

### Para CI/CD

❌ **Não instale em CI.** Context-mode é otimização de **sessão interativa**. Pipelines automatizados não se beneficiam e adicionam latência.

---

## 🔧 Troubleshooting

| Sintoma | Solução |
|---|---|
| `ctx stats` não responde | Reinicie o IDE; rode `ctx doctor` |
| Hooks não disparam | Verifique se `.github/hooks/context-mode.json` existe e Node >= 22.5 |
| DB cresce muito | Apague `.context-mode/` na raiz — será recriado |
| Versão desatualizada | `npm install -g context-mode@latest` ou `ctx upgrade` |
| Erro em Windows com PATH | Após `ctx upgrade`, **feche e reabra** o terminal/IDE |

---

## 📚 Referências

- Repositório: <https://github.com/mksglu/context-mode>
- Artigo do autor: <https://mksg.lu/blog/context-mode>
- Guia BetterStack: <https://betterstack.com/community/guides/ai/context-mode-mcp>
- Discussão HN: <https://news.ycombinator.com/item?id=47193064>
