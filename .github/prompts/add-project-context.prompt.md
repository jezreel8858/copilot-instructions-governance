---
name: add-project-context
description: 
  DESCOBERTA DE PROJETO — Execute DEPOIS de `/init-context`.
  Orquestra descoberta estruturada de projeto com Intent Classification + Multi-Query RRF.
  Análise estática offline → geração automática de YAML/Markdown → validação e binding atômico.
  Execute UMA VEZ POR PROJETO (reutilizável). PRÉ-REQUISITO `/init-context` já executado.
model: "claude-sonnet-4.6"
tools: ['file_search', 'grep_search', 'read_file', 'run_in_terminal']
source_docs:
  - .github/skills/yaml-governance/SKILL.md
  - .github/skills/context-builder/SKILL.md
  - .github/skills/terminal-governance/SKILL.md
  - CLAUDE.md
  - .github/copilot-instructions.md
---

# `/add-project-context`

**PRÉ-REQUISITO: Execute `/init-context` PRIMEIRO (uma única vez na sessão).**

Auto-carregar contexto estruturado de um projeto com Intent Classification + Multi-Query RRF.

> **PROPÓSITO**: Plugar projeto externo ao contexto de governança — scanner + geração de artefatos de binding
>
> **FREQUÊNCIA**: ✅ N VEZES (1x por projeto)
>
> **ORDEM**: DEPOIS de `/init-context` (que é 1x apenas)
>
> **REUTILIZÁVEL**: Sim — execute para cada projeto novo na mesma sessão
>
> **⛔ GUARDRAIL**: Todos os artefatos gerados ficam NESTE repositório de governança.
>                  Nenhum arquivo é criado ou modificado nos projetos externos.
>
> **Se você é o Copilot**: Execute as FASES 1 → 2 → 3 sequencialmente conforme descrito abaixo.

---

## ⛔ Confinamento Absoluto ao Repositório de Governança

```
┌──────────────────────────────────────────────────────────────┐
│  Este comando registra projetos externos COMO REFERÊNCIA.    │
│  Todos os artefatos criados ficam NESTE repositório.         │
│                                                              │
│  ✅ CRIA EM: ./docs/ai-context/catalog.yaml (ATUALIZA)      │
│  ✅ CRIA EM: ./.github/instructions/<projeto>.instructions.md│
│                                                              │
│  ❌ NUNCA cria nada no projeto externo                       │
│  ❌ NUNCA modifica [nome-projeto-externo-1]/                 │
│  ❌ NUNCA modifica [nome-projeto-externo-2]/                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 📌 Source Docs (Pre-Fetch Automático)

Este prompt carrega automaticamente (conforme frontmatter `source_docs`):
- ✅ `.github/skills/yaml-governance/SKILL.md` — governança YAML obrigatória
- ✅ `.github/skills/context-builder/SKILL.md` — estruturas de contexto
- ✅ `CLAUDE.md` — regras normativas `R-001..R-039`
- ✅ `.github/copilot-instructions.md` — roteamento rápido e autonomia

**Pre-requisito**: Se algum arquivo não foi anexado automaticamente, o Copilot DEVE alertar "⚠️ Pre-fetch incompleto" e carregá-los manualmente.

### 🏥 Health Check — Binding Context (R-034)

**ANTES de iniciar**, o Copilot VERIFICA **neste repositório de governança**:

```
✓ Existe: ./docs/ai-context/catalog.yaml?
✓ Existe: ./docs/ai-context/binding.md?
```

**Se algum FALTAR**:
```
⚠️ Binding context não detectado!

Este repositório de governança não possui docs/ai-context/catalog.yaml ou binding.md.
→ Interromper `/add-project-context`
→ Disparar agent `binding-initializer` para criá-los NESTE repositório
```

**Se existem**: Prosseguir para FASE 1 normalmente.

---

## 🎯 Uso

```
/add-project-context <caminho-absoluto-do-projeto>
```

### Exemplos

```
/add-project-context D:\workspace\porto\meu-projeto-backend
/add-project-context D:\workspace\porto\meu-projeto-frontend
/add-project-context D:\workspace\porto\meu-novo-projeto
```

---

## 📋 Fluxo Automático — 3 Fases

### FASE 1: **Scanner Local — Intent Classification + RRF** (Determinístico, Offline)

**Objetivo**: Detectar stack real do projeto usando análise estática offline (mesmo scanner do `adapter-generator.agent.md`).

O Copilot executa **análise estática offline** sem chamar APIs externas:

**Scanner — Artefatos Analisados (Ordem de Prioridade)**

Reuse the same scanner from `adapter-generator.agent.md` § 🔍 Scanner de Projeto:

1. **[1] Detecção de Linguagem & Runtime** (Package managers):
   - `package.json` → Node.js/TypeScript/JavaScript
   - `pom.xml` → Java/Maven
   - `build.gradle` / `build.gradle.kts` → Kotlin/Java/Gradle
   - `requirements.txt` / `Pipfile` → Python
   - `go.mod` → Go
   - `Dockerfile` → Detectar runtime base

2. **[2] Detecção de Framework & Ecossistema**:
   - Angular: `angular.json` + `"@angular/core"` em `package.json`
   - React: `react`, `react-dom` em `package.json`
   - Spring Boot: `spring-boot-starter` em `pom.xml` / `build.gradle`
   - Nest.js: `"@nestjs/core"` em `package.json`
   - Express: `express` em `package.json`
   - Django/FastAPI: `requirements.txt`

3. **[3] Detecção de Estrutura & Padrões**:
   - Monorepo: `lerna.json`, `nx.json`, `workspaces` em `package.json`
   - Layered: pastas `/controllers`, `/services`, `/repositories`, `/models`
   - Component-based: `/components`, `/pages`
   - Modular: subpastas organizadas `/module-a`, `/module-b`

4. **[4] Detecção de Codestyle & Configuração**:
   - `.eslintrc.json` / `.eslintrc.js` → ESLint rules
   - `tsconfig.json` → TypeScript strict mode
   - `.prettierrc` → Prettier formatting
   - `.checkstyle.xml` → Java style
   - `sonar-project.properties` → Code quality config

5. **[5] Detecção de Type Safety & Testes**:
   - `tsconfig.json` com `"strict": true` → Type-safety obrigatório
   - `jest.config.js` / `karma.conf.js` → Framework de testes
   - `playwright.config.ts` → E2E testing
   - `/test`, `/tests`, `/spec` folders → Padrão de tests

6. **[6] Detecção de Integração & APIs**:
   - `@openapi`/`@swagger` comments → API documentation
   - `docker-compose.yml` → Local infrastructure
   - `values-*.yaml` → Kubernetes/Helm deployment

**Output Fase 1**: Stack detectado + project_profile consolidado (YAML)

### FASE 2: **Adaptação e Geração de Artefatos** (LLM — Copilot)

O Copilot:

#### 2.1 Validar Input
- Usar o argumento do comando como fonte primária (obrigatório): **`<caminho-absoluto-do-projeto>`**
- Se o argumento estiver ausente, solicitar via `ask_questions` um caminho **absoluto**
- Validar existência do caminho no workspace antes do scanner

#### 2.2 Executar Detecção via Scanner (mesmo do `adapter-generator.agent.md`)
Use o scanner consolidado em `adapter-generator.agent.md` § 🔍 Scanner de Projeto — O Que Procurar:
- Detectar linguagens (package.json, pom.xml, build.gradle, etc)
- Detectar frameworks (Angular, React, Spring, etc)
- Detectar estrutura (monorepo, layered, component-based)
- Detectar codestyle (ESLint, Prettier, tsconfig, etc)
- Consolidar project_profile

#### 2.3 Apresentar Descobertas
- **Stack detectado**: (ex: `Java 17 + Spring Boot 3 + Hibernate`)
- **Frameworks**: (ex: `Angular 21 + RxJS`)
- **Arquitetura**: (ex: `component-based`)
- **Testing**: (ex: `Jasmine/Karma + Playwright`)

#### 2.4 Fazer 3 Perguntas via `ask_questions` (R-027 — Obrigatório)

```
[Q1] Nome do projeto?
  - Sugerido automaticamente a partir do último segmento do path
    (ex: path D:\workspace\porto\meu-projeto-backend → sugere "meu-projeto-backend")
  - Validar: kebab-case, não existe ainda em catalog.yaml
  - Exemplos: meu-projeto-backend, meu-frontend-app, meu-backend-api

[Q2] Descrição (1-2 linhas)?
  - Descreva o propósito do projeto em 1 frase
  - Exemplos:
      "Serviço de [domínio] — Java/Spring Boot"
      "Frontend de [funcionalidade] — Angular 21"
  - Livre, sem validação de formato

[Q3] Qual adapter herdar ou criar novo?
  - Listar adapters existentes em `.github/instructions/` com seus detected_stack
  - Adicionar opção: "Criar novo adapter (scanner gerará automaticamente)"
  - Sugestão automática baseada no stack detectado na FASE 1
    (ex: stack Angular → sugerir `angular-v21-frontend.instructions.md` se existir)
```

> Tipo do projeto (backend/frontend/etc) é inferido pelo scanner da FASE 1 — não é perguntado.

#### 2.5 Gerar Artefatos (NESTE repositório de governança)

- **novo_projeto.yaml** (entry para catalog — referência interna):
  ```yaml
  artefato: "projeto"
  nome: "<Q1>"
  tipo: "<inferido-pelo-scanner>"   # auto-inferido — não perguntado
  path_externo: "<caminho-absoluto-do-projeto-externo>"  # para scanner (read-only)
  extends: ["<adapter-sugerido-Q3>"]
  descrição: "<Q2>"
  ```

- **`<nome>.instructions.md`** em `./.github/instructions/` (SOMENTE se Q3 = "Criar novo adapter"):
  ```yaml
  ---
  applyTo: ["**/*.java"]   # conforme stack detectado
  projeto: "<P1>"
  detected_stack: "<stack-do-scanner>"
  ---
  ```

> ⚠️  O adapter é criado em `./.github/instructions/<nome>.instructions.md` NESTE repo.
>     Nenhum arquivo é criado no projeto externo (`<caminho-externo>`).

#### 2.6 Preview + Confirmação
- Mostrar YAML gerado
- Pedir: **"Proceder?"** (y/n)
- Se NÃO: voltar ao passo 2.4

**Output Fase 2**: YAML + Markdown revisados, preview aprovado

### FASE 3: **Binding Atômico via Script** (Execução — Copilot invoca terminal)

**Regra R-008**: Executar via terminal (fallback quando MCP indisponível). Se Context Mode MCP estiver ativo, preferir `ctx_execute` ou `ctx_batch_execute`.

O Copilot invoca script `binding_scaffolder.py` **atomicamente** (tudo ou nada):

**Pré-requisitos**:
- ✅ FASE 2 concluída: `novo_projeto.yaml` + `xxx.instructions.md` revisados
- ✅ YAML validado (sem indentação errada, sem chaves duplicadas)
- ✅ Preview aprovado pelo usuário

**Comando (Terminal via R-008)**:
```bash
cd /d/workspace/porto/eco-sistema-custom-app
python tools/binding-scaffolder/binding_scaffolder.py generate projeto ./novo_projeto.yaml
```

**Script executa (atomicamente) — SOMENTE neste repositório**:
1. **Validar**: schema YAML, kebab-case, sem duplicatas em catalog.yaml
2. **Planejar**: 3–4 operações (CREATE se novo adapter, UPDATE, UPDATE, UPDATE)
3. **Preview**: arquivos a serem modificados → "Proceder? (y/n)"
4. **Executar** (se confirmado):
   - Backup automático de arquivos
   - [CREATE] `.github/instructions/<nome>.instructions.md` ← NESTE repo (se necessário)
   - [UPDATE] `docs/ai-context/catalog.yaml` ← NESTE repo
   - [UPDATE] `docs/ai-context/README.md` ← NESTE repo
   - [UPDATE] `.github/instructions/README.md` ← NESTE repo
   - ❌ Nenhuma operação no projeto externo
5. **Validar pós**: YAML válido, entrada presente
6. **Atomicidade**: Qualquer erro → rollback automático

**Saída esperada**:
```
✅ Artefato validado: projeto
✅ [CREATE] .github/instructions/<nome>.instructions.md  ← NESTE repo
✅ [UPDATE] docs/ai-context/catalog.yaml                ← NESTE repo
✅ [UPDATE] docs/ai-context/README.md                   ← NESTE repo
✅ [UPDATE] .github/instructions/README.md              ← NESTE repo
✅ YAML válido
⚠️  Nenhum arquivo modificado nos projetos externos
🎉 Artefato gerado com sucesso!
```

**Output Fase 3**: Projeto registrado em catalog.yaml + adapters em .github/instructions/ → pronto para `/pesquisar`, `/plano`

---

## 📊 Exemplo de Saída Esperada


```
[FASE 1 ✅] Scanner READ-ONLY Executado (projeto externo — somente leitura)
├─ Projeto escaneado: D:\workspace\porto\[meu-projeto] (read-only)
├─ Linguagem: Java 17
├─ Framework: Spring Boot 3
├─ Stack: Spring Boot 3 + Hibernate + JUnit 5
├─ Estrutura: Layered (controllers, services, repositories, models)
├─ Codestyle: Checkstyle + Maven
├─ Testing: JUnit 5 + Mockito
├─ CI/CD: GitHub Actions
├─ Convenções: @Log4j2, exceções customizadas, PT-BR logging
└─ ❌ Nenhum arquivo modificado no projeto externo

[FASE 2 ✅] Perguntas + Geração de Artefatos (NESTE repositório)
├─ Pergunta 1: "Nome do projeto?" → meu-projeto-backend
├─ Pergunta 2: "Descrição?" → Serviço de processamento de [domínio]
├─ Pergunta 3: "Qual adapter herdar ou criar novo?" → criar novo adapter
├─ Gerados (NESTE repo):
│  ✓ novo_projeto.yaml (entry para catalog)
│  ✓ .github/instructions/meu-projeto-backend.instructions.md ← NESTE repo
└─ Preview aprovado ✅

[FASE 3 ✅] Binding Scaffolder — Execução Atômica (NESTE repositório)
├─ Comando: python binding_scaffolder.py generate projeto ./novo_projeto.yaml
├─ Validação: ✅ Artefato validado (schema OK, sem duplicatas)
├─ Plano: 4 operações (CREATE, UPDATE, UPDATE, UPDATE) — todas NESTE repo
├─ Preview: 4 arquivos serao modificados → [Proceder? (y/n)] → y
├─ Execução:
│  ✅ [CREATE] .github/instructions/meu-projeto-backend.instructions.md ← NESTE repo
│  ✅ [UPDATE] docs/ai-context/catalog.yaml                              ← NESTE repo
│  ✅ [UPDATE] docs/ai-context/README.md                                 ← NESTE repo
│  ✅ [UPDATE] .github/instructions/README.md                            ← NESTE repo
│  ❌ Nenhuma operação no projeto externo (meu-projeto-backend/)
├─ Validação pós: ✅ YAML válido, entrada presente em catalog
└─ Resultado: 🎉 Artefato gerado com sucesso!

🚀 Projeto adicionado! Agora pronto para: /pesquisar, /plano, /implementar
```

---

## 🔄 Quando Usar

- **Início de tarefa em projeto novo** ← Use ANTES de `/pesquisar`
- **Mudança de contexto entre projetos** ← Use quando trocar de repo
- **Preparação para refatoração** ← Use ANTES de `/plano`
- **Validação de padrões** ← Use quando não tem certeza de convenção

---

## 🚨 Troubleshooting &Validação YAML

### Validação YAML Obrigatória

**TODA VEZ QUE ALTERAR ARQUIVOS `.yml` ou `.yaml`, execute validação.**

#### Como Validar

**Opção A: Python (Recomendado)**
```bash
python -c "import yaml; yaml.safe_load(open('docs/ai-context/catalog.yaml')); print('✅ YAML válido')" || echo "❌ ERRO: YAML inválido"
```

**Opção B: yamllint (se disponível)**
```bash
yamllint docs/ai-context/catalog.yaml
```

#### Checklist Pré-Confirmação (FASE 2.6)

Antes de confirmar `"Proceder? (y/n)"` em Fase 2:

- [ ] `novo_projeto.yaml` foi validado sem erros?
- [ ] Indentação é consistente (2 espaços)?
- [ ] Sem tabs ou espaços misturados?
- [ ] Todas as aspas fechadas?

**Se falhar em qualquer ponto**: PARE, corrija manualmente, e valide novamente.

### Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| "Projeto já existe em catalog" | Nome duplicado | Use nome único, ex: `projeto-exemplo-unico` |
| "Copilot não apresenta descobertas" | Prompt não carregado corretamente | Reexecute `/add-project-context` ou carregue manualmente |
| "Erro ao atualizar catalog.yaml" | YAML inválido | Valide YAML conforme checklist acima |
| `mapping values are not allowed here` | Indentação errada | Use **2 espaços**, nunca tabs |
| `could not find expected ':'` | YAML malformado | Valide sintaxe de `key: value` |
| `duplicate key` | Chave duplicada | Remova entrada duplicada |
| "Script falha com ModuleNotFoundError" | Dependências faltando | `pip install pyyaml jinja2` |
| "Script mostra 'Campo obrigatório ausente'" | YAML gerado incompleto | Verificar se `novo_projeto.yaml` tem: artefato, nome, tipo, extends, descrição |
| "Rollback ocorreu" | Erro durante execução | Arquivo foi restaurado. Verificar saída e corrigir entrada |

---

## ✅ Checklist: Copilot Executou Corretamente?

Após invocar `/add-project-context D:\workspace\porto\[meu-projeto]`, verifique:

- [ ] **FASE 1**: Copilot apresentou descobertas (Stack, Frameworks, Estrutura, Codestyle)?
- [ ] **FASE 2.1**: Solicitou ou inferiu o caminho do projeto corretamente?
- [ ] **FASE 2.2-2.3**: Executou scanner (adapter-generator) e apresentou descobertas?
- [ ] **FASE 2.4**: Fez exatamente **3 perguntas** (nome, descrição, adapter)?
- [ ] **FASE 2.4**: Sugeriu nome baseado no path? (ex: `meu-projeto-backend`)
- [ ] **FASE 2.4**: Sugeriu adapter baseado no stack detectado?
- [ ] **FASE 2.5**: Gerou `novo_projeto.yaml` + `<nome>.instructions.md` (se criar novo)?
- [ ] **FASE 2.6**: Mostrou preview antes de confirmar?
- [ ] **FASE 3**: Invocou script corretamente?
- [ ] **FASE 3**: Confirmou: ✅ "Artefato gerado com sucesso!"?
- [ ] **Pós-execução**: `docs/ai-context/catalog.yaml` foi atualizado?
- [ ] **Pós-execução**: `.github/instructions/README.md` foi sincronizado?

**Se todos checkpoints completaram**: ✅ **Sucesso!**  
**Se algum falhou**: ⚠️ Ver seção Troubleshooting acima.

---

## 🔍 Próximos Passos Após Execução

Após `/add-project-context` completar com sucesso:

- **`/pesquisar <tema>`** — explorar padrões específicos com contexto já estruturado
- **`/plano`** — planejar mudanças com knowledge base do projeto pronto
- **`/implementar`** — executar com `/ctx-checkpoint` para continuidade
- **`/validar`** — validar qualidade do projeto

Exemplo típico:
```bash
/add-project-context meu-projeto-backend
/pesquisar "como usar @EmbeddedId"
/plano "refatorar Entity para usar EmbeddedId"
```

---


