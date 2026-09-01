---
name: init-context
description:
  ⚠️ PRÉ-REQUISITO OBRIGATÓRIO — Inicializa contexto de governança global para TODA sessão.
  Carrega CLAUDE.md + copilot-instructions.md, valida conformidade R-001..R-040 + Model Enforcement (R-036).
  Execute UMA ÚNICA VEZ no início da sessão ANTES de /add-project-context ou qualquer agent.
  NÃO REPITA na mesma sessão — faz 1x apenas.
model: "claude-haiku-4.5"
tools: ['read_file', 'list_dir', 'run_subagent']
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - docs/ai-context/catalog.yaml
---

# `/init-context`

**PRIMEIRO COMMAND DA SESSÃO — Obrigatório antes de tudo!**

Inicializa contexto obrigatório de governança. Execute 1x por sessão APENAS.

> **PROPÓSITO**: PRÉ-REQUISITO para toda execução downstream. Carregar regras R-001..R-039, validar model, eliminar alucinação.
>
> **FREQUÊNCIA**: ❌ 1x POR SESSÃO (nunca repita na mesma sessão)
>
> **ORDEM**: SEMPRE PRIMEIRO — antes de `/add-project-context` ou `@agent-router`
>
> **PRÓXIMO PASSO**: Após `/init-context` completar, execute `/add-project-context <projeto>` para cada projeto novo.

---

## 📌 Source Docs (Pre-Fetch Obrigatório)

Este prompt carrega **automaticamente** (conforme frontmatter `source_docs`):

- ✅ **`CLAUDE.md`** — Governança global, regras normativas R-001..R-039
- ✅ **`.github/copilot-instructions.md`** — Roteamento rápido, agents, skills, binding

**Validação**: Se algum arquivo não foi anexado, Copilot **DEVE** alertar e carregá-lo manualmente.

```
⚠️ ALERTA: Arquivo não anexado automaticamente!
   → Carregando manualmente...
```

---

## 🎯 Uso

### Invocação Explícita (Manual)

```bash
/init-context
```

### Invocação Automática (Copilot — Obrigatório)

Copilot **EXATAMENTE**:
1. Ao iniciar sessão ou trabalho em novo repositório
2. Após reset explícito do usuário ou perda de contexto relevante
3. ANTES de invocar `@agent-router` na primeira execução da sessão

---

## 📋 Execução em 6 Passos

### **PASSO 1: Validar Carregamento de Diretrizes Base**

Copilot VERIFICA que ambos os `source_docs` foram carregados:

```
[Health Check] Source Docs
├─ CLAUDE.md → ✅ Anexado (regras R-001..R-039)
├─ .github/copilot-instructions.md → ✅ Anexado (agents + skills + binding)
└─ Status: ✅ Pronto
```

**Se FALTA algum:**

```
⚠️ PRÉ-REQUISITO NÃO ATENDIDO!

Arquivo faltando: <arquivo>

→ Tentando carregar manualmente...
```

**Depois, prosseguir para PASSO 2.**

---

### **PASSO 2: Informar Modelo Ativo (R-021)**

Exibir modelo em uso — apenas **informativo**, não bloqueante:

```
[Model Info]
├─ Recomendado: Claude Haiku (inicialização, Q&A)
│               Claude Sonnet+ (implementação/refactor)
│               Claude Opus  (arquitetura complexa)
├─ Atual (sessão): <model-atual>
└─ ℹ️  R-036 é verificado ao invocar agents de implementação — não aqui.
```

> `/init-context` carrega contexto de governança — não bloqueia por modelo.
> A verificação bloqueante (R-036 com `ask_questions`) ocorre ao invocar agents
> de implementação: `@bug-triage`, `@test-implementation`, `@refactor-planner`, etc.

---

### **PASSO 3: Exibir Regras Críticas**

O nível de detalhe é **condicional** — verificar se binding context existe (PASSO 4 antecipa resultado):

#### Se binding context **JÁ EXISTE** (sessão recorrente):

Exibir apenas top 5 — sem ruído para quem já conhece as regras:

```
📋 TOP 5 REGRAS CRÍTICAS ATIVAS  (ver todas: CLAUDE.md)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[R-009] Sem arquivos autônomos: solicite aprovação ANTES
[R-010] Segurança: nunca expor credenciais
[R-027] Clarificação: use ask_questions (nunca deduza)
[R-037] Agent Router First: toda solicitação → @agent-router
[R-038] Genericidade: .github/* sem projetos específicos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✅ R-001..R-040 ativas — Agents respeitarão
```

#### Se binding context **NÃO EXISTE** (primeira execução):

Exibir resumo completo para garantir alinhamento:

```
📋 REGRAS CRÍTICAS ATIVAS (primeira execução — leia com atenção)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[R-001] Escopo: altere APENAS o solicitado
[R-002] Mudança mínima: prefira pequenas alterações
[R-003] Sem duplicação: regra global → CLAUDE.md
[R-008] Execução: prefira ctx_* (terminal é fallback)
[R-009] Sem arquivos autônomos: solicite aprovação ANTES
[R-010] Segurança: nunca expor credenciais
[R-027] Clarificação: use ask_questions (nunca deduza)
[R-031] Plano Auto-Implementável: zero-interrupção + contingências
[R-034] Health Check Binding: verificar catalog.yaml + binding.md
[R-035] Terminal: sem paginação interativa (--no-pager, GIT_PAGER=cat)
[R-036] Model Enforcement: verificado ao invocar agents de implementação
[R-037] Agent Router First: TODA solicitação começa com @agent-router
[R-038] Genericidade: .github/* deve ser genérica (sem projetos específicos)
[R-039] Diagramas: usar Mermaid em .md (nada de PNG/SVG)
[R-040] Grafo de Roteamento: routing-graph.yaml é fonte de verdade estrutural

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✅ R-001..R-040 ativas — Agents respeitarão
```

---

### **PASSO 4: Validar Binding Context (R-034)**

Verificar se estrutura de binding existe **NESTE repositório de governança**:

```
[Health Check] Binding Context (R-034) — verificando NESTE repositório
├─ ./docs/ai-context/catalog.yaml → ?
├─ ./docs/ai-context/binding.md → ?
└─ Status: ?
```

> ⚠️  O binding context (catalog.yaml + binding.md) é **EXCLUSIVO DESTE repositório**.
> Projetos externos (project-example-app, etc.) NÃO possuem
> e NÃO devem possuir catalog.yaml ou binding.md.
**Se AMBOS existem:**

Ler `catalog.yaml` e exibir estado real dos projetos registrados:

```
✅ Binding context DETECTADO (neste repositório de governança)

   Projetos registrados:
   ├─ <nome-projeto-1>  → adapter: <nome-projeto-1>.instructions.md ✅
   ├─ <nome-projeto-2>  → adapter: <nome-projeto-2>.instructions.md ✅
   └─ ... (total: <n> projetos)

   Adapters em .github/instructions/:
   └─ <lista-de-arquivos-.instructions.md>

   → Pronto para /add-project-context, /pesquisar, /plano, @agent-router
```

**Se ALGUM FALTA:**

```
⚠️ Binding context INCOMPLETO (neste repositório)!

Faltando:
  - <arquivo>

→ Disparando agent `binding-initializer` para criação...
→ Todos os arquivos serão criados NESTE repositório.
→ Nenhum arquivo será criado nos projetos externos.
```

---

### **PASSO 5: Verificar Herança de Instruções Genéricas**

Para cada projeto registrado em `catalog.yaml`, verificar se o campo `extends:` está configurado, conectando o projeto aos adapters genéricos disponíveis.

```
[Health Check] Herança de Instruções Genéricas
├─ Adapters genéricos disponíveis:
│   ├─ Listar automaticamente de `.github/instructions/*.instructions.md`
│   └─ Sugerir herança por similaridade de stack
├─ Projetos sem `extends:` configurado: ?
└─ Status: ?
```

**Se `projetos:` está vazio ou todos já têm `extends:`:**

```
✅ Herança de instruções OK
   → Nenhum projeto sem extends: pendente
   → Pronto para /add-project-context, /pesquisar, /plano
```

**Se algum projeto registrado está sem `extends:`**, perguntar via `ask_questions` (por projeto):

```
Projeto "[nome-do-projeto]" não possui `extends:` configurado.
Deseja configurar herança de instruções genéricas agora?
```

Opções:
- **(A)** Herdar 1 adapter existente (selecionar da lista)
- **(B)** Herdar múltiplos adapters existentes
- **(C)** Não herdar agora — projeto possui ou terá adapter próprio

**Se usuário escolhe A ou B:**
1. Exibir preview do YAML a ser adicionado ao projeto em `catalog.yaml`:
   ```yaml
   extends:
     - "<adapter-id>"
   ```
2. Aguardar confirmação do usuário
3. Atualizar `catalog.yaml` com o campo `extends:` no projeto correspondente

**Se usuário escolhe C:**
```
⚠️ Projeto sem herança de instruções genéricas registrada.
   Certifique-se de que possui adapter próprio em .github/instructions/
```

---

### **PASSO 6: Validar Atividade do Context Mode (Dashboard Health)**

Verificar se a sessão atual do Context Mode está sendo rastreada para evitar "Dashboard vazia" no JetBrains:
1. Execute `ctx_stats()`.
2. Se `Total calls` retornar 0 ou falhar, invoque `/ctx-start` para inicializar a telemetria e o banco de dados da sessão.

---

### **PASSO 7: Verificar Cache de Grafo de Conhecimento e Sumarização (por Projeto)**

Para cada projeto registrado em `catalog.yaml` (`projetos:`), verificar se já existe cache de **grafo de conhecimento** (`@code-knowledge-graph`) e de **sumarização** (`@code-summarizer`) no Context Mode — evita reconstrução/reprocessamento desnecessário e informa ao usuário o que já está disponível para consulta imediata.

```
[Health Check] Cache de Grafo/Sumarização por Projeto
├─ Projetos registrados em catalog.yaml: <n>
├─ Se <n> = 0 → pular este passo (nenhum projeto para checar)
└─ Para cada <project-id>:
    ├─ ctx_search(queries: ["code-graph:<project-id>:*"])   → grafo cacheado?
    └─ ctx_search(queries: ["code-summary:<project-id>:*"]) → sumários cacheados?
```

> Executar em **lote** via `ctx_batch_execute` (queries de todos os projetos no mesmo array — nunca 1 chamada por projeto, R-008/economia de contexto/token budget).

**Exibir tabela consolidada:**

```
📊 STATUS DE CACHE — Grafo de Conhecimento e Sumarização
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Projeto           | Grafo (code-graph:*) | Sumarização (code-summary:*)
------------------|----------------------|------------------------------
<project-id-1>    | ✅ cacheado          | ✅ cacheado
<project-id-2>    | ❌ ausente           | ⚠️ parcial (<n> arquivos)
<project-id-3>    | ❌ ausente           | ❌ ausente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: <n-com-grafo>/<n-total> com grafo | <n-com-sumario>/<n-total> com sumarização
```

**Se algum projeto estiver sem cache (grafo e/ou sumarização):**

```
ℹ️ Cache ausente não bloqueia a sessão — apenas informativo.
   → Para construir grafo: invocar @code-knowledge-graph (RF-002, sob demanda)
   → Para sumarizar: invocar @code-summarizer (RF-002, sob demanda)
   → Nenhuma construção automática é feita por este prompt (R-009 — sem ação autônoma sem confirmação)
```

**Se `projetos:` estiver vazio em `catalog.yaml`:**

```
ℹ️ Nenhum projeto registrado ainda — pulando verificação de cache de grafo/sumarização.
   → Use /add-project-context <caminho> para registrar o primeiro projeto.
```

---

## ✅ Validação Final — Checklist de Inicialização

Ao concluir `/init-context`, Copilot **EXIBE**:

```
╔═══════════════════════════════════════════════════════════╗
║         ✅ CONTEXTO DE GOVERNANÇA INICIALIZADO            ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║ [✅] Diretrizes base carregadas                          ║
║      CLAUDE.md + copilot-instructions.md                 ║
║                                                           ║
║ [✅] Modelo conforme (R-036)                             ║
║      Esperado: <model-frontmatter>                       ║
║      Atual: <model-sessão>                               ║
║                                                           ║
║ [✅] Regras críticas (R-001..R-040) ativas              ║
║      Exibidas conforme contexto (recorrente/1ª vez)      ║
║                                                           ║
║ [✅] Binding context verificado (R-034)                  ║
║      Localização: ./docs/ai-context/ DESTE repo          ║
║      Projetos registrados: <n-projetos>                  ║
║      Adapters em .github/instructions/: <n-adapters>     ║
║                                                           ║
║ [✅] Herança de instruções verificada (PASSO 5)          ║
║      Projetos com extends: <n-projetos-com-extends>      ║
║      Projetos sem extends: <n-projetos-sem-extends>      ║
║                                                           ║
║ [✅] Context Mode Session (PASSO 6)                      ║
║      Estatísticas: <Total calls> chamadas               ║
║      Status: ✅ Ativo (rastreável no Dashboard)         ║
║                                                           ║
║ [✅] Cache de Grafo/Sumarização por Projeto (PASSO 7)    ║
║      Grafo (code-graph:*): <n-com-grafo>/<n-total>       ║
║      Sumarização (code-summary:*): <n-com-sumario>/<n-total> ║
║                                                           ║
║ [✅] PRONTO PARA PRÓXIMO PASSO                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

🎯 Próximos passos recomendados:
    → /add-project-context <caminho-externo>  para plugar um projeto externo
    → /del-project-context <nome-projeto>     para desplugar um projeto
    → @agent-router                           para classificar intenção
    → /health                                 para checar saúde da governança
    → /deep-search, /plan, /implement, /validate para fluxo de desenvolvimento
    → Nenhum arquivo será criado fora DESTE repositório de governança ✅

ℹ️  Validação de contexto: ✅ SUCESSO
   Estado armazenado para sessão | Disponível para agents downstream
```

---

### 💡 Recomendações ao Usuário

Ao final do checklist, Copilot **SEMPRE** sintetiza em bullets objetivos as recomendações derivadas do que foi observado nos Passos 1-7 — nunca genéricas, sempre condicionadas ao estado real detectado nesta execução:

```
💡 RECOMENDAÇÕES PARA ESTA SESSÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Model]     <se mismatch: "Troque para <model-esperado> antes de agents de implementação (R-036)">
[Binding]   <se incompleto: "Execute binding-initializer — catalog.yaml/binding.md ausentes (R-034)">
[Extends]   <se houver projeto sem extends: "Configure herança em <n> projeto(s) pendente(s) — PASSO 5">
[Cache]     <se houver projeto sem grafo/sumário: "Considere @code-knowledge-graph/@code-summarizer para <projeto(s)> antes de análises profundas">
[Sessão]    <se Context Mode inativo: "Rode /ctx-start — Total calls = 0, dashboard não vai rastrear">
[Fluxo]     "Toda solicitação a partir daqui deve começar por @agent-router (R-037)"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Regras de geração:**
- Cada linha só aparece se a condição correspondente foi de fato detectada nos Passos 1-7 desta execução — nunca listar recomendação para item já ✅/conforme.
- Se **nenhuma** condição de alerta foi detectada (tudo ✅), exibir apenas:
  ```
  💡 RECOMENDAÇÕES PARA ESTA SESSÃO
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Nenhuma pendência detectada — ambiente 100% conforme.
  → Prossiga diretamente para @agent-router.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```
- Recomendações são **sempre informativas** — nunca bloqueiam a sessão nem disparam ação autônoma (R-009); apenas apontam o próximo comando/agent que o usuário pode invocar.
- Ordem fixa: Model → Binding → Extends → Cache → Sessão → Fluxo (reflete a ordem dos Passos 2/4/5/7/6/router).

---

## 🚀 Integração com Agent Router

Após `/init-context` executar com sucesso, **Copilot automaticamente prossegue**:

```
[CONTEXTO INICIALIZADO] ✅

Você está pronto para:

1. @agent-router
   └─ Copilot classifica intenção
   └─ Copilot roteia para agent correto

2. Agent Downstream (bug-triage | test-strategy | etc)
   └─ Recebe contexto já carregado + diretrizes ativas
   └─ Nenhuma violação de R-001..R-039 esperada
```

**Regra (R-037)**: Toda solicitação após `/init-context` deve começar com `@agent-router`.

---

## 🔄 Quando Invocar Manualmente

Invoque `/init-context` **manualmente** em caso de:

| Cenário | Ação |
|---------|------|
| Novo repositório / primeira vez | `/init-context` ANTES de qualquer agent |
| Mudança de contexto entre projetos (mesma sessão) | usar `/add-project-context` para o projeto alvo (sem repetir `/init-context`) |
| Ambiguidade em regras | `/init-context` para validar conformidade |
| Agent comportamento estranho | `/init-context` + `/ctx-doctor` (diagnóstico) |
| Início de nova sessão (cross-session) | `/init-context` para recarregar estado |

---

## 🚨 Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| "Arquivo não anexado" | Pre-fetch falhou | Copilot carrega manualmente via `read_file` |
| "Model mismatch" | Modelo não é o esperado | Escolher opção (A), deixar (B) ou cancelar (C) |
| "Binding context ausente" | `catalog.yaml` ou `binding.md` faltando | Disparar `binding-initializer` automaticamente |
| "Copilot não respeita regras após" | Regras não foram relevantes no downstream | Reexecutar `/init-context` ou ativar diagnostics com `/ctx-doctor` |

---

## ✅ Resultado Final Esperado

Ao completar `/init-context`, você verá:

```
CONTEXTO INICIALIZADO COM SUCESSO

[PASSO 1] Diretrizes base — OK
[PASSO 2] Modelo ativo — INFORMADO
[PASSO 3] Regras criticas — ATIVAS (R-001..R-040)
[PASSO 4] Binding context — VALIDO (<n> projetos registrados)
[PASSO 5] Herança de instruções — OK (<n-com-extends> c/ extends | <n-sem-extends> sem extends)
[PASSO 6] Context Mode Session — ATIVA (<n> chamadas)
[PASSO 7] Cache grafo/sumarização — <n-com-grafo>/<n-total> com grafo | <n-com-sumario>/<n-total> com sumarização

Proximo: /add-project-context <path> | /pesquisar | @agent-router
```

---

*v1.2 Init Context Prompt — 2026-06-12*
PASSO 5 adicionado: verificação de herança de instruções genéricas via campo `extends:` em `catalog.yaml`.

*v1.3 — 2026-09-01*
PASSO 7 adicionado: verificação de cache de grafo de conhecimento (`code-graph:<project-id>:*`, `@code-knowledge-graph`) e de sumarização (`code-summary:<project-id>:*`, `@code-summarizer`) por projeto registrado em `catalog.yaml`, via `ctx_batch_execute`/`ctx_search` em lote — puramente informativo, nunca aciona construção/sumarização automática (R-009).

*v1.4 — 2026-09-01*
Seção "💡 Recomendações ao Usuário" adicionada ao final do checklist de validação — sintetiza em bullets condicionais (Model/Binding/Extends/Cache/Sessão/Fluxo) apenas as pendências reais detectadas nos Passos 1-7, sempre informativa e nunca bloqueante/autônoma (R-009).

