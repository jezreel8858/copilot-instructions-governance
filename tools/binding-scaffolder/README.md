# binding-scaffolder — Suite Completa

> Gerador automático de artefatos de binding com validação, preview e execução atômica

---

## 📦 Conteúdo da Suite

```
tools/binding-scaffolder/
├── README.md .......................... Este arquivo
├── USAGE.md ........................... Guia prático de uso
├── SPEC.md ............................ Especificação técnica para mantedores
├── binding_scaffolder.py .............. Core implementation (Python)
├── schemas.json ....................... Validação Zod (JSON)
├── manifest.json ...................... Registry de artefatos gerados
└── templates/
    ├── adapter-instructions.hbs ....... Template para novo adapter
    ├── catalog-adapter-entry.hbs ...... Entry em catalog.yaml
    ├── catalog-projeto-entry.hbs ...... Entry para projeto
    ├── instructions-readme-row.hbs .... Linha em tabela
    └── aicontext-readme-section.hbs .. Seção de backend/frontend
```

---

## ✨ Recursos

✅ **Automação Completa**: Cria 4-5 arquivos interdependentes atomicamente  
✅ **Validação Rigorosa**: Schema Zod antes de qualquer geração  
✅ **Preview Seguro**: Git diff pré-visualização antes de executar  
✅ **Rollback Automático**: Reverte tudo em caso de erro  
✅ **Sem Surpresas**: Sempre pede confirmação do usuário  

---

## 🚀 Quick Start

### 1. Dependências

```bash
pip install pyyaml jinja2
```

### 2. Gerar Novo Adapter

```yaml
# mobile-adapter.yaml
artefato: "adapter"
nome: "mobile-stack"
applyTo: ["**/*.swift", "**/*.kt"]
descrição: "Convenções de Mobile Swift/Kotlin"
scope: ["Entities", "Services", "Tests"]
```

```bash
python tools/binding-scaffolder/binding_scaffolder.py generate mobile-adapter.yaml
```

### 3. Gerar Novo Projeto

```yaml
# novo-projeto.yaml
artefato: "projeto"
nome: "novo-app"
tipo: "backend"
extends: ["backend-stack"]
descrição: "Novo serviço de integração"
```

```bash
python tools/binding-scaffolder/binding_scaffolder.py generate novo-projeto.yaml
```

---

## 📚 Documentação

| Arquivo | Para Quem | Conteúdo |
|---------|-----------|----------|
| **USAGE.md** | Desenvolvedores | Guia prático com exemplos |
| **SPEC.md** | Mantedores | Arquitetura, classes, roadmap |
| **binding_scaffolder.py** | Programadores | Implementação core |
| **schemas.json** | Arquitectos | Validação de entrada |
| **templates/** | Desenhadores | Handlebars templates |

---

## 🎯 Casos de Uso Reais

### Caso 1: Adicionar novo adapter de stack

```bash
# Criar mobile-stack para iOS/Android
cat > mobile.yaml << 'EOF'
artefato: "adapter"
nome: "mobile-stack"
applyTo: ["**/*.swift", "**/*.kt"]
descrição: "Padrões de desenvolvimento mobile"
EOF

python binding_scaffolder.py generate mobile.yaml
```

**Resultado**: ✅ Cria `.github/instructions/mobile-stack.instructions.md` + atualiza 4 outros arquivos

### Caso 2: Onboard novo projeto backend

```bash
# Novo serviço de webhook
cat > webhook.yaml << 'EOF'
artefato: "projeto"
nome: "custom-webhook-service"
tipo: "backend"
extends: ["backend-stack"]
descrição: "Integrações com webhooks HTTP"
EOF

python binding_scaffolder.py generate webhook.yaml
```

**Resultado**: ✅ Adiciona em `catalog.yaml → projetos[]` + atualiza 3 READMEs

---

## 🔧 Integração com Agent (Futuro)

Quando `binding-scaffolder-agent` estiver ativo:

```
USER: "Cria um novo adapter para Rust"
  ↓
AGENT: Parse input (pode ser free-form text)
  ↓
AGENT: Inferir campos (applyTo, escopo, etc)
  ↓
AGENT: Chamar binding_scaffolder.py
  ↓
AGENT: Exibir resultado
```

---

## 🛠️ Customizar

### Adicionar novo tipo de artefato (ex: SKILL)

1. **Estender `schemas.json`** com entry `skill`
2. **Criar template** `skill-template.hbs`
3. **Adicionar método** `plan_skill()` em `BindingScaffolder`
4. **Testar** com arquivo YAML de input

---

## 🐛 Troubleshooting

| Problema | Solução |
|---|---|
| "Módulo jinja2 não encontrado" | `pip install jinja2` |
| "YAML parsing error" | Validar arquivo com `python -m yaml < file` |
| "Nome já existe" | Usar nome único não listado em `docs/ai-context/catalog.yaml` |
| "Arquivo não encontrado" | Executar do root do repository |

---

## 📊 Status

- ✅ **Core**: Pronto para uso
- ✅ **Validação**: Implementada
- ✅ **Templates**: 5 templates base
- ✅ **Documentação**: Completa
- ⏳ **Agent Integration**: Próxima fase
- 🔮 **Multi-repo sync**: Futuro

---

## 📞 Suporte / Dúvidas

- **Como usar?** → `USAGE.md`
- **Como manter?** → `SPEC.md`
- **Como estender?** → `SPEC.md` seção 9 (Roadmap)

---

**Status**: Release v1.0 ✅  
**Data**: 2026-06-10  
**Integração**: `docs/ai-context/catalog.yaml` → agents.binding-scaffolder

