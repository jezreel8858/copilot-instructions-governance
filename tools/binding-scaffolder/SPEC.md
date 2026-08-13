# binding-scaffolder — Especificação Técnica Detalhada

> Referência para desenvolvedores mantendo o scaffolder

---

## 1. Arquitetura

```
binding-scaffolder/
├── binding_scaffolder.py .......... Core (445 linhas)
├── schemas.json .................. Validação Zod
├── templates/
│   ├── adapter-instructions.hbs .. Template para .instructions.md
│   ├── catalog-adapter-entry.hbs . Entry em catalog.yaml
│   ├── catalog-projeto-entry.hbs . Entry em projetos[]
│   ├── instructions-readme-row.hbs Linha em README tabela
│   └── aicontext-readme-section.hbs Seção em docs README
├── USAGE.md ..................... Guia prático
├── SPEC.md ...................... Este arquivo
└── manifest.json ................ Registry de versões
```

---

## 2. Classes Principais

### `BindingScaffolder`
Orquestrador central com métodos:

```python
class BindingScaffolder:
    def validate_input(data: Dict, artefato: str) -> bool
    def plan_adapter(data: Dict) -> Manifest
    def plan_projeto(data: Dict) -> Manifest
    def render_templates(manifest: Manifest, data: Dict) -> Manifest
    def preview_changes(manifest: Manifest) -> bool
    def execute_manifest(manifest: Manifest) -> bool
    def validate_output(manifest: Manifest) -> bool
```

### `Manifest`
Dataclass que representa plano de execução:

```python
@dataclass
class Manifest:
    artefato: str         # "adapter" | "projeto"
    nome: str             # nome do artefato
    entries: List[ManifestEntry]
    timestamp: str
```

### `ManifestEntry`
Versão simplificada - em produção, estender com:

```python
@dataclass
class ManifestEntry:
    path: str             # arquivo a criar/atualizar
    action: str           # "CREATE" | "UPDATE" | "MERGE"
    template: Optional[str]  # template Handlebars
    section: Optional[str]   # seção a atualizar
    content: Optional[str]   # conteúdo renderizado
    priority: int         # ordem de execução
```

---

## 3. Fluxo de Dados

```
YAML Input
    ↓
validate_input() ──→ [Zod schema check]
    ↓
plan_adapter() ou plan_projeto() ──→ Manifest
    ↓
render_templates() ──→ Manifest (com content preenchido)
    ↓
preview_changes() ──→ [Exibe diff, aguarda confirmação]
    ↓
execute_manifest() ─→ [Backup, write, validate, rollback se erro]
    ↓
Success ou Error
```

---

## 4. Pontos Críticos de Manutenção

### 4.1 Template Drift
**Problema**: Templates ficam desatualizados com evolução de catalog.yaml

**Solução**:
- Adicionar `template_version` em schemas.json
- Alertar se template_v < catalog_v
- Documentar breaking changes em CHANGELOG

### 4.2 Merge Conflicts
**Problema**: Múltiplos agents gerando adapters simultaneamente

**Solução**:
- Usar locks de arquivo (futuro)
- Ou instruir users a rodar sequencialmente
- Ou usar git branches isoladas

### 4.3 Rollback Robusto
**Problema**: Se falha no meio, estado fica inconsistente

**Solução** (atual):
- Backup em memória
- Atomic writes
- Validação YAML pós-execução

**Melhoria** (futuro):
- Usar `git add/stash` para backup real
- Enable reversão via `git reset`

---

## 5. Schema Validation (Zod)

### Adapter Schema

```json
{
  "artefato": "adapter",
  "nome": "mobile-stack",          // regex: ^[a-z-]+$
  "applyTo": ["**/*.swift"],       // array, globstar only
  "descrição": "...",              // 10-200 chars
  "scope": ["Entities"]            // optional
}
```

**Validações Customizadas**:
1. `nome_unico`: Não existe em catalog.yaml
2. `applyTo_valido`: Cada pattern passar globstar test
3. `tipo_compativel`: Frontend→frontend-stack, Backend→backend-stack

---

## 6. Templates Handlebars

### adapter-instructions.hbs

```handlebars
---
applyTo: {{applyToJson}}
---
# {{titulo_humanizado}}
> {{descrição}}
...
```

**Variáveis disponíveis**:
- `nome`: nome do adapter
- `titulo_humanizado`: nome em Title Case
- `descrição`: descrição input
- `applyTo`: array de patterns
- `applyToList`: patterns como string ", ".join()
- `data`: data atual
- `scope`: array de escopos

### catalog-adapter-entry.hbs

```handlebars
- id: "{{id}}"
  name: "{{nome}}"
  source: ".github/instructions/{{nome}}.instructions.md"
```

---

## 7. Testes Manuais Recomendados

### Test 1: Novo Adapter Válido

```bash
cat > test_adapter.yaml << 'EOF'
artefato: "adapter"
nome: "test-stack"
applyTo: ["**/*.test"]
descrição: "Test adapter para validar pipeline"
EOF

python binding_scaffolder.py generate test_adapter.yaml
# Deve criar .github/instructions/test-stack.instructions.md + atualizar 4 arquivos
```

### Test 2: Validação de Nome Duplicado

```bash
cat > test_dup.yaml << 'EOF'
artefato: "adapter"
nome: "backend-stack"  # Já existe!
applyTo: ["**/*.java"]
descrição: "Duplicate test"
EOF

python binding_scaffolder.py generate test_dup.yaml
# Deve falhar com: "Nome 'backend-stack' já existe em catalog.yaml"
```

### Test 3: Rollback em Erro

```bash
# Quebrar propositalmente o template para forçar erro
# Depois verificar que arquivos foram revertidos
```

---

## 8. Roadmap

### Fase 1 (Atual ✅)
- [x] Scaffolder core
- [x] Templates Handlebars básicos
- [x] Validação Zod
- [x] Preview + confirmação
- [x] Atomic execution + rollback

### Fase 2 (Próximos 3 meses)
- [ ] Git integration (branches, commits)
- [ ] Multi-file merge sem sobrescrita
- [ ] Suporte a SKILL e AGENT como artefatos
- [ ] Testes unitários (pytest)

### Fase 3 (Futuro)
- [ ] Multi-repo sync (eco-sistema → example-project, etc)
- [ ] Dependency inference (sugerir extends)
- [ ] Web UI para scaffolding
- [ ] Marketplace de templates

---

## 9. Conhecimento Compartilhado

### Para Novos Mantedores

1. **Leia**: USAGE.md (entender fluxo), SPEC.md (este arquivo)
2. **Rode**: Test 1 e 2 para validar install
3. **Modifique**: Um template (ex: adapter-instructions.hbs)
4. **Teste**: Gerar novo adapter e validar output

### Troubleshooting Internal

| Sintoma | Diagnóstico | Fix |
|---|---|---|
| Templates não carregam | Falta `jinja2` | `pip install jinja2` |
| YAML parse error | Arquivo malformado | `python -m yaml < file` |
| Rollback falha | Permissão de arquivo | chmod 666 nos arquivos |

---

## 10. Integração com Agent (Futuro)

```python
# Quando binding-scaffolder-agent estiver ativo:
@scaffolder_agent
def handle_novo_adapter(user_input: str) -> Result:
    # 1. Parse free-form user input
    # 2. Inferir campos faltando (LLM)
    # 3. Validar via BindingScaffolder
    # 4. Executar manifest
    # 5. Reportar resultado
```

---

**Documento**: SPEC.md (Técnica)  
**Versão**: 1.0  
**Data**: 2026-06-10  
**Próximo review**: Q3 2026

