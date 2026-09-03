# Diretrizes Globais para Mensagens de Commit (Copilot)

> **Referência rápida:**
> `tipo(escopo): resumo no imperativo (máx. 72 chars)` → corpo (máx. 72 chars/linha) → rodapé
> Execute `git status` **uma única vez** antes de gerar qualquer mensagem.

---

## 1. Idioma e Padrão

- Toda mensagem de commit **deve ser em Português do Brasil**.
- Siga o padrão **Conventional Commits**.
- Tipos válidos e quando usá-los:

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade visível ao usuário/sistema |
| `fix` | Correção de bug com impacto funcional |
| `refactor` | Reestruturação de código sem alterar comportamento externo |
| `test` | Adição, correção ou remoção de testes |
| `docs` | Alterações exclusivas em documentação (`.md`, comentários, JSDoc) |
| `chore` | Manutenção sem impacto funcional (deps, scripts, configs, dead code) |
| `perf` | Otimização mensurável de performance |
| `build` | Mudanças no sistema de build (`pom.xml`, `package.json`, `Dockerfile`) |
| `ci` | Mudanças em pipelines de CI/CD |
| `style` | Formatação pura (espaços, vírgulas) sem mudança de lógica |
| `revert` | Reversão de commit anterior |
| `wip` | Progresso parcial; **nunca fazer merge direto na branch principal** |

- Estrutura obrigatória:
  ```
  tipo(escopo): resumo curto no imperativo

  Corpo opcional — o que mudou e por quê. (máx. 72 chars/linha)

  Rodapé opcional — BREAKING CHANGE: ... | Closes #123
  ```

---

## 2. Pré-requisitos Obrigatórios

> **Execute SEMPRE antes de gerar a mensagem:**

1. Rode `git status` **uma única vez** para ver os arquivos staged e não-staged.
2. Baseie a mensagem **apenas** no que estiver em stage (`Changes to be committed`).
3. Se nenhum arquivo estiver staged, oriente o usuário a fazer `git add ...` — **nunca invente alterações**.
4. Se houver dúvida sobre o conteúdo de um arquivo modificado, leia-o antes de descrevê-lo.
5. Se o commit implementa um plano documentado (ex: `PLANO_FUNCIONALIDADE.md`), referencie-o no corpo.

---

## 3. Escopo e Granularidade

- Commits devem ser **coerentes e atômicos**: uma mudança lógica por commit.
- **Backend e frontend** em projetos separados → gerar **uma mensagem por projeto**.
    - Exemplo: `feat(api): ...` e `feat(web): ...`
- Não misturar `docs` com `feat/fix` no mesmo commit, salvo quando a documentação for entrega obrigatória da funcionalidade.

### Quando dividir em múltiplos commits

| Situação | Ação recomendada |
|---|---|
| Schema de banco + lógica de negócio + UI | Commits separados por camada |
| Refatoração independente de nova feature | Commit de `refactor` antes do `feat` |
| Hotfix aplicado junto com feature em desenvolvimento | Separar em `fix` + `feat` |
| Mudança de dependência + uso da nova API | `build` + `feat` separados |

---

## 4. Como Escrever o Resumo (título)

- Verbo no **imperativo**: `adiciona`, `corrige`, `atualiza`, `remove`, `refatora`, `documenta`, `implementa`, `extrai`, `elimina`, `exclui`, `migra`, `expõe`, `protege`.
- Máximo de **72 caracteres** no título.
- **Evite:**
    - Palavras vagas: "ajustes", "mudanças", "update", "fix stuff"
    - Nomes de variáveis ou detalhes de implementação
    - Frases sem contexto: "resolve bug", "melhora código"
    - Emojis no título — prejudicam rastreabilidade em ferramentas de CI e `grep`

### Tipo correto para exclusões

| Situação da exclusão | Tipo recomendado |
|---|---|
| Classe substituída por outra (renomeação, decomposição) | `refactor` |
| Código morto, orphan, nunca mais usado | `chore` |
| Arquivo de teste desnecessário/duplicado | `test` |
| Arquivo de configuração obsoleto | `chore` |
| Remoção de feature completa | `feat` (com `BREAKING CHANGE`) |
| Remoção de código deprecado após migração | `refactor` |

---

## 5. Estrutura do Corpo

> **Regra de formatação:** cada linha do corpo deve ter no máximo **72 caracteres** para garantir legibilidade no `git log` e em ferramentas de revisão.

### 5.1 — Commits Simples (1 a 5 arquivos)

Liste cada arquivo com uma descrição objetiva. Use apenas as seções que se aplicam:

```text
tipo(escopo): resumo curto em português

- Descrição narrativa do que foi feito e por quê.

Arquivos adicionados:
- caminho/do/NovoComponente.java — por que foi criado.

Arquivos modificados:
- caminho/do/ComponenteExistente.java — o que foi alterado.

Arquivos removidos:
- caminho/do/ComponenteObsoleto.java — por que foi removido; substituído por X (se aplicável).

Como validar:
- mvn -Dtest=NomeDoTesteTest test > logs/test-run.out 2>&1
```

> **Regra para arquivos removidos:** sempre explique o **motivo** da exclusão e, quando aplicável, qual classe/arquivo assumiu a responsabilidade. Nunca deixe a remoção sem contexto.

---

### 5.2 — Commits Complexos (6+ arquivos ou múltiplas funcionalidades)

Quando o commit envolver muitos arquivos, **agrupe por categoria funcional** em vez de listar cada arquivo individualmente. Isso torna a mensagem legível e rastreável sem ser exaustiva.

```text
tipo(escopo): resumo curto em português

- Descrição narrativa consolidada: o que o conjunto de mudanças entrega
  e por que foi feito dessa forma.

─── Novos arquivos ──────────────────────────────────────────────────
  [Grupo A — Nome da funcionalidade/camada]
  - ArquivoExemplo1.java — responsabilidade/objetivo
  - ArquivoExemplo2.java — responsabilidade/objetivo

  [Grupo B — Testes]
  - ArquivoExemplo1Test.java — o que é coberto

─── Arquivos modificados ────────────────────────────────────────────
  [Grupo C — Nome da camada/contexto]
  - ArquivoExemplo3.java — o que foi alterado e por quê (resumido)
  - ArquivoExemplo4.java — o que foi alterado e por quê (resumido)

  [Grupo D — Documentação]
  - docs/GUIA.md        — seções adicionadas/atualizadas

─── Arquivos removidos ──────────────────────────────────────────────
  [Grupo E — Motivo da exclusão]
  - ArquivoAntigo.java  — substituído por ArquivoExemplo1.java (motivo)
  - CodigoInativo.java  — código morto; sem uso desde refatoração X

─── Breaking changes ────────────────────────────────────────────────
  (omitir esta seção se não houver quebra de contrato)
  - Descreva o que quebrou e como migrar.

Como validar:
- mvn -Dtest=SuiteOuClasseTest test > logs/test-run.out 2>&1
  (ou o comando equivalente para o projeto)
```

**Regras para commits complexos:**
- Agrupe por responsabilidade, não por pasta (ex: "Infraestrutura de Dados", "Testes de Integração", "Documentação").
- Arquivos com mudanças óbvias pelo contexto do grupo podem ter descrição reduzida a uma palavra-chave.
- **Para arquivos removidos:** indique sempre o motivo — substituição, dead code, merge em outra classe, deprecação concluída.
- Se o commit implementa um plano rastreável (ex: `PLANO_MIGRACAO.md`), referencie-o no corpo.
- Mantenha os separadores visuais (`───`) para facilitar a leitura no histórico do Git.
- Omita seções que não tiverem arquivos (ex: sem remoções → omite `─── Arquivos removidos`).

---

## 6. Seção "Como validar" (obrigatória para feat/fix/refactor)

- Sempre inclua o comando de teste ou verificação que o revisor deve executar.
- **Backend (Maven):**
  ```bash
  mvn -Dtest=NomeDoTesteTest test > logs/test-run.out 2>&1
  mvn -pl <modulo> test > logs/test-run.out 2>&1   # módulo específico
  mvn test > logs/test-run.out 2>&1                # suite completa
  ```
- **Frontend (Angular/Vitest):**
  ```bash
  npm test
  ng test --watch=false
  ```
- Para `docs` e `chore` sem impacto de teste, use: `Como validar: N/A — alteração sem impacto em testes.`

---

## 7. Rodapés e Trailers

Use trailers padronizados no rodapé quando necessário:

```text
BREAKING CHANGE: descreva o que quebrou e como migrar.
Closes #123
Refs #456
Co-authored-by: Nome Sobrenome <email@exemplo.com>
Reviewed-by: Nome Sobrenome <email@exemplo.com>
```

| Trailer | Quando usar |
|---|---|
| `BREAKING CHANGE:` | Mudança que quebra contrato público (API, interface, schema) |
| `Closes #N` | Issue/ticket resolvido **totalmente** por este commit |
| `Refs #N` | Issue/ticket relacionado mas não fechado por este commit |
| `Co-authored-by:` | Pair programming ou contribuição de outra pessoa |

> `BREAKING CHANGE:` no rodapé é equivalente ao `!` no título (`feat!:`) — use um dos dois, não ambos.

---

## 8. Commits WIP (Work In Progress)

Para salvar progresso sem intenção de revisão imediata:

```text
wip(escopo): descreve o estado parcial do trabalho

- O que está feito e o que ainda falta implementar.
- Este commit será squashed antes do merge.
```

> **Nunca faça merge de commit `wip:` diretamente na branch principal.**
> Sempre faça `git rebase -i` para squash ou reword antes do PR.

---

## 9. Exemplos de Referência

### Commit Simples — `fix`
```text
fix(sessao): corrige renovação de acesso expirado no interceptor

- O interceptor não estava reenviando a requisição original após o
  refresh, causando perda silenciosa da chamada HTTP.

Arquivos modificados:
- sessao/interceptors/sessao.interceptor.ts — adiciona reenvio após renovarAcesso()

Como validar:
- npm test -- --testPathPattern=sessao.interceptor
```

---

### Commit Simples — `feat` com breaking change
```text
feat(api)!: altera contrato do endpoint /itens para retornar PaginaDTO<ItemDTO>

- Resposta anterior era ListaDTO<ItemDTO>; agora é PaginaDTO<ItemDTO> com campos
  pagina, tamanhoPagina e totalElementos para suporte a paginação.

Arquivos modificados:
- controller/ItemController.java — atualiza retorno para Flux<PaginaDTO<ItemDTO>>
- dto/ItemDTO.java               — adiciona campos de paginação

Como validar:
- mvn -Dtest=ItemControllerTest test > logs/test-run.out 2>&1

BREAKING CHANGE: clientes que consumiam /itens como array devem
  atualizar para ler o campo `conteudo` do objeto PaginaDTO retornado.
```

---

### Commit de Exclusão Simples — `refactor` (classe substituída)
```text
refactor(persistencia): remove RepositorioGenericoLegado após migração completa

- A interface RepositorioGenericoLegado (raw/@Deprecated) foi removida após todos
  os chamadores terem migrado para RepositorioTipado. O adaptador
  AdaptadorRepositorioTipado mantém retrocompatibilidade para código externo.

Arquivos removidos:
- repositorio/RepositorioGenericoLegado.java — substituída por RepositorioTipado<T, ID>

Arquivos modificados:
- repositorio/AdaptadorRepositorioTipado.java — remove dependência da interface excluída
- config/ConfiguracaoPersistencia.java       — atualiza mapeamento sem a interface legada

Como validar:
- mvn -pl modulo-persistencia test > logs/test-run.out 2>&1
```

---

### Commit de Exclusão Simples — `chore` (código morto)
```text
chore(cadastro): remove ConversorLegadoCadastro não utilizado desde v1.5

- Classe sem chamadores após migração para mapeador automático em novembro/2025.
  Nenhuma funcionalidade é afetada pela remoção.

Arquivos removidos:
- mapper/ConversorLegadoCadastro.java — código morto; zero referências no projeto

Como validar:
- mvn test > logs/test-run.out 2>&1
```

---

### Commit Complexo — `refactor` com remoções e plano rastreável
```text
refactor(persistencia): decomposição de classes extensas e melhorias de runtime (Plano V2 — itens 1.5, 3.2, 3.1)

- RepositorioBaseImpl (~1600 linhas) decomposta em três classes auxiliares
  com responsabilidade única. ConstrutorFiltroSql (~1285 linhas) decomposta em quatro
  construtores focados. Adicionada instrumentação de métricas nas operações de banco.
- Referência completa: docs/plan/PLANO_MELHORIA_PERSISTENCIA_V2.md

─── Novos arquivos ──────────────────────────────────────────────────
  [Decomposição RepositorioBaseImpl]
  - repositorio/helper/AgregadorDeLinhas.java   — agregação de linhas e coleções
  - repositorio/helper/MapeadorDeLinhas.java    — utilitários estáticos de mapeamento
  - repositorio/helper/ExecutorDeEscrita.java   — INSERT/UPDATE/DELETE via DTO

  [Decomposição ConstrutorFiltroSql]
  - filtro/ConstrutorFiltroComplexo.java        — filtros para DTOs com junções
  - filtro/ConstrutorFiltroSimples.java         — filtros para entidades simples
  - filtro/ContextoFiltro.java                  — contexto mutável de construção
  - filtro/ConstrutorPaginacao.java             — LIMIT/OFFSET

  [Observabilidade]
  - repositorio/MetricasPersistencia.java       — medição de tempo com padrão noop

  [Testes]
  - repositorio/helper/AgregadorDeLinhasTest.java
  - repositorio/MetricasPersistenciaTest.java

─── Arquivos modificados ────────────────────────────────────────────
  [Orquestradores]
  - repositorio/RepositorioBaseImpl.java        — reduzido a ~380 linhas; delega para auxiliares
  - filtro/ConstrutorFiltroSql.java              — fachada pública ~180 linhas; delega para construtores

  [Infraestrutura]
  - config/ConfiguracaoPersistencia.java        — declaração dos novos componentes
  - config/RegistradorDeRepositorio.java        — inicialização limpa; avisos isolados

  [Documentação]
  - modulo-persistencia/README.md               — documentação completa do módulo
  - docs/plan/PLANO_MELHORIA_PERSISTENCIA_V2.md  — todos os 18 itens marcados como concluídos

─── Arquivos removidos ──────────────────────────────────────────────
  [Classes obsoletas após decomposição]
  - filtro/ConstrutorFiltroSqlAntigo.java        — lógica migrada para novos construtores
  - repositorio/AuxiliarMapeamento.java         — utilitários absorvidos por MapeadorDeLinhas

Como validar:
- mvn -pl modulo-persistencia test > logs/test-run.out 2>&1
```