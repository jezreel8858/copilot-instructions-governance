---
name: git-governance
description: Convenções de git workflow, branch naming, commit standards e PR guidelines para projetos enterprise.
tier: 2
category: governance
triggers:
  - "como nomear branch"
  - "padrão de commit"
  - "convention de PR"
  - "git workflow"
  - "mensagem de commit"
  - "branch naming"
tools: []
source_docs:
  - "CLAUDE.md"
  - ".github/copilot-instructions.md"
---

# Git Governance

> Convenções de git workflow para manter rastreabilidade, revisão eficiente e histórico limpo em projetos enterprise.

## Quando Usar

- Ao criar uma nova branch e querer seguir a convenção correta
- Antes de usar `/commit` para entender o formato esperado
- Ao configurar PR templates ou guidelines de revisão
- Ao onboarding de novo desenvolvedor no git workflow

---

## 1) Branch Naming Convention

**Formato padrão:**

```
<tipo>/<jira-id>-<descricao-kebab>
```

| Tipo | Uso |
|------|-----|
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `refactor/` | Refatoração sem mudança de comportamento |
| `test/` | Apenas testes |
| `docs/` | Apenas documentação |
| `chore/` | Build, deps, configuração |
| `hotfix/` | Correção crítica em produção |

**Exemplos:**

```
docs/governance-simplificar-binding-initializer
```

**Regras:**
- Sempre kebab-case
- ID Jira quando existir (`<PROJETO>-<numero>`)
- Descrição em PT-BR ou EN (consistente no projeto)
- Máximo 60 caracteres no total

---

## 2) Commit Convention (Conventional Commits)

Use `/commit` para gerar a mensagem automaticamente. Referência rápida:

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[trailers opcionais]
```

**Tipos:**

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova feature |
| `fix` | Bug fix |
| `refactor` | Refactor |
| `test` | Testes |
| `docs` | Documentação |
| `chore` | Build/deps/config |
| `perf` | Performance |

**Regras da mensagem:**
- Imperativo, PT-BR: "adiciona", "corrige", "remove", "extrai"
- Sem ponto final na primeira linha
- ≤ 72 caracteres na primeira linha
- Corpo separado por linha em branco

---

## 3) Pull Request Guidelines

**Título do PR** deve seguir Conventional Commits:

```
feat(auth): adiciona autenticação por token JWT
fix(entity): corrige NPE em PecaEntity ao buscar por ID nulo
```

**Template mínimo de PR:**

```markdown
## O que foi feito
- <item 1>
- <item 2>

## Tipo de mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Refactor
- [ ] Docs

## Como testar
1. <passo 1>
2. <passo 2>

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem secrets expostos
- [ ] CLAUDE.md consultado para convenções
```

---

## 4) Merge Strategy

| Estratégia | Quando usar |
|-----------|------------|
| **Squash merge** | Features pequenas (1-3 commits) — mantém histórico limpo |
| **Merge commit** | Features grandes ou releases — preserva contexto |
| **Rebase** | ❌ Evitar em branches compartilhadas |

---

## 5) Checklist Pré-PR

- [ ] Branch nomeada conforme convenção?
- [ ] Commits seguem Conventional Commits (use `/commit`)?
- [ ] Testes passando?
- [ ] Sem `console.log` / `System.out.println` de debug?
- [ ] Sem credenciais expostas (R-010)?
- [ ] PR title segue o formato?
- [ ] Descrição clara do que e por quê?

---

## 6) Referências

- Conventional Commits: https://www.conventionalcommits.org/
- `/commit` prompt: `.github/prompts/commit.prompt.md`
- Regras de segurança: `CLAUDE.md` R-010

