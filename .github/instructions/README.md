# Instructions — Adapters por Projeto/Stack

Instructions registram convenções e padrões específicos de um projeto, domínio ou stack.

> Regras globais: `../../CLAUDE.md`
> Regras operacionais: `../copilot-instructions.md`
> **Manifest de binding (compartilhado, adapters):** `../../docs/ai-context/catalog.yaml`
> **Overlay de projetos (LOCAL, gitignored — R-043):** `../../docs/ai-context/catalog.local.yaml`

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
2. Adapters de Stack (*.instructions.md com applyTo, raiz — compartilhados) — Priority 50
   ↓
3. Projeto (catalog.local.yaml → projetos[] + .github/instructions/local/*, gitignored — R-043) — Priority 40
```

## 3) Estrutura da Pasta: Compartilhado vs. Local (R-043)

| Local | Escopo | Git | Gerado por |
|---|---|---|---|
| `.github/instructions/*.instructions.md` (raiz) | Adapters **genéricos por stack** — reutilizáveis por qualquer projeto | ✅ Commitado | Manual/curadoria |
| `.github/instructions/local/*.instructions.md` | Adapters **por-projeto** — customizados via scanner | ❌ Gitignored | `adapter-generator` (via `/add-project-context`) |

> ⚠️ Nunca misture os dois: um adapter por-projeto **nunca** vai na raiz, e um adapter genérico **nunca** vai em `local/`.

## 4) Instruções Convencionais (Adapters Compartilhados)

| Documento | Escopo | ApplyTo |
|---|---|---|
| `spring-boot-backend.instructions.md` | Backend Java/Spring Boot (genérico) | `**/*.java` |
| `angular-v21-frontend.instructions.md` | Frontend Angular 21 (genérico) | `**/*.ts`, `**/*.js` |
| `python-backend.instructions.md` | Backend Python (genérico) | `**/*.py`, `**/pyproject.toml` |
| `database.instructions.md` | Banco de Dados / Migrações (genérico) | `migrations/**`, `**/*.sql`, `schema/**` |
| `devops.instructions.md` | DevOps / CI-CD / Containers (genérico) | `**/Dockerfile*`, `kubernetes/**`, `.github/workflows/**` |

> **Lista de projetos**: consulte `../../docs/ai-context/catalog.local.yaml` (gitignored, R-043 — nunca `catalog.yaml`).
> Projetos são adicionados/removidos via `/add-project-context` e `/del-project-context`.

## 5) Como Carrega Cada IDE

| IDE | Mecanismo | Discovery |
|---|---|---|
| **GitHub Copilot** (VS Code, JetBrains) | Carrega `../copilot-instructions.md` (global) + `*.instructions.md` com frontmatter `applyTo` | Automática por padrão glob |
| **Cursor IDE** | Suporta `.cursor/rules/` mas também lê `../copilot-instructions.md` | Automática + manual |
| **Claude Code** | Lê `../../CLAUDE.md` + `../copilot-instructions.md` conforme configuração | Via catalog.yaml |

## 6) Como Adicionar Novo Adapter (genérico/compartilhado)

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

> Adapter **por-projeto** segue fluxo diferente: gerado automaticamente por `/add-project-context`
> em `.github/instructions/local/<projeto>.instructions.md` (gitignored) — nunca criado manualmente aqui.

## 7) Sugestões de Futuros Adapters

Os adapters abaixo **ainda não existem** e são candidatos para adição futura:

```
- mobile.instructions.md        → applyTo: ["**/*.swift", "**/*.kt"]
- security.instructions.md      → applyTo: ["auth/**", "security/**"]
- react-frontend.instructions.md → applyTo: ["src/**/*.tsx", "src/**/*.jsx"]
- golang-backend.instructions.md → applyTo: ["**/*.go", "go.mod"]
```

## 8) Regras de Manutenção

- Não inventariar documentos inexistentes (R-005).
- Ao criar ou revisar um adapter, atualizar este índice na mesma entrega (R-015).
- Se o conteúdo virar governança global, mover a regra para `CLAUDE.md` e manter aqui apenas referência (R-003).
- Manter `applyTo` patterns precisos e mutuamente exclusivos quando possível.
- Sincronizar sempre o manifest de binding (`docs/ai-context/catalog.yaml`).
- **Nunca** criar/editar adapter por-projeto na raiz — destino correto é sempre `local/` (R-043).

## 9) Fonte de Verdade

- **Índice local de adapters:** este arquivo
- **Manifest de binding global (compartilhado):** `../../docs/ai-context/catalog.yaml`
- **Cada `*.instructions.md`:** representa um adapter reutilizável por projeto/stack
- **Lista de projetos (LOCAL, gitignored):** `../../docs/ai-context/catalog.local.yaml`

## 10) Referências

- GitHub Copilot Instructions: https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions
- CLAUDE.md — R-003 (Sem duplicação), R-015 (Atualização atômica), R-043 (Local Overlay Pattern)
- `../copilot-instructions.md` — Seção 5 (Binding de Adapters)
- `../../docs/ai-context/binding.md` — Guia completo de binding
