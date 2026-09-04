# Codegraph Visualizer (Angular Material 3)

> Ferramenta desacoplada e reutilizável para visualização e exploração interativa de grafos de conhecimento de código-fonte multi-repositório com pontes cross-repo.

---

## 1) 🎯 Objetivo e Arquitetura

O **Codegraph Visualizer** transforma bancos de grafos SQLite locais (`.codegraph/graph.db` gerados pelo motor `@optave/codegraph`) em uma aplicação web interativa standalone, desenhada sob as diretrizes do **Angular Material 3** e motor gráfico **vis-network**.

### Principais Capacidades:
- **Multi-Repositório Unificado**: Agrega e visualiza simultaneamente N projetos (Frontend, Backend, Legados) em um único canvas.
- **Pontes Cross-Repo Reais**: Conecta e rotula chamadas REST, RestTemplate, Feign e gateways entre serviços distintos.
- **Filtros e Busca em Tempo Real**: Autocomplete instantâneo com zoom suave e realce de nós.
- **Side Sheet Inspector**: Painel lateral Material com metadados estruturais, chamadores (inbound), dependências (outbound) e links para pontes cross-repo.
- **Zero Servidor / Zero Lock-in**: Gera páginas HTML standalone que rodam diretamente no navegador (`file://`).

---

## 2) 📁 Estrutura do Módulo

```
tools/codegraph-visualizer/
├── README.md                     # Guia de uso e arquitetura
├── ROADMAP.md                    # Roadmap técnico detalhado (Fases 1 a 6 concluídas)
├── PLAN.md                       # Plano de execução técnica e pré-voo
├── .gitignore                    # Isola artefatos locais gerados (R-043/R-044)
├── schemas/
│   └── graph.schema.json         # Contrato versionado (Node/Edge/Metrics/Cycles)
├── bridges.json.example          # Exemplo genérico de declaração de pontes REST
├── template/
│   └── index.html                # Template base Angular Material 3 + vis-network + Three.js
└── generator/
    ├── generate-graph.py         # Orquestrador CLI de visualização unificada desacoplado
    ├── contract_parser.py        # Parser OpenAPI (3.0/3.1), Swagger e AsyncAPI
    ├── metrics_calculator.py     # Métricas de Robert Martin (Ca/Ce/I/A/D) e Detecção de Ciclos (Tarjan SCC)
    └── diff_checker.py           # Análise de Diff Git Triplo e CI Gate de Boundaries
```

---

## 3) 🚀 Como Executar

### Descoberta Automática (via `catalog.local.yaml` / `catalog.yaml`):
```bash
python tools/codegraph-visualizer/generator/generate-graph.py --open
```

### Ingestão de Contratos OpenAPI / Swagger:
```bash
python tools/codegraph-visualizer/generator/generate-graph.py --openapi docs/openapi/api-docs.json --open
```

### Visualização com Blast Radius de Diff Git:
```bash
python tools/codegraph-visualizer/generator/generate-graph.py --diff HEAD~1 --open
```

### Validação CI Gate (Verificação de Boundaries):
```bash
python tools/codegraph-visualizer/generator/generate-graph.py --ci
```

### Especificando Caminho de Saída ou Projetos Específicos:
```bash
# Exportar para local customizado
python tools/codegraph-visualizer/generator/generate-graph.py --output "dist/meu-grafo.html" --open

# Filtrar projetos específicos do catálogo
python tools/codegraph-visualizer/generator/generate-graph.py --projects "projeto-a,projeto-b"

# Apontar diretamente bancos de dados ou pastas de projetos
python tools/codegraph-visualizer/generator/generate-graph.py --db /path/do/projeto-a /path/do/projeto-b
```

---

## 4) 🧭 Roadmap de Evolução (Status de Implementação)

| Fase | Funcionalidade | Status |
|---|---|:---:|
| **Fase 1** | **Material 3 UI + Multi-Repo CLI** (Visualização 2D, autocomplete, side inspector e pontes REST) | ✅ Concluída |
| **Fase 2** | **Descoberta Automática via Catálogo** (Ingestão dinâmica de `catalog.local.yaml`, namespacing e paletas) | ✅ Concluída |
| **Fase 3** | **Ingestão de Contratos OpenAPI / AsyncAPI** (Parser OpenAPI 3.x, Swagger, AsyncAPI e correlação de rotas) | ✅ Concluída |
| **Fase 4** | **Taxonomia e Métricas de Robert Martin** (Cálculo de Ca/Ce/I/A/D, zonas de dor/inutilidade e ciclos Tarjan) | ✅ Concluída |
| **Fase 5** | **Visualização 3D e Navegação Espacial** (Three.js WebGL GPU, animação de partículas de dados em pontes) | ✅ Concluída |
| **Fase 6** | **CI/CD Gate Visual & Revisão de PR** (Diff triplo Verde/Âmbar/Vermelho e exit code 1 em violações de boundary) | ✅ Concluída |

---

## 5) 🛡️ Governança & Boas Práticas

- **R-038 (Genericidade)**: O código gerador e o template são 100% genéricos e funcionam para qualquer conjunto de projetos.
- **R-043 (Isolamento Local)**: Caminhos de projetos e arquivos HTML gerados vivem no overlay local ou no workspace do desenvolvedor, nunca versionados no repositório de governança compartilhado.
- **R-044 (Anonimização)**: Schemas e documentação utilizam termos neutros e reutilizáveis.

