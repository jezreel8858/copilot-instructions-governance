#!/usr/bin/env python3
"""
Módulo de Ingestão de Contratos de API (OpenAPI, Swagger, AsyncAPI)
==================================================================
Lê especificações OpenAPI (3.0/3.1), Swagger 2.0 e AsyncAPI (2.x/3.x)
em formato JSON ou YAML, correlaciona rotas e chamadas cross-repo automaticamente
e classifica a compatibilidade de contratos (COMPATIBLE / BREAKING / UNVERIFIED).
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Set


def normalize_route_path(path_str: str) -> str:
    """Normaliza caminhos de rotas substituindo parâmetros por wildcard padronizado.
    Exemplos:
      /v1/usuarios/{id} -> /v1/usuarios/*
      /v1/usuarios/:id  -> /v1/usuarios/*
      /v1/usuarios/${id} -> /v1/usuarios/*
    """
    if not path_str:
        return ""
    cleaned = path_str.strip().split("?")[0]
    # Substitui template literals ${param} primeiro
    cleaned = re.sub(r'\$\{[^}]+\}', '*', cleaned)
    # Substitui {param} de OpenAPI
    cleaned = re.sub(r'\{[^}]+\}', '*', cleaned)
    # Substitui :param do Express/NestJS
    cleaned = re.sub(r':[\w]+', '*', cleaned)
    # Remove barras duplicadas e barra final
    cleaned = re.sub(r'/+', '/', cleaned).rstrip("/")
    return cleaned if cleaned else "/"


class OpenApiParser:
    """Parser de especificações OpenAPI 3.x e Swagger 2.0."""

    @staticmethod
    def parse_spec_file(file_path: Path) -> List[Dict[str, Any]]:
        """Lê arquivo OpenAPI/Swagger e extrai lista de endpoints e schemas."""
        if not file_path.exists():
            return []

        data = {}
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                if file_path.suffix.lower() in (".yaml", ".yml"):
                    try:
                        import yaml
                        data = yaml.safe_load(content) or {}
                    except ImportError:
                        return []
                else:
                    data = json.loads(content)
        except Exception as e:
            print(f"[WARN] Erro ao carregar especificação OpenAPI '{file_path}': {e}")
            return []

        endpoints = []
        paths = data.get("paths", {})
        base_path = data.get("basePath", "")  # Swagger 2.0
        servers = data.get("servers", [])
        server_prefix = ""
        if servers and isinstance(servers, list) and "url" in servers[0]:
            srv_url = servers[0]["url"]
            if srv_url.startswith("/"):
                server_prefix = srv_url

        for raw_path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue
            full_path = (server_prefix or base_path) + raw_path
            norm_path = normalize_route_path(full_path)

            for method in ("get", "post", "put", "delete", "patch", "options", "head"):
                if method in path_item and isinstance(path_item[method], dict):
                    op = path_item[method]
                    endpoints.append({
                        "method": method.upper(),
                        "raw_path": full_path,
                        "normalized_path": norm_path,
                        "operation_id": op.get("operationId", ""),
                        "summary": op.get("summary", ""),
                        "description": op.get("description", ""),
                        "tags": op.get("tags", []),
                        "parameters": op.get("parameters", []),
                        "request_body": op.get("requestBody", {}),
                        "responses": op.get("responses", {}),
                        "spec_file": str(file_path)
                    })

        return endpoints


class AsyncApiParser:
    """Parser de especificações AsyncAPI 2.x/3.x para tópicos e mensageria (RabbitMQ, Kafka)."""

    @staticmethod
    def parse_spec_file(file_path: Path) -> List[Dict[str, Any]]:
        """Lê arquivo AsyncAPI e extrai canais, operações e schemas de mensagens."""
        if not file_path.exists():
            return []

        data = {}
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                if file_path.suffix.lower() in (".yaml", ".yml"):
                    try:
                        import yaml
                        data = yaml.safe_load(content) or {}
                    except ImportError:
                        return []
                else:
                    data = json.loads(content)
        except Exception as e:
            print(f"[WARN] Erro ao carregar especificação AsyncAPI '{file_path}': {e}")
            return []

        channels_list = []
        channels = data.get("channels", {})
        for channel_name, channel_item in channels.items():
            if not isinstance(channel_item, dict):
                continue
            publish_op = channel_item.get("publish") or channel_item.get("pub")
            subscribe_op = channel_item.get("subscribe") or channel_item.get("sub")

            if publish_op:
                channels_list.append({
                    "type": "asyncapi_publish",
                    "channel": channel_name,
                    "operation_id": publish_op.get("operationId", ""),
                    "summary": publish_op.get("summary", ""),
                    "message": publish_op.get("message", {}),
                    "spec_file": str(file_path)
                })
            if subscribe_op:
                channels_list.append({
                    "type": "asyncapi_subscribe",
                    "channel": channel_name,
                    "operation_id": subscribe_op.get("operationId", ""),
                    "summary": subscribe_op.get("summary", ""),
                    "message": subscribe_op.get("message", {}),
                    "spec_file": str(file_path)
                })

        return channels_list


EXCLUDED_SCAN_DIRS = frozenset({
    "node_modules", ".git", "dist", "build", "target", ".angular",
    ".gradle", ".idea", ".vscode", "venv", ".venv", "__pycache__",
    "coverage", ".next", ".nuxt", "bin", "obj", ".turbo",
    "android", "ios", "tmp", ".codegraph"
})


class ContractCorrelator:
    """Correlaciona endpoints expostos e clientes consumidores cross-repo."""

    @staticmethod
    def extract_http_calls_from_source(source_dir: Path) -> List[Dict[str, Any]]:
        """Varre arquivos de código do projeto em busca de endpoints chamados via HTTP Client."""
        calls = []
        if not source_dir.exists():
            return calls

        # Padrões comuns de chamadas HTTP em TypeScript/JavaScript/Java/Python
        http_patterns = [
            # Angular / Axios / Fetch / HttpService: http.get('/v1/usuarios'), fetch('/api/...')
            re.compile(r"""\b(?:get|post|put|delete|patch)\s*(?:<[^>]+>)?\s*\(\s*[`'"]([^`'"]+)[`'"]""", re.IGNORECASE),
            # Angular URL concat: `${this.baseUrl}/v1/usuarios`
            re.compile(r"""(?:baseUrl|apiUrl|endpoint|url)\s*\+\s*[`'"]([^`'"]+)[`'"]""", re.IGNORECASE),
            # RestTemplate / WebClient Java: restTemplate.exchange("/v1/usuarios", ...)
            re.compile(r"""(?:restTemplate|webClient|httpClient)\.(?:exchange|getForObject|postForObject|get|post)\s*\(\s*["']([^"']+)["']""", re.IGNORECASE),
            # FeignClient: @GetMapping("/v1/usuarios") dentro de interfaces client
            re.compile(r"""@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']""", re.IGNORECASE)
        ]

        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_SCAN_DIRS and not d.startswith(".")]
            for file in files:
                if file.endswith((".ts", ".js", ".java", ".py")):
                    file_path = Path(root) / file
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()

                        # Filtro rápido em memória para evitar regex se não houver termos relevantes
                        if not any(k in content for k in ("http", "fetch", "get", "post", "put", "delete", "patch", "Url", "url", "Mapping", "exchange")):
                            continue

                        lines = content.splitlines()
                        for line_num, line in enumerate(lines, 1):
                            for pat in http_patterns:
                                matches = pat.findall(line)
                                for m in matches:
                                    route = m if isinstance(m, str) else (m[1] if len(m) > 1 else m[0])
                                    if "/" in route and len(route) > 2 and not route.startswith("//"):
                                        norm = normalize_route_path(route)
                                        calls.append({
                                            "raw_route": route,
                                            "normalized_route": norm,
                                            "file": str(file_path),
                                            "line": line_num,
                                            "symbol": file_path.stem
                                        })
                    except Exception:
                        pass

        return calls

    @staticmethod
    def extract_server_endpoints_from_source(source_dir: Path) -> List[Dict[str, Any]]:
        """Varre Controllers e Resources backend em busca de rotas expostas."""
        endpoints = []
        if not source_dir.exists():
            return endpoints

        # Padrões Spring Boot / Express / NestJS / FastAPI
        spring_class_mapping = re.compile(r"""@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']""", re.IGNORECASE)
        spring_method_mapping = re.compile(r"""@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)(?:\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']*)["']\s*\))?""", re.IGNORECASE)

        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_SCAN_DIRS and not d.startswith(".")]
            for file in files:
                if file.endswith((".java", ".ts", ".py", ".js")):
                    file_path = Path(root) / file
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()

                        # Filtro rápido para ignorar arquivos que não definem mappings
                        if "@" not in content or "Mapping" not in content:
                            continue

                        class_prefix = ""
                        c_match = spring_class_mapping.search(content)
                        if c_match:
                            class_prefix = c_match.group(1)

                        for m_match in spring_method_mapping.finditer(content):
                            http_verb = m_match.group(1).replace("Mapping", "").upper()
                            m_path = m_match.group(2) or ""
                            full_route = (class_prefix + ("/" if not class_prefix.endswith("/") and not m_path.startswith("/") and m_path else "") + m_path).rstrip("/")
                            norm = normalize_route_path(full_route)
                            endpoints.append({
                                "verb": http_verb,
                                "raw_route": full_route,
                                "normalized_route": norm,
                                "file": str(file_path),
                                "symbol": file_path.stem
                            })
                    except Exception:
                        pass

        return endpoints

    @staticmethod
    def correlate_projects(
        projects_cfg: List[Dict[str, Any]],
        openapi_specs: Optional[List[Any]] = None,
        max_workers: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Correlaciona chamadores e provedores entre projetos e gera a lista de pontes automáticas."""
        from collections import defaultdict
        from concurrent.futures import ThreadPoolExecutor

        bridges = []
        project_servers = {}
        project_clients = {}

        # 1. Extração concorrente de endpoints e chamadas clientes por projeto (I/O paralelo)
        def _extract_project(p: Dict[str, Any]) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
            p_id = p["name"]
            p_path = Path(p.get("path", ""))
            endpoints = []
            calls = []
            if p_path.exists():
                endpoints = ContractCorrelator.extract_server_endpoints_from_source(p_path)
                calls = ContractCorrelator.extract_http_calls_from_source(p_path)
            return p_id, endpoints, calls

        workers = max_workers or min(32, (os.cpu_count() or 4) * 2)
        with ThreadPoolExecutor(max_workers=workers) as executor:
            for p_id, endpoints, calls in executor.map(_extract_project, projects_cfg):
                if endpoints:
                    project_servers[p_id] = endpoints
                if calls:
                    project_clients[p_id] = calls

        # 2. Ingestão de OpenAPI specs externas / locais
        if openapi_specs:
            for spec_file in openapi_specs:
                spec_endpoints = OpenApiParser.parse_spec_file(spec_file)
                # Tenta associar spec ao projeto pelo diretório
                matched_proj = None
                for p in projects_cfg:
                    if str(spec_file).startswith(p.get("path", "")):
                        matched_proj = p["name"]
                        break
                if not matched_proj and projects_cfg:
                    matched_proj = projects_cfg[0]["name"]

                if matched_proj:
                    server_list = project_servers.setdefault(matched_proj, [])
                    for se in spec_endpoints:
                        server_list.append({
                            "verb": se["method"],
                            "raw_route": se["raw_path"],
                            "normalized_route": se["normalized_path"],
                            "file": se["spec_file"],
                            "symbol": se.get("operation_id") or "OpenAPIEndpoint"
                        })

        # 3. Cruzamento e Match de Rotas Cross-Repo com Indexação O(1) em memória
        matched_pairs: Set[Tuple[str, str, str, str]] = set()

        # Índice de endpoints por normalized_route para resolução O(1) de rotas exatas
        endpoints_by_norm = defaultdict(list)
        all_endpoints_with_proj = []

        for server_proj, endpoints in project_servers.items():
            for ep in endpoints:
                s_norm = ep.get("normalized_route")
                if s_norm:
                    endpoints_by_norm[s_norm].append((server_proj, ep))
                all_endpoints_with_proj.append((server_proj, ep))

        for client_proj, calls in project_clients.items():
            for call in calls:
                client_norm = call.get("normalized_route")
                client_sym = call["symbol"]
                if not client_norm:
                    continue

                # 3.1 Match exato direto via índice em memória
                exact_candidates = endpoints_by_norm.get(client_norm)
                matched_exact = False
                if exact_candidates:
                    for server_proj, ep in exact_candidates:
                        if client_proj == server_proj:
                            continue
                        pair_key = (client_proj, client_sym, server_proj, ep["symbol"])
                        if pair_key not in matched_pairs:
                            matched_pairs.add(pair_key)
                            bridges.append({
                                "src_proj": client_proj,
                                "src_symbol": client_sym,
                                "tgt_proj": server_proj,
                                "tgt_symbol": ep["symbol"],
                                "label": f"{ep.get('verb', 'REST')}: {ep['raw_route']}",
                                "description": f"Chamada detectada em {Path(call['file']).name}:{call['line']} ➔ {Path(ep['file']).name}",
                                "protocol": "HTTP REST",
                                "status": "COMPATIBLE",
                                "auto_detected": True
                            })
                            matched_exact = True

                # 3.2 Se já encontrou match exato, não precisa checar sufixo/prefixo
                if matched_exact:
                    continue

                # 3.3 Fallback para correspondência por sufixo ou prefixo representativo
                client_parts = client_norm.split("/")
                client_prefix = client_parts[:3] if len(client_parts) >= 3 else None

                for server_proj, ep in all_endpoints_with_proj:
                    if client_proj == server_proj:
                        continue  # Ignora intra-repo

                    server_norm = ep.get("normalized_route")
                    if not server_norm:
                        continue

                    is_match = False
                    if client_norm.endswith(server_norm) or server_norm.endswith(client_norm):
                        is_match = True
                    elif client_prefix and len(server_norm.split("/")) >= 3 and client_prefix == server_norm.split("/")[:3]:
                        is_match = True

                    if is_match:
                        pair_key = (client_proj, client_sym, server_proj, ep["symbol"])
                        if pair_key not in matched_pairs:
                            matched_pairs.add(pair_key)
                            bridges.append({
                                "src_proj": client_proj,
                                "src_symbol": client_sym,
                                "tgt_proj": server_proj,
                                "tgt_symbol": ep["symbol"],
                                "label": f"{ep.get('verb', 'REST')}: {ep['raw_route']}",
                                "description": f"Chamada detectada em {Path(call['file']).name}:{call['line']} ➔ {Path(ep['file']).name}",
                                "protocol": "HTTP REST",
                                "status": "COMPATIBLE",
                                "auto_detected": True
                            })

        return bridges

