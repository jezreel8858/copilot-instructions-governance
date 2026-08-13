# binding-scaffolder — Guia de Uso Prático

> Gerador automático de artefatos de binding. Orquestra criação atômica de múltiplos arquivos com validação + preview.

---

## 1. Instalação

```bash
# Dependências
pip install pyyaml jinja2

# Tornar executável
chmod +x tools/binding-scaffolder/binding_scaffo lder.py
```

---

## 2. Uso Básico

### Exemplo 1: Criar novo Adapter

**Criar arquivo de entrada:**

```bash
cat > novo_mobile_adapter.yaml << 'EOF'
artefato: "adapter"
nome: "mobile-stack"
applyTo:
  - "**/*.swift"
  - "**/*.kt"
descrição: "Convenções de Mobile Swift/Kotlin — entities, services, testes, logging"
scope:
  - "Entities"
  - "Services"
  - "Tests"
  - "Logging"
EOF
```

**Executar generator:**

```bash
python tools/binding-scaffolder/binding_scaffolder.py generate novo_mobile_adapter.yaml
```

**Output esperado:**

```
======================================================================
📋 PLANO: 5 arquivos serão modificados
======================================================================
✨ [CREATE] .github/instructions/mobile-stack.instructions.md
    └─ section: None
📝 [UPDATE] docs/ai-context/catalog.yaml
    └─ section: adapters
📝 [UPDATE] docs/ai-context/binding.md
    └─ section: adapters_ref
📝 [UPDATE] .github/instructions/README.md
    └─ section: tabela_adapters
📝 [UPDATE] tools/binding-scaffolder/manifest.json
    └─ section: registros

======================================================================
✅ Proceder com essas mudanças? (y/n): y

🚀 Executando...
✅ Criado: .github/instructions/mobile-stack.instructions.md
✅ Atualizado: docs/ai-context/catalog.yaml
✅ Atualizado: docs/ai-context/binding.md
✅ Atualizado: .github/instructions/README.md
✅ Atualizado: tools/binding-scaffolder/manifest.json

✓ Validando output...
✅ docs/ai-context/catalog.yaml — YAML válido

🎉 Artefato gerado com sucesso!
```

---

### Exemplo 2: Criar novo Projeto

**Criar arquivo de entrada:**

```bash
cat > novo_projeto.yaml << 'EOF'
artefato: "projeto"
nome: "custom-webhook-app"
tipo: "backend"
extends:
  - "backend-stack"
descrição: "Serviço de webhooks HTTP — integrações com sistemas externos"
EOF
```

**Executar:**

```bash
python tools/binding-scaffolder/binding_scaffolder.py generate novo_projeto.yaml
```

**Output esperado:**

```
======================================================================
📋 PLANO: 4 arquivos serão modificados
======================================================================
📝 [UPDATE] docs/ai-context/catalog.yaml
📝 [UPDATE] docs/ai-context/README.md
📝 [UPDATE] docs/ai-context/binding.md
📝 [UPDATE] .github/instructions/README.md

======================================================================
✅ Proceder com essas mudanças? (y/n): y

🚀 Executando...
✅ Atualizado: docs/ai-context/catalog.yaml
✅ Atualizado: docs/ai-context/README.md
✅ Atualizado: docs/ai-context/binding.md
✅ Atualizado: .github/instructions/README.md

✓ Validando output...
✅ docs/ai-context/catalog.yaml — YAML válido

🎉 Artefato gerado com sucesso!
```

---

## 3. Validação Sem Execução

```bash
python tools/binding-scaffolder/binding_scaffolder.py validate novo_mobile_adapter.yaml
```

**Validações:**
- ✅ Schema YAML: confirmação de campos obrigatórios
- ✅ Nome único em catalog.yaml
- ✅ Glob patterns válidos (globstar syntax)
- ✅ `extends` referencia adapters existentes

---

## 4. Estrutura de Input

### Adapter Input YAML

```yaml
artefato: "adapter"
nome: "database-stack"              # kebab-case, 3-50 chars
applyTo:                            # glob patterns
  - "**/*.sql"
  - "**/migrations/**"
descrição: "Padrões para DB"        # 10-200 chars
scope:                              # opcional
  - "Migrations"
  - "Queries"
  - "Indexes"
```

### Projeto Input YAML

```yaml
artefato: "projeto"
nome: "custom-analytics-app"          # kebab-case, 3-60 chars
tipo: "backend"                     # backend ou frontend
extends:                            # deve existir em catalog
  - "backend-stack"
descrição: "Analytics e reports"    # 10-200 chars
```

---

## 5. Arquivos Gerados

### Para Novo Adapter

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `.github/instructions/{nome}.instructions.md` | CREATE | Arquivo principal com padrões |
| `docs/ai-context/catalog.yaml` | UPDATE | Adiciona entrada em `adapters[]` |
| `docs/ai-context/binding.md` | UPDATE | Atualiza referência em seção de adapters |
| `.github/instructions/README.md` | UPDATE | Adiciona linha em tabela de adapters |
| `tools/binding-scaffolder/manifest.json` | UPDATE | Registra versão do artefato |

### Para Novo Projeto

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/ai-context/catalog.yaml` | UPDATE | Adiciona entrada em `projetos[]` |
| `docs/ai-context/README.md` | UPDATE | Adiciona linha em seção (Backend/Frontend) |
| `docs/ai-context/binding.md` | UPDATE | Atualiza count de projetos |
| `.github/instructions/README.md` | UPDATE | Atualiza tabela de mapeamento |

---

## 6. Fluxo Completo Passo-a-Passo

```
┌────────────────────────────────────────────────────────────┐
│  1. USER: Cria arquivo YAML com specs do artefato          │
│     Exemplo: novo_adapter.yaml                             │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  2. SCAFFOLDER: Parse + Validate                           │
│     • Verifica schema JSON                                  │
│     • Valida nome único em catalog.yaml                     │
│     • Verifica glob patterns                                │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  3. SCAFFOLDER: Ler contexto (catalog.yaml, README, etc)   │
│     • Detectar conflitos de naming                          │
│     • Ler adapters/projetos existentes                      │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  4. SCAFFOLDER: Gerar manifest (plano de arquivos)         │
│     • Listar 4-5 arquivos a criar/atualizar                │
│     • Mapear templates para cada um                         │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  5. SCAFFOLDER: Renderizar templates Handlebars            │
│     • Substituir {{variáveis}} com dados de input           │
│     • Gerar conteúdo final                                  │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  6. SCAFFOLDER: Gerar preview (diff)                       │
│     • Mostrar quais arquivos serão modificados              │
│     • Exibir mudanças propostas                             │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  7. USER: Revisar + Confirmar ("y" ou "n")                 │
│     • Se "n": cancelar e sair                               │
│     • Se "y": prosseguir para execução                      │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  8. SCAFFOLDER: Atomic Execution                           │
│     • Backup de arquivos existentes (em memória)            │
│     • Criar/atualizar arquivos em ordem de prioridade       │
│     • Rollback automático se qualquer erro ocorrer          │
└─────────────────┬──────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────────────────────┐
│  9. SCAFFOLDER: Validação pós-execução                     │
│     • Testar YAML syntax em cada arquivo                    │
│     • Se OK: "✅ Sucesso!"                                  │
│     • Se erro: rollback e mensagem de erro                  │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| "Nome já existe" | Duplicado em catalog.yaml | Usar nome único |
| "Arquivo inválido" | YAML malformado | Validar com `python -m yaml` |
| "Pattern inválido" | Glob syntax errado | Usar `**/*.ext` ou `path/**/*.ext` |
| "Arquivo não encontrado" | Caminho incorreto | Executar do root do projet |

---

## 8. Checklist de Qualidade

- [ ] Arquivo YAML válido (testar: `python -c "import yaml; yaml.load(open('file'))"`)
- [ ] Nome único (não existe em catalog.yaml)
- [ ] `extends` referencia adapters/skills existentes
- [ ] `applyTo` usando globstar syntax correto
- [ ] Descrição com 10-200 caracteres
- [ ] Preview revisada antes de confirmar
- [ ] Todos os arquivos gerados com sucesso
- [ ] YAML validado pós-execução

---

## 9. Extensões Futuras

```python
# [Futuro] Suportar mais tipos de artefatos
- SKILL: criar `skills/{nome}/SKILL.md` + entrada em catalog
- AGENT: criar `.github/agents/{nome}.agent.md` + entry
- TOOL: criar `tools/{nome}/` + MCP registration

# [Futuro] Integração com Git
- Criar branch automático: `feat/binding-{nome}`
- Commit automático: "Add adapter: {nome}"
- PR template com checklist

# [Futuro] Sincronização Multi-Repo
- Atualizar catalog em repositórios-alvo
- Validar coerência entre repos
```

---

**Status**: Guia v1.0 — Pronto para uso  
**Data**: 2026-06-10  
**Exemplo**: Run `python tools/binding-scaffolder/binding_scaffolder.py generate novo_projeto.yaml`

