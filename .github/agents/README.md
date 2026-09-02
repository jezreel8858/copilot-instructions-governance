# Agents — governança genérica

- Perfis especializados para tarefas com orquestração, triagem e execução guiada.

> Regras globais: consulte `../../CLAUDE.md`.
> Regras operacionais: consulte `../copilot-instructions.md`.

## 1) Agent vs Skill

- **Agent**: usado quando a tarefa exige decisão de rota, escopo e entrega estruturada.
- **Skill**: usado quando a tarefa é conhecimento pontual/checklist reutilizável.
- Regra prática: se precisa classificar intenção e escolher fluxo, use agent.

## 2) Catálogo Atual (estado verificado)

| Tipo | Nome | Quando usar |
|---|---|---|
| Agent | `agent-router` | Entry point obrigatório para classificar intenção e delegar para downstream |
| Agent | `prompt-structuring` | ⚠️ ***(NEW)*** Passo mandatório pós-`agent-router` (R-041) — refina o prompt em loop controlado (máx. 5 iterações) antes de retornar para classificação de intenção |
| Agent | `bug-triage` | Triagem de bugs/regressões com reprodução e severidade |
| Agent | `test-strategy` | Estratégia de testes, cobertura por risco e critérios de aceitação |
| Agent | `test-implementation` | ⭐ ***(NEW)*** Implementar suítes de testes unitários, integração e E2E com cobertura objetiva |
| Agent | `test-fix` | 🔧 ***(NEW)*** Corrigir testes quebrados a partir de relatório de falhas — opera somente nos testes identificados |
| Agent | `refactor-planner` | Planejamento de refatoração incremental com risco e rollback |
| Agent | `docs-curator` | Curadoria e padronização de documentação/catálogo |
| Agent | `deep-search` | 🔎 ***(NEW)*** Retriever/Researcher para pesquisa interna (repo + context-mode + terminal read-only) e externa (Tavily), com decomposição paralela de pesquisa composta |
| Agent | `analysis-architect` | Análise técnica unificada: impacto local (tier B1), risco, dependências, contratos e integrações cross-sistema (OpenAPI/AsyncAPI/gRPC/GraphQL) com metodologia B1/B2/B3 |
| Agent | `agent-auditor` | 🧪 ***(NEW)*** Auditoria semântica de governança do próprio catálogo (agents/skills/prompts): detecta smells e gaps, classifica severidade e recomenda handoff para executores, sempre read-only |
| Agent | `agent-factory` | Criação/revisão estrutural de agents e governança |
| Agent | `context-builder` | Coletar, condensar e persistir contexto técnico em `docs/context/` |
| Agent | `binding-initializer` | ⚡ ***(NEW)*** Criar `catalog.yaml` + `binding.md` para novo repositório (1 pergunta — Health Check R-034) |
| Agent | `adapter-generator` | ⚡ ***(NEW)*** Gerar automaticamente adapters em `.github/instructions/` via `/add-project-context` |
| Agent | `skill-factory` | ⭐ ***(NEW)*** Criar/revisar skills customizadas com padrão SKILL.md e `.index.json` atômico |
| Agent | `prompt-factory` | 📝 ***(NEW)*** Criar/revisar `.prompt.md` seguindo padrão canônico Copilot 2026: frontmatter correto, body estruturado e README atualizado |
| Agent | `business-rules-extractor` | 📋 ***(NEW)*** Extrair regras de negócio de código e documentar em `.md`; validar refatorações contra regras documentadas |
| Agent | `angular` | 🅰️ Especialista Angular **enterprise, perfil híbrido v2.0.0** — análise/recomendação (arquitetura moderna, RxJS+Signals, performance CWV/SSR, segurança, acessibilidade, testes, upgrades) **E** implementação de feature/bugfix (testing-first, diff mínimo), carregando skills de componentização, patterns Angular e contratos de API para design system |
| Agent | `spring-boot` | ☕ Especialista backend Spring Boot **enterprise, perfil híbrido v2.0.0** — análise/recomendação (arquitetura, versões Java/JDK, performance, observabilidade, segurança, migração) **E** implementação de feature/bugfix (virtual threads vs reativo, testing-first) |
| Agent | `spring-reactive` | ⚛️ Especialista backend reativo Spring WebFlux/Reactor **enterprise, perfil híbrido v2.0.0** — análise/recomendação (capacidade, resiliência, backpressure, observabilidade, segurança, compatibilidade Java/JDK) **E** implementação de feature/bugfix (sem bloqueio de event-loop, testing-first) |
| Agent | `docs-writer` | 📝 ***(NEW)*** Perfil documentador agnóstico de domínio — gera/atualiza documentação técnica em Markdown (Diátaxis, ADR/MADR, README, runbook, postmortem), produz exclusivamente arquivos `.md` |
| Agent | `code-review` | 🔎 Revisa código (diff/PR) antes do merge por correção, segurança, convenções, impacto, testes e performance; classifica achados por severidade; read-only; delega para `bug-triage`/`analysis-architect`/`test-strategy`/`refactor-planner` |
| Agent | `requirements-analyst` | 🧾 ***(NEW)*** Elicita e estrutura requisitos funcionais/não-funcionais a partir de pedido de negócio ambíguo (EARS, INVEST, Gherkin, FURPS+); detecta *solution-jumping* via Five Whys; prospectivo (não confundir com `business-rules-extractor`, que é reverso) |
| Agent | `code-summarizer` | 🗜️ ***(NEW)*** Ponto de entrada único para sumarização de código-fonte agnóstica a linguagem (RF-008); modelo híbrido — heurística/AST determinística primeiro, LLM leve como fallback; nunca substituído por chamada direta a lib de parsing |
| Agent | `code-knowledge-graph` | 🕸️ Ponto de entrada único para construção/consulta do grafo de conhecimento de código-fonte cross-projeto — nível código (arquivo; import/http) **e** nível arquitetural (controller/service, blast radius, ciclo, acoplamento tight/loose/circular, risco); puramente determinístico (sem LLM). **v3.0.0**: motor único **pattern-matching via regex (TypeScript+Java), 100% Node.js built-ins** (`build-graph.js`, gera apenas `graph.json`); visualização interativa via `render-viewer.js` (Cytoscape.js, sem limite de nós — substitui Mermaid, limitado a ~500); validado em execução real cross-repo (2.668 arquivos, 2.417 nós, 5.221 arestas, 3 ciclos reais, 31 arestas cross-repo, poucos segundos) |
| Agent | `security-reviewer` | 🔒 ***(NEW)*** Revisa código de aplicação por segurança especializada (OWASP Top 10:2025, ASVS 5.0, SCA/CVE, secrets) — complementa `code-review` (dimensão genérica) com profundidade de security specialist; read-only |
| Agent | `performance-agent` | ⚡ ***(NEW)*** Revisa código por performance especializada — Core Web Vitals (frontend), N+1/latência (backend), otimização de query (banco); read-only |
| Agent | `compliance-guardrails` | 🛡️ ***(NEW)*** Avalia conformidade regulatória de aplicação (SOC 2, GDPR/LGPD, HIPAA, ISO 27001) — audit trails, least privilege, retenção de dado pessoal; distinto de `agent-safety-guardrails` (segurança do próprio agent de IA); read-only |
| Agent | `feature-planner` | 📋 ***(NEW)*** Decompõe requisito de feature nova em subtasks executáveis com dependências e paralelização; distinto de `refactor-planner` (refatoração de código existente) |
| Agent | `agentic-memory-manager` | 🧠 ***(NEW)*** Persiste/recupera memória long-term entre sessões (episódica, semântica, procedimental) via `agent-memory-policy`; memória procedimental exige aprovação humana explícita |
| Agent | `devops-engineer` | 🐳 ***(NEW)*** Revisa Dockerfile, Kubernetes, CI/CD e IaC por segurança/resiliência/boas práticas; read-only |
| Agent | `debugger` | 🐛 ***(NEW)*** Investiga causa raiz a partir de stack trace/log — call graph, hipótese testável, reprodução mínima; não corrige, complementa `bug-triage` com investigação mais profunda |
| Agent | `code-style-enforcer` | 🎨 ***(NEW)*** Verifica aderência a convenções de estilo documentadas no adapter de stack; nunca bloqueador, apenas sugestão |
| Agent | `refactor-executor` | 🔧 ***(NEW)*** Executa plano de refatoração já aprovado por `refactor-planner`, fase a fase, validando contra regras de negócio documentadas |

## 3) Roteamento Rápido

| Cenário | Rota |
|---|---|
| Entrada padrão no chat | `agent-router` |
| ⚠️ Toda solicitação (pós Health Check R-034) | `prompt-structuring` (mandatório, retorna ao `agent-router`) |
| Bug, erro, regressão | `bug-triage` |
| Estratégia de testes | `test-strategy` |
| Implementação de testes (unit/integration/E2E) | `test-implementation` |
| Correção de testes quebrados (com relatório de falhas) | `test-fix` |
| Planejamento de refactor | `refactor-planner` |
| Impacto técnico local | `analysis-architect` (tier B1) |
| Curadoria de documentação | `docs-curator` |
| Pesquisa interna aprofundada (repo/context-mode/terminal) ou pesquisa externa composta | `deep-search` |
| Análise técnica, impacto, contratos, integrações cross-sistema | `analysis-architect` |
| 🧪 Auditoria semântica de governança do catálogo (smells/gaps em agents, skills e prompts) | `agent-auditor` |
| Criação/revisão de agents | `agent-factory` |
| Consolidação de contexto para execução posterior | `context-builder` |
| ⚡ Binding context faltando (Health Check) | `binding-initializer` |
| ⚡ Gerar adapters após /add-project-context | `adapter-generator` |
| ⭐ Criar/revisar skill customizada | `skill-factory` |
| 📝 Criar/revisar prompt `.prompt.md` | `prompt-factory` |
| 📋 Extrair/documentar/validar regras de negócio | `business-rules-extractor` |
| 🅰️ Análise, recomendação e implementação Angular (feature/bugfix) | `angular` |
| ☕ Análise, recomendação e implementação backend Spring Boot (feature/bugfix) | `spring-boot` |
| ⚛️ Análise, recomendação e implementação backend reativo WebFlux/Reactor (feature/bugfix) | `spring-reactive` |
| 📝 Escrever/gerar documentação técnica em `.md` (qualquer domínio) | `docs-writer` |
| 🔎 Revisar código (diff/PR) antes do merge, por severidade | `code-review` |
| 🧾 Elicitar/estruturar requisitos a partir de pedido ambíguo (pré-técnico) | `requirements-analyst` |
| 🗜️ Sumarizar código-fonte para reduzir bytes/tokens no contexto (pós-`/init-context` ou sob demanda) | `code-summarizer` |
| 🕸️ Construir/consultar grafo de conhecimento de código — nível código (arquivo/classe/função, import/chamada/herança/tabela-SQL) e nível arquitetural (sistema/serviço, blast radius, ciclo, acoplamento, risco, diagrama Mermaid), cross-projeto | `code-knowledge-graph` |
| 🔒 Revisão especializada de segurança de aplicação (OWASP, CVE, secrets), read-only | `security-reviewer` |
| ⚡ Revisão especializada de performance (Core Web Vitals, N+1, query), read-only | `performance-agent` |
| 🛡️ Avaliação de conformidade regulatória de aplicação (SOC 2, GDPR/LGPD, HIPAA), read-only | `compliance-guardrails` |
| 📋 Decomposição de feature nova em subtasks executáveis | `feature-planner` |
| 🧠 Persistência/recuperação de memória long-term entre sessões | `agentic-memory-manager` |
| 🐳 Revisão de artefatos DevOps (Dockerfile/K8s/CI-CD/IaC), read-only | `devops-engineer` |
| 🐛 Investigação de causa raiz a partir de stack trace/log | `debugger` |
| 🎨 Verificação de aderência a convenções de estilo documentadas | `code-style-enforcer` |
| 🔧 Execução de plano de refatoração já aprovado por `refactor-planner` | `refactor-executor` |

## 4) Pre-fetch Recomendado

Antes de tarefas não triviais, anexar ao contexto:

- `../../CLAUDE.md`
- `../copilot-instructions.md`
- `./README.md`
- `./catalog.yaml`
- `../skills/README.md`
- `../../docs/ai-context/routing-graph.yaml` — grafo de roteamento estrutural (R-040)

## 5) Regras de Catálogo

- Não listar agent inexistente.
- Mudou governança? Atualizar este arquivo e `catalog.yaml` na mesma entrega.
- Em conflito entre texto e YAML, corrigir ambos no mesmo commit.

## 6) Catálogo Estruturado

- Fonte estruturada: `.github/agents/catalog.yaml`.
- `metadata.total_agents` deve refletir exatamente os agents ativos.

## 7) Templates

- Template de pesquisa: `.github/agents/templates/research-agent.md`
- Template operacional: `.github/agents/templates/operational-agent.md`

## 8) Diretrizes Transversais (obrigatórias)

- Todo agent deve manter contrato explícito de entrada/saída e não-escopo.
- Todo handoff deve usar o schema formal v1.0 (`versao`, `para`, `emissor`, `contexto`) — ver `handoff-governance/SKILL.md` seção 2.1.
- Toda execução deve declarar **confidence score numérico** (0.00–1.00) **e nível de routing** (`rule-based|semantic|llm-based`) — não apenas `alta|média|baixa`.
- Toda decisão operacional deve seguir menor privilégio de tools.
- Todo agent deve preservar rastreabilidade (rota, evidências e próximo passo mínimo).
- Todo agent pode declarar `version:` no frontmatter para rastrear mudanças de comportamento.
- Nova rota de roteamento → atualizar `docs/ai-context/routing-graph.yaml` **antes** de editar a Decision Tree (R-040).
- **Re-triagem por turno (R-042)**: todo agent downstream deve declarar seção **"Retorno ao Router"** com gatilho objetivo de deriva de intenção — roteamento não é evento único da conversa.
- **Ferramentas mínimas obrigatórias (Tooling Baseline)**: TODO agent deve incluir `run_subagent` no frontmatter `tools:` — sem essa tool, o handoff de retorno exigido por R-042 não é executável (descrever em texto não basta). Ver tabela de baseline por perfil em `agent-contracts/SKILL.md` § 9. `agent-factory` valida essa regra em toda criação/revisão de agent.
- **Visibilidade de fluxo (Banner de Identidade)**: TODO agent — não apenas o `agent-router` — abre toda resposta com `Agente Ativo: <name>`, mesmo continuando em `task_mode` sem handoff neste turno; se houve handoff/re-triagem, adiciona `Handoff: <origem> → <destino> (motivo: ...)`. Padrão de mercado (OpenAI Agents SDK `HandoffOutputItem`, LangGraph `active_agent` streaming) — detalhes em `agent-contracts/SKILL.md` § 0. Sem isso, o usuário perde visibilidade do fluxo assim que a conversa passa a ser respondida por um downstream por vários turnos.

## 9) Skills-base por função

| Função de agent | Skills mínimas recomendadas |
|---|---|
| Router/triagem | `agent-contracts`, `handoff-governance`, `confidence-fallback-policy` |
| Análise/impacto | `agent-contracts`, `confidence-fallback-policy`, `agent-evals-lab` |
| Pesquisa | `agent-contracts`, `handoff-governance`, `tavily` |
| Curadoria/governança | `agent-contracts`, `agent-safety-guardrails`, `agent-evals-lab` |
| Operação com métricas | `agent-observability-otel` |
| Agents com memória adaptativa | `agent-memory-policy` (Tier 3 — experimental) |
| Documentação (escrita) | `documentation-writing-patterns`, `mermaid-diagrams`, `agent-contracts` |
| Revisão de código | `code-review-patterns`, `code-tracing`, `agent-contracts` |
| Elicitação de requisitos | `requirements-engineering-patterns`, `agent-contracts` |
| Segurança de aplicação (especialista) | `security-review-patterns`, `agent-contracts` |
| Performance (especialista) | `performance-engineering-patterns`, `agent-contracts` |
| Compliance/auditoria de aplicação | `compliance-governance-patterns`, `agent-contracts` |
| Planejamento/decomposição de feature | `task-decomposition-patterns`, `agent-contracts` |
| Memória long-term de agent | `agent-memory-policy`, `agent-contracts` |
| Revisão DevOps | `devops-agent-patterns`, `agent-contracts` |
| Investigação de causa raiz | `code-tracing`, `agent-contracts` |
