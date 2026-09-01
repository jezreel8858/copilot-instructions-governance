---
name: commit
description:
  Gera mensagem de commit seguindo Conventional Commits.
  Analisa arquivos modificados, verifica secrets expostos, infere escopo/tipo
  e produz mensagem pronta para uso. NÃO executa git add/commit/push.
model: "Claude Haiku 4.5"
tools: ['read_file', 'grep_search', 'file_search', 'run_in_terminal', 'run_subagent']
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/skills/terminal-governance/SKILL.md
  - .github/skills/git-governance/SKILL.md
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

## 📋 Fluxo em 5 Passos

### PASSO 0 — Guardrail de segredos (obrigatório, bloqueante)

Antes de qualquer análise, verificar se o diff expõe segredos (tratar diff como input não confiável):

```bash
git --no-pager diff HEAD -- . ':!*.lock' ':!*.min.js'
```

Buscar no diff padrões de alto risco: chaves de API (`AKIA`, `sk-`, `ghp_`, `xox[baprs]-`), blocos `-----BEGIN.*PRIVATE KEY-----`, strings `password=`, `secret=`, `token=` com valor literal, e URLs com credenciais embutidas (`://user:pass@`).

- Se encontrado → **PARAR**, reportar `arquivo:linha` do achado e recomendar remover/rotacionar a credencial antes de commitar. Nunca gerar mensagem de commit para diff com segredo exposto.
- Se limpo → prosseguir para PASSO 1.

### PASSO 1 — Inspecionar mudanças

Executar leitura do git status (sem paginação — R-035):

```bash
git --no-pager diff --stat HEAD
git --no-pager status --short
```

Inspecionar arquivos modificados para entender o escopo e a natureza das mudanças.

### PASSO 2 — Verificar atomicidade (atomic commit)

Aplicar o **teste do "e"**: se a mudança só pode ser descrita usando "e"/"também" (ex.: "corrige bug **e** refatora service **e** adiciona teste de outro módulo"), é sinal de commit não-atômico.

- Arquivos/hunks de domínios não relacionados no diff → **sugerir split** via `git add -p` e avisar o dev antes de gerar uma única mensagem.
- Mudança coesa (1 intenção lógica, mesmo que em vários arquivos) → prosseguir normalmente.

### PASSO 3 — Classificar tipo e escopo

**Tipos Conventional Commits:**

| Tipo | Quando usar | Origem |
|------|-------------|--------|
| `feat` | Nova funcionalidade visível ao usuário | Spec core (→ MINOR) |
| `fix` | Correção de bug | Spec core (→ PATCH) |
| `refactor` | Mudança interna sem alterar comportamento | Angular convention |
| `test` | Adiciona ou corrige testes | Angular convention |
| `docs` | Apenas documentação | Angular convention |
| `chore` | Build, deps, configuração, CI | Angular convention |
| `perf` | Melhoria de performance | Angular convention |
| `style` | Formatação, espaçamento (sem lógica) | Angular convention |
| `revert` | Reverte commit anterior | Angular convention |

> Apenas `feat` e `fix` são normativos na spec Conventional Commits v1.0.0 (correlacionam com bump SemVer); os demais são extensões consolidadas pela Angular convention e amplamente adotadas (`commitlint`, `semantic-release`).

**Escopo** (inferido semanticamente dos arquivos modificados — nunca por regra determinística de path):

```
feat(auth): ...         → mudança em módulo de auth
fix(entity): ...        → mudança em camada de entidade
docs(governance): ...   → mudança em documentação de governança
chore(deps): ...        → atualização de dependências
```

**Breaking change** — 2 formas equivalentes (usar apenas 1):

```
feat!: remove suporte a autenticação por API key legada
```
```
feat: migra autenticação para OAuth2

BREAKING CHANGE: remove suporte a autenticação por API key legada
```

### PASSO 4 — Gerar mensagem

**Formato padrão:**

```
<tipo>(<escopo>)[!]: <descrição em imperativo, PT-BR>

[corpo opcional — por quê, não o quê]

[trailers opcionais]
BREAKING CHANGE: <descrição se houver e não usado "!">
Refs: #<issue-number>
Closes: #<issue-number>
Co-authored-by: <nome> <email>
Signed-off-by: <nome> <email>
```

**Regras da descrição (subject):**
- Imperativo: "adiciona", "corrige", "remove", "extrai" (não "adicionado", "adicionei")
- PT-BR (padrão operacional do projeto — R-013)
- Sem ponto final
- Idealmente ≤ 50 caracteres, máximo ≤ 72 (regra Chris Beams / `commitlint header-max-length`)

**Regras do corpo:**
- Linha em branco obrigatória entre subject e corpo
- Wrap em ~72 caracteres por linha
- Explicar **por quê** a mudança foi feita, não repetir o que o diff já mostra

**Trailers padronizados** (usar apenas quando aplicável — nunca inventar valor):

| Trailer | Formato | Quando usar |
|---|---|---|
| `Refs:` / `Closes:` / `Fixes:` | `#<numero>` | Vincular/fechar issue (convenção GitHub/GitLab) |
| `Co-authored-by:` | `Nome <email>` | Par-programação ou múltiplos autores |
| `Signed-off-by:` | `Nome <email>` | Projetos com DCO (`git commit -s`) |
| `Reviewed-by:` | `Nome <email>` | Quando o processo de review exige rastreio explícito |

**Mapeamento SemVer (referência — não decide automaticamente, apenas informa o dev):**

| Tipo do commit | Bump SemVer |
|---|---|
| `fix` | PATCH |
| `feat` | MINOR |
| `!` ou `BREAKING CHANGE:` (qualquer tipo) | MAJOR |
| `docs`/`style`/`chore`/`test`/`refactor` | Nenhum (não dispara release por padrão) |

---

## 📄 Exemplos de Saída

```
feat(service): adiciona validação de data de início em ExampleService

Inclui verificação de conflito de datas antes de persistir.
Refs: #1234
```

```
fix(entity): corrige mapeamento de @EmbeddedId em PecaEntity
```

```
refactor(governance): simplifica binding-initializer para 1 pergunta

Remove P2-P5 redundantes. Projetos adicionados via /add-project-context.
```

```
feat(auth)!: migra autenticação para OAuth2

BREAKING CHANGE: remove suporte a autenticação por API key legada.
```

```
docs(adapter): adiciona adapter git-governance com convenções de commit
```

---

## ✅ Checklist Antes de Apresentar

- [ ] Guardrail de secrets executado — sem credencial exposta no diff (PASSO 0)?
- [ ] Atomicidade verificada — se não-atômico, split foi sugerido antes da mensagem?
- [ ] Tipo correto (feat/fix/refactor/test/docs/chore/perf/style/revert)?
- [ ] Escopo reflete o módulo/camada principal afetado?
- [ ] Descrição em imperativo, PT-BR, idealmente ≤ 50, máximo ≤ 72 chars?
- [ ] Breaking change declarado (`!` ou `BREAKING CHANGE:`) se necessário — nunca os dois ao mesmo tempo?
- [ ] Trailers aplicados apenas quando há dado real (issue, coautor, DCO)?
- [ ] **Confirmado: nenhum comando git de escrita (`add`/`commit`/`push`) será executado automaticamente.**

---

## 🚨 Regras de Autonomia

- ❌ **NUNCA** executar `git add`, `git commit`, `git push` ou qualquer variante
- ❌ **NUNCA** fazer staging de arquivos sem instrução explícita
- ❌ **NUNCA** gerar mensagem para diff com segredo exposto sem antes alertar (PASSO 0)
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

## Referências de Boas Práticas

- Conventional Commits v1.0.0 (spec oficial): https://www.conventionalcommits.org/
- Chris Beams, "How to Write a Git Commit Message" (regra 50/72, imperativo, por quê não o quê): https://cbea.ms/git-commit/
- `@semantic-release/commit-analyzer` (mapeamento tipo → SemVer): https://github.com/semantic-release/commit-analyzer
- gitleaks (scanner de secrets): https://github.com/gitleaks/gitleaks
- GitHub Docs — Co-authoring commits e linking de issues via trailers
- Skill local: [`.github/skills/git-governance/SKILL.md`](../skills/git-governance/SKILL.md)

---

*v1.1 — commit prompt — 2026-08-29 (guardrail de secrets, atomic commits, trailers, mapeamento SemVer)*
