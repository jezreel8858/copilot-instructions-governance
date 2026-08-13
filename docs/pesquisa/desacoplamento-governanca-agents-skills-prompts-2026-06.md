# Pesquisa — Desacoplamento de Governança de Agents/Skills/Prompts

**Data**: 2026-06-10  
**Objetivo**: identificar práticas para transformar governança de IA acoplada a um projeto em base genérica reutilizável por qualquer stack.

---

## 1) Síntese executiva

A literatura e documentação oficial convergem para um padrão **Core + Adapters**:

- **Core genérico**: regras globais, catálogo de agents, skills transversais, contratos de handoff, templates e prompts operacionais.
- **Adapters por projeto/stack**: instruções específicas (`*.instructions.md`) e mapa de projetos (`docs/ai-context/catalog.yaml`) carregados sob demanda.

Resultado esperado:
- governança reutilizável em diferentes repositórios;
- menor duplicação de regras;
- menor acoplamento com domínio e tecnologia.

---

## 2) Padrão recomendado (Core + Adapters)

## Core (reutilizável)
- `CLAUDE.md` com regras globais sem tecnologia fixa.
- `.github/agents/*` com roteamento, análise, curadoria e contratos neutros.
- `.github/skills/*` com capacidades transversais (contexto, pesquisa, segurança, evals).
- `.github/prompts/*` com fluxo operacional genérico.
- catálogos estruturados (`catalog.yaml`, `.index.json`).

## Adapters (específicos)
- `.github/instructions/*.instructions.md` para regras de stack/projeto.
- `docs/ai-context/catalog.yaml` para mapear alvos e caminhos.
- carregamento progressivo por necessidade da tarefa.

---

## 3) Diretrizes de desacoplamento

### Must-have
- Core sem nomes de produto/sistema/equipe.
- Core sem stack fixa (Java, Angular, etc.).
- Handoff com payload mínimo (contexto, evidência, lacunas, próximo passo).
- Regras globais versionadas e sem duplicação em adapters.
- Catálogo textual e estruturado sincronizados.

### Should-have
- Evals de regressão de roteamento por agent.
- Política de confiança/fallback explícita.
- Observabilidade mínima (rota, fallback, latência, erro).

### Optional
- A/B de prompts do router.
- Dashboard executivo de qualidade/custo.

---

## 4) Anti-padrões observados

- Colocar regras de tecnologia no arquivo global de governança.
- Duplicar regra global dentro de instructions de projeto.
- Fazer router com lógica de domínio.
- Skill transversal com exemplos de um único produto.
- Catálogo YAML divergente do README.

---

## 5) Checklist de migração (acoplado -> genérico)

- [ ] Extrair regras globais para `CLAUDE.md` neutro.
- [ ] Mover regras de stack para `.github/instructions/*.instructions.md`.
- [ ] Remover nomes de produto do catálogo de agents/skills.
- [ ] Padronizar handoff e fallback entre agents.
- [ ] Revisar skills para exemplos genéricos.
- [ ] Validar sincronia entre README e índices estruturados.

---

## 6) Aplicação prática nesta entrega

### Ajustes aplicados
- `CLAUDE.md` desacoplado de domínio específico.
- `.github/copilot-instructions.md` migrado para linguagem genérica e orientado a adapters.
- `.github/agents/README.md` e `.github/agents/catalog.yaml` com metadados genéricos.
- `.github/instructions/README.md` reposicionado como índice de adapters.
- `.github/skills/README.md` e `.github/skills/.index.json` com nomenclatura genérica.
- Skills com conteúdo desacoplado:
  - `sonarqube-governance/SKILL.md`
  - `tavily/SKILL.md`
  - `context-mode/SKILL.md`
  - `context-compact/SKILL.md`
  - `mermaid-diagrams/SKILL.md`
  - `agent-contracts/SKILL.md`

### Observação
- Os arquivos `soma-*.instructions.md` foram preservados como **adapters específicos**, conforme estratégia solicitada.

---

## 7) Referências oficiais

1. GitHub Copilot — custom instructions: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
2. GitHub Copilot — custom agents (`*.agent.md`): https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents
3. GitHub Changelog — `AGENTS.md`: https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions
4. Anthropic — Agent Skills Overview: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
5. Anthropic — Equipping agents with skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
6. OpenAI — Prompting guide: https://developers.openai.com/api/docs/guides/prompting
7. OpenAI — Prompt engineering: https://developers.openai.com/api/docs/guides/prompt-engineering
8. OpenAI Agents SDK — handoffs: https://openai.github.io/openai-agents-python/handoffs
9. OpenAI Agents SDK — guardrails: https://openai.github.io/openai-agents-python/guardrails
10. MCP Specification — prompts/resources: https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
11. Microsoft Semantic Kernel — agent framework: https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent
12. LangGraph — orchestration: https://www.langchain.com/langgraph

---

## 8) Próximo passo mínimo

- Consolidar um `binding.yaml` por projeto no diretório de instructions para automatizar seleção de adapters por stack/domínio.

