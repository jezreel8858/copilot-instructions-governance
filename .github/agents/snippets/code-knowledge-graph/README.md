# code-knowledge-graph — Script de Referência (Node.js puro, sem dependências)

> Script de referência (R-026) do agent [`code-knowledge-graph.agent.md`](../../code-knowledge-graph.agent.md).
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
| [`build-graph.js`](build-graph.js) | Script único de produção do grafo: caminha os project roots, extrai imports/decorators/filas via regex, constrói o grafo (`Object`/`Set` em memória, sem lib externa), roda DFS (ciclos), BFS reverso (blast radius + órfãos), matching cross-repo 1-para-N. Gera **apenas `graph.json`**. |
| [`render-viewer.js`](render-viewer.js) | Script de visualização: lê `graph.json` e gera `graph-viewer.html` (Cytoscape.js via CDN, dados embutidos inline) — busca, filtro por tipo/projeto, destaque de vizinhança, painel de detalhes, realce de ciclos/filas. |

## Como rodar

```bash
# 1) Gerar o grafo (graph.json) — aceita N projetos (Java e/ou Angular, misturados)
node build-graph.js "<caminho-do-projeto>"

# Cross-repo (2+ projetos, matching automático de endpoints Angular<->Spring)
node build-graph.js "<projeto-A>" "<projeto-B>" "<projeto-C>" "<projeto-D>"

# Customizar diretório de saída (padrão: cwd)
node build-graph.js "<projeto-A>" "<projeto-B>" --out "<diretorio-saida>"

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
| Import graph intra-repo (TypeScript) | Regex `import ... from "..."` + resolução de path relativo em Node (`fs.existsSync`) |
| Import graph intra-repo (Java) | Regex `import a.b.C;` + resolução via convenção Maven (`a.b.C` → `<root>/a/b/C.java`) |
| Framework nodes (Angular `@Component`/`@Injectable`/`@NgModule`/`@Directive`/`@Pipe`, Spring `@Service`/`@Repository`/`@Entity`/`@Configuration`, Spring Reactive `Mono`/`Flux`, EJB `@Stateless`/`@Stateful`/`@Singleton`/`@MessageDriven`) | Regex por decorator/anotação, aplicado ao conteúdo do arquivo |
| Endpoints REST + cross-repo matching 1-para-N | Regex `@RestController`+`@RequestMapping` (Java) e getter `apiUrl` (Angular) + matching com guarda de profundidade mínima de path. Nó do controller unificado com o nó de arquivo (sem duplicação). |
| Integração HTTP (Angular → serviço externo) | Regex `this.http.get/post/put/delete(...)` / `fetch(...)` |
| **Filas RabbitMQ (produtor/consumidor)** | Regex `new Queue/DirectExchange/TopicExchange/FanoutExchange(...)`, `@RabbitListener(queues = ...)`, `rabbitTemplate.convertAndSend(...)` — com **resolução de constantes Java** (`static final String`, referenciadas via `Classe.CONST` ou bare-name), pois o idioma real de Spring AMQP raramente usa string literal direta. Aresta `type: "queue"`, `coupling: "eventual"`. |
| **Detecção de nós órfãos** | Nó sem NENHUMA aresta (nem entrada nem saída) — calculado via adjacência + adjacência reversa já existentes, sem custo adicional relevante. Reporta agregado por tipo/projeto + amostra de até 30 nós. |
| Sensibilidade de dado financeiro/PII | Regex sobre assinatura de campo (`cpf/rg/email/telefone: string`, `valor/preco/salario: number`) |
| Blast radius profundidade 1/2 | BFS reverso sobre adjacência em `Object`/`Set`, JavaScript puro |
| Detecção de ciclo | DFS com pilha de recursão (cores WHITE/GRAY/BLACK), JavaScript puro |
| Acoplamento/risco | Classificação determinística por `type`/fan-in (`tight`/`loose`/`eventual`/`circular`) |
| Visualização interativa (`render-viewer.js`) | Cytoscape.js + layout `fcose`, sem limite prático de nós/arestas (substitui Mermaid, limitado a ~500) |

## Limitações reais conhecidas (documentadas, não bloqueantes)

1. **Pattern-matching via regex, não AST real** — pode ter falsos positivos/negativos em casos sintaticamente
   incomuns (ex.: anotações multi-linha atípicas, imports comentados, strings contendo padrões parecidos com
   decorators). Validado empiricamente contra 4 projetos reais (soma-pecas-app, soma-vistoria-app,
   somaorcamento, somaparametrizacao) com resultado consistente entre execuções.
2. **Resolução de import Java assume convenção Maven padrão** (`package.Class` → `package/Class.java` relativo
   à raiz `src/main/java`) — não resolve wildcard imports (`import pacote.*;`).
3. **EJB/Jakarta EE sem projeto real no workspace para validação** — regras mantidas por completude, testadas
   apenas contra padrão sintético.
4. **Matching cross-repo 1-para-1 ingênuo geraria falso-positivo em massa** quando um path-base é curto/genérico
   — corrigido com guarda de profundidade mínima de 2 segmentos de path antes de aplicar heurística de prefixo.
5. **Filas/eventos: apenas RabbitMQ (Spring AMQP) instrumentado** — Kafka, JMS e outros brokers não têm regra
   dedicada (sem evidência real de uso no workspace até o momento). Resolução de fila via constante cobre o
   idioma `Classe.CONST`/bare-name; não resolve nomes montados dinamicamente em runtime (ex.: `"prefix-" + var`).
6. **Gap de cobertura de import esperado, não é bug**: nem todo `import`/`java-import` bruto vira aresta —
   imports de bibliotecas externas (`org.springframework.*`, `@angular/*`, etc.) são intencionalmente
   descartados (RF-004, só imports locais contam). O campo `gapCobertura` do resumo reporta bruto vs.
   resolvido para visibilidade, mas uma diferença grande é esperada e não indica falha do motor.
7. **Nós órfãos nem sempre são "problema"** — classes `@Configuration`/`@Component` descobertas via
   component-scan do Spring nunca são importadas explicitamente por outro arquivo e aparecem como órfãs
   legitimamente. Sempre trate a lista como candidata a triagem humana, não como lista de bugs confirmados.

## Validação real (cross-repo, 2026-09-01)

Execução real contra os 4 projetos registrados no ecossistema (soma-pecas-app + soma-vistoria-app +
somaorcamento + somaparametrizacao, este último adicionado como módulo IntelliJ nesta rodada):

```bash
node build-graph.js \
  "D:\workspace\porto\soma-pecas-app\src\main\java" \
  "D:\workspace\porto\soma-vistoria-app\src\main\java" \
  "D:\workspace\porto\somaorcamento\src\app" \
  "D:\workspace\porto\somaparametrizacao\src\app"
```

| Métrica | Valor |
|---|---|
| Arquivos processados | 2.856 |
| Nós totais | 2.518 (2.460 file, 50 controller, 7 service, 1 queue) |
| Arestas totais | 5.362 (5.320 import, 40 http, 2 queue) |
| Coupling | 5.316 tight, 40 loose, 1 eventual, 5 circular |
| Cross-repo (Angular→Spring) | 33 arestas (25 exact, 8 heuristic) |
| Ciclos detectados | 5 |
| RabbitMQ | 1 fila, 1 exchange, 1 listener, 1 producer (`soma-vistoria-app`) |
| Nós órfãos | 142 (139 file, 3 controller) — majoritariamente classes `@Configuration` via component-scan |
| Sensibilidade de dado (PII/financeiro) | 14 nós |
| Tempo de execução | ~35-60s (2.856 arquivos, 4 projetos) |

## Reproduzir a validação

```bash
node build-graph.js \
  "D:\workspace\porto\soma-pecas-app\src\main\java" \
  "D:\workspace\porto\soma-vistoria-app\src\main\java" \
  "D:\workspace\porto\somaorcamento\src\app" \
  "D:\workspace\porto\somaparametrizacao\src\app"

node render-viewer.js --in graph.json
# abrir graph-viewer.html no navegador para visualizar/navegar interativamente
```
