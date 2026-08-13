# Instructions — Adapters por Projeto/Stack

Instructions registram convenções e padrões específicos de um projeto, domínio ou stack.

> Regras globais: `../../CLAUDE.md`
> Regras operacionais: `../copilot-instructions.md`
> **Manifest de binding:** `../../docs/ai-context/catalog.yaml`

## 1) Propósito

- Centralizar instruções específicas por projeto/stack sem contaminar a governança global.
- Servir como índice para descoberta rápida do conteúdo aplicável.
- Evitar duplicação de regras globais que já vivem em `CLAUDE.md`.
- Facilitar discovery automático via IDE/tooling com suporte a `applyTo` glob patterns.

## 2) Mecanismo de Binding (Padrão Consolidado GitHub Copilot)

Cada arquivo de adapter declara um **frontmatter YAML com `applyTo`**:

```yaml
---
applyTo: ["src/**/*.java"]
---
# Conteúdo da instrução...
```

O `applyTo` glob pattern informa ao IDE/tooling quais arquivos devem carregar esta instrução.

**Hierarquia de aplicação:**

```
1. Global Rules (CLAUDE.md, ./copilot-instructions.md) — Priority 100
   ↓
2. Adapters de Stack (*.instructions.md com applyTo) — Priority 50
   ↓
3. Projeto (docs/ai-context/catalog.yaml → projetos[]) — Priority 40
```

## 3) Instruções Convencionais (Adapters)

| Documento | Escopo | ApplyTo |
|---|---|---|
| `spring-boot-backend.instructions.md` | Backend Java/Spring Boot (genérico) | `**/*.java` |
| `angular-v21-frontend.instructions.md` | Frontend Angular 21 (genérico) | `**/*.ts`, `**/*.js` |
| `python-backend.instructions.md` | Backend Python (genérico) | `**/*.py`, `**/pyproject.toml` |
| `database.instructions.md` | Banco de Dados / Migrações (genérico) | `migrations/**`, `**/*.sql`, `schema/**` |
| `devops.instructions.md` | DevOps / CI-CD / Containers (genérico) | `**/Dockerfile*`, `kubernetes/**`, `.github/workflows/**` |

> **Lista de projetos**: consulte `../../docs/ai-context/catalog.yaml` (seção `projetos:`).
> Projetos são adicionados/removidos via `/add-project-context` e `/del-project-context`.

## 4) Como Carrega Cada IDE

| IDE | Mecanismo | Discovery |
|---|---|---|
| **GitHub Copilot** (VS Code, JetBrains) | Carrega `../copilot-instructions.md` (global) + `*.instructions.md` com frontmatter `applyTo` | Automática por padrão glob |
| **Cursor IDE** | Suporta `.cursor/rules/` mas também lê `../copilot-instructions.md` | Automática + manual |
| **Claude Code** | Lê `../../CLAUDE.md` + `../copilot-instructions.md` conforme configuração | Via catalog.yaml |

## 5) Como Adicionar Novo Adapter

1. Criar arquivo `.github/instructions/<nome-projeto>.instructions.md`
2. Adicionar **frontmatter YAML com `applyTo`**:
   ```yaml
   ---
   applyTo: ["caminho/glob/**/*.ext"]
   ---
   ```
3. Documentar o escopo e convenções
4. Atualizar:
   - **Este arquivo** (`README.md`) — adicionar linha na tabela
   - **Manifest de binding** (`docs/ai-context/catalog.yaml`) — adicionar entry em `adapters:`

## 6) Sugestões de Futuros Adapters

Os adapters abaixo **ainda não existem** e são candidatos para adição futura:

```
- mobile.instructions.md        → applyTo: ["**/*.swift", "**/*.kt"]
- security.instructions.md      → applyTo: ["auth/**", "security/**"]
- react-frontend.instructions.md → applyTo: ["src/**/*.tsx", "src/**/*.jsx"]
- golang-backend.instructions.md → applyTo: ["**/*.go", "go.mod"]
```

## 7) Regras de Manutenção

- Não inventariar documentos inexistentes (R-005).
- Ao criar ou revisar um adapter, atualizar este índice na mesma entrega (R-015).
- Se o conteúdo virar governança global, mover a regra para `CLAUDE.md` e manter aqui apenas referência (R-003).
- Manter `applyTo` patterns precisos e mutuamente exclusivos quando possível.
- Sincronizar sempre o manifest de binding (`docs/ai-context/catalog.yaml`).

## 8) Fonte de Verdade

- **Índice local de adapters:** este arquivo
- **Manifest de binding global:** `../../docs/ai-context/catalog.yaml`
- **Cada `*.instructions.md`:** representa um adapter reutilizável por projeto/stack
- **Lista de projetos:** `../../docs/ai-context/catalog.yaml` (seção `projetos:`)

## 9) Referências

- GitHub Copilot Instructions: https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions
- CLAUDE.md — R-003 (Sem duplicação), R-015 (Atualização atômica)
- `../copilot-instructions.md` — Seção 5 (Binding de Adapters)
- `../../docs/ai-context/binding.md` — Guia completo de binding
