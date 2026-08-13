---
name: agent-observability-otel
description: >
  Convenções de observabilidade para agents de IA com OpenTelemetry GenAI Semantic
  Conventions v1.41 (2026). Cobre spans (invoke_agent, execute_tool, chat), métricas
  de tokens/latência/custo, logs estruturados e integração com backends (Datadog, Langfuse).
tier: 2
category: observability
triggers:
  - "observability agent"
  - "opentelemetry llm"
  - "otel genai"
  - "tracing agent"
  - "spans llm"
  - "token usage metrics"
  - "latência llm"
  - "gen_ai semconv"
  - "langfuse"
  - "rastreabilidade agent"
source_docs:
  - CLAUDE.md
  - .github/copilot-instructions.md
tools:
  - context-mode
  - sonarqube-governance
---

# Agent Observability — OpenTelemetry GenAI

> **Baseado em**: OTel GenAI Semantic Conventions v1.41 (status: Development) · 2026
> **Nota**: atributos `gen_ai.*` podem mudar sem major version bump — validar contra spec antes de usar em produção.

## 1) Por que Observabilidade em Agents?

Agents falham de formas que parecem sucesso: outputs bem formados mas incorretos, tool calls redundantes, ações semanticamente inválidas. Métricas tradicionais (HTTP 200, latência p99) não capturam isso.

**O que precisa ser rastreado em agents:**
- Decisões do LLM (quais tools foram chamadas e com quais argumentos)
- Latência por etapa (LLM call, tool execution, retrying)
- Uso e custo de tokens por sessão e por usuário
- Falhas de ferramenta e seus motivos
- Handoffs entre agents (quem delegou para quem)

---

## 2) OTel GenAI — Tipos de Span

A OTel GenAI Semantic Conventions definem 4 tipos principais de span:

### 2.1) gen_ai.client.chat — Chamada ao LLM

```
Span Kind: CLIENT
Operação:  gen_ai.operation.name = "chat"

Atributos obrigatórios:
  gen_ai.system            = "openai" | "anthropic" | "azure" | "gemini"
  gen_ai.request.model     = "gpt-4o" | "claude-sonnet-4" | etc.
  gen_ai.response.model    = modelo real usado (pode diferir do solicitado)

Atributos de uso:
  gen_ai.usage.input_tokens   = N    ← tokens enviados
  gen_ai.usage.output_tokens  = N    ← tokens gerados
  gen_ai.usage.total_tokens   = N    ← project

Atributos de performance:
  gen_ai.request.temperature  = 0.7
  gen_ai.request.max_tokens   = 4096
  gen_ai.response.finish_reason = "stop" | "length" | "tool_calls"
```

### 2.2) invoke_agent — Invocação de Agent

```
Span Kind: SERVER (se entrada do usuário) ou CLIENT (se delegação de outro agent)
Operação:  gen_ai.operation.name = "invoke_agent"

Atributos:
  gen_ai.agent.name           = "test-implementation"   ← nome do agent
  gen_ai.agent.description    = "Implementa suítes de teste"
  gen_ai.request.id           = "<uuid-da-sessão>"      ← correlation ID
  agent.conversation.id       = "<conversa>"
```

### 2.3) execute_tool — Execução de Tool/MCP

```
Span Kind: INTERNAL
Operação:  gen_ai.operation.name = "execute_tool"

Atributos:
  gen_ai.tool.name            = "read_file" | "grep_search" | "run_in_terminal"
  gen_ai.tool.call.id         = "<id-da-chamada>"
  gen_ai.tool.description     = "Lê conteúdo de arquivo"
  tool.execution.status       = "success" | "error" | "timeout"
  tool.execution.duration_ms  = 123
```

### 2.4) Hierarquia de Spans (Multi-step Agent)

```
[invoke_agent: test-implementation]          ← raiz da sessão
  ├── [gen_ai.client.chat]                   ← 1ª chamada ao LLM
  │     └── tokens: 850 in / 320 out
  ├── [execute_tool: read_file]              ← tool call 1
  │     └── duration: 12ms, status: success
  ├── [execute_tool: grep_search]            ← tool call 2
  │     └── duration: 45ms, status: success
  ├── [gen_ai.client.chat]                   ← 2ª chamada ao LLM (com tool results)
  │     └── tokens: 1200 in / 580 out
  └── [execute_tool: insert_edit_into_file]  ← tool call 3
        └── duration: 8ms, status: success
```

---

## 3) Métricas Obrigatórias (gen_ai.*)

```yaml
# Métricas definidas na OTel GenAI spec

gen_ai.client.token.usage:
  tipo: Histogram
  unit: tokens
  labels: [gen_ai.system, gen_ai.request.model, gen_ai.token.type]
  quando: cada chamada LLM
  alerta: p95 > 3000 tokens/req → revisar prompt

gen_ai.client.operation.duration:
  tipo: Histogram
  unit: segundos
  labels: [gen_ai.system, gen_ai.request.model, gen_ai.operation.name]
  quando: cada operação LLM
  alerta: p99 > 30s → degradação do provider

gen_ai.tool.execution.duration:
  tipo: Histogram
  unit: milissegundos
  labels: [gen_ai.tool.name, tool.execution.status]
  quando: cada tool call
  alerta: qualquer tool > 5s → timeout implícito

gen_ai.session.cost:
  tipo: Counter
  unit: USD
  labels: [gen_ai.agent.name, gen_ai.request.model]
  quando: cada sessão completa
  alerta: > $0.50/sessão → revisar eficiência
```

---

## 4) Logs Estruturados (JSON)

```json
{
  "timestamp": "2026-07-30T14:23:05.123Z",
  "level": "INFO",
  "service": "copilot-agent",
  "agent_name": "test-implementation",
  "operation": "execute_tool",
  "tool_name": "read_file",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "duration_ms": 12,
  "status": "success",
  "message": "Tool executada com sucesso"
}
```

**Campos obrigatórios em todos os logs de agent:**
- `timestamp` — ISO 8601 com milliseconds
- `trace_id` + `span_id` — correlação com traces OTel
- `agent_name` — qual agent gerou o log
- `operation` — qual ação foi executada
- `status` — `success` | `error` | `timeout`

---

## 5) Backends de Observabilidade

| Backend | Open Source | OTel GenAI Nativo | Melhor Para |
|---|---|---|---|
| **Langfuse** | ✅ | ✅ | Traces LLM, prompt versioning, custo |
| **MLflow Tracing** | ✅ | ✅ | CI/CD integration, model registry |
| **Arize Phoenix** | ✅ (Elastic 2.0) | ✅ | RAG + agent traces combinados |
| **Datadog LLM Obs.** | ❌ | ✅ v1.37+ | Infraestrutura + LLM em um só lugar |
| **Grafana + Tempo** | ✅ | Parcial | Self-hosted, budget constrained |

---

## 6) Boas Práticas

- **Correlacionar com `trace_id`**: toda log line, erro e métrica de uma sessão deve compartilhar o mesmo `trace_id` para correlação no backend
- **Não logar conteúdo de prompt/completion por padrão**: pode conter PII — usar feature flag controlada
- **Instrumentar tool calls individuais**: latência por tool é mais útil que latência total da sessão
- **Token budget awareness**: emitir alerta quando sessão ultrapassa 80% do token budget configurado
- **Gravar finish_reason**: `tool_calls` vs `stop` vs `length` indica qualidade da conversa

---

## 7) Anti-padrões

- ❌ Logar prompt completo ou completion sem verificar PII
- ❌ Usar apenas métricas de HTTP (status 200) para monitorar saúde de agents
- ❌ Não correlacionar logs com trace_id (impossível debugar multi-step agents)
- ❌ Medir só latência end-to-end sem breakdown por etapa (LLM vs tool)
- ❌ Não registrar token usage (custo invisível)
- ❌ Criar spans proprietários sem usar atributos gen_ai.* (lock-in de vendor)

---

## 8) Referências

- OTel GenAI Semconv v1.41: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- Zylos Research — OTel for AI Agents: https://zylos.ai/research/2026-02-28-opentelemetry-ai-agent-observability
- Digital Applied — Observability 2026: https://www.digitalapplied.com/blog/ai-agent-observability-2026-tracing-monitoring-stack-guide
- OpenLLMetry (instrumentação automática): https://github.com/traceloop/openllmetry
- Langfuse (backend open source): https://langfuse.com/
