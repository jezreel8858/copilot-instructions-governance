# AI Context — Governança e Binding de Adapters

> Documentação consolidada sobre descoberta progressiva, binding hierárquico e mecanismos de carregamento de instruções para IA no ecossistema .

---

## 📋 Índice

| Arquivo | Propósito |
|---------|-----------|
| **`binding-base.md`** | TEMPLATE genérico (reutilizável) — guia de binding para novo repositório. **100% sem projetos/adapters específicos** |
| **`binding.md`** | Guia detalhado específico do  com exemplos de projetos, adapters e nomes reais |
| **`catalog-base.yaml`** | TEMPLATE genérico (reutilizável) — manifest declarativo sem projetos. Use como base |
| **`catalog.yaml`** | Manifest específico do  com 12 projetos mapeados |
| **Este README** | Índice e entry point de contexto de IA |

---

## 🚀 Quick Start

### Para Desenvolvedores

1. **Etapa 1:** Ler [`CLAUDE.md`](../../CLAUDE.md) — regras globais (5 min)
2. **Etapa 2:** Ler [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) — operacional (3 min)
3. **Etapa 3:** Se trabalhando com backend → ler `.github/instructions/spring-boot-backend.instructions.md`
4. **Etapa 4:** Se trabalhando com frontend → ler `.github/instructions/angular-v21-frontend.instructions.md`

**Bônus:** Abra seu IDE — copilot carrega adapters **automaticamente** via `applyTo` glob!

### Para Arquitetos / Mantenedores

1. Entender binding (genérico): [`binding-base.md`](binding-base.md) — template de conceitos (5 min)
2. Entender binding no : [`binding.md`](binding.md) — guia com exemplos reais (10 min)
3. Revisar estrutura: [`catalog.yaml`](catalog.yaml) e [`catalog-base.yaml`](catalog-base.yaml)
4. Adicionar novo adapter (se necessário): seção 8 de ambos binding files
5. Sincronizar: `.github/instructions/README.md` + `catalog.yaml`

---

## 🎯 `catalog-base.yaml` vs `catalog.yaml`

| Aspecto | `catalog-base.yaml` | `catalog.yaml`                     |
|---------|---------------------|------------------------------------|
| **Propósito** | Template reutilizável para qualquer repositório | Instância específica do        |
| **Projetos** | `projetos: []` (vazio) | ✅ Preenchido (11 projetos)         |
| **Adapters** | Templates genéricos (customizar) |  (base-backend, base-frontend) |
| **Ecossistema** | `[seu-ecossistema]` (placeholder) | `custom-ecosystem`                 |
| **Uso** | Copiar e adaptar para novo repositório | Usar diretamente no IDE            |
| **Frequência de mudança** | Raramente | Frequente (ao adicionar projetos)  |

### Quando Usar Qual?

**Use `catalog.yaml`:**
- Você está trabalhando no ecossistema 
- IDE carrega automaticamente
- Copilot já sabe seus projetos → Copilot usa automaticamente

**Use `catalog-base.yaml`:**
- Criando novo repositório com esta base de governança  
- Precisa de template genérico
- Vá para: [Instruções de Uso](#como-usar-catalog-baseyaml-como-template)

### Como Usar `catalog-base.yaml` como Template

```bash
# 1. Copie o template
cp docs/ai-context/catalog-base.yaml seu-catalogo.yaml

# 2. Customize adapters
# - Atualize IDs (remova "-template")
# - Atualize `applyTo` glob patterns conforme seu stack
# - Customize `source:` paths

# 3. Preencha a seção de projetos
# REMOVA: projetos: []
# ADICIONE seus projetos:
# projetos:
#   - name: "seu-projeto-backend"
#     extends: ["seu-adapter-id"]
#     type: "backend"

# 4. Customize globais e metadados
# - Atualize `ecosystem` (linha 24)
# - Atualize `maintainer` (linha 26)

# 5. Valide
python -c "import yaml; yaml.safe_load(open('seu-catalogo.yaml', encoding='utf-8')); print('✅ Válido')"

# 6. Commite no seu novo repositório
git add seu-catalogo.yaml
git commit -m "feat: add catalog com seus projetos"
```

---

## 🎯 `binding-base.md` vs `binding.md`

| Aspecto | `binding-base.md` | `binding.md`                              |
|---------|---------------------|-------------------------------------------|
| **Propósito** | 🎁 Template genérico para ANY repositório | 🚀 Guia específico do CUSTOM              |
| **Exemplos de Projetos** | `seu-projeto` (placeholder) | `custom-app` (0 reais)                    |
| **Nomes de Adapters** | `seu-backend-adapter` (placeholder) | `base-backend`, `base-frontend` (reais)   |
| **Manifest Referenciado** | `seu-catalogo.yaml` | `catalog.yaml`                            |
| **Status** | 🔒 Template — não muda | 🔄 Documentação viva do               |

### Quando Usar Qual?

**Use `binding.md`:**
- Você está no ecossistema 
- Quer entender binding com exemplos REAIS do seu contexto
- Procura referência com projetos/adapters específicos

**Use `binding-base.md`:**
- Criando novo repositório com esta base de governança
- Precisa converter guia  para seu contexto
- Vai reutilizar este documento para outra org

### Como Usar `binding-base.md` como Template

```bash
# 1. Copie o template para seu repositório
cp docs/ai-context/binding-base.md your-repo/binding-guide.md

# 2. Customize globalmente (Busca + Replace)
#    - "seu-projeto" → seu projeto real
#    - "seu-backend-adapter" → seu adapter real
#    - "src/main/java" → seu path real
#    - "[CUSTOMIZE]" → valores específicos

# 3. Customize frontmatter examples
#    - Atualize `applyTo` patterns
#    - Atualize `maintainer` 
#    - Atualize `tags`

# 4. Customize seções de exemplo
#    - Section 5 "Discover": remova referencias 
#    - Section 11 "Exemplo Prático": customzie com seu stack

# 5. Pronto: você tem um guia de binding para sua org!
```

---

## 🔗 Mapa de Navegação

```
eco-sistema-app/
├── CLAUDE.md ......................... Regras globais de IA (R-001..R-031)
├── .github/
│   ├── copilot-instructions.md ....... Operacional + Roteamento
│   └── instructions/
│       ├── README.md ................. Índice de adapters
│       ├── spring-boot-backend.instructions.md  ← Carrega em **/*.java
│       └── angular-v21-frontend.instructions.md ← Carrega em **/*.ts
│
└── docs/
    └── ai-context/
        ├── README.md ................. Este arquivo
        ├── binding-base.md ........... 🎁 Template genérico de binding (reutilizável)
        ├── binding.md ................ 🚀 Guia de binding específico 
        ├── catalog-base.yaml ......... 🎁 Template genérico de manifest (reutilizável)
        └── catalog.yaml .............. 🚀 Manifest específico  (12 projetos)
```

---

## 🏗️ Hierarquia de 3 Camadas

```
┌─────────────────────────────────┐
│ Camada 1: GLOBAL (Priority 100) │
│ CLAUDE.md + .github/copilot-... │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│ Camada 2: ADAPTER (Priority 50) │
│ .github/instructions/*.md       │
│ (applyTo glob patterns)         │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│ Camada 3: PROJETO (Priority 25) │
│ [Futuro] Customizações locais   │
└─────────────────────────────────┘
```

**Aplicação automática** via GitHub Copilot quando arquivo combina `applyTo` pattern.

---

## 📦 Adapters Convencionais Atuais

| Adapter | Stack | Aplica A |
|---------|-------|----------|
| `spring-boot-backend.instructions.md` | Java/Spring | `**/*.java` |
| `angular-v21-frontend.instructions.md` | Angular 21 | `**/*.ts`, `**/*.js` |

## 📋 Projetos Mapeados (0 projetos)

### Backend (0 projetos)

### Frontend (0 projetos)

---

## ✨ Features

### ✅ Implementado

- [x] Binding de 3 camadas (Global → Stack → Projeto)
- [x] Frontmatter YAML com `applyTo` glob
- [x] Manifest declarativo (`catalog.yaml`)
- [x] Auto-discovery via IDE (GitHub Copilot, Cursor)
- [x] Documentação completa (`binding.md`)
- [x] Sem duplicação de regras (R-003)

### 🔮 Futuro

- [ ] Adapters por domínio (Mobile, DevOps, Security)
- [ ] Customizações por projeto específico
- [ ] Integração com git hooks para validação de frontmatter
- [ ] Dashboard de discovery e health check

---

## 📚 Documentação

### Para Entender o Mecanismo (Genérico)

👉 **[`binding-base.md`](binding-base.md)** — Template genérico com:
- O que é binding e por que importa
- Hierarquia de 3 camadas (conceitual)
- Padrões de frontmatter (exemplo genérico)
- Troubleshooting e resolução de conflitos
- Step-by-step para adicionar adapter (template)

### Para Configurar Seu Binding

👉 **[`catalog-base.yaml`](catalog-base.yaml)** — Template YAML com:
- Estrutura genérica (reutilizável)
- Comentários inline para customização
- Instruções passo-a-passo de uso

👉 **[`catalog.yaml`](catalog.yaml)** — Manifest do  com:
- 12 projetos mapeados
- Adapters e agents específicos
- Pronto para carregamento no IDE

👉 **Para Regras Globais**

👉 **[`CLAUDE.md`](../../CLAUDE.md)** — Regras normativas (R-001..R-039)

👉 **[`.github/copilot-instructions.md`](../../.github/copilot-instructions.md)** — Operacional

👉 **[`.github/skills/project-scanner/SKILL.md`](../../.github/skills/project-scanner/SKILL.md)** — **[NOVO]** Diretrizes para scanner automático de projeto

---

## 🚀 Começar Rápido — Novo Adapter

```bash
# 1. Criar arquivo
touch .github/instructions/novo-dominio.instructions.md

# 2. Adicionar frontmatter
cat > .github/instructions/novo-dominio.instructions.md << 'EOF'
---
applyTo: ["caminho/glob/**/*.ext"]
version: "1.0"
title: "Título do Adapter"
---

# Conteúdo aqui
EOF

# 3. Atualizar índice
# Editar .github/instructions/README.md — adicionar tabela

# 4. Atualizar manifest
# Editar docs/ai-context/catalog.yaml — adicionar entry

# 5. Commit
git add .github/instructions/novo-dominio.instructions.md
git add .github/instructions/README.md
git add docs/ai-context/catalog.yaml
git commit -m "feat: adicionar adapter novo-dominio"
```

👉 Detalhes completos: seção 8 de [`binding.md`](binding.md)

---

## 🔗 Referências

- **GitHub Docs:** [Copilot Custom Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions)
- **Cursor Docs:** [Rules for AI](https://docs.cursor.com/context/rules-for-ai)
- **CLAUDE.md:** Governança global (R-001..R-031)
- **Pesquisa Consolidada:** Padrões de GitHub, Google, OpenAI e Anthropic validados

---

## 📞 Suporte / Dúvidas

| Dúvida | Resposta |
|--------|----------|
| Como adicionar novo adapter? | [`binding.md` seção 8](binding.md#8-adicionando-novo-adapter) |
| IDE não carrega adapter | [`binding.md` seção 9](binding.md#9-troubleshooting) |
| Qual a diferença entre camadas? | [`binding.md` seção 2](binding.md#2-hierarquia--3-camadas) |
| Como converter adapter em global? | [`binding.md` seção correspondente](binding.md#quando-converter-adapter--global) |
| Qual a estrutura recomendada? | Este arquivo + `binding.md` + `catalog.yaml` |

---

## 📈 Status

| Item | Status | Nota |
|------|--------|------|
| Binding de 3 camadas | ✅ Ativo | Consolidado no mercado (GitHub pattern) |
| Adapters atuais | ✅ 2 adapters | Backend + Frontend () |
| Template de binding | ✅ Implementado | `binding-base.md` (genérico) |
| Manifest YAML | ✅ Implementado | `catalog.yaml` () + `catalog-base.yaml` (template) |
| Discovery automática | ✅ IDE | GitHub Copilot, Cursor, Claude Code |
| Documentação | ✅ Completa | `binding.md` + `binding-base.md` + este README |

---

**Última atualização:** 2026-06-10  
**Versão do mecanismo:** 1.0  
**Padrão consolidado:** GitHub Copilot (R-019)  
**Responsável:** eco-sistema-custom-app maintainers

