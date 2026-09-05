---
name: refactoring-planning-patterns
description: >-
  Diretrizes consolidadas para planejamento e decomposição macro de refatorações
  estruturais: Mikado Method, Strangler Fig, Branch by Abstraction, testes de
  caracterização (Golden Master), métricas de acoplamento e rollback multicamada.
tier: 2
category: process
triggers:
  - "planejamento de refatoração"
  - "refactor planning"
  - "mikado method"
  - "strangler fig"
  - "branch by abstraction"
  - "golden master"
  - "characterization tests"
  - "blast radius refactor"
  - "decomposição de refatoração"
  - "rollback de refatoração"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/agents/refactor-planner.agent.md
tools: []
---

# Refactoring Planning Patterns

> Base de conhecimento especializada em **planejamento e governança de refatorações estruturais e arquiteturais**. Utilizada pelo `@refactor-planner` para estruturar planos acíclicos atômicos (DAGs) com garantias de zero-downtime, rede de segurança e rollback desacoplado de reversão de commit.

## Quando Usar

- Ao decompor refatorações amplas em código de alto risco, alta complexidade ou múltiplos dependentes.
- Ao planejar a modernização ou extração de módulos legados com ou sem testes automatizados prévios.
- Ao arquitetar migrações estruturais que exigem coexistência temporária entre legado e novo componente.
- Ao mapear rollback e contingência em nível de contrato, feature flag ou schema de banco de dados.

---

## 1) Metodologias e Padrões de Refatoração Estrutural

```text
[Identificação de Smells / Hotspots]
                │
                ▼
  [Safety Net: Characterization Tests]
                │
                ▼
  [Mikado Method: Grafo de Dependências]
         ┌──────┴──────┐
         ▼             ▼
   [In-Process]   [Inter-Process]
    Branch by       Strangler
   Abstraction         Fig
         │             │
         └──────┬──────┘
                ▼
   [Cutover & Descomissionamento]
```

### A) Mikado Method (Ellnestam & Brolund)
- **Princípio**: Decomposição por exploração reversa. Define-se o objetivo raiz (*Mikado Goal*) e realiza-se um experimento (*spike*).
- **Regra Cardeal de Rollback**: Se o spike quebrar a compilação ou revelar pré-requisitos ausentes, o código é **imediatamente revertido** (`git reset --hard`).
- O erro nunca é consertado dentro do spike; ele é registrado como nó folha no grafo de pré-requisitos.
- As mudanças reais só são integradas no tronco principal quando as folhas do grafo estiverem resolvidas e com testes verdes.

### B) Branch by Abstraction (Paul Hammant)
- **Escopo**: Refatorações intra-processo no mesmo repositório sem branches de longa duração.
- **Passos Canônicos**:
  1. Criar interface/abstração sobre o código legado alvo.
  2. Redirecionar todos os clientes para a nova interface.
  3. Criar a nova implementação moderna ao lado da legada.
  4. Introduzir **Feature Flag** em runtime para chavear entre implementações.
  5. Validar em produção, alternar tráfego para 100% novo e remover o código legado.

### C) Strangler Fig Application (Martin Fowler)
- **Escopo**: Refatorações arquiteturais cross-serviços ou entre monolito e microsserviços.
- **Mecanismo**: Interceptação perimetral de tráfego via API Gateway / Reverse Proxy.
- Rotas específicas são migradas incrementalmente para o novo serviço enquanto a rota legada permanece ativa para o tráfego restante, até a extinção do subsistema antigo.

---

## 2) Safety Net e Testes de Caracterização (Michael Feathers)

- **Premissa**: Não existe refatoração segura em código sem cobertura confiável.
- **Characterization Tests / Golden Master**:
  - Capturar o comportamento *real observado* da aplicação legada (incluindo bugs tácitos aceitos pelo negócio).
  - Alimentar a rotina com massas variadas de entrada e armazenar os snapshots de saída (Approval Testing).
  - Esse baseline congelado serve como oráculo determinístico para atestar que o comportamento externo não sofreu regressão.
- **Identificação de Seams (Costuras)**:
  - Localizar pontos do código onde o comportamento pode ser interceptado e injetado sem edição invasiva (ex.: construtores, interfaces, factory methods).

---

## 3) Análise Comportamental e Métricas de Acoplamento

### A) Hotspots (Adam Tornhill — CodeScene)
$$\text{Hotspot Score} = \text{Normalized Churn (frequência de commits)} \times \text{Complexidade Ciclomática}$$
- Concentrar esforço de planejamento nos 2% a 4% de arquivos que concentram o maior número de incidentes e retrabalho.

### B) Acoplamento Temporal (Co-change Analysis)
- Detectar arquivos que mudam juntos no histórico do Git sem dependência estática explícita:
$$Jaccard(A, B) = \frac{|\text{Commits}(A \cap B)|}{|\text{Commits}(A \cup B)|}$$
- $Jaccard \ge 0.5$ indica acoplamento oculto grave (*Shotgun Surgery*) que deve ser unificado na refatoração.

### C) Métricas de Estabilidade e Abstração (Robert C. Martin)
- **Instabilidade ($I$)**: $I = C_e / (C_a + C_e)$ (onde $C_a$ é fan-in e $C_e$ é fan-out).
- **Abstração ($A$)**: proporção de tipos abstratos/interfaces.
- **Zone of Pain ($A \to 0, I \to 0$)**: classes muito concretas e com dezenas de dependentes diretos. Exigem criação de interface intermediária antes de qualquer alteração de lógica.

---

## 4) Estrutura do DAG de Tarefas Atômicas

Cada nó do plano de refatoração deve ser estruturado com contratos estritos:

| Campo | Descrição |
|---|---|
| **Task ID & Propósito** | Identificador sequencial único e objetivo único (*Single Concern*) |
| **Executor Especialista** | Agente de stack responsável (`@angular-engineer`, `@spring-boot-engineer`, etc.) |
| **Gate In (Pré-condições)** | Testes de caracterização verdes, workspace limpo, branches alinhadas |
| **Ação Determinística** | Escopo delimitado (máx. 1 a 3 arquivos por passo) |
| **Gate Out (Pós-condições)**| Suíte de testes 100% verde, compilação sem warnings/erros, diff mínimo |
| **Contingência / Rollback** | Mecanismo de reversão local ou em runtime |

---

## 5) Matriz de Rollback Multicamada (Zero-Downtime)

Evitar dependência exclusiva de `git revert` em produção. Planejar contingência por camada:

| Camada | Padrão Aplicado | Mecanismo de Rollback Rápido |
|---|---|---|
| **Contrato de API** | Evolução aditiva (*Tolerant Reader*) | Gateway chaveia rota de volta ao handler legado |
| **Lógica Interna** | *Branch by Abstraction* | Desativação imediata da Feature Flag em runtime |
| **Persistência / DB** | *Expand & Contract* (Parallel Change) | 1. Reverter leitura para coluna legada<br>2. Desativar dual-write<br>3. Drop de coluna nova apenas após soak time |

---

## Checklist Verificável de Planejamento

- [ ] Código alvo possui safety net (testes unitários confiáveis ou testes de caracterização documentados).
- [ ] Dependências, fan-in/fan-out e blast radius foram avaliados via `@code-knowledge-graph`.
- [ ] Hotspots históricos e acoplamento temporal (co-change) foram considerados no agrupamento das etapas.
- [ ] Padrão de migração selecionado adequadamente (Mikado, Branch by Abstraction ou Strangler Fig).
- [ ] Tarefas organizadas em DAG com no máximo 1 a 3 arquivos alterados por nó.
- [ ] Cada nó do plano possui Gate In, Gate Out e agente especialista de stack atribuído.
- [ ] Rollback planejado em runtime (flags, tolerância a falhas, expand & contract) sem depender puramente de commit revert.

---

## Anti-padrões

| Anti-padrão | Risco / Sintoma | Correção Recomendada |
|---|---|---|
| "Big Bang" Refactoring | Conflitos insolúveis de merge e quebras em produção | Aplicar Mikado Method e fatiamento em DAG |
| Refatorar sem Safety Net | Quebra silenciosa de regras de negócio tácitas | Escrever Characterization Tests antes de mover código |
| Depender de `git revert` para BD | Perda irrecuperável de dados ou corrupção | Adotar padrão *Expand & Contract* com dual-write |
| Modificar comportamento e estrutura juntos | Impossibilidade de rastrear causa raiz de bugs | Separar estritamente refactoring de nova feature |
| Ignorar Zone of Pain ($A=0, I=0$) | Propagação de quebras em cascata no sistema | Injetar interface (Branch by Abstraction) primeiro |

---

## Referências Oficiais

- Fowler, Martin. *Refactoring: Improving the Design of Existing Code*. Addison-Wesley, 2018.
- Feathers, Michael. *Working Effectively with Legacy Code*. Prentice Hall, 2004.
- Ellnestam, Ola; Brolund, Daniel. *The Mikado Method*. Manning Publications, 2014.
- Tornhill, Adam. *Your Code as a Crime Scene*. Pragmatic Bookshelf, 2ª ed., 2024.
- Hammant, Paul. *Branch by Abstraction* (https://paulhammant.com/blog/branch-by-abstraction.html)
- Martin, Robert C. *Clean Architecture: Software Structure and Design*. Prentice Hall, 2017.

