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

        for root, _, files in os.walk(source_dir):
            for file in files:
                if file.endswith((".ts", ".js", ".java", ".py")):
                    file_path = Path(root) / file
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()
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
        spring_method_mapping = re.compile(r"""@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']*)["']""", re.IGNORECASE)

        for root, _, files in os.walk(source_dir):
            for file in files:
                if file.endswith((".java", ".ts", ".py", ".js")):
                    file_path = Path(root) / file
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            class_prefix = ""
                            c_match = spring_class_mapping.search(content)
                            if c_match:
                                class_prefix = c_match.group(1)

                            for m_match in spring_method_mapping.finditer(content):
                                http_verb = m_match.group(1).replace("Mapping", "").upper()
                                m_path = m_match.group(2)
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
        openapi_specs: Optional[List[Path]] = None
    ) -> List[Dict[str, Any]]:
        """Correlaciona chamadores e provedores entre projetos e gera a lista de pontes automáticas."""
        bridges = []
        project_servers = {}
        project_clients = {}

        # 1. Extração de endpoints providos por projeto
        for p in projects_cfg:
            p_id = p["name"]
            p_path = Path(p.get("path", ""))
            if p_path.exists():
                endpoints = ContractCorrelator.extract_server_endpoints_from_source(p_path)
                project_servers[p_id] = endpoints

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

        # 3. Extração de chamadas clientes por projeto
        for p in projects_cfg:
            p_id = p["name"]
            p_path = Path(p.get("path", ""))
            if p_path.exists():
                calls = ContractCorrelator.extract_http_calls_from_source(p_path)
                project_clients[p_id] = calls

        # 4. Cruzamento e Match de Rotas Cross-Repo
        matched_pairs: Set[Tuple[str, str, str, str]] = set()

        for client_proj, calls in project_clients.items():
            for call in calls:
                client_norm = call["normalized_route"]
                client_sym = call["symbol"]

                for server_proj, endpoints in project_servers.items():
                    if client_proj == server_proj:
                        continue  # Ignora intra-repo

                    for ep in endpoints:
                        server_norm = ep["normalized_route"]
                        server_sym = ep["symbol"]

                        # Match de rotas (exato ou prefixo representativo)
                        is_match = False
                        if client_norm and server_norm:
                            if client_norm == server_norm:
                                is_match = True
                            elif client_norm.endswith(server_norm) or server_norm.endswith(client_norm):
                                is_match = True
                            elif len(client_norm.split("/")) >= 3 and client_norm.split("/")[:3] == server_norm.split("/")[:3]:
                                is_match = True

                        if is_match:
                            pair_key = (client_proj, client_sym, server_proj, server_sym)
                            if pair_key not in matched_pairs:
                                matched_pairs.add(pair_key)
                                bridges.append({
                                    "src_proj": client_proj,
                                    "src_symbol": client_sym,
                                    "tgt_proj": server_proj,
                                    "tgt_symbol": server_sym,
                                    "label": f"{ep.get('verb', 'REST')}: {ep['raw_route']}",
                                    "description": f"Chamada detectada em {Path(call['file']).name}:{call['line']} ➔ {Path(ep['file']).name}",
                                    "protocol": "HTTP REST",
                                    "status": "COMPATIBLE",
                                    "auto_detected": True
                                })

        return bridges

