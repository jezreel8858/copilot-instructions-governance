---
name: commit
description:
  Gera mensagem de commit seguindo Conventional Commits.
  Analisa arquivos modificados, infere escopo e tipo, e produz
  mensagem pronta para uso. NÃO executa git add/commit/push.
model: "claude-haiku-4.5"
tools: ['read_file', 'grep_search', 'file_search', 'run_in_terminal']
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/skills/terminal-governance/SKILL.md
---

# `/commit`

Gera mensagem de commit convencional pronta para uso.

> **REGRA ABSOLUTA**: Este prompt apenas **gera a mensagem**. Nunca executa `git add`, `git commit` ou `git push` — decisão e execução são sempre do dev.

---

## 🎯 Uso

```bash
/commit
/commit "contexto opcional da mudança"
```

---

## 📋 Fluxo em 3 Passos

### PASSO 1 — Inspecionar mudanças

Executar leitura do git status (sem paginação — R-035):

```bash
git --no-pager diff --stat HEAD
git --no-pager status --short
```

Inspecionar arquivos modificados para entender o escopo e a natureza das mudanças.

### PASSO 2 — Classificar tipo e escopo

**Tipos Conventional Commits:**

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade visível ao usuário |
| `fix` | Correção de bug |
| `refactor` | Mudança interna sem alterar comportamento |
| `test` | Adiciona ou corrige testes |
| `docs` | Apenas documentação |
| `chore` | Build, deps, configuração, CI |
| `perf` | Melhoria de performance |
| `style` | Formatação, espaçamento (sem lógica) |
| `revert` | Reverte commit anterior |

**Escopo** (inferido dos arquivos modificados):

```
feat(auth): ...         → mudança em módulo de auth
fix(entity): ...        → mudança em camada de entidade
docs(governance): ...   → mudança em documentação de governança
chore(deps): ...        → atualização de dependências
```

### PASSO 3 — Gerar mensagem

**Formato padrão:**

```
<tipo>(<escopo>): <descrição em imperativo, PT-BR, ≤ 72 chars>

[corpo opcional — por quê, não o quê]

[breaking change ou referências opcionais]
BREAKING CHANGE: <descrição se houver>
Refs: #<issue-number>
Co-authored-by: <nome> <email>
```

**Regras da descrição:**
- Imperativo: "adiciona", "corrige", "remove", "extrai" (não "adicionado", "adicionei")
- PT-BR (padrão operacional do projeto — R-013)
- Sem ponto final
- ≤ 72 caracteres na primeira linha

---

## 📄 Exemplos de Saída

```
feat(service): adiciona validação de data de início em ExampleService

Inclui verificação de conflito de datas antes de persistir.
Refs: [PROJ-1234]
```

```
fix(entity): corrige mapeamento de @EmbeddedId em PecaEntity
```

```
refactor(governance): simplifica binding-initializer para 1 pergunta

Remove P2-P5 redundantes. Projetos adicionados via /add-project-context.
```

```
docs(adapter): adiciona adapter git-governance com convenções de commit
```

---

## ✅ Checklist Antes de Apresentar

- [ ] Tipo correto (feat/fix/refactor/test/docs/chore/perf/style/revert)?
- [ ] Escopo reflete o módulo/camada principal afetado?
- [ ] Descrição em imperativo, PT-BR, ≤ 72 chars?
- [ ] Breaking change declarado se necessário?
- [ ] Refs a issues se aplicável?
- [ ] **Confirmado: nenhum comando git será executado automaticamente.**

---

## 🚨 Regras de Autonomia

- ❌ **NUNCA** executar `git add`, `git commit`, `git push` ou qualquer variante
- ❌ **NUNCA** fazer staging de arquivos sem instrução explícita
- ✅ **APENAS** gerar e exibir a mensagem para o dev copiar/usar
- ✅ Se o dev quiser ajustar o tipo ou escopo, refaça com as correções solicitadas

---

## 🔄 Integração com Workflow

```
/implement → /validate → /commit → [dev executa git commit manualmente]
```

Após `/commit` gerar a mensagem, o dev executa:

```bash
git add <arquivos>
git commit -m "<mensagem gerada>"
```

---

*v1.0 — commit prompt — 2026-06-12*

