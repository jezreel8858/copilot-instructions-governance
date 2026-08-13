# Hooks - Harness Controls (governança genérica)

Este diretório concentra hooks operacionais para manter execução previsível no IDE.

## Hooks disponíveis

### Context Mode

- `.github/hooks/context-mode.json`
  - Registra hooks JetBrains Copilot para `context-mode`.
  - Eventos: `PreToolUse`, `PostToolUse`, `PreCompact`, `SessionStart`.
  - Papel: continuidade de sessão e recuperação de contexto com `ctx_search`.

## Nota: Chaves Duplicadas (camelCase + PascalCase)

O arquivo `context-mode.json` declara cada evento em **duas variantes de capitalização** propositalmente:

| camelCase | PascalCase | Motivo |
|---|---|---|
| `sessionStart` | `SessionStart` | JetBrains Copilot usa `SessionStart`, Claude Code usa `sessionStart` |
| `userPromptSubmitted` | `UserPromptSubmitted` | Compatibilidade multi-plataforma |
| `preToolUse` | `PreToolUse` | idem |
| `postToolUse` | `PostToolUse` | idem |
| `preCompact` | `PreCompact` | idem |
| `errorOccurred` | `ErrorOccurred` | idem |

**Não remover** as variantes duplicadas — são necessárias para garantir que os hooks disparem em ambas as plataformas.

## Fallback mínimo

Se o hook não estiver disponível:

1. Registrar no resultado que o fallback foi usado.
2. Prosseguir com workflow por prompts (`/plano`, `/implementar`, `/validar`, `/pesquisar`).
3. Priorizar `ctx_*` quando o MCP estiver acessível novamente.

## Integração

- Manter `.github/hooks/context-mode.json` versionado.
- Alinhar qualquer mudança com `CLAUDE.md` e `.github/copilot-instructions.md`.
