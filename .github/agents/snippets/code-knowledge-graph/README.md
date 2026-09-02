# code-knowledge-graph — Script de Referência (Node.js puro, sem dependências)

> Script de referência (R-026) do agent [`code-knowledge-graph.agent.md`](../../code-knowledge-graph.agent.md).
>
> **Decisão de 2026-09-01 (motor)**: o motor único e definitivo de extração é
> **pattern-matching via regex (TypeScript + Java), 100% Node.js built-ins** (`fs`/`path`/`crypto`)
> — sem dependência externa, sem subprocess, sem venv/instalação de qualquer tipo.
>
> **Decisão de 2026-09-01 (Mermaid)**: Mermaid tem limite prático de ~500 nós/linhas para renderizar um
> diagrama legível — este grafo tem milhares de nós. `build-graph.js` **não gera mais** `graph.mmd`
> nem `graph.html` baseado em Mermaid — apenas `graph.json` (dados estruturados, sem limite). A visualização
> interativa passou a ser responsabilidade de um script separado, [`render-viewer.js`](render-viewer.js), que
> usa **Cytoscape.js** (via CDN) para navegação com busca, filtro por tipo/projeto, destaque de vizinhança e
> painel de detalhes por nó — sem limite prático de nós/arestas.

## Arquivos

| Arquivo | Papel |
|---|---|
| [`build-graph.js`](build-graph.js) | Script único de produção do grafo: descobre módulos automaticamente, extrai imports/decorators/filas via regex, constrói o grafo (`Object`/`Set` em memória, sem lib externa), roda DFS (ciclos), BFS reverso (blast radius + órfãos), matching cross-repo 1-para-N. Gera **apenas `graph.json`**. |
| [`render-viewer.js`](render-viewer.js) | Script de visualização: lê `graph.json` e gera `graph-viewer.html` (Cytoscape.js via CDN, dados embutidos inline) — busca, filtro por tipo/projeto, destaque de vizinhança, painel de detalhes, realce de ciclos/filas. |

## Como rodar

```bash
# 1) Gerar o grafo (graph.json) — cada argumento pode ser um REPO INTEIRO
# (single ou multi-módulo Maven) ou um source root explícito (src/main/java, src/app)
node build-graph.js "<caminho-do-repo>"

# Cross-repo (2+ repos, matching automático de endpoints Angular<->Spring)
node build-graph.js "<repo-A>" "<repo-B>" "<repo-C>" "<repo-D>"

# Customizar diretório de saída (padrão: cwd)
node build-graph.js "<repo-A>" "<repo-B>" --out "<diretorio-saida>"

# Incluir arquivos de teste no grafo (default: EXCLUÍDOS — RF-026, ver §Capacidades)
node build-graph.js "<repo-A>" --include-tests

# 2) Gerar o visualizador interativo a partir do graph.json
node render-viewer.js --in "<diretorio-saida>/graph.json" --out "<diretorio-saida>"
# abrir graph-viewer.html no navegador (requer internet só para carregar Cytoscape.js via CDN)
```

Saída de `build-graph.js`: **somente `graph.json`** (nós/arestas estruturado). Saída de `render-viewer.js`:
**`graph-viewer.html`** (visualizador interativo, dados embutidos inline — evita CORS de `fetch()` em
`file://`). Nenhum dos 2 arquivos é versionado (`.gitignore`) — são artefatos reproduzíveis, não fonte.

## Capacidades

| Capacidade | Como |
|---|---|
| **Descoberta automática de módulos (RF-023)** | Cada argumento pode ser um repo inteiro (single ou multi-módulo Maven, ex.: monorepo `[PROJETO-B]` com 6 módulos EJB/JPA/Web/WS) — `discoverSourceRoots()` varre recursivamente e atribui `project` único por módulo (`repo` ou `repo/módulo`), nunca `path.basename(root)` cru (bug real da v3.0: colapsava todo projeto Java em `projectId: "java"`, todo Angular em `"app"`). |
| Import graph intra-repo (TypeScript) | Regex `import ... from "..."` + resolução de path relativo (`./x`) OU **path alias** via `tsconfig.json` `compilerOptions.paths` (ex.: `@core/*` → `src/app/core/*`), resolvido com `fs.existsSync`. |
| **Re-export de barrel file** | Regex `export * from "..."` / `export { A, B } from "..."` — mesma resolução de path/alias do import. Crítico para Angular: arquivos só registrados via barrel (`store/effects/index.ts`) nunca apareciam conectados sem isso, ficando falsamente órfãos. |
| **Import graph intra-repo (Java), escopo por repositório** | Regex `import a.b.C;` + resolução via convenção Maven (`a.b.C` → `<root>/a/b/C.java`), buscando **apenas nos source roots do MESMO repositório** (`repoRoot`) do arquivo importador — nunca cross-repo (bug real corrigido: classes utilitárias duplicadas entre microserviços, ex. `BusinessException`, resolviam para o repo ERRADO quando a busca era global sobre todos os roots passados). Cross-módulo dentro do MESMO repo Maven multi-módulo conta como `tight` (mesmo repositório, módulo diferente). |
| **Referência same-package Java (RF-024, sem `import`)** | Classes no mesmo pacote **não exigem `import`** (regra da linguagem) — o motor baseado só em `import` era estruturalmente cego a isso (enums/DTOs usados só por vizinhos de pacote pareciam órfãos). Detectado via nome de classe (`\bClassName\b`, mínimo 4 caracteres) contra o conteúdo já em memória dos arquivos do mesmo diretório — sem I/O extra. Aresta `confidence: "heuristic"`, `coupling: "tight"`, `metadata.samePackage: true`. |
| Framework nodes (Angular `@Component`/`@Injectable`/`@NgModule`/`@Directive`/`@Pipe`, Spring `@Service`/`@Repository`/`@Entity`/`@Configuration`, Spring Reactive `Mono`/`Flux`, EJB `@Stateless`/`@Stateful`/`@Singleton`/`@MessageDriven`) | Regex por decorator/anotação, aplicado ao conteúdo do arquivo. |
| Endpoints REST + cross-repo matching 1-para-N | Regex `@RestController`+`@RequestMapping` (Java) e getter `apiUrl` (Angular) + matching com guarda de profundidade mínima de path. Nó do controller unificado com o nó de arquivo (sem duplicação). |
| **Cross-repo SOAP/JAX-WS (RF-025)** | Client stub JAX-WS RI (interface `@WebService(targetNamespace=...)` com `@RequestWrapper(localName="<operação>")` por método) casado com implementação server-side (classe `@WebService`, operação extraída de `@WebMethod` + assinatura `public Tipo metodo(`) por chave `targetNamespace::operação`. Aresta `type: "soap"`, `confidence: "exact"` (com namespace) ou `"heuristic"` (sem namespace), `coupling: "loose"`, só criada entre `repoRoot` diferentes. Descoberto/corrigido a pedido do usuário: motor não ligava `[PROJETO-A]`.`ServicoExemploWeb.operacaoExemploA` ao EJB do monorepo `[PROJETO-B]` (só havia detecção cross-repo REST até então). |
| Integração HTTP (Angular → serviço externo) | Regex `this.http.get/post/put/delete(...)` / `fetch(...)`. |
| **Filas RabbitMQ (produtor/consumidor)** | Regex `new Queue/DirectExchange/TopicExchange/FanoutExchange(...)`, `@RabbitListener(queues = ...)`, `rabbitTemplate.convertAndSend(...)` — com **resolução de constantes Java** (`static final String`, referenciadas via `Classe.CONST` ou bare-name). Nomes que resolvem para um valor **dinâmico em runtime** (ex.: `new Queue(queueName, ...)` onde `queueName` vem de `service.create()`) são descartados (impossível resolver estaticamente) — evita "nós fantasma" com nome de variável local; apenas contabilizado em `rabbit-queue-dynamic-unresolved`. Aresta `type: "queue"`, `coupling: "eventual"`. |
| **Detecção de nós órfãos** | Nó sem NENHUMA aresta (nem entrada nem saída) — calculado via adjacência + adjacência reversa já existentes, sem custo adicional relevante. Reporta agregado por tipo/projeto + amostra de até 30 nós. |
| **Exclusão de arquivos de teste por padrão (RF-026)** | `isTestFile()` — agnóstico de framework: `*.spec.ts(x)`/`*.test.ts(x)`/`*.spec.js(x)`/`*.test.js(x)` (Jest/Jasmine/Vitest/Mocha), `FooTest.java`/`FooTests.java`/`TestFoo.java`/`FooIT.java` (JUnit/TestNG/Failsafe), diretórios `__tests__`/`__mocks__`/`__snapshots__`/`e2e`/`e2e-playwright`/`cypress`. Evidência real: 31% dos nós/35% das arestas de um projeto Angular eram teste, distorcendo blast-radius. **Default: exclui.** Reversível via `--include-tests`. |
| Sensibilidade de dado financeiro/PII | Regex sobre assinatura de campo (`cpf/rg/email/telefone: string`, `valor/preco/salario: number`). |
| Blast radius profundidade 1/2 | BFS reverso sobre adjacência em `Object`/`Set`, JavaScript puro. |
| **Detecção de ciclo (grafo separado)** | DFS com pilha de recursão (cores WHITE/GRAY/BLACK) sobre `cycleAdjacency` — grafo que **exclui** arestas `samePackage` (referências same-package são tipicamente bidirecionais e inflam ciclos falso-positivo: 28→1058 num teste real antes desta exclusão). Órfãos/blast-radius continuam usando o grafo completo (`adjacency`), que inclui same-package. |
| Acoplamento/risco | Classificação determinística por `type`/fan-in (`tight`/`loose`/`eventual`/`circular`). |
| Visualização interativa (`render-viewer.js`) | Cytoscape.js + layout `fcose`, sem limite prático de nós/arestas (substitui Mermaid, limitado a ~500). |

## Limitações reais conhecidas (documentadas, não bloqueantes)

1. **Pattern-matching via regex, não AST real** — pode ter falsos positivos/negativos em casos sintaticamente
   incomuns (ex.: anotações multi-linha atípicas, imports comentados, strings contendo padrões parecidos com
   decorators). Validado empiricamente contra 13+ repositórios reais (incluindo o monorepo Maven `[PROJETO-B]`, 6
   módulos) com resultado consistente entre execuções (hash determinístico).
2. **Resolução de import Java assume convenção Maven padrão** (`package.Class` → `package/Class.java` relativo
   à raiz `src/main/java`) — não resolve wildcard imports (`import pacote.*;`).
3. **EJB/Jakarta EE**: regras mantidas por completude; classes referenciadas apenas via lookup JNDI/remote
   interface (padrão comum em módulos EJB legados, ex.: `[PROJETO-B]/[MODULO-EJB]`) não são capturadas
   (nenhum `import` estático aponta para esse tipo de binding em runtime) — aparecem como órfãs legítimas.
4. **Matching cross-repo 1-para-1 ingênuo geraria falso-positivo em massa** quando um path-base é curto/genérico
   — corrigido com guarda de profundidade mínima de 2 segmentos de path antes de aplicar heurística de prefixo.
5. **Filas/eventos: apenas RabbitMQ (Spring AMQP) instrumentado** — Kafka, JMS e outros brokers não têm regra
   dedicada (sem evidência real de uso no workspace até o momento). Nomes de fila montados dinamicamente em
   runtime (variável local, não constante) são intencionalmente descartados — ver `rabbit-queue-dynamic-unresolved`.
6. **Gap de cobertura de import esperado, não é bug**: nem todo `import`/`java-import` bruto vira aresta —
   imports de bibliotecas externas (`org.springframework.*`, `@angular/*`, etc.) são intencionalmente
   descartados (RF-004, só imports locais contam). O campo `gapCobertura` do resumo reporta bruto vs.
   resolvido para visibilidade, mas uma diferença grande é esperada e não indica falha do motor.
7. **Nós órfãos nem sempre são "problema"** — classes `@Configuration`/`@Component` descobertas via
   component-scan do Spring nunca são importadas explicitamente por outro arquivo e aparecem como órfãs
   legitimamente; controllers sem chamador cross-repo detectado (endpoints internos/ops) também. Sempre trate
   a lista como candidata a triagem humana, não como lista de bugs confirmados.
8. **Path alias resolvido apenas via `tsconfig.json` `compilerOptions.paths`** — não lê `angular.json`
   `paths` (raramente diverge do tsconfig na prática) nem resolve aliases definidos via webpack/jest config
   customizado fora do tsconfig padrão.
9. **Re-export (`export * from`) resolve o arquivo alvo, mas não os símbolos individuais re-exportados**
   — a aresta liga barrel→arquivo-fonte; não distingue quais exports específicos são realmente consumidos
   downstream (limitação aceitável para o nível de granularidade `file`/RF-004 do motor).
10. **Same-package heurística tem risco de falso-positivo em nomes de classe muito comuns** (ex.: `Status`,
    `Request`) — mitigado com limiar mínimo de 4 caracteres e `\b` word-boundary, mas não elimina 100% (ex.:
    menção em comentário/log). Sempre marcada `confidence: "heuristic"`.
11. **Cross-repo SOAP (RF-025) casa por `targetNamespace::operação`, não pelo método realmente invocado no
    ponto de chamada** — a aresta liga o arquivo do client stub JAX-WS (interface `@WebService`) à
    implementação; a atribuição ao caller real (ex.: `ServicoClienteExemploImpl`) depende da resolução de
    `import` Java já existente (RF-002), que funciona porque o stub é sempre injetado/importado normalmente.
    Não detecta chamadas SOAP feitas via lookup dinâmico de porta sem stub gerado em disco.
12. **Exclusão de teste (RF-026) por convenção de nome/diretório, não por AST/tipo real** — nomes atípicos
    que fogem da convenção (ex.: classe de produção `ABTest.java` representando feature toggle, não teste)
    podem ser falsamente excluídos; ou um arquivo de teste com nome fora do padrão (`verificacao_login.ts`
    sem sufixo `.spec`/`.test`) pode não ser detectado. Risco aceito dado o ganho médio observado (-31% nós).
    Ao ativar `--include-tests`, nenhum arquivo é excluído (comportamento anterior preservado).
13. **Excluir testes pode aumentar levemente a contagem de órfãos** — um arquivo de produção referenciado
    **apenas** por um spec-file (nunca por outro arquivo de produção) passa a aparecer como órfão de
    produção quando `--include-tests` não é usado. Isso é **esperado e mais correto** (revela arquivos só
    testados, nunca usados de fato), não uma regressão do motor.

## Validação real (cross-repo, 13 repositórios, 2026-09-02)

Execução real contra os 13 repositórios do ecossistema de exemplo (incluindo o monorepo Maven `[PROJETO-B]`,
6 módulos, descoberto automaticamente):

```bash
node build-graph.js \
  "<workspace>\[PROJETO-M]" \
  "<workspace>\[PROJETO-B]" \
  "<workspace>\[PROJETO-H]" \
  "<workspace>\[PROJETO-D]" \
  "<workspace>\[PROJETO-I]" \
  "<workspace>\[PROJETO-J]" \
  "<workspace>\[PROJETO-G]" \
  "<workspace>\[PROJETO-K]" \
  "<workspace>\[PROJETO-L]" \
  "<workspace>\[PROJETO-A]" \
  "<workspace>\[PROJETO-C]" \
  "<workspace>\[PROJETO-E]" \
  "<workspace>\[PROJETO-F]"
```

| Métrica | Antes (bug de escopo global) | Depois (escopo por repo + same-package) |
|---|---|---|
| Arquivos processados | 8.222 | 8.222 |
| Nós totais | 6.420 | 8.050 (7.920 file, 110 controller, 7 service, 13 queue) |
| Arestas totais | 20.454 | 27.996 (27.907 import, 73 http, 16 queue) |
| Coupling | 13.641 tight, **6.770 loose** (falso-positivo cross-repo) | **27.848 tight**, 107 loose real, 13 eventual, 28 circular |
| Ciclos detectados | 28 | 28 (estável — same-package corretamente excluído do DFS de ciclos) |
| Cross-repo (Angular→Spring) | 66 arestas (55 exact, 11 heuristic) | 66 arestas (55 exact, 11 heuristic) |
| RabbitMQ | 12 filas declaradas, 16 nós fila (incl. 1 nó fantasma `queueName`) | 12 filas declaradas, **13 nós fila reais** (nó fantasma eliminado) |
| **Nós órfãos** | **156** | **52** (-67%) |

Referências same-package detectadas: **7.544** (evidência do tamanho real do gap que o motor baseado só em
`import` tinha para código Java idiomático).

## Validação real (cross-repo SOAP/JAX-WS, 2 repositórios, 2026-09-02)

Investigação a pedido do usuário: o grafo não ligava `[PROJETO-A]`.`ServicoExemploWeb.operacaoExemploA`
ao EJB implementado no monorepo `[PROJETO-B]` — motor só tinha detecção cross-repo REST (RF-013), sem noção de SOAP/JAX-WS.

```bash
node build-graph.js "<workspace>\[PROJETO-A]" "<workspace>\[PROJETO-B]" --out ./out-validacao-soap
```

| Métrica | Valor |
|---|---|
| Client stubs JAX-WS detectados | 31 |
| Implementações `@WebService` detectadas | 15 |
| Arestas `soap` criadas | 2 (`operacaoExemploA`, `operacaoExemploB`, namespace `http://contrato.exemplo.com/ws/`, `confidence: exact`) |
| Cadeia completa confirmada | `ServicoClienteExemploImpl` --(import, tight)--> stub `ServicoExemploWeb` ([PROJETO-A]) --(soap, exact, cross-repo)--> impl `ServicoExemploWeb` ([PROJETO-B]/[MODULO-WS]) |
| Operações de client sem servidor no escopo | 162 (confirmado: contratos legítimos com servidor **fora** dos 2 repos validados — ex. `[ServicoSoapExterno1]`, `[ServicoSoapExterno2]`, `[ServicoSoapExterno3]`) |

## Validação real (exclusão de testes, 1 repositório Angular, 2026-09-02)

Feedback do usuário: arquivos de teste "sujavam muito o grafo" e tinham baixa relevância para consumo por agents de arquitetura/impacto.

```bash
node build-graph.js "<workspace>\[PROJETO-E]"          # default: exclui testes
node build-graph.js "<workspace>\[PROJETO-E]" --include-tests  # comportamento anterior
```

| Métrica | Com testes (`--include-tests`) | Sem testes (default) |
|---|---|---|
| Nós totais | 1.143 | **789 (-31%)** |
| Arestas totais | 4.320 | **2.794 (-35%)** |
| Órfãos | 2 | 8 (aumento esperado — ver limitação #13) |
| Arquivos de teste ignorados | 0 | 357 |

## Reproduzir a validação

```bash
node build-graph.js "<workspace>\[PROJETO-C]" "<workspace>\[PROJETO-E]"
node render-viewer.js --in graph.json
# abrir graph-viewer.html no navegador para visualizar/navegar interativamente
```

