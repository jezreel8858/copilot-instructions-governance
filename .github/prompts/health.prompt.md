---
name: health
description:
  Verifica saúde completa da infraestrutura de governança. Valida catalog.yaml,
  .index.json, binding context, agents acessíveis e sincronização entre arquivos.
  Vai além do /ctx-doctor (que cobre apenas Context Mode MCP).
model: "claude-haiku-4.5"
tools: ['read_file', 'list_dir', 'file_search', 'run_in_terminal', 'run_subagent']
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
  - docs/ai-context/catalog.yaml
  - .github/skills/terminal-governance/SKILL.md
---

# `/health`

Diagnóstico completo da infraestrutura de governança.

> **DIFERENÇA vs `/ctx-doctor`**: `/ctx-doctor` verifica apenas o MCP Context Mode. `/health` verifica toda a estrutura de governança: arquivos, sincronização, YAML, binding.

---

## 🎯 Uso

```bash
/health   → diagnóstico completo
```

Se o usuário enviar flags (ex.: `--quick`), informe que o comando atual executa o diagnóstico completo.

---

## 📋 Verificações em 6 Categorias

### CAT-1: Binding Context

```
[Binding Context]
├─ docs/ai-context/catalog.yaml    → ✅/❌ (existe + YAML válido?)
├─ docs/ai-context/binding.md      → ✅/❌ (existe?)
├─ docs/ai-context/catalog-base.yaml → ✅/❌ (template base existe?)
└─ Projetos registrados            → <N> projetos
```

**Se faltarem**: alertar + sugerir `binding-initializer`.

### CAT-2: Agents

```
[Agents]
├─ .github/agents/catalog.yaml     → ✅/❌ (YAML válido?)
├─ total_agents declarado          → <N> (coincide com arquivos .agent.md?)
├─ .agent.md files                 → <N> arquivos encontrados
└─ Desincronização                 → <lista de discrepâncias se houver>
```

### CAT-3: Skills

```
[Skills]
├─ .github/skills/.index.json      → ✅/❌ (JSON válido?)
├─ total_skills declarado          → <N> (coincide com pastas?)
├─ Pastas com SKILL.md             → <N> encontradas
└─ Skills sem entrada no índice    → <lista ou "nenhuma">
```

### CAT-4: Prompts

```
[Prompts]
├─ .github/prompts/README.md       → ✅/❌ (atualizado?)
├─ Prompts registrados no README   → <lista>
├─ Arquivos .prompt.md existentes  → <lista>
└─ Prompts órfãos (arquivo sem entrada no README) → <lista ou "nenhum">
```

### CAT-5: Conformidade R-038 (Genericidade)

```
[Genericidade R-038]
├─ QUICK-START.md sem nomes específicos → ✅/❌
├─ instructions/README.md sem lista de projetos específicos → ✅/❌
└─ copilot-instructions.md genérico → ✅/❌
```

### CAT-6: Conformidade ctx-first (Economia de Créditos)

```
[ctx-first]
├─ Prompts críticos usam ctx_search(sort:"timeline") → ✅/⚠️/❌
├─ Coleta principal via ctx_batch_execute(commands, queries) → ✅/⚠️/❌
├─ Follow-up em queries em lote (evita chamadas unitárias) → ✅/⚠️/❌
├─ Uso de source quando múltiplas fontes são citadas → ✅/⚠️/❌
├─ Bloqueio de payload grande em ctx_index(content) → ✅/⚠️/❌
└─ Anti-dump (sem saída bruta extensa inline) → ✅/⚠️/❌
```

---

## 📊 Saída Final

```
╔═══════════════════════════════════════════════════════════╗
║              🏥 GOVERNANCE HEALTH CHECK                   ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║ [CAT-1] Binding Context    → ✅/⚠️/❌                    ║
║ [CAT-2] Agents             → ✅/⚠️/❌  (<N> de <total>)  ║
║ [CAT-3] Skills             → ✅/⚠️/❌  (<N> de <total>)  ║
║ [CAT-4] Prompts            → ✅/⚠️/❌                    ║
║ [CAT-5] R-038 Conformidade → ✅/⚠️/❌                    ║
║ [CAT-6] ctx-first          → ✅/⚠️/❌                    ║
║                                                           ║
║ Status Geral: ✅ SAUDÁVEL | ⚠️ AVISOS | ❌ AÇÃO NECESSÁRIA║
╚═══════════════════════════════════════════════════════════╝

⚠️ Itens que requerem atenção:
  - <lista de problemas detectados ou "Nenhum">

🎯 Próximo passo mínimo:
  - <ação sugerida se houver problema>
```

---

## 🔗 Comparativo: `/health` vs `/ctx-doctor`

| Aspecto | `/health` | `/ctx-doctor` |
|---------|-----------|---------------|
| Binding context | ✅ | ❌ |
| Agents sync | ✅ | ❌ |
| Skills sync | ✅ | ❌ |
| R-038 conformidade | ✅ | ❌ |
| Conformidade ctx-first | ✅ | ❌ |
| MCP conectividade | ❌ | ✅ |
| Context Mode stats | ❌ | ✅ |

**Uso recomendado**: `/health` no início do dia (governance check) + `/ctx-doctor` antes de tarefa crítica (MCP check).

---

*v1.0 — health prompt — 2026-06-12*

