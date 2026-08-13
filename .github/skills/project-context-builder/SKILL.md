---
name: project-context-builder
tier: advanced
type: discovery-and-generation
input_type: path-based
output_type: structured-artifacts

description: 
  Scanner automático de projetos + Copilot Chat. Detecta stack, padrões e convenções
  localmente (offline), depois Copilot gera novo_projeto.yaml + xxx.instructions.md
  usando SEU PRÓPRIO MODELO (sem APIs externas). Funciona via `/add-project-context`.

triggers:
  - "/add-project-context"
  - "novo projeto"
  - "adicionar projeto ao binding"
  - "scaffolding automático"
  - "escanear projeto"

source_docs:
  - "../../../tools/project-context-builder/SPEC.md"
  - "../../../tools/project-context-builder/scanner.py"
  - "../../../tools/project-context-builder/config.json"
  - "../../../docs/ai-context/catalog.yaml"

capabilities:
  - name: "scan_project_structure"
    input: "caminho relativo ou absoluto do projeto"
    output: "detected stack, patterns, examples, conventions"
    
  - name: "generate_project_yaml"
    input: "scan output + nome + tipo + descrição"
    output: "novo_projeto.yaml pronto para binding-scaffolder"
    
  - name: "generate_instructions_md"
    input: "scan output + patterns coletados"
    output: "xxx.instructions.md com conventions do projeto"

workflow:
  1: "User informa caminho do projeto"
  2: "Scanner detecta stack, coleta exemplos (offline)"
  3: "Bot pergunta estrutura (nome, tipo, extends, descrição)"
  4: "Copilot Chat usa seu modelo para gerar artefatos (sem APIs)"
  5: "Executa binding-scaffolder ou manualmente"

constraints:
  - "Scanner executado localmente (offline, sem custo)"
  - "Geração de artefatos feita por Copilot Chat (seu modelo, sem APIs externas)"
  - "Sempre pedir confirmação antes de criar arquivos"
  - "Fallback para CLI interativa se scanner falhar"

---

# project-context-builder — Skill de Descoberta de Projeto

## Overview

Automatiza o processo de **adicionar novo projeto ao binding** via Copilot Chat:

```
User: /add-project-context
  ↓
FASE 1: Scanner Local (offline)
  • Detecta stack (Java, TS, Python, etc)
  • Extrai padrões (nomeclatura, tests, structure)
  • Coleta exemplos reais
  ↓
FASE 2: Perguntas Estruturadas (no chat)
  • Nome? Tipo? Extends? Descrição?
  ↓
FASE 3: Copilot Chat Gera Artefatos (seu modelo, sem APIs)
  • novo_projeto.yaml
  • xxx.instructions.md
  ↓
FASE 4: Preview + Confirmação
  • User revisa no chat
  • Confirma para executar
  ↓
FASE 5: Executa binding-scaffolder
  • Cria arquivos atomicamente
```

## Fluxo Completo

### Stage 1: Input & Validation

```python
user_input = input("Caminho do projeto (relativo ou absoluto): ")
validated_path = validate_path(user_input)
if not is_valid_project_path(validated_path):
    return "❌ Caminho inválido ou projeto não detectado"
```

### Stage 2: Local Scanning (Offline)

```python
scanner = ProjectScanner(validated_path)

detected = scanner.detect_stack()
# → "java-spring" | "typescript-angular" | "python-django" | etc

patterns = scanner.extract_patterns()
# → {
#     "package_base": "br.com.projectname",
#     "naming_convention": "PascalCase_Services",
#     "structure": "entity-service-controller",
#     "typical_imports": [...],
#     "testing_style": "junit5-mockito"
#   }

examples = scanner.collect_examples(count=5)
# → [
#     "file": "...ServiceImpl.java",
#     "class": "ObteCadastroServiceImpl",
#     "pattern": "padrão interface+impl"
#   ]
```

### Stage 3: Structured Questions (no Copilot Chat)

```
Copilot pergunta:
1. Nome do projeto? [custom-app]
2. Tipo? [backend ou frontend]
3. Extends? [backend-stack ou frontend-stack]
4. Descrição? [Serviço customizado]
```

### Stage 4: Copilot Chat Generation (Seu Modelo, Sem APIs)

```
Copilot Chat recebe o contexto:
{
  "detected_stack": "java-spring",
  "patterns": {package_base, naming, structure, tests, ...},
  "real_examples": [3-5 arquivos reais do projeto],
  "user_input": {nome, tipo, extends, descrição}
}

Copilot usa SEU PRÓPRIO MODELO (instalado em seu IDE):
✅ Claude em VS Code/JetBrains com Copilot Chat
✅ GPT-4 em outros IDEs
✅ Sem chamar APIs externas (tudo local)

Copilot gera:
{
  "novo_projeto.yaml": "artefato: projeto\nnome: ...",
  "xxx.instructions.md": "---\napplyTo: [...]\n..."
}

Resultado: TUDO NO CHAT, visível para revisar
```

### Stage 5: Preview, Confirmação & Execução

```
1. User revisa os arquivos gerados NO CHAT
   • novo_projeto.yaml
   • xxx.instructions.md
   • (pode editar se precisar)

3 Confirmar para executar
   ↓
4. Handler executa:
   python binding_scaffolder.py generate novo_projeto.yaml
   
4. Resultado:
   ✅ Arquivos criados atomicamente
   ✅ YAML validado
   ✅ Rollback automático se erro
```

## Casos de Uso

| Caso | Input | Output |
|------|-------|--------|
| Novo backend Spring Boot | `/add-project-context` → path | novo_projeto.yaml + backend.instructions.md |
| Novo frontend Angular | path | novo_projeto.yaml + frontend.instructions.md |
| Variante de stack existente | path (herda padrões) | yaml + instructions com padrões customizados |

## Fallbacks & Contingências

| Cenário | Fallback |
|---|---|
| Scanner falha | CLI interativa (perguntas manuais) |
| Copilot timeout (raro) | Usar templates base (genéricos) |
| Arquivo existe | Ask overwrite ou versioning |
| Path inválido | Sugerir paths válidos do workspace |

## Extensibilidade

Adicionar novo tipo de stack:
1. Criar detector em `scanner.py` (e.g., `detect_rust()`)
2. Adicionar exemplos de nomeclatura
3. Criar template `rust-stack.instructions.md`
4. Atualizar config.json

---

**Status**: Skill v1.0 (Copilot Chat) — Pronto para uso imediato  
**Integração**: `/add-project-context` no Copilot Chat  
**LLM**: Copilot Chat (seu modelo no IDE, sem APIs externas)  
**Custo**: Zero (offline na Fase 1, Copilot nativo na Fase 2)

