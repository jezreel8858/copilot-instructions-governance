# CLAUDE.md — governanca-ai-reutilizavel

## 1) Objetivo

Este arquivo é a fonte de verdade operacional para o uso de IA em qualquer repositório que adote esta base de governança.

- Escopo desta base: estabelecer governança genérica, desacoplada de domínio e tecnologia.
- Regra de ouro: evitar duplicação de regra entre arquivos de instrução.

## 2) Hierarquia de Instruções

Em caso de conflito, siga esta ordem:

1. System
2. Developer
3. User
4. Arquivos locais deste repositório (`CLAUDE.md`, `.github/*`)

## 3) Regras Normativas (R-001..R-040)

- **R-001 (Escopo)**: altere apenas o que foi solicitado.
- **R-002 (Mudança mínima)**: prefira alterações pequenas, reversíveis e rastreáveis.
- **R-003 (Sem duplicação)**: regra global fica em `CLAUDE.md`; `.github/*` referencia, não copia.
- **R-004 (Rastreabilidade)**: sempre citar caminhos exatos dos arquivos tocados.
- **R-005 (Não inventar catálogo)**: não listar agent/skill inexistente.
- **R-006 (Pré-condições — Roteador)**: vide [`agent-router.agent.md`](.github/agents/agent-router.agent.md) § *Matriz de Decisão: Quando Pedir Contexto*. Regra específica do roteador; não é norma global.
- **R-007 (Decisões explícitas)**: registrar decisões relevantes em bullets curtos.
- **R-008 (Execução preferencial)**: para comandos e análise pesada, prefira `ctx_execute`, `ctx_execute_file` ou `ctx_batch_execute`. Terminal é fallback apenas quando `ctx_*` estiver indisponível. Se Context Mode falhar, PARE e informe o problema.
- **R-009 (Sem arquivos autônomos)**: nunca crie arquivos de qualquer formato sem solicitação explícita. Se julgar necessário, SOLICITE aprovação ANTES.
- **R-010 (Segurança)**: nunca expor credenciais, tokens ou dados sensíveis.
- **R-011 (Sem overengineering)**: implementar o necessário para a fase atual.
- **R-012 (Clarificação progressiva)**: antes de implementar, avalie se a solicitação tem escopo suficiente. Se ambígua, use `ask_questions` com sugestões pré-preenchidas — nunca pergunte em aberto. Máximo 3 perguntas por ciclo. Não aplique em solicitações simples com intenção clara.
- **R-013 (PT-BR operacional)**: documentação de governança e respostas operacionais em PT-BR.
- **R-014 (Um objetivo por arquivo)**: cada documento deve ter responsabilidade clara.
- **R-015 (Atualização atômica de catálogo)**: alterou governança, atualize os READMEs de catálogo na mesma entrega.
- **R-016 (Evidência objetiva)**: resultados com evidência (`arquivo`, `simbolo`, `comando`) e próximo passo mínimo.
- **R-017 (PT-BR com acentuação correta)**: em arquivos `.md` redigidos em português, use ortografia e acentuação corretas. Evite transliteração ASCII quando o termo exigir acento.
- **R-018 (Planejamento paralelo)**: ao estruturar planos, identifique etapas independentes. Marque com `[P]` paralelo ou `[S]` sequencial. Etapas sem dependência DEVEM ser agrupadas para execução simultânea.
- **R-019 (Busca web proativa com ctx-cache)**: antes de propor solução para cenários de incerteza técnica, siga o fluxo: `ctx_search` no cache primeiro → Tavily se insuficiente → indexar resultado via `ctx_index`. Para docs externos, prefira `ctx_fetch_and_index` (cache 24h nativo). Não use para perguntas sobre o próprio codebase.
- **R-020 (Falha compacta)**: ao reportar erros, use formato 3 linhas — Causa / Local / Ação sugerida. Proibido stack trace completo sem pedido. Máximo 5 erros; resto: `(+N erros similares)`.
- **R-021 (Model Routing Signal)**: avalie o tipo da tarefa antes de agir. Emita sinal visual **antes** de codar quando a tarefa exigir modelo 1× ou superior. MCP tools amplificam modelos menores — use-os antes de escalar. Nunca use modelo pesado para tarefa que modelo leve resolve.
- **R-022 (Auto-recuperação do Context Mode)**: quando `ctx_*` falhar com `Not connected`, realize **1 tentativa automática** de recuperação. Após restart, execute 1 health check (`ctx_doctor`) e retome. Se não voltar, PARE e solicite ação manual. Proibido repetir tentativas automáticas.
- **R-023 (MCP Trust Allowlist)**: conecte apenas servidores MCP confiáveis/aprovados; nunca use MCP de origem não verificada.
- **R-024 (MCP Least-Tools)**: mantenha ativas somente as ferramentas MCP necessárias à tarefa corrente.
- **R-025 (MCP Prompt Budget)**: se houver degradação por excesso de tools MCP, reduza a superfície de ferramentas antes de prosseguir.
- **R-026 (Sem código inline em agents/skills/prompts)**: arquivos `.github/agents/*.md`, `.github/skills/*/SKILL.md` e `.github/prompts/*.md` NÃO devem conter blocos de código com implementações > 8 linhas. Código real vai em `snippets/`, `templates/` ou `commands/`, referenciado por caminho ou `source_docs:`.
- **R-027 (Clarificação Obrigatória via ask_questions)**: frente a qualquer ambiguidade, use EXCLUSIVAMENTE `ask_questions` antes de agir. Proibido inferir ou deduzir intenção. A última opção sempre deve ser campo aberto. Sem exceções, ressalvado R-041 (loop controlado do agent `prompt-structuring`, limitado a 5 iterações).
- **R-028 (Estrutura de Resposta — Code Assist Standard)**: ao iniciar qualquer implementação, exiba resumo em 5 seções: **(1)** Resumo da Abordagem; **(2)** Visão Geral dos Componentes; **(3)** Implementação; **(4)** Passos Cruciais; **(5)** Notas Técnicas de Impacto. Para outros perfis de agent (router, analista, operacional), consulte o modelo de 2 camadas (universal + template por perfil) em `.github/skills/agent-contracts/SKILL.md` § 8.
- **R-029 (Postura Senior Engineer)**: **(a)** prefira bullets e tabelas a parágrafos; **(b)** código limpo sem explicações inline; **(c)** elimine introduções genéricas de IA — responda como colega sênior, preciso e focado.
- **R-030 (Checkpoint obrigatório por fase/plano)**: durante `/implement`, ao concluir cada fase (`- [x]`) e ao concluir o plano, execute `/ctx-checkpoint` imediatamente, registrando `lastStep`, `nextStep` e `source` do checkpoint na resposta.
- **R-031 (Plano Auto-Implementável — Zero-Interrupção)**: todo plano aprovado (explícito ou por contexto claro) DEVE ser executado integralmente sem interrupção nem contra-medida do agent. **Pré-voo obrigatório** antes de iniciar: **(a)** Escopo completo — todos os artefatos mapeados e dependências resolvidas; **(b)** Contingências por fase — cada passo com `[fallback: <ação alternativa se falhar>]` inline; **(c)** Critério de falha tolerável — distinguir o que é contornável (warnings, arquivo ausente, tool lenta) do que é bloqueante real; **(d)** Bloqueantes absolutos — único motivo de parada permitido: violação de R-003 (commit autônomo), exposição de credencial (R-010), ou estado de dados irrecuperável detectado. **Formato de contingência por passo:** `[S] Passo X — descrição [fallback: alternativa]`. Ao final, **relatório de execução** (o que foi feito, o que usou fallback, próximo passo) substitui checkpoints intermediários. Proibido pedir confirmação mid-plan.
- **R-032 (Nomeação de documentação)**: todo novo arquivo de documentação `.md` criado deve usar `kebab-case` no nome.
- **R-033 (Não gerar documentação automaticamente)**: nunca gere documentos `.md` se não for solicitado ou sem a aprovação por `ask_questions`.
- **R-034 (Health Check de Binding Context)**: ao iniciar trabalho em novo repositório com esta base, Copilot DEVE verificar se existem `docs/ai-context/catalog.yaml` e `docs/ai-context/binding.md`. Se faltarem: ⚠️ **ALERTAR E DISPARAR AGENT `binding-initializer`** com sequência de `ask_questions` para gerar arquivos customizados. Sem exceções — binding é pré-requisito para descoberta de adapters.
- **R-035 (Terminal sem paginação interativa)**: nunca executar comandos que abram pager interativo (ex.: `less`, `more`, `git log` paginado) que exijam `q` para sair. Sempre usar modo não interativo (`--no-pager`, `GIT_PAGER=cat`, pipes com `cat`, limites explícitos) para evitar bloqueio da sessão.
- **R-036 (Conformidade de Modelo — Model Enforcement)**: Ao iniciar qualquer agent/prompt/skill, o Copilot DEVE verificar **ANTES** de executar: `Est á o model da minha sessão = model definido no frontmatter do artefato?`. Se NÃO coincidir: **ALERTAR** via `ask_questions` com 3 opções: **(A)** Trocar para o modelo correto (ex: `Claude Sonnet 4.5`); **(B)** Continuar com modelo atual (aceitando potencial perda de qualidade); **(C)** Cancelar execução. Sem exceções — model mismatch impacta QoS. Formato de verificação: `[Model Check] Expected: <model-frontmatter> | Current: <model-sessão> | Status: ❌ MISMATCH`. Se usuário escolher **A**, Copilot PODE recomendar `/switch-model <modelo-correto>` se disponível, ou instruir: "Troque manually em settings → Model".
- **R-037 (Ponto de Entrada Obrigatório — Agent Router First)**: **SEM EXCEÇÕES**, toda solicitação deve começar com `@agent-router`. Controller routing é o ponto de entrada único para: **(a)** classificação de intenção; **(b)** decisão de rota; **(c)** prevenção de implementação direta sem triagem. O roteador delega para downstream (bug-triage, test-strategy, refactor-planner, impact-architect, docs-curator, research-router, analysis-architect) conforme necessidade. Bypass de @agent-router é violação de governança. Proibido implementar sem passar por triagem.
- **R-038 (Genericidade Obrigatória em Governança)**: Toda documentação de governança criada em `.github/` (agents, skills, prompts, copilot-instructions) **DEVE ser genérica**, desacoplada de: **(a)** projetos específicos; **(b)** tecnologias exclusivas; **(c)** convenções de domínio particulares. Convencionalidades, adapters e exemplos concretos **PERTENCEM EXCLUSIVAMENTE A** `.github/instructions/*.instructions.md` (adapters) ou `docs/ai-context/` (contexto de binding). Se uma regra de governança referencia projeto, domínio ou tech específica, é violação de R-038. Teste: substituir nome de projeto/tecnologia por `[PROJETO]` ou `[TECH]` — se deixar de fazer sentido, está muito específica para governança global.
- **R-039 (Diagramas em Markdown com Mermaid)**: Todo diagrama incorporado em arquivo `.md` **DEVE usar Mermaid** (sintaxe nativa de blocos code com linguagem `mermaid`). Razões: **(a)** versionabilidade — diagramas vivem no Git, não em binários; **(b)** portabilidade — renderização nativa em GitHub, GitLab, Notion e ferramentas de IA; **(c)** manutenibilidade — patches e reviews sem ferramentas específicas. Proibido: imagens PNG/SVG geradas externamente, Visio, Lucidchart embarcados. Se precisar de estilo avançado, use plugins Mermaid ou refatore para simplificar.
- **R-040 (Grafo de Roteamento como Fonte de Verdade)**: O roteamento de agents **DEVE ser declarado como dado estruturado** (ex.: `docs/ai-context/routing-graph.yaml` com nós, arestas, thresholds e política de cascata). A Decision Tree em prosa de qualquer agent-router é **documentação derivada** — não fonte única. Toda nova rota ou agente adicionado ao ecossistema exige: **(a)** entrada no grafo estruturado; **(b)** atualização da Decision Tree (derivada); **(c)** novo caso de teste em `docs/ai-context/evals/casos-roteamento.yaml` (equivalente ao R-015 para evals). Threshold de confiança para cada rota deve ser declarado explicitamente no grafo e reportado no output do router.
- **R-041 (Exceção de Loop Controlado — Agent `prompt-structuring`)**: por exceção formal a R-011 (sem overengineering), R-012 (clarificação progressiva, máx. 3 perguntas/ciclo) e R-027 (proibição de loop em `ask_questions`), o agent `prompt-structuring` é o **ÚNICO** agent do catálogo autorizado a operar em loop de auto-refinamento de prompt. Regras do loop: **(a)** limite rígido `loop_count <= 5` — ao atingir 5 iterações sem completude, o loop é interrompido compulsoriamente e o fluxo prossegue com o melhor prompt disponível, sinalizando a limitação; **(b)** cada iteração avalia o prompt contra o checklist estrutural `<task>/<context>/<constraints>/<output_format>`; se incompleto, faz **no máximo 1 pergunta objetiva por iteração** via `ask_questions` (nunca aberta); **(c)** encerramento antecipado é obrigatório assim que o prompt atingir completude — não force as 5 iterações; **(d)** o agent SEMPRE retorna para `@agent-router` ao final (sucesso ou limite atingido) — nunca roteia diretamente para downstream. Nenhum outro agent do catálogo pode adotar este padrão de loop sem nova exceção formalizada nesta regra.

## 3.1) Regra de Autoria de Agents

- Toda criação ou revisão de agent customizado deve usar o `agent-factory`.
- Ao criar novo agent, atualizar `README.md` e `catalog.yaml` na mesma entrega.

## 4) Fluxo Operacional Base

**SEM EXCEÇÃO: Todo fluxo deve começar com `@agent-router`**

```
Solicitação do Usuário
           ↓
    @agent-router ←── OBRIGATÓRIO (Health Check R-034)
           ↓
    @prompt-structuring ←── OBRIGATÓRIO (R-041 — loop máx. 5 iterações)
    (refina prompt em <task>/<context>/<constraints>/<output_format>)
           ↓
    @agent-router ←── retorno obrigatório (loop nunca roteia direto)
    (classificação de intenção com prompt refinado)
           ↓
  [Delega para downstream correto]
       ↙ ↓ ↘ ↙ ↓ ↘
  @bug-triage  @test-strategy  @refactor-planner
  @impact-architect  @docs-curator
  @research-router  @analysis-architect
           ↓
        [EXECUÇÃO]
           ↓
      [RESULTADO]
```

**Fases de Execução:**

1. **Triagem** (agent-router): classificar intenção e decidir rota
2. **Análise** (agent downstream): executar análise específica
3. **Validação** (self-check): revisar consistência
4. **Resumo**: reportar resultado, evidências e próximos passos

## 5) Estrutura de Governança

- `.github/copilot-instructions.md` -> regras operacionais e roteamento rápido.
- `.github/agents/README.md` -> catálogo de agents e uso.
- `.github/skills/README.md` -> catálogo de skills e padrão.
- `.github/instructions/README.md` -> catálogo de instructions e convenções de domínio.
- `.github/hooks/context-mode.json` -> hooks de continuidade para context-mode.
- `.github/prompts/README.md` -> comandos operacionais do workflow.
  - **Novo (v1.1)**: 
    - `/add-project-context` — Auto-carregar contexto com Intent + RRF (**com implementation guide para Copilot**)
    - `/del-project-context` — Remover contexto de projeto com confirmação
  - **Novo (v1.2)**:
    - Health Check (R-034): Se faltarem `catalog.yaml` + `binding.md`, disparar `binding-initializer` automaticamente
- `.github/agents/catalog.yaml` -> catálogo estruturado de agents.
- `.github/skills/.index.json` -> índice estruturado de skills.

## 6) Catálogo Atual (estado verificado)

### Agents (18 ativos)
- `agent-router` v1.1.0 — entry point obrigatório; confidence score + nível de routing declarados no output; routing-graph.yaml como fonte estrutural (R-040)
- `prompt-structuring` — ⚠️ passo mandatório pós-`agent-router` (R-041); loop de refinamento de prompt limitado a 5 iterações; sempre retorna ao `agent-router`
- `bug-triage`
- `test-strategy`
- `test-implementation` — implementar suítes de teste com cobertura objetiva
- `test-fix` — corrigir testes quebrados a partir de relatório de falhas (somente testes identificados)
- `business-rules-extractor` — extrair regras de negócio de código e documentar em `.md`; validar refatorações contra ground truth
- `refactor-planner`
- `impact-architect`
- `docs-curator`
- `research-router`
- `analysis-architect`
- `analysis-architect` v2.0.0 — análise técnica unificada: impacto, riscos, dependências, contratos e integrações cross-sistema (absorveu `analysis-integration-architect`); metodologia B1/B2/B3 + BREAKING|COMPATIBLE|DEPRECIAÇÃO
- `agent-factory`
- `skill-factory` — criar/revisar skills com padrão SKILL.md e .index.json atômico
- `prompt-factory` — criar/revisar `.prompt.md` seguindo padrão canônico Copilot 2026 (frontmatter, body, kebab-case, README)
- `context-builder`
- `binding-initializer` — inicializar catalog.yaml + binding.md (1 pergunta — R-034)
- `adapter-generator` — gerar adapters em `.github/instructions/` via /add-project-context

### Artefatos Estruturais de Orquestração
- `docs/ai-context/routing-graph.yaml` — grafo de roteamento (R-040): nós = agents, arestas = condições, política de cascata
- `docs/ai-context/evals/casos-roteamento.yaml` — suíte de evals de regressão de roteamento (23 casos)

## 7) Política de Mudança

- Atualize este arquivo quando regras globais mudarem.
- Evite mover detalhe técnico de stack para regras globais se for específico de um app.
- Se a mudança afetar catálogo, sincronize:
  - `.github/agents/README.md`
  - `.github/skills/README.md`
  - `.github/instructions/README.md`
  - `.github/agents/catalog.yaml`
  - `.github/skills/.index.json`

## 8) Definition of Done (governança)

- [ ] Regras globais estão apenas em `CLAUDE.md`.
- [ ] O mapa do ecossistema está atualizado em `docs/ai-context/catalog.yaml`.
- [ ] `.github/copilot-instructions.md` referencia estes arquivos sem duplicação excessiva.
- [ ] Catálogos em `.github/agents/README.md` e `.github/skills/README.md` refletem o estado real.
- [ ] Artefatos `.github/hooks/context-mode.json` e `.github/prompts/README.md` estão presentes e coerentes.
- [ ] Linguagem clara, direta e rastreável.
- [ ] Documentação em PT-BR com acentuação correta quando aplicável.

### Checklist de Genericidade (R-038)

**ANTES de submeter arquivo novo em `.github/` (agents, skills, prompts, copilot-instructions):**

- [ ] Substitua mentalmente todos os nomes de projeto por `[PROJETO]` — o texto faz sentido?
- [ ] Substitua todas as tecnologias/frameworks por `[TECH]` — o texto ainda é válido?
- [ ] Nenhuma referência a: domínio de negócio, linguagem de programação específica, framework exclusivo
- [ ] Se há customização de tech/domínio, está em `.github/instructions/*.instructions.md` (adapter)?
- [ ] Se há lista de exemplos concretos, apontam para `docs/ai-context/catalog.yaml` e nunca duplicam?

**Teste rápido**: Seu documento continua útil para um projeto completamente diferente (ex: Go backend, React frontend)?
- ✅ Sim? → Pode ir para `.github/` (global)
- ❌ Não? → Deve ir para `.github/instructions/<adapter>.instructions.md` (adapter)

### Descoberta progressiva de convenções

- Comece por `CLAUDE.md`, `docs/ai-context/catalog.yaml` e `.github/copilot-instructions.md`.
- Em seguida, use o índice de adapters em `.github/instructions/README.md` para carregar apenas as instruções específicas de cada projeto/stack.
- Depois, se ainda houver dúvida, valide diretamente no código do projeto-alvo e nos documentos do adapter correspondente.
