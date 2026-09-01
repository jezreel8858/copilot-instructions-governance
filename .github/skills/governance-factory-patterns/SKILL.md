---
name: governance-factory-patterns
description: >
  Fluxo canônico "Factory Pattern" para agents que criam/revisam artefatos de
  governança (agent, skill, prompt) — Decision Tree comum, checklist de
  qualidade estrutural e template de saída com validações ✅/❌ parametrizável
  por tipo de artefato.
tier: 1
category: governance
triggers:
  - "criar agent"
  - "criar skill"
  - "criar prompt"
  - "factory pattern"
  - "atualizar catálogo"
  - "checklist de criação"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - .github/agents/agent-factory.agent.md
  - .github/agents/skill-factory.agent.md
  - .github/agents/prompt-factory.agent.md
tools: []
---

# Governance Factory Patterns

## 0) Problema Resolvido

`agent-factory`, `skill-factory` e `prompt-factory` compartilham ~90% da mesma lógica operacional (criar vs. revisar vs. auditar em lote; checklist de qualidade estrutural; atualização atômica de catálogo). Sem esta skill, cada um reimplementa o mesmo fluxo com pequenas variações de nomenclatura — risco de drift entre os 3 quando uma regra normativa muda (ex.: R-015).

## 1) Decision Tree Canônica (Factory Pattern)

```
Solicitação de criar/revisar/auditar artefato de governança
    ↓
Tipo de artefato? → agent | skill | prompt
    ↓
Já existe artefato equivalente? (busca por nome + por escopo semântico)
    ├─ Sim → propor REVISÃO do existente (nunca duplicar)
    └─ Não → prosseguir para criação
    ↓
Coletar campos obrigatórios via ask_questions (ver `structured-intake-patterns`
para o padrão de intake, se aplicável)
    ↓
Gerar arquivo seguindo template canônico do tipo de artefato
    ↓
Autocrítica grounded, 1 round (§3.1 — gate obrigatório antes de finalizar)
    ↓
Executar Checklist de Qualidade Estrutural (§3 desta skill)
    ↓
Atualizar catálogo(s) + README na MESMA entrega (R-015 — atomicidade obrigatória)
    ↓
Reportar no Formato de Saída (§4 desta skill)
```

## 2) Campos Obrigatórios por Tipo de Artefato

| Campo | agent | skill | prompt |
|---|---|---|---|
| Nome (kebab-case) | ✅ | ✅ | ✅ |
| Descrição objetiva (frontmatter) | ✅ | ✅ | ✅ |
| Tier/Categoria | — | ✅ | — |
| Model | ✅ | — | ✅ (se aplicável) |
| Tools (com `run_subagent` obrigatório — R-042) | ✅ | opcional | opcional |
| Triggers (PT-BR) | — | ✅ | — |
| Source_docs | recomendado | ✅ | recomendado |
| Registro em índice/catálogo | `catalog.yaml` + `README.md` | `.index.json` + `README.md` | `README.md` de prompts |

## 3) Checklist Genérico de Qualidade Estrutural

- [ ] Nome em `kebab-case`, sem espaços/maiúsculas.
- [ ] Campo obrigatório do tipo de artefato presente (ver tabela §2).
- [ ] Não duplica artefato existente (busca prévia por nome E por escopo semântico).
- [ ] Catálogo/índice atualizado **na mesma entrega** (R-015 — nunca "depois").
- [ ] README correspondente atualizado **na mesma entrega**.
- [ ] Se `agent`: `run_subagent` presente no frontmatter `tools:` (bloqueante — R-042); seção "Retorno ao Router" declarada; banner "Agente Ativo" presente no Formato de Saída.
- [ ] Se `skill`: `tier`, `category`, `triggers` em PT-BR presentes; `source_docs` aponta para arquivos reais (não inventados).
- [ ] Se `prompt`: nomenclatura `.prompt.md`, frontmatter mínimo (`description`, `model` quando aplicável), separação de responsabilidade clara com `.instructions.md` (não duplicar regra já coberta por adapter).

### 3.1) Gate de Autocrítica Semântica (grounded, 1 round — obrigatório)

> Fecha o gap que a checklist estrutural acima **não cobre**: coerência de *conteúdo*, não de *forma*. Baseado no padrão single-shot de [`reflection-self-critique-patterns/SKILL.md`](../reflection-self-critique-patterns/SKILL.md) §2 — aplicado aqui porque os 3 factory agents **geram artefato revisável** (diferente de um Retriever decidindo parar/continuar uma chamada externa, que é anti-padrão de uso desta mesma skill).

Antes de finalizar o conteúdo (antes do Checklist §3), responder objetivamente, com evidência (não opinião):

1. **Toda referência cruzada a outra skill/agent no conteúdo gerado é uma dependência FUNCIONAL real, ou apenas um rótulo semântico?** (ex.: registrar um agent como "consumidor" de uma skill exige que o mecanismo do agent dependa daquela skill — não basta o tema "parecer" relacionado).
2. **O escopo declarado da skill/agent sendo referenciado bate com o uso real proposto?** Reler a `description`/§0 do artefato referenciado e confirmar, não assumir pelo nome.
3. **Esta mudança introduz acoplamento novo entre 2 artefatos que antes eram independentes?** Se sim, esse acoplamento é necessário ou é conveniência de redação?

Se qualquer resposta indicar inconsistência: corrigir o conteúdo (remover referência indevida, ajustar redação) **antes** de prosseguir para o Checklist §3 — máximo 1 round de correção automática (alinhado a R-011/regra "Sem Loops"); se ainda inconsistente após 1 round, reportar como bloqueante (R-020) e aguardar orientação.

## 4) Formato de Saída — Bloco de Validações ✅/❌ (parametrizável)

```markdown
Arquivo criado/alterado: `.github/<tipo>/<nome>.<extensao>`

Validações:
- Nome kebab-case: ✅/❌
- Campo obrigatório do tipo presente: ✅/❌
- Não duplica artefato existente: ✅/❌
- Catálogo/índice atualizado atomicamente (R-015): ✅/❌
- README atualizado atomicamente: ✅/❌
- [se agent] run_subagent presente (R-042): ✅/❌
- [se agent] Seção "Retorno ao Router" presente: ✅/❌
- [se skill] tier/category/triggers presentes: ✅/❌

Arquivos atualizados:
- <lista de catálogo/README/índice tocados>

Resumo: <1-2 linhas do que foi criado/revisado e por quê>
```

## 5) Regra de Ouro: Atualização Atômica (R-015)

Nenhuma criação/revisão de artefato de governança é considerada completa sem a atualização do catálogo/índice correspondente **na mesma entrega**. Isso é comum aos 3 factory agents e não deve ser tratado como etapa opcional/posterior — um artefato criado sem registro no catálogo é invisível para o `agent-router` e para descoberta progressiva (`@agent list`, `@skill list`).

## 6) Anti-padrões

- ❌ Criar artefato e "esquecer" de atualizar catálogo/README na mesma entrega (viola R-015).
- ❌ Duplicar artefato existente por não ter buscado por escopo semântico (só buscar por nome exato é insuficiente).
- ❌ Agent criado sem `run_subagent` no frontmatter (estruturalmente incapaz de cumprir R-042).
- ❌ Skill criada sem `triggers` em PT-BR ou com `source_docs` apontando para arquivo inexistente.
- ❌ Reinventar o fluxo de Decision Tree em vez de referenciar esta skill — risco de drift entre os 3 factory agents.
- ❌ Registrar referência cruzada a outra skill/agent (ex.: "consumidor de X") sem confirmar dependência funcional real — pular o gate §3.1 e validar só a estrutura (achado real: `deep-search` registrado como consumidor de `reflection-self-critique-patterns` sem uso funcional).

## 7) Consumidores Mapeados

- `agent-factory` — mantém especificidade de templates (`research-agent.md`/`operational-agent.md`), referencia esta skill para o fluxo genérico e checklist.
- `skill-factory` — mantém especificidade do template `SKILL.md`, referencia esta skill para o fluxo genérico e checklist.
- `prompt-factory` — mantém especificidade de template/naming `.prompt.md`, referencia esta skill para o fluxo genérico e checklist.
- **Futuro:** qualquer 4º "factory" (ex.: `instructions-factory`, se vier a existir) herda o padrão sem reinventar o fluxo.

## 8) Referências

- `CLAUDE.md` — R-015 (atualização atômica de catálogo).
- `.github/copilot-instructions.md` — R-042 (tooling mínimo, `run_subagent` bloqueante).
- `.github/skills/agent-contracts/SKILL.md` §8-9 — baseline de formato de saída e tooling mínimo por perfil.
- `.github/skills/reflection-self-critique-patterns/SKILL.md` — padrão de autocrítica grounded 1-round usado no gate §3.1.
- `.github/skills/governance-audit-patterns/SKILL.md` — taxonomia de smells usada como referência de coerência semântica no gate §3.1 (auditoria pós-hoc equivalente feita por `agent-auditor`).

