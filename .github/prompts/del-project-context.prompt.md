---
name: del-project-context
type: governance-cleanup
input_type: project-name
output_type: audit-log
model: "claude-haiku-4.5"

description:
  Remove contexto estruturado de um projeto do binding de instruções e do cache Context Mode.
  Operação destrutiva com validação prévia, confirmação e rollback via Git.

triggers:
  - "/del-project-context"
  - "remover projeto"
  - "deletar binding"
  - "limpar contexto"
  - "desvincular projeto"

dependencies:
  - project-context-builder
  - yaml-governance

source_docs:
  - "CLAUDE.md"
  - "docs/ai-context/catalog.yaml"
  - ".github/instructions/README.md"

workflow:
  1: "User fornece nome do projeto"
  2: "Agent valida existência em catalog.yaml"
  3: "Agent lista artefatos a remover (YAML entry + arquivo .instructions.md)"
  4: "Agent pede confirmação explícita"
  5: "Se confirmado: Atualiza catalog.yaml + valida YAML + registra em audit.log"

constraints:
  - "Operação destrutiva — exigir confirmação explícita"
  - "Validar YAML imediatamente após alteração"
  - "NÃO remove adapters globais nem código-fonte"
  - "NÃO usa rm ou operações shell destrutivas — Python via project-context-builder"
  - "Registrar ação em audit.log"
---

# `/del-project-context` — Remoção de Contexto de Projeto

## Visão Geral

Remove um projeto do binding hierárquico (`docs/ai-context/catalog.yaml`) e do armazenamento de instruções (`.github/instructions/`) — **todos os artefatos são NESTE repositório de governança**. Reversível via Git.

> ⚠️  Esta operação modifica APENAS artefatos deste repositório de governança.
>     O repositório externo do projeto removido NÃO é tocado.

## Uso

```bash
/del-project-context <nome-do-projeto>
```

### Exemplos

```
/del-project-context project-app
```

## O Que é Removido (NESTE repositório)

| Alvo | Ação | Observação |
|------|------|-----------|
| `./docs/ai-context/catalog.yaml` | Remove entrada YAML do projeto | Sintaticamente validado |
| `./.github/instructions/<projeto>.instructions.md` | Deleta arquivo de instruções | Específico do projeto |
| Context Mode Cache (FTS5) | Invalida índice + snapshot | TTL reset (24h) |

## O Que NÃO é Removido

- ✗ Repositório Git / código-fonte do projeto externo
- ✗ Qualquer arquivo dentro do projeto externo
- ✗ Adapters genéricos já existentes em `.github/instructions/`
- ✗ Regras em `CLAUDE.md` (governança global)
- ✗ Documentação em `docs/` (preservada)

## Fluxo

```
/del-project-context meu-projeto-backend

[1] Validar existência em catalog.yaml                    ✓
[2] Listar artefatos a remover                          ✓
[3] Pedir confirmação explícita (sim/não)               → User
[4] Se sim:
    ├─ Atualizar catalog.yaml (remove entrada YAML)
    ├─ Validar YAML com yamllint                        [fallback: abortar + Git checkout]
    ├─ Deletar .github/instructions/<projeto>.instructions.md
    └─ Registrar em audit.log
[5] Relatório: artefatos removidos + próximos passos    ✓
```

## Validação de YAML (Obrigatória)

Após qualquer alteração em `catalog.yaml`:

**Python (recomendado)**
```bash
python -c "import yaml; yaml.safe_load(open('docs/ai-context/catalog.yaml')); print('✅ Válido')" || echo "❌ Erro"
```

**yamllint**
```bash
yamllint docs/ai-context/catalog.yaml
```

Erros comuns:

| Erro | Causa | Solução |
|------|-------|---------|
| `mapping values are not allowed here` | Indentação errada | Revise indentação (2 espaços) |
| `could not find expected ':'` | Colon faltando | Verifique sintaxe |
| `unexpected indent` | Tabs/espaços misturados | Use sempre 2 espaços |

## Casos de Uso

| Situação | Ação |
|----------|------|
| Projeto descontinuado | `/del-project-context <nome>` |
| Reorganizar binding | `/del-project-context <antigo>` + `/add-project-context <novo>` |
| Cache corrompido | `/del-project-context` + `/add-project-context` (recupera) |
| Remover adapter customizado | `/del-project-context <nome>` |

## Recuperação

Se remover por engano:

```bash
# Recuperar via Git
git checkout docs/ai-context/catalog.yaml .github/instructions/<projeto>.instructions.md

# Recarregar contexto
/add-project-context <projeto>
```

## Fallbacks

| Cenário | Ação |
|---|---|
| Project não encontrado em catalog.yaml | Abortar com mensagem clara |
| YAML inválido após remoção | Reverter com Git checkout + report |
| Confirmação não fornecida | Aguardar entrada do user |

---

**Status**: Prompt v1.1 (Padrão Skill)  
**Integração**: Agent `project-context-builder`  
**Dependência**: `yaml-governance` skill  
**Referência**: `/add-project-context` (operação inversa)  
**Audit**: Registrado em `.github/hooks/context-mode.json`
