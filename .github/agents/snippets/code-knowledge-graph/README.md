# code-knowledge-graph — Script de Referência (Node.js puro, sem dependências)

> Script de referência (R-026) do agent [`code-knowledge-graph.agent.md`](../../code-knowledge-graph.agent.md).
>
>
> **Decisão de 2026-09-01 (Mermaid)**: Mermaid tem limite prático de ~500 nós/linhas para renderizar um
> diagrama legível — este grafo tem milhares de nós (2.417+). `build-graph.js` **não gera mais** `graph.mmd`
> nem `graph.html` baseado em Mermaid — apenas `graph.json` (dados estruturados, sem limite). A visualização
> interativa passou a ser responsabilidade de um script separado, [`render-viewer.js`](render-viewer.js), que
> usa **Cytoscape.js** (via CDN) para navegação com busca, filtro por tipo/projeto, destaque de vizinhança e
> painel de detalhes por nó — sem limite prático de nós/arestas.

## Arquivos

| Arquivo | Papel |
|---|---|
| [`build-graph.js`](build-graph.js) | Script único de produção do grafo: caminha os project roots, extrai imports/decorators via regex, constrói o grafo (`Object`/`Set` em memória, sem lib externa), roda DFS (ciclos), BFS reverso (blast radius), matching cross-repo 1-para-N. Gera **apenas `graph.json`**. |
| [`render-viewer.js`](render-viewer.js) | Script de visualização: lê `graph.json` e gera `graph-viewer.html` (Cytoscape.js via CDN, dados embutidos inline) — busca, filtro por tipo/projeto, destaque de vizinhança, painel de detalhes, realce de ciclos. |

## Como rodar

```bash
# 1) Gerar o grafo (graph.json)
node build-graph.js "<caminho-do-projeto>"

# Cross-repo (2+ projetos, matching automático de endpoints Angular<->Spring)
node build-graph.js "<projeto-A>" "<projeto-B>"

# Customizar diretório de saída (padrão: cwd)
node build-graph.js "<projeto-A>" "<projeto-B>" --out "<diretorio-saida>"

# 2) Gerar o visualizador interativo a partir do graph.json
node render-viewer.js --in "<diretorio-saida>/graph.json" --out "<diretorio-saida>"
# abrir graph-viewer.html no navegador (requer internet só para carregar Cytoscape.js via CDN)
```

Saída de `build-graph.js`: **somente `graph.json`** (nós/arestas estruturado). Saída de `render-viewer.js`:
**`graph-viewer.html`** (visualizador interativo, dados embutidos inline — evita CORS de `fetch()` em
`file://`). Nenhum dos 2 arquivos é versionado (`.gitignore`) — são artefatos reproduzíveis, não fonte.

**Tempo de execução real medido**: ~poucos segundos para 2.668 arquivos reais (2 projetos Java + 1 Angular,
cross-repo) — extração via regex em memória, sem overhead de subprocess ou parsing AST completo.

## Capacidades

| Capacidade | Como |
|---|---|
| Import graph intra-repo (TypeScript) | Regex `import ... from "..."` + resolução de path relativo em Node (`fs.existsSync`) |
| Import graph intra-repo (Java) | Regex `import a.b.C;` + resolução via convenção Maven (`a.b.C` → `<root>/a/b/C.java`) |
| Framework nodes (Angular `@Component`/`@Injectable`/`@NgModule`/`@Directive`/`@Pipe`, Spring `@Service`/`@Repository`/`@Entity`/`@Configuration`, Spring Reactive `Mono`/`Flux`, EJB `@Stateless`/`@Stateful`/`@Singleton`/`@MessageDriven`) | Regex por decorator/anotação, aplicado ao conteúdo do arquivo |
| Endpoints REST + cross-repo matching 1-para-N | Regex `@RestController`+`@RequestMapping` (Java) e getter `apiUrl` (Angular) + matching com guarda de profundidade mínima de path |
| Integração HTTP (Angular → serviço externo) | Regex `this.http.get/post/put/delete(...)` / `fetch(...)` |
| Sensibilidade de dado financeiro/PII | Regex sobre assinatura de campo (`cpf/rg/email/telefone: string`, `valor/preco/salario: number`) |
| Blast radius profundidade 1/2 | BFS reverso sobre adjacência em `Object`/`Set`, JavaScript puro |
| Detecção de ciclo | DFS com pilha de recursão (cores WHITE/GRAY/BLACK), JavaScript puro |
| Acoplamento/risco | Classificação determinística por `type`/fan-in (idêntica à versão anterior) |
| Visualização interativa (`render-viewer.js`) | Cytoscape.js + layout `fcose`, sem limite prático de nós/arestas (substitui Mermaid, limitado a ~500) |

## Limitações reais conhecidas (documentadas, não bloqueantes)

1. **Pattern-matching via regex, não AST real** — pode ter falsos positivos/negativos em casos sintaticamente
   incomuns (ex.: anotações multi-linha atípicas, imports comentados, strings contendo padrões parecidos com
   decorators). Validado empiricamente contra 3 projetos reais (soma-pecas-app, soma-vistoria-app,
   somaorcamento) com resultado consistente entre execuções.
2. **Resolução de import Java assume convenção Maven padrão** (`package.Class` → `package/Class.java` relativo
   à raiz `src/main/java`) — não resolve wildcard imports (`import pacote.*;`).
3. **EJB/Jakarta EE sem projeto real no workspace para validação** — regras mantidas por completude (mesma
   ressalva já documentada na versão anterior), testadas apenas contra padrão sintético.
4. **Matching cross-repo 1-para-1 ingênuo geraria falso-positivo em massa** quando um path-base é curto/genérico
   — mesma correção da versão anterior aplicada aqui: guarda de profundidade mínima de 2 segmentos de path
   antes de aplicar heurística de prefixo.
5. **Filas/eventos (RabbitMQ/Kafka) não instrumentados** — item 3 do Gate de Paridade Funcional (RNF-012)
   permanece pendente; não coberto por este motor (nem era pelo motor anterior de fato, apesar de documentado).

## Validação real (cross-repo, 2026-09-01)

Execução real contra os 3 projetos registrados no ecossistema (soma-pecas-app + soma-vistoria-app +
somaorcamento):

```bash
node build-graph.js \
  "D:\workspace\porto\soma-pecas-app\src\main\java" \
  "D:\workspace\porto\soma-vistoria-app\src\main\java" \
  "D:\workspace\porto\somaorcamento\src\app"
```

| Métrica | Valor |
|---|---|
| Arquivos processados | 2.668 |
| Nós totais | 2.417 (2.361 file, 50 controller, 6 service) |
| Arestas totais | 5.221 (5.184 import, 37 http) |
| Coupling | 5.181 tight, 37 loose, 0 eventual, 3 circular |
| Cross-repo (Angular→Spring) | 31 arestas (24 exact, 7 heuristic) |
| Ciclos detectados | 3 |
| Sensibilidade de dado (PII/financeiro) | 14 nós |
| Tempo de execução | poucos segundos |


## Reproduzir a validação

```bash
node build-graph.js \
  "D:\workspace\porto\soma-pecas-app\src\main\java" \
  "D:\workspace\porto\soma-vistoria-app\src\main\java" \
  "D:\workspace\porto\somaorcamento\src\app"

node render-viewer.js --in graph.json
# abrir graph-viewer.html no navegador para visualizar/navegar interativamente
```

