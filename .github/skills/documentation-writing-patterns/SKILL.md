---
name: documentation-writing-patterns
description: >-
  Diretrizes agnósticas de domínio para estruturar e escrever documentação
  técnica em Markdown com qualidade de mercado (Diátaxis, ADR/MADR, README,
  front-matter, formatação chunking-friendly para consumo por IA).
tier: 2
category: documentation
triggers:
  - "escrever documentação"
  - "criar documentação técnica"
  - "estruturar README"
  - "criar ADR"
  - "documentar decisão técnica"
  - "gerar arquivo .md de documentação"
tools: []
source_docs:
  - "CLAUDE.md"
  - ".github/copilot-instructions.md"
---

# Documentation Writing Patterns

> Base de conhecimento agnóstica de assunto para qualquer agent cujo trabalho seja **produzir documentação técnica em Markdown** — independente do domínio (código, processo, arquitetura, API, decisão, incidente).

## Quando Usar

- Antes de gerar qualquer arquivo `.md` novo de documentação técnica.
- Antes de decidir a estrutura de um README, ADR, runbook, postmortem, RFC ou PRD.
- Ao revisar documentação existente que não segue padrão de mercado.
- Ao avaliar se um documento será bem "chunkado" por pipelines de RAG/indexação de IA.

## 1) Framework de Categorização (Diátaxis)

Todo documento pertence a **exatamente um** dos 4 quadrantes — nunca misturar no mesmo arquivo:

| Tipo | Objetivo | Público | Regra |
|---|---|---|---|
| **Tutorial** | Aprendizado guiado, passo a passo | Iniciante no assunto | Foco em ação + aquisição de conhecimento |
| **How-to** | Resolver um objetivo específico | Já conhece o básico | Foco em ação + aplicação |
| **Reference** | Descrição técnica precisa | Consulta rápida | Foco em cognição + aplicação (sem narrativa) |
| **Explanation** | Contexto e racional de decisões | Entendimento profundo | Foco em cognição + aquisição |

## 2) Estrutura Mínima por Tipo de Artefato

| Artefato | Estrutura mínima obrigatória |
|---|---|
| **README** | Title → Description → Install → Usage (com exemplo) → API (se lib) → Contributing → Tests → License (padrão `standard-readme`) |
| **ADR (MADR)** | Front-matter (`status`, `date`, `decision-makers`) → Contexto/Problema → Opções consideradas → Decisão → Consequências |
| **Runbook** | Sintoma → Pré-requisitos → Passos numerados → Verificação → Rollback |
| **Postmortem** | Resumo do incidente → Timeline → Causa raiz → Impacto → Ações corretivas (owner + prazo) |
| **RFC** | Motivação → Especificação/Design → Alternativas rejeitadas → Impacto/Riscos |
| **PRD** | Problema → Objetivo/Métrica de sucesso → Escopo (in/out) → Requisitos → Riscos |

## 3) Convenções de Formatação Obrigatórias

- Headings hierárquicos sequenciais (`#` → `##` → `###`), **nunca pular nível** — essencial para chunking/RAG (splitters de LLM dividem exatamente nesses limites).
- Tabelas para dados comparativos/estruturados; bullets para listas curtas; parágrafos curtos (1 ideia por bloco, evitar paredes de texto).
- Code fences sempre com linguagem declarada (` ```ts `, ` ```bash `).
- Front-matter YAML com metadados (`status`, `date`, `autor`) quando o doc tiver ciclo de vida.
- Links relativos entre docs do mesmo repositório (portabilidade).
- Mermaid para diagramas de fluxo/arquitetura quando aplicável — ver [`../mermaid-diagrams/SKILL.md`](../mermaid-diagrams/SKILL.md).

## 4) Nomenclatura de Arquivo

- `kebab-case` obrigatório — sem espaços, acentos ou versão no nome (evitar `-v2`).
- Sufixo por tipo quando aplicável: `README.md`, `RUNBOOK.md`, `POSTMORTEM-YYYY-MM-DD.md`, `NNNN-titulo.md` (ADR).

## 5) Anti-Alucinação / Veracidade Técnica

- Nunca documentar comportamento sem verificar contra o código/fonte real.
- Declarar explicitamente lacunas quando não houver evidência suficiente — **nunca inferir**.
- Geração incremental: não reescrever o documento inteiro quando a mudança é pontual.
- Preferir fatos rastreáveis (paths, símbolos, comandos) a resumos genéricos.

## Como Usar

1. Identificar o tipo de documento (Diátaxis) antes de escrever qualquer linha.
2. Selecionar a estrutura mínima do artefato (tabela da seção 2).
3. Redigir seguindo as convenções de formatação (seção 3) e nomenclatura (seção 4).
4. Verificar cada afirmação técnica contra o código/fonte real antes de publicar.
5. Rodar o checklist abaixo antes de entregar.

## Checklist

- [ ] Tipo de documento identificado (tutorial/how-to/reference/explanation) e não misturado.
- [ ] Estrutura mínima do tipo de artefato aplicada.
- [ ] Headings hierárquicos sem pular nível.
- [ ] Nome de arquivo em kebab-case.
- [ ] Conteúdo técnico verificado contra código/fonte real (sem alucinação).
- [ ] Lacunas declaradas explicitamente quando existirem.
- [ ] Saída é SOMENTE arquivo(s) `.md` (nunca outro formato).

## Referências

- Diátaxis Framework — https://diataxis.fr
- Google Developer Documentation Style Guide — https://developers.google.com/style
- MADR (Markdown ADR) — https://adr.github.io/madr
- standard-readme spec — https://github.com/richardlitt/standard-readme
- llms.txt proposal — https://llmstxt.org
- Anthropic, "Writing effective tools for AI agents" — https://www.anthropic.com/engineering/writing-tools-for-agents

