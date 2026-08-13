# Exemplos Práticos — Skill YAML Governance

## Índice de Exemplos

1. [Configuração de Aplicação](#1-configuração-de-aplicação)
2. [Kubernetes Manifest](#2-kubernetes-manifest)
3. [Helm values.yaml](#3-helm-valuesyaml)
4. [GitHub Actions Workflow](#4-github-actions-workflow)
5. [Schema JSON para Validação](#5-schema-json-para-validação)
6. [Configuração CI/CD](#6-configuração-cicd)

---

## 1. Configuração de Aplicação

### ❌ ANTES — Problemas

```yaml
# config-ruim.yaml
Service:
    name: meu-servico
  database:
    host: localhost
    port: 5432
    password: minha-senha-123      # ⚠️ Segredo hardcoded
    pool_size: 10                  # ⚠️ inconsistente com naming

  logging:
    level: DEBUG                   # ⚠️ boolean coercion risk
    file: /var/log/app.log

  feature_flags:
    - enable_cache                 # ⚠️ ambíguo
    - on                           # ⚠️ YES/NO/on/off → boolean!

  timeout: 30                      # ⚠️ tipo ambíguo, sem unidade
```

**Problemas:**
- Indentação inconsistente (2 e 4 espaços)
- PascalCase misturado com snake_case
- Segredo em texto plano
- Valores ambíguos sem quotes
- Sem comentários explicativos
- Sem versionamento

### ✅ DEPOIS — Correto

```yaml
# config-bom.yaml
---
# Versão do schema de configuração
apiVersion: "1.0.0"
kind: ApplicationConfig

metadata:
  name: my-service
  version: "2.1.0"
  environment: production

# Configuração da aplicação
spec:
  service:
    name: my-service
    port: 8080
    # Context path para roteamento reverso (ticket #1234)
    contextPath: "/api/v1"

  database:
    # Deve usar postgres 14+ para compatibilidade com jsonb
    host: "${DB_HOST}"            # Carregado de env var
    port: 5432
    name: "my-db"
    connectionPool: 20              # camelCase consistente
    maxRetries: 3
    # Segredo sempre referenciado, nunca hardcoded
    passwordSecretRef:
      name: db-credentials
      key: password

  logging:
    level: "INFO"                   # Explícito entre quotes
    format: json
    file: "/var/log/app.log"
    # Mantém 10 dias de logs antes de arquivar
    retention:
      days: 10
      maxSizeBytes: 104857600      # 100MB

  cache:
    # Desabilitado em desenvolvimento, ativado em produção
    enabled: true
    ttlSeconds: 3600
    backend: redis

  featureFlags:
    enableNewUI: true              # booleano explícito
    enableBetaAPI: false
    maintenanceModeActive: "false"  # string explícita quando necessário

  timeout:
    # Em segundos; aumentar se houver latência de rede
    request: 30
    idle: 90
```

**Melhorias:**
- ✅ Indentação 2 espaços consistente
- ✅ camelCase uniforme
- ✅ Segredos via referência (env vars, K8s Secret)
- ✅ Tipagem explícita (quotes em valores ambíguos)
- ✅ Comentários explicam "porquê"
- ✅ Versionamento implícito (apiVersion, spec.version)

---

## 2. Kubernetes Manifest

### ❌ ANTES — Problemas

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default

spec:
  replicas: 1                       # ⚠️ Muito baixo para produção
  selector:
    matchLabels:
      app: my-app

  template:
    metadata:
      labels:
        app: my-app

    spec:
      containers:
      - name: app
        image: my-app:latest        # ⚠️ Latest tag → não reproduzível
        ports:
        - containerPort: 8080
        env:
        - name: DB_PASSWORD
          value: "secret123"        # ⚠️ NUNCA hardcode!

        resources:
          limits:
            memory: 1Gi             # ⚠️ Sem limite de CPU
          requests:
            memory: 256Mi           # ⚠️ Sem request de CPU

        # ⚠️ Sem health checks

      restartPolicy: Always
```

**Problemas:**
- Sem versão de imagem (latest tag)
- Segredo hardcoded em env var
- Sem CPU limits/requests
- Sem health checks (liveness/readiness)
- Sem labels/annotations suficientes
- Réplicas muito baixas para produção

### ✅ DEPOIS — Correto

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "2.1.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/managed-by: helm
  annotations:
    description: "My application service"
    owner: "platform-team@example.com"

spec:
  # Mínimo 2 replicas para HA; 3+ para produção
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0

  selector:
    matchLabels:
      app.kubernetes.io/name: my-app
      app.kubernetes.io/component: backend

  template:
    metadata:
      labels:
        app.kubernetes.io/name: my-app
        app.kubernetes.io/version: "2.1.0"
        app.kubernetes.io/component: backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"

    spec:
      serviceAccountName: my-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000

      containers:
      - name: app
        # Sempre especificar versão exata, nunca latest
        image: "registry.example.com/my-app:v2.1.0"
        imagePullPolicy: IfNotPresent

        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP

        # Segredo carregado de referência (K8s Secret)
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: APP_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"

        # Readiness: verifica se container está pronto para tráfego
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3

        # Liveness: detecta travamento, reinicia se necessário
        livenessProbe:
          httpGet:
            path: /health/alive
            port: http
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3

        # CPU: solicitação é garantida, limite é máximo
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"

        # Security context por container (override do pod-level)
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
              - ALL
          readOnlyRootFilesystem: true

        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache

      # Volumes (não usar hostPath em produção)
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir:
          sizeLimit: 100Mi

      # Tolerações para node scheduling
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "backend"
        effect: "NoSchedule"

      # Afinidade: preferir nodes específicos
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - my-app
              topologyKey: kubernetes.io/hostname

      # Política de restart
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
```

**Melhorias:**
- ✅ Versão de imagem explícita
- ✅ Segredo via reference (K8s Secret)
- ✅ CPU + Memory requests e limits
- ✅ Health checks (readiness, liveness)
- ✅ Labels e annotations consolidadas
- ✅ Múltiplas réplicas (HA)
- ✅ Security context (non-root, read-only filesystem)
- ✅ Resource limits em volumes
- ✅ Estratégia de rolling update

---

## 3. Helm values.yaml

### ❌ ANTES — Problemas

```yaml
# values-bad.yaml
replicaCount: 1                # ⚠️ Muito baixo para prod
image:
  repository: my-repo/my-app
  tag: latest                  # ⚠️ Latest tag
  pullPolicy: Always           # ⚠️ Ineficiente

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

resources: {}                  # ⚠️ Sem limits/requests
autoscaling:
  enabled: no                  # ⚠️ Ambíguo: sim/não?

ingress:
  enabled: off                 # ⚠️ OFF/ON ambíguo
  className: nginx
  annotations: []
  hosts:
    - host: localhost          # ⚠️ Hardcoded para localhost
      paths:
      - path: /
        pathType: Prefix
```

### ✅ DEPOIS — Correto

```yaml
# values-prod.yaml — Exemplo para produção
---
# Padrão de Helm: começar com valores descritivos
replicaCount: 3              # Mínimo para HA

image:
  # Sempre com repositório completo (sem assumir Docker Hub)
  repository: "registry.example.com/my-app"
  # Versão de imagem exata (nunca latest)
  tag: "2.1.0"
  pullPolicy: IfNotPresent   # Evita pull desnecessário

imagePullSecrets:
  - name: registry-credentials

nameOverride: ""
fullnameOverride: ""

# Configuração de segurança
serviceAccount:
  create: true
  annotations:
    description: "Service account para my-app"
  name: ""

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true

# Serviço
service:
  type: ClusterIP
  port: 80
  targetPort: http
  annotations: {}

# Ingress (habilitado por padrão em prod)
ingress:
  enabled: true              # Booleano explícito
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    acme.cert-manager.io/http01-edit-in-place: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    # Utilizar valores de parâmetros de chart (--set)
    - host: "my-app.example.com"
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: my-app-tls
      hosts:
        - "my-app.example.com"

# Resources — OBRIGATÓRIO em produção
resources:
  limits:
    cpu: "500m"
    memory: "512Mi"
  requests:
    cpu: "100m"
    memory: "256Mi"

# Autoscaling — ative em produção com carga variável
autoscaling:
  enabled: true              # Booleano explícito: true/false
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# Node affinity — preferir nodes específicos
nodeSelector:
  workload: "backend"

tolerations:
  - key: "workload"
    operator: "Equal"
    value: "backend"
    effect: "NoSchedule"

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - my-app
          topologyKey: kubernetes.io/hostname

# Health checks
healthChecks:
  readiness:
    enabled: true
    initialDelaySeconds: 10
    periodSeconds: 5
    failureThreshold: 3
  liveness:
    enabled: true
    initialDelaySeconds: 30
    periodSeconds: 10
    failureThreshold: 3

# Configuração de aplicação
appConfig:
  # Carregado via ConfigMap
  logLevel: "info"
  environment: "production"
  # Segredos carregados via Secret e referenciados em env
  database:
    host: "${DB_HOST}"
    passwordSecretRef: db-credentials
```

---

## 4. GitHub Actions Workflow

### ✅ Bom — Completo

```yaml
# .github/workflows/validate-and-deploy.yml
---
name: Validate YAML and Deploy

on:
  push:
    branches: [main, develop]
    paths:
      - "**.yaml"
      - "**.yml"
      - ".yamllint"
      - ".github/workflows/validate-and-deploy.yml"
  pull_request:
    branches: [main, develop]
    paths:
      - "**.yaml"
      - "**.yml"
      - ".yamllint"

jobs:
  # Fase 1: Validação de Sintaxe
  lint:
    runs-on: ubuntu-latest
    name: Lint YAML Syntax
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run yamllint
        uses: ibiqlik/action-yamllint@v3
        with:
          config_file: .yamllint
          file_or_dir: config/
          strict: true

  # Fase 2: Validação de Schema
  schema-validate:
    runs-on: ubuntu-latest
    name: Validate Against Schema
    needs: lint
    if: success()
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install check-jsonschema pyyaml

      - name: Validate app config
        run: |
          check-jsonschema \
            --schemafile schemas/app-config.json \
            --data-transform 'load(input_type="yaml")' \
            config/application.yaml

      - name: Validate environment configs
        run: |
          for env_file in config/values-*.yaml; do
            echo "Validating $env_file..."
            check-jsonschema \
              --schemafile schemas/values.json \
              --data-transform 'load(input_type="yaml")' \
              "$env_file" || exit 1
          done

  # Fase 3: Validação Kubernetes (se aplicável)
  kubernetes-validate:
    runs-on: ubuntu-latest
    name: Validate Kubernetes Manifests
    needs: lint
    if: success()
    steps:
      - uses: actions/checkout@v4

      - name: Install kubeconform
        run: |
          mkdir -p /tmp/kubeconform
          cd /tmp/kubeconform
          wget https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
          tar xf kubeconform-linux-amd64.tar.gz
          sudo mv kubeconform /usr/local/bin/
          kubeconform --version

      - name: Validate manifests
        run: |
          kubeconform \
            -summary \
            -output text \
            -ignore-missing-schemas \
            k8s/

  # Fase 4: Deploy (apenas em main)
  deploy:
    runs-on: ubuntu-latest
    name: Deploy Configuration
    needs: [lint, schema-validate]
    if: github.ref == 'refs/heads/main' && success()
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Docker Registry
        uses: docker/login-action@v2
        with:
          registry: "registry.example.com"
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Deploy via Helm
        run: |
          helm repo update
          helm upgrade --install my-app ./helm-chart \
            -f config/values-prod.yaml \
            --namespace production \
            --create-namespace \
            --atomic \
            --timeout 5m

      - name: Verify Deployment
        run: |
          kubectl rollout status deployment/my-app -n production --timeout=5m
          kubectl get pods -n production -l app.kubernetes.io/name=my-app
```

---

## 5. Schema JSON para Validação

### ✅ Exemplo — Schema Reutilizável

```jsonschema
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/app-config.schema.json",
  "title": "Application Configuration Schema",
  "description": "Schema para validar configurações de aplicação YAML",
  "type": "object",
  
  "required": ["apiVersion", "kind", "metadata", "spec"],
  
  "properties": {
    "apiVersion": {
      "type": "string",
      "pattern": "^(v\\d+|\\d\\.\\d+\\.\\d+)$",
      "description": "Versão do schema (ex: v1, 1.0.0)"
    },
    
    "kind": {
      "type": "string",
      "enum": ["ApplicationConfig"],
      "description": "Tipo de recurso"
    },
    
    "metadata": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 253,
          "pattern": "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
          "description": "Nome único do recurso"
        },
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$",
          "description": "Versão semântica (X.Y.Z)"
        },
        "environment": {
          "type": "string",
          "enum": ["development", "staging", "production"],
          "description": "Ambiente de deployment"
        }
      }
    },
    
    "spec": {
      "type": "object",
      "required": ["database", "logging"],
      "properties": {
        "database": {
          "type": "object",
          "properties": {
            "host": {
              "type": "string",
              "description": "Host do banco ou variável de ambiente"
            },
            "port": {
              "type": "integer",
              "minimum": 1,
              "maximum": 65535,
              "description": "Porta do banco"
            },
            "name": {
              "type": "string",
              "description": "Nome do banco de dados"
            },
            "connectionPool": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "description": "Tamanho do pool de conexões"
            },
            "passwordSecretRef": {
              "type": "object",
              "required": ["name", "key"],
              "properties": {
                "name": {"type": "string"},
                "key": {"type": "string"}
              },
              "description": "Referência a K8s Secret com senha"
            }
          },
          "required": ["host", "port"],
          "additionalProperties": false
        },
        
        "logging": {
          "type": "object",
          "properties": {
            "level": {
              "type": "string",
              "enum": ["debug", "info", "warn", "error"],
              "description": "Nível de logging"
            },
            "format": {
              "type": "string",
              "enum": ["json", "text"],
              "description": "Formato de log"
            }
          }
        },
        
        "timeout": {
          "type": "object",
          "properties": {
            "request": {
              "type": "integer",
              "minimum": 1,
              "description": "Timeout de request em segundos"
            },
            "idle": {
              "type": "integer",
              "minimum": 1,
              "description": "Timeout de conexão idle em segundos"
            }
          }
        }
      }
    }
  },
  
  "additionalProperties": false
}
```

---

## 6. Configuração CI/CD

### ✅ Makefile Reutilizável

```makefile
# Makefile — tarefas comuns de validação YAML
.PHONY: help yaml-lint yaml-validate yaml-format yaml-check

help:
	@echo "YAML Governance — Makefile"
	@echo "  make yaml-lint      — Executar yamllint em todos os arquivos"
	@echo "  make yaml-validate  — Validar contra JSON Schema"
	@echo "  make yaml-format    — Formatar YAML (experimental)"
	@echo "  make yaml-check     — Executar todas as validações"

yaml-lint:
	@echo "📋 Rodando yamllint..."
	yamllint -c .yamllint .

yaml-validate:
	@echo "✅ Validando contra schema..."
	check-jsonschema \
		--schemafile schemas/app-config.json \
		--data-transform 'load(input_type="yaml")' \
		config/application.yaml

yaml-format:
	@echo "🎨 Formatando YAML (usando yq)..."
	yq -i '... comments="" | sort_keys' config/*.yaml

yaml-check: yaml-lint yaml-validate
	@echo "✨ Todas as validações passaram!"
```

### ✅ Docker Health Check

```dockerfile
# Dockerfile — exemplo com health check
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY .. .

# Health check que valida YAML periodicamente
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import yaml; yaml.safe_load(open('config.yaml'))" || exit 1

CMD ["python", "app.py"]
```

---

## Resumo de Checklist de Implementação

```yaml
---
checklist:
  - item: "Indentação = 2 espaços"
    status: false
  - item: "Nomeação kebab-case (IaC) ou camelCase (app)"
    status: false
  - item: "Valores ambíguos entre aspas"
    status: false
  - item: "Nenhum segredo hardcoded"
    status: false
  - item: "Arquivo passa yamllint -c .yamllint"
    status: false
  - item: "Arquivo passa schema validation"
    status: false
  - item: "Comentários explicam 'porquê'"
    status: false
  - item: "Versionamento presente (apiVersion, kind)"
    status: false
```

---

**Versão:** 1.0.0  
**Última atualização:** 2026-06-10

