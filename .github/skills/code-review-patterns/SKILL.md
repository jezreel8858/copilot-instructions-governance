---
name: code-review-patterns
description: >-
  Diretrizes de mercado para revisão de código automatizada por IA — taxonomia
  de severidade, dimensões de análise, critérios de bloqueio de merge e
  anti-padrões de review (review fatigue, falso-positivo, revisão fora do diff).
tier: 2
category: quality
triggers:
  - "revisar código"
  - "code review"
  - "revisão antes do merge"
  - "analisar pull request"
  - "revisar diff"
  - "severidade de achado"
tools: []
source_docs:
  - "CLAUDE.md"
  - ".github/copilot-instructions.md"
---

# Code Review Patterns

> Base de conhecimento para agents/prompts que revisam código (diff/PR) antes do merge — nunca corrigem, apenas analisam e reportam.

## Quando Usar

- Antes de revisar um diff/PR e decidir a severidade dos achados.
- Ao definir se um achado deve **bloquear** o merge ou apenas alertar.
- Ao estruturar o relatório de saída de uma revisão de código.
- Ao avaliar se o agent está caindo em anti-padrões de review (ruído, falso-positivo).

## 1) Taxonomia de Severidade (padrão de mercado)

| Nível | Equivalente de mercado | Critério | Bloqueia merge? |
|---|---|---|---|
| 🔴 **Bloqueador** | blocker / critical / P0 | Bug funcional, falha de segurança, quebra de contrato não documentada | ✅ Sim |
| 🟠 **Alta prioridade** | major / P1 | Violação de convenção com impacto real, gap de teste em caminho crítico | ⚠️ Recomendado antes do merge |
| 🟡 **Sugestão** | minor / nitpick / P2-P3 | Estilo, otimização opcional, preferência sem impacto funcional | ❌ Não |
| ✅ **Aprovação** | approved | Trecho bem implementado, digno de nota positiva | — |

## 2) Dimensões de Análise (cobertura mínima)

| Dimensão | O que verificar |
|---|---|
| **Correção funcional** | Lógica, edge cases, condições de corrida, off-by-one |
| **Segurança** | OWASP Top 10 / CWE — injeção, exposição de dados, auth bypass, secrets no diff |
| **Convenções** | Aderência ao adapter de stack do projeto (`.github/instructions/<projeto>.instructions.md`) |
| **Impacto** | Breaking change, dependências afetadas, contratos quebrados |
| **Testes** | Cobertura ausente em caminho crítico, testes quebrados pelo diff |
| **Performance** | N+1, queries sem índice, loops/alocações desnecessárias no hot path |
| **Manutenibilidade** | Complexidade ciclomática alta, duplicação, nomes obscuros |

## 3) Critérios de Bloqueio de Merge

Bloquear (🔴) **somente** quando:
- Segurança crítica (secret exposto, injeção, bypass de autenticação/autorização).
- Bug funcional com evidência clara (não suposição).
- Breaking change de contrato público sem documentação/versionamento.
- Ausência total de teste em caminho crítico de negócio (pagamento, auth, dado sensível).

Demais achados → alertar (🟠/🟡), nunca bloquear por preferência de estilo isolada.

## 4) Boas Práticas de Prompt/Análise

- **Diff-only**: revisar apenas as linhas alteradas + contexto imediato — nunca o arquivo inteiro (evita ruído e review fatigue).
- **Evidência obrigatória**: todo achado cita `arquivo:linha` — nunca afirmação vaga sem localização.
- **Contexto do PR**: usar descrição/issue vinculada quando disponível antes de classificar severidade (reduz falso-positivo por falta de contexto de negócio).
- **Complementar, não substituir SAST/lint**: rodar/considerar linters e SAST determinísticos (ESLint, SonarQube, Semgrep) primeiro; a revisão por IA cobre o que é semântico e contextual, não o que já é checável por regra estática.

## 5) Anti-Padrões (review fatigue e falso-positivo)

- ❌ Gerar dezenas de comentários "nitpick" sem priorização — sinaliza ruído, não qualidade.
- ❌ Revisar arquivo inteiro quando só uma função mudou.
- ❌ Alertar "possível vulnerabilidade" sem evidência concreta (linha, padrão, CWE referenciável).
- ❌ Ignorar contexto de negócio documentado (issue/PR description) e sugerir mudança já rejeitada anteriormente.
- ❌ Bloquear merge por preferência de estilo sem violação de convenção declarada.
- ❌ Corrigir o código diretamente — revisão é read-only por definição.

## 6) Formato de Saída Recomendado

- Sumário executivo no topo (contagem por severidade + veredito).
- Achados agrupados por severidade, não por arquivo (facilita priorização).
- Cada achado: `[categoria] descrição → arquivo:linha`.
- Veredito final: `APROVADO | APROVADO COM RESSALVAS | BLOQUEADO`.

## Checklist

- [ ] Revisão restrita ao diff (não ao arquivo inteiro).
- [ ] Todo achado tem `arquivo:linha` como evidência.
- [ ] Severidade classificada conforme critério de bloqueio (seção 3), não por preferência.
- [ ] Contexto de PR/issue considerado antes de classificar.
- [ ] Nenhuma correção aplicada — apenas relatório.
- [ ] Veredito final declarado (APROVADO/RESSALVAS/BLOQUEADO).

## Referências

- Google Engineering Practices — Code Review Guide: https://google.github.io/eng-practices/review/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Padrões observados em ferramentas de mercado (CodeRabbit, Qodo/PR-Agent, Sourcery, DeepSource, SonarQube AI CodeFix) — revisão diff-only, severidade blocker/major/minor, complemento a SAST/lint.

