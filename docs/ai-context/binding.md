# Binding Context — Eco-Sistema 

> **Manifest de binding instanciado**: `catalog.yaml`
> **Template base**: `catalog-base.yaml`
> **Gerado por**: `binding-initializer` (1 pergunta — nome do ecossistema)

Este arquivo documenta o mecanismo de binding hierárquico do ecossistema. Para a referência completa do padrão, consulte `binding-base.md`.

---

## Hierarquia Ativa

```
Camada 1 (Global — Priority 100)
  ├─ CLAUDE.md
  └─ .github/copilot-instructions.md
       ↓
Camada 2 (Stack/Adapter — Priority 50)
  ├─ spring-boot-backend.instructions.md  → applyTo: **/*.java
  ├─ angular-v21-frontend.instructions.md → applyTo: **/*.ts, **/*.js
  ├─ python-backend.instructions.md       → applyTo: **/*.py
  ├─ database.instructions.md             → applyTo: migrations/**, **/*.sql
  └─ devops.instructions.md               → applyTo: **/Dockerfile*, kubernetes/**
       ↓
Camada 3 (Projeto — Priority 40, Local Overlay — R-043)
```

> ⚠️ **Desacoplamento total (R-043)**: a Camada 3 vive em `catalog.local.yaml` (gitignored), NUNCA em `catalog.yaml` (compartilhado/commitado). Todo agent/prompt faz merge em memória dos dois arquivos ao ler a lista de projetos — a escrita de projeto/adapter NUNCA toca `catalog.yaml`.

---

## Projetos Registrados

> Projetos vivem em `catalog.local.yaml` (gitignored, R-043) — **nunca** em `catalog.yaml`.
> Este arquivo (`binding.md`) é compartilhado/commitado e nunca lista projetos reais.

Para a lista real desta máquina, consulte `catalog.local.yaml` (se existir localmente).

---

## Gerenciamento de Projetos

```bash
# Setup único (1x por clone/máquina) — cria o overlay local gitignored
cp docs/ai-context/catalog.local.yaml.example docs/ai-context/catalog.local.yaml

# Adicionar projeto (grava em catalog.local.yaml, nunca em catalog.yaml)
/add-project-context <caminho-absoluto-do-projeto>

# Remover projeto (remove de catalog.local.yaml)
/del-project-context <nome-do-projeto>

# Verificar saúde do binding
/health
```

---

## Adapters Disponíveis

| Adapter | Stack | ApplyTo |
|---------|-------|---------|
| `spring-boot-backend.instructions.md` | Java/Spring Boot | `src/**/*.java`, `pom.xml` |
| `angular-v21-frontend.instructions.md` | Angular 21 | `src/**/*.ts`, `src/**/*.js`, `angular.json` |
| `python-backend.instructions.md` | Python Backend | `**/*.py`, `**/pyproject.toml` |
| `database.instructions.md` | BD / Migrações | `migrations/**`, `**/*.sql`, `schema/**` |
| `devops.instructions.md` | DevOps / CI-CD | `**/Dockerfile*`, `kubernetes/**`, `.github/workflows/**` |

Para adicionar novos adapters, veja `.github/instructions/README.md`.

---

## Como o Binding Funciona

1. Dev abre `SeuArquivo.java` em `custom-app`
2. Copilot verifica CLAUDE.md (priority 100) → sempre carrega
3. Copilot verifica `spring-boot-backend.instructions.md` (priority 50) → `**/*.java` combina → carrega
4. Copilot verifica `catalog.yaml` → `custom-app` → `extends: base-backend` → confirma
5. Dev recebe: regras globais + convenções Java/Spring do adapter genérico `base-backend`

---

*Última atualização: 2026-07-30*
*Ecossistema: app-ecossistema*

