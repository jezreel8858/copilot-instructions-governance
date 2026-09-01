# code-knowledge-graph — Script de Referência (100% Semgrep)

> Script de referência (R-026) do agent [`code-knowledge-graph.agent.md`](../../code-knowledge-graph.agent.md). Única fonte de extração: **Semgrep CLI** (determinístico, RNF-008) — substitui integralmente o regex artesanal (`build-graph.js`, removido) e a lib `dependency-cruiser` (avaliada e rejeitada — ver histórico em `docs/requirements/REQ-grafo-conhecimento-codigo.md` §15).

## Arquivos

| Arquivo | Papel |
|---|---|
| [`semgrep-rules.yaml`](semgrep-rules.yaml) | ~40 regras Semgrep: import graph (TS/Java), framework Angular/Spring Boot/Spring Reactive/EJB, integração HTTP/evento, sensibilidade de dado, endpoints REST cross-repo |
| [`build-graph.py`](build-graph.py) | Orquestrador único: invoca Semgrep via subprocess, constrói grafo (`Map`/`Set` em memória, sem lib externa — RNF-004), roda BFS (blast radius, RF-015), DFS (ciclos, RF-016), matching cross-repo 1-para-N (RF-021), gera Mermaid/HTML |

## Pré-requisito: Semgrep em venv ISOLADO (obrigatório)

> ⚠️ **Nunca instalar Semgrep no Python global.** `pip install semgrep` reescreve dependências compartilhadas (`protobuf`, `click`, `opentelemetry-api`, `jsonschema`, e principalmente **`mcp`** — o SDK usado pelas próprias tools desta sessão) — risco real e confirmado empiricamente (ver histórico §15.2/§16 do REQ).

```bash
python -m venv .venv-semgrep
.venv-semgrep/Scripts/pip install semgrep   # Windows
# .venv-semgrep/bin/pip install semgrep     # Linux/Mac
```

## Como rodar

```bash
# Projeto único
.venv-semgrep/Scripts/python build-graph.py "<caminho-do-projeto>" --semgrep ".venv-semgrep/Scripts/semgrep.exe"

# Cross-repo (2+ projetos, matching automático de endpoints Angular<->Spring)
.venv-semgrep/Scripts/python build-graph.py "<projeto-A>" "<projeto-B>" --semgrep ".venv-semgrep/Scripts/semgrep.exe"
```

Saída: `graph.json` (nós/arestas estruturado), `graph.mmd` (Mermaid puro), `graph.html` (renderizado via `mermaid.js` CDN, abrível no navegador). Nenhum desses 3 arquivos é versionado (`.gitignore`) — são artefatos reproduzíveis, não fonte.

## Capacidades (RF-001..RF-021)

| Capacidade | Como |
|---|---|
| Import graph intra-repo (RF-004/005) | Regra `ts-import` (Semgrep) + resolução de path local em Python |
| Framework nodes (Angular `@Component`/`@Injectable`, Spring `@RestController`/`@Service`) | Regras AST Semgrep |
| Integração HTTP/evento + direção producer/consumer (RF-013/014) | Regras `angular-http-client`/`angular-event-consumer`/`angular-event-producer` |
| Sensibilidade de dado financeiro/PII (RF-018 item 8) | `pattern-regex` nativo do Semgrep (não AST — ver nota abaixo) |
| Endpoints REST + cross-repo matching 1-para-N (RF-002/003/021) | Regras `angular-api-url-path`/`spring-rest-controller-with-mapping` + matching Python com guarda de profundidade mínima de path |
| Blast radius profundidade 1/2 (RF-015) | BFS em `Map`/`Set`, Python |
| Detecção de ciclo (RF-016) | DFS com pilha de recursão, Python |
| Acoplamento/risco (RF-017/018) | Classificação determinística por `type`/fan-in |
| Diagrama Mermaid (RF-019) | Gerado a partir do grafo final |

## Limitações reais encontradas (documentadas, não bloqueantes)

1. **Semgrep AST não reconhece `interface` TS para pattern de field** (`Parse_error` em `interface $I { $FIELD: number }`) — só reconhece `class`. **Corrigido** usando `pattern-regex` (mecanismo nativo do Semgrep, não script externo) para as 2 regras de sensibilidade de dado — funciona para `interface` e `class`.
2. **Matching cross-repo 1-para-1 ingênuo gera falso-positivo em massa** quando um service tem path-base curto/genérico (ex.: `/v1` sozinho casava com os 39 controllers). **Corrigido**: guarda de profundidade mínima de 2 segmentos de path antes de aplicar heurística de prefixo (`path_depth(jp) >= 2 and path_depth(np_) >= 2`).
3. **Semgrep OSS/CE não tem "join mode" nativo estável** para resolver 1-para-N entre regras/arquivos (join mode é experimental e nem está disponível na CE — confirmado via pesquisa web). O matching 1-para-N é responsabilidade de pós-processamento (implementado em `build-graph.py`), não do Semgrep.
4. **Instalação global de `pip install semgrep` corrompe dependências compartilhadas** (ver seção "Pré-requisito" acima) — sempre usar venv isolado.

## Cobertura de Frameworks (Angular, Spring Boot, Spring Reactive, EJB — rodada 18)

> Pesquisa web (`@deep-search`, budget 3/3) confirmou: o registry oficial `github.com/semgrep/semgrep-rules` cobre principalmente **segurança** (XSS, SQLi, SSRF) para Angular/Spring — não tem patterns estruturais prontos para detecção de arquitetura/framework (decorators, DI, endpoints). Todas as regras abaixo foram **propostas e validadas com evidência real** (exceto onde indicado).

| Framework | Regras | Validação |
|---|---|---|
| **Angular** | `@NgModule`, `@Directive`, `@Pipe`, `inject()`, Signals (`signal`/`computed`/`effect`) | ✅ Real: `angular-example` (24 NgModule, 27 Directive, 22 Pipe, 605 inject, 519 Signals) |
| **Spring Boot** | `@Controller` (puro), `@Repository` (+ idioma `interface extends JpaRepository`), `@Entity`, `@Configuration`, `@Bean`, `@Transactional` | ✅ Real: `springboot-example-app`/`springboot-api-web` (42 Repository, 50 Entity, 11 Configuration, 10 Bean, 47 Transactional). ⚠️ `@Controller` puro sem evidência real (todos os projetos testados usam `@RestController`) |
| **Spring Reactive/WebFlux** | `Mono<T>`/`Flux<T>` em métodos, `RouterFunction`/`HandlerFunction` (estilo funcional), `WebClient`, `R2dbcRepository` | ✅ Real: `webflux-patterns`/`spring-mvc-vs-webflux` (73 Mono, 12 Flux, 28 WebClient). ⚠️ `RouterFunction`/`R2dbcRepository` sem evidência real (projetos testados usam estilo anotado + agregação via WebClient, não functional routing nem R2DBC) |
| **EJB/Jakarta EE** | `@Stateless`, `@Stateful`, `@Singleton`, `@MessageDriven`, `@EJB` (injeção), `@Local`/`@Remote`, `@Schedule`/`@Timeout`, `@TransactionAttribute` | ⚠️ **Sem projeto real no workspace** — validado apenas contra arquivo sintético de teste (sintaxe confirmada, mas não uso real em produção) |

**Bug real encontrado e corrigido nesta rodada:** `@Repository` em Spring Data é tipicamente aplicado a `interface` (não `class`) quando usado com Spring Data JPA (`interface XRepository extends JpaRepository<...>`) — mesma classe de limitação do Semgrep já documentada acima (AST não casa `class $C` para `interface`). Regra `spring-repository-decorator` corrigida com `pattern-either` cobrindo `class`, `interface` anotada, e o idioma real sem anotação explícita (`extends JpaRepository`/`CrudRepository`).

## Reproduzir a validação cross-repo (springboot-example-app + angular-example)

```bash
python -m venv .venv-semgrep
.venv-semgrep/Scripts/pip install semgrep
.venv-semgrep/Scripts/python build-graph.py \
  "D:\workspace\springboot-example-app\src\main\java" \
  "D:\workspace\angular-example\src\app" \
  --semgrep ".venv-semgrep/Scripts/semgrep.exe"
# abrir graph.html no navegador para visualizar
# limpar depois: rm -rf .venv-semgrep graph.*
```

**Tempo esperado:** ~4min para 2213 arquivos reais (escala offline/batch, não real-time).

