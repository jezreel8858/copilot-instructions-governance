# Skills — governança genérica

Skills são pacotes de conhecimento reutilizável para apoiar execução de tasks.

> Regras globais: `../../CLAUDE.md`
> Regras operacionais: `../copilot-instructions.md`

## 1) Front-matter Obrigatório (skill)

Toda skill deve declarar no topo:

- `name`
- `description`
- `triggers` (PT-BR, quando aplicável)
- `source_docs` (quando aplicável)
- `tools` (quando aplicável)

## 2) Tiers (uso recomendado)

- **Tier 1 (Core):** uso frequente e transversal.
- **Tier 2 (Support):** uso condicionado por cenário.
- **Tier 3 (Experimental):** uso restrito e validado caso a caso.

## 3) Skills Atuais (estado verificado)

| Skill | Tier sugerido | Quando usar |
|---|---|---|
| `context-mode` | Tier 1 | Roteamento ctx-first, coleta em batch, busca indexada e processamento em sandbox com economia de tokens/créditos |
| `sonarqube-governance` | Tier 2 | Monitorar métricas de qualidade, cobertura e segurança via SonarQube |
| `tavily` | Tier 2 | Pesquisar documentação externa, changelog, versões e referências de terceiros |
| `context-builder` | Tier 2 | Preparar, condensar e persistir contexto técnico multi-projeto em `docs/context/` |
| `context-compact` | Tier 2 | Compactar contexto pós-leitura, remover ruído e gerar resumos executáveis |
| `mermaid-diagrams` | Tier 2 | Criar diagramas Mermaid legíveis para documentação, ADRs e análises técnicas |
| `agent-contracts` | Tier 1 | Padronizar contrato de entrada, saída e não-escopo de agents |
| `handoff-governance` | Tier 1 | Definir critérios e payload mínimo de handoff entre agents |
| `confidence-fallback-policy` | Tier 1 | Definir score de confiança e regras de fallback/escalonamento |
| `agent-safety-guardrails` | Tier 1 | Aplicar guardrails de segurança e compliance em respostas de agents |
| `agent-observability-otel` | Tier 2 | Padronizar telemetria e rastreabilidade de execução de agents |
| `agent-evals-lab` | Tier 2 | Definir suíte de avaliação contínua e regressão de agents |
| `yaml-governance` | Tier 2 | Manipular, validar e governar arquivos YAML/YML com segurança, tipagem e schema |
| **`test-implementation-backend`** | ⭐ **Tier 2** | Padrões **genéricos** de testes backend (agnóstico de framework — pirâmide, AAA, mocks) |
| **`test-implementation-spring-boot`** | ⭐ **Tier 2** | Padrões **específicos** JUnit 5 + Mockito + JaCoCo para Spring Boot |
| **`test-implementation-frontend`** | ⭐ **Tier 2** | Padrões **genéricos** de testes frontend (agnóstico de framework — componentes, E2E) |
| **`test-implementation-angular-jasmine`** | ⭐ **Tier 2** | Padrões **específicos** Jasmine/Karma + Playwright para Angular 21 (legado/migração) |
| **`test-implementation-angular-vitest`** | ⭐ **Tier 2** | Padrões **específicos** Vitest 3+ + @angular/build:unit-test para Angular 20/21+ (oficial/novo padrão) |
| **`test-implementation-python`** | ⭐ **Tier 2** | Padrões **específicos** pytest + coverage.py para Python |
| `test-coverage-governance` | Tier 2 | Estratégia agnóstica de cobertura, métricas e priorização por risco |
| `project-scanner` | Tier 2 | Scanner automático de projetos para detecção de stack e convenções |
| `project-context-builder` | Tier 2 | Preparar, condensar e persistir contexto técnico multi-projeto |
| `git-governance` | Tier 2 | Convenções de git workflow, branch naming, commit standards e PR guidelines |
| **`terminal-governance`** | 🔧 **Tier 1** | Boas práticas obrigatórias para uso de `run_in_terminal` — prevenção de poluição de contexto, truncamento de saída, não-interativo, lote e padrões proibidos |
| **`code-tracing`** | 🔧 **Tier 1** | Rastrear código do sintoma à causa raiz — grep vs semântico, stack trace parsing, call graph, rastreio de API/método, coleta mínima de evidências |
| **`business-rules-governance`** | 📋 **Tier 1** | Taxonomia, templates e protocolos para extrair, documentar e validar regras de negócio em markdown — ground truth para validação de refatorações |
| **`integration-contract-analysis`** | 🔗 **Tier 2** | Análise de contratos de integração (OpenAPI, AsyncAPI, gRPC, GraphQL): detecção de **breaking changes**, classificação BREAKING/COMPATIBLE/DEPRECIAÇÃO, consumidores afetados |
| **`dependency-graph-mapping`** | 🔗 **Tier 2** | Mapeamento de grafo de dependências cross-sistema: fluxo origem→transformação→destino, acoplamento tight/loose/eventual, blast radius e dependências circulares |
| **`agent-memory-policy`** | 🧠 **Tier 3** | Política de memória long-term para agents: tipos episódico, semântico e procedimental. Foco em memória procedimental (agents auto-adaptativos) com guardrails e aprovação humana obrigatória |

## 4) Instructions associadas

| Documento | Escopo |
|---|---|
| `*.instructions.md` | Adapters específicos por projeto/stack (carregar sob demanda) |

## 5) Triggers em PT-BR

- Prefira termos acionáveis e objetivos.
- Evite frases ambíguas ou genéricas.
- Atualize triggers quando houver falso negativo recorrente.

## 6) Source Docs Mínimos

- `CLAUDE.md`
- `.github/copilot-instructions.md`
- Documentos específicos da própria skill

## 7) Regras de Manutenção

- Não inventariar skills inexistentes.
- Ao criar/alterar skill, atualizar este catálogo na mesma entrega.
- Manter instruções curtas e rastreáveis.

## 8) Índice Estruturado

- Fonte estruturada: `.github/skills/.index.json`.
- Em conflito entre texto e JSON, corrigir os dois na mesma entrega.
