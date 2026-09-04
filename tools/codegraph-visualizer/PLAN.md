# Plano de Implementação — Codegraph Visualizer (Fases 2 a 6)

> Plano de execução técnica com pré-voo (R-031), paralelização de tarefas (R-018) e contingências inline `[fallback: X]`.

---

## 🛫 Pré-Voo de Execução

- **Escopo**: Implementar as Fases 2 a 6 da ferramenta `tools/codegraph-visualizer/` no repositório `deep-agents-copilot`.
- **Arquitetura**:
  - `generator/generate-graph.py` ➔ Evoluído com descoberta automática via catalog, ingestão de OpenAPI e classificador de acoplamento.
  - `template/index.html` ➔ Evoluído com seletor de visualização 2D/3D, filtros de acoplamento e suporte dinâmico a N repositórios.
  - `schemas/graph.schema.json` ➔ Atualizado com contratos de acoplamento e metadados de contratos.
- **Critério de Falha Tolerável**: Se um projeto listado no catálogo não possuir `.codegraph/graph.db`, emitir aviso e prosseguir com os demais sem abortar.
- **Bloqueantes Absolutos**: Nenhuma escrita em `catalog.yaml` compartilhado (R-043) e zero credenciais expostas (R-010).

---

## 📋 Estrutura de Fases & Ações

### Fase 2 — Descoberta Dinâmica via Catálogo (Catalog-Driven Multi-Repo)
- [x] `[S]` **Etapa 2.1**: Implementar leitor de catálogo que mescla `docs/ai-context/catalog.yaml` + `catalog.local.yaml` em memória. `[fallback: usar lista de projetos padrão passada via CLI]`
- [x] `[S]` **Etapa 2.2**: Implementar namespacing automático de nós por `project_id` e atribuição dinâmica de paleta de cores para N repositórios. `[fallback: usar paleta ciclica padrão]`
- [x] `[S]` **Etapa 2.3**: Atualizar o gerador para suportar flags `--all`, `--projects <list>` e `--output <path>`. `[fallback: gerar no caminho padrão]`

### Fase 3 — Ingestão de Contratos de API & Descoberta Automática de Pontes
- [x] `[P]` **Etapa 3.1**: Criar módulo de detecção e correlação de contratos REST/OpenAPI (`Angular HttpClient` ➔ `Spring @RestController`). `[fallback: usar catálogo de pontes declaradas]`
- [x] `[P]` **Etapa 3.2**: Incorporar metadados de protocolo, método HTTP e status de compatibilidade (`COMPATIBLE`/`BREAKING`) nas arestas geradas. `[fallback: rotular como HTTP REST]`

### Fase 4 — Taxonomia e Destaque de Acoplamento (Coupling Classifier)
- [x] `[S]` **Etapa 4.1**: Implementar classificador heurístico de acoplamento (`Tight`, `Loose`, `Eventual`, `Circular`) baseado em fan-in, tipo de chamada e ciclo. `[fallback: classificar como standard/loose]`
- [x] `[S]` **Etapa 4.2**: Adicionar filtros e estilização visual por nível de acoplamento no template Angular Material 3. `[fallback: manter estilo uniforme]`

### Fase 5 — Alternador de Visualização 3D / WebXR
- [x] `[S]` **Etapa 5.1**: Integrar motor `3d-force-graph` / Three.js no template `template/index.html` com alternador instantâneo 2D ⇄ 3D na barra de controle. `[fallback: manter visualizador 2D vis-network]`
- [x] `[S]` **Etapa 5.2**: Adicionar clusterização volumétrica tridimensional por repositório com rotação automática e seleção de nós em 3D. `[fallback: layout esférico simples]`

### Fase 6 — Validação, Testes e Documentação
- [x] `[S]` **Etapa 6.1**: Testar a geração ponta a ponta com o conjunto de repositórios do workspace (`[PROJETO-FRONTEND]`, `[PROJETO-BACKEND-A]`, `[PROJETO-BACKEND-B]`). `[fallback: testar com fixtures locais]`
- [x] `[S]` **Etapa 6.2**: Atualizar `README.md` e `ROADMAP.md` com os novos comandos e recursos disponíveis. `[fallback: atualizar changelog]`

