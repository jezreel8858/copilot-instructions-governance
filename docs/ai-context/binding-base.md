# Binding de Adapters — TEMPLATE GENÉRICO (Reutilizável)

> **PROPÓSITO**: Este arquivo é a BASE/TEMPLATE genérica para usar em qualquer repositório que adote esta estrutura de governança de IA. É 100% desacoplado de projetos específicos.
>
> **TL;DR**: Binding é o mecanismo que vincula instruções globais (governança) com instruções específicas de projeto/stack via YAML frontmatter `applyTo`. 3 camadas hierárquicas com descoberta automática em IDE.
> 
> **Manifest declarativo**: `catalog.yaml` ou `seu-catalogo.yaml`

---

## 1) O Que É Binding?

**Binding** é o mecanismo que vincula instruções globais (governança) com instruções específicas de projeto/stack, garantindo que cada arquivo receba as regras corretas.

**Analogia:** Um desenvolvedor abrindo `src/main/java/SeuClasse.java` receberá automaticamente:
1. Regras globais (sempre)
2. Regras de backend Java (via `applyTo: "**/*.java"`)
3. Regras de projeto (se existir customização)

---

## 2) Hierarquia — 3 Camadas

```
┌──────────────────────────────────────────────────────────┐
│  Camada 1: GLOBAL (Priority 100)                         │
│  - CLAUDE.md (regras normativas)                         │
│  - .github/copilot-instructions.md (operacional)         │
│  ApplyTo: * (sempre aplicado)                           │
└──────────────┬───────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────┐
│  Camada 2: STACK/ADAPTER (Priority 50, condicional)      │
│  - .github/instructions/*.instructions.md                │
│    • seu-spring-boot-backend.instructions.md  (applyTo: *.java)      │
│    • seu-angular-v21-frontend.instructions.md (applyTo: *.ts)        │
│  Discovery: por glob pattern applyTo                    │
└──────────────┬───────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────┐
│  Camada 3: PROJETO (Priority 40)                         │
│  - seu-catalogo.yaml → projetos[]                        │
│  - Extends adapters de camada 2                         │
│  Discovery: por nome de diretorio/projeto               │
└──────────────────────────────────────────────────────────┘
```

**Regra de Conflito:** Se houver sobreposição, aplica a **maior prioridade numérica**.

---

## 3) Frontmatter YAML — applyTo Glob Patterns

Cada adapter declara seu escopo com frontmatter:

```yaml
---
applyTo: ["src/main/java/**/*.java"]
---
```

### Padrões Válidos

| Padrão | Exemplo | Matches |
|---|---|---|
| `**/*.ext` | `**/*.java` | Todos os `.java` em qualquer profundidade |
| `path/**/*.ext` | `src/main/java/**/*.java` | Todos os `.java` sob `src/main/java/` |
| `exact/file.ext` | `pom.xml` | Arquivo exato |
| Múltiplos | `["**/*.ts", "**/*.js"]` | Qualquer `.ts` ou `.js` |

### Padrões Sem Suporte (evitar)

```text
# ❌ Não usar
applyTo: "**/*.java"              # String, não array
applyTo: [**/*.java]              # Sem aspas
applyTo: src/**/*.java            # Sem indicador de múltiplos níveis
```

---

## 4) Arquivo Frontmatter Completo (Exemplo)

```yaml
---
# Versão deste adapter
version: "1.0"

# Padrões de arquivo onde carrega (GitHub Copilot, Cursor, etc.)
applyTo: ["src/main/java/**/*.java", "pom.xml"]

# Descrição para descoberta
title: "Convenções de Backend"

# ISO 8601 de última atualização
lastUpdated: "[CUSTOMIZE]"

# Responsável por manutenção
maintainer: "[seu-time]"

# Tags para busca semântica (futuro)
tags: ["[sua-tech]", "[stack]"]
---

# Convenções de [Seu Domínio]
...
```

---

## 5) Discovery — Como Carrega Automaticamente?

### GitHub Copilot (VS Code, JetBrains)

1. Copilot lê `.github/copilot-instructions.md` (global) — **sempre**
2. Copilot lê `.github/instructions/` e interpreta frontmatter `applyTo`
3. Copilot consulta `seu-catalogo.yaml` para descobrir projeto específico
4. Quando você abre um arquivo (ex: `SeuArquivo.java` em `seu-projeto`):
   - **Passo 1:** Verifica pattern global (priority 100) ✓ sempre carrega
   - **Passo 2:** Verifica pattern stack: `SeuArquivo.java` ✓ `src/main/java/**/*.java` → seu-adapter
   - **Passo 3:** Verifica projeto: arquivo está em `seu-projeto` → carrega projeto config (priority 40)
   - **Passo 4:** Aplica em ordem: global (100) > stack (50) > projeto (40)

### Mapeamento de Projetos (customizar com SEU binding)

Adicionar projetos em `seu-catalogo.yaml` → seção `projetos:`

**Exemplo:**
```yaml
projetos:
  - name: "seu-projeto-backend"
    extends: ["seu-backend-adapter"]
    type: "backend"
  - name: "seu-projeto-frontend"
    extends: ["seu-frontend-adapter"]
    type: "frontend"
```

### Cursor IDE

- Suporta `.cursor/rules/` (precedência local)
- Também respeita `.github/copilot-instructions.md` como fallback
- Mesmo mecanismo de `applyTo`

### Claude Code

- Lê `CLAUDE.md` (global)
- Lê `.github/copilot-instructions.md` (operacional)
- Suporta referência manual ao catalog

---

## 6) Manifest de Binding — seu-catalogo.yaml

O arquivo `seu-catalogo.yaml` (ou alias) é a **single source of truth** para descoberta com 3 seções:

### Seção `global:`
```yaml
global:
  - id: "ai-governance"
    source: "CLAUDE.md"
    priority: 100
    applyTo: "*"
```

### Seção `adapters:`
```yaml
adapters:
  - id: "seu-backend-adapter"
    source: ".github/instructions/seu-spring-boot-backend.instructions.md"
    priority: 50
    applyTo: ["src/main/java/**/*.java"]
```

### Seção `projetos:` (Binding Específico)
```yaml
projetos:
  - name: "seu-projeto"
    extends: ["seu-backend-adapter"]
    priority: 40
    type: "backend"
```

A seção `projetos:` opera como **override local** — quando você abre arquivo em um projeto específico, Copilot carrega primeiro os adapters globais + convencionais, depois aplica customizações de projeto se existirem.

**Quando atualizar `seu-catalogo.yaml`:**
- Criar novo adapter
- Adicionar/remover projeto
- Mudar escopo ou prioridades
- Mudar relacionamento projeto ↔ adapter

---

## 7) Resolução de Conflitos

### Cenário 1: Dois adapters com padrões que se sobrepõem

```
adapter-a: applyTo: ["src/**/*.java"]
adapter-b: applyTo: ["src/main/**/*.java"]
```

**Arquivo:** `src/main/java/SeuArquivo.java`

**Resolução:**
1. Ambos combinam ✓
2. Aplica-se `adapter-b` (padrão mais específico) **OU** ambos em ordem de prioridade
3. **Regra:** usar `priority` em `sean-catalogo.yaml` para desambiguar
   - `adapter-b: priority 60` > `adapter-a: priority 50` → adapter-b vence

### Cenário 2: Conflito de regra entre camadas

**Camada 1 (global):** "Use logging framework X"
**Camada 2 (adapter):** "Use logging framework X SEMPRE, nunca Y"

**Resolução:** Camada 2 é mais específica → **camada 2 vence** (maior prioridade numérica)

---

## 8) Adicionando Novo Adapter

### Step-by-Step

1. **Criar arquivo**
   ```bash
   touch .github/instructions/<dominio>.instructions.md
   ```

2. **Adicionar frontmatter**
   ```yaml
   ---
   applyTo: ["caminho/glob/**/*.ext"]
   version: "1.0"
   title: "Título do Adapter"
   maintainer: "[seu-time]"
   ---
   ```

3. **Escrever conteúdo** (sem duplicar globals)
   ```markdown
   # Convenções de <Dominio>
   
   > Regras globais: consulte `CLAUDE.md`
   > Regras operacionais: consulte `.github/copilot-instructions.md`
   
   ## 1) Seção
   - Regra 1
   - Regra 2
   ```

4. **Atualizar índices**
   - `.github/instructions/README.md` — adicionar tabela
   - `seu-catalogo.yaml` — adicionar entry na seção `adapters:`

5. **Testar descoberta**
   - Abra arquivo que combina `applyTo`
   - Verifique se adapter carrega no IDE

---

## 9) Troubleshooting

### IDE não carrega adapter esperado

**Causas comuns:**

| Causa | Fix |
|---|---|
| Frontmatter YAML inválido | Validar sintaxe em https://www.yamllint.com/ |
| `applyTo` pattern não combina arquivo | Testar glob em https://globster.xyz/ |
| IDE desatualizado | Reiniciar IDE, fazer reload manual |
| Precedência: adapter menor prioridade | Aumentar `priority` em `seu-catalogo.yaml` |

**Checklist:**

```
✓ Arquivo .instructions.md existe no caminho correto?
✓ Frontmatter YAML tem sintaxe correta?
✓ Pattern applyTo combina o arquivo que abriste?
✓ Priority está acima de concorrentes em seu-catalogo.yaml?
✓ IDE suporta mecanismo (Copilot/Cursor/Claude)?
```

### Regra de um adapter conflita com global

**Solução:** 
- Documentar no adapter por que sobrescreve global
- Adicionar comentário no frontmatter: `# Sobrescreve CLAUDE.md por razão X`
- Considerar se deve ficar em `CLAUDE.md` em vez de adapter

---

## 10) Ciclo de Vida — Manutenção

### Quando criar novo adapter

- Stack nova (ex: mobile com Swift)
- Domínio novo com 5+ regras (ex: DevOps, Security)
- Projeto tão específico que merece isolamento

### Quando **não** criar novo adapter

- Menos de 3 regras → adicionar a adapter existente ou global
- Conflita com governança global → mover ambos para `CLAUDE.md`
- Aplica a `*` files → definitivamente vai em global

### Quando converter adapter → global

1. A regra virou consenso de toda a org
2. Nenhum projeto a sobrescreve
3. Aplica-se a **múltiplos** adapters
4. **Ação:** mover para `CLAUDE.md`, atualizar `seu-catalogo.yaml` (marcar como deprecated)

---

## 11) Exemplo Prático: Adicionando Adapter Mobile

### 1. Criar arquivo

```bash
touch .github/instructions/mobile.instructions.md
```

### 2. Conteúdo com frontmatter

```text
---
applyTo: ["ios/**/*.swift", "android/**/*.kt"]
version: "1.0"
title: "Convenções de Mobile — Swift & Kotlin"
---

# Convenções de Mobile

> Regras globais: `../../CLAUDE.md`
> Stack adapter: `.github/instructions/mobile.instructions.md`

## 1) Swift (iOS)

- Use `struct` para value types...

## 2) Kotlin (Android)

- Use `data class`...
```

### 3. Atualizar `.github/instructions/README.md`

```diff
| `seu-spring-boot-backend.instructions.md` | Backend (sua tech) | `**/*.java` |
| `seu-angular-v21-frontend.instructions.md` | Frontend (sua tech) | `**/*.ts`, `**/*.js` |
+ | `mobile.instructions.md` | Mobile Swift/Kotlin | `ios/**/*.swift`, `android/**/*.kt` |
```

### 4. Atualizar `seu-catalogo.yaml`

```yaml
adapters:
  # ...existing...
  
  - id: "mobile-stack"
    name: "Mobile — Swift & Kotlin"
    source: ".github/instructions/mobile.instructions.md"
    priority: 50
    applyTo:
      - "ios/**/*.swift"
      - "android/**/*.kt"
    audience: ["mobile-team"]
```

### 5. Commit

```bash
git add .github/instructions/mobile.instructions.md
git add .github/instructions/README.md
git add seu-catalogo.yaml
git commit -m "feat: adicionar adapter de mobile (Swift + Kotlin)"
```

---

## 12) Referências

- **GitHub Copilot Instructions:** https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions
- **Cursor Rules:** https://docs.cursor.com/context/rules-for-ai
- **CLAUDE.md R-003:** Sem duplicação de regras entre camadas
- **CLAUDE.md R-015:** Atualização atômica de catálogos
- **GitHub Copilot Cookbook:** https://github.com/github/copilot-instructions

---

## 13) Definition of Done — Novo Adapter

- [ ] Arquivo `.github/instructions/<nome>.instructions.md` criado
- [ ] Frontmatter YAML com `applyTo` válido
- [ ] Conteúdo não duplica global rules (R-003)
- [ ] `.github/instructions/README.md` atualizado com nova tabela
- [ ] `seu-catalogo.yaml` atualizado com novo entry
- [ ] Pattern `applyTo` testado (ex: globster.xyz)
- [ ] Referências cruzadas atualizadas (se necessário)
- [ ] Commit com mensagem descritiva

---

## 📋 Como Usar Este Arquivo Como Base

1. **Copie este arquivo** para seu novo repositório
2. **Remova** todas as mencões "CUSTOMIZE" e referencie sua tech stack real
3. **Customize** exemplos — substitua nomes de SeuProjeto, SeuAdapter, src/ paths, etc.
4. **Atualize** frontmatter examples com sua realidade
5. **Pronto:** você tem um guia genérico de binding para sua organização

---

*Última atualização: 2026-06-11*  
*Versão do mecanismo: 1.0*  
*Status: Template genérico (reutilizável)*  
*Uso: Copie como referência para novo repositório com esta base de governança*

