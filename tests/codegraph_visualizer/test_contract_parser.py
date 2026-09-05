"""
Testes Unitários para ContractParser e Correlator (Codegraph Visualizer)
"""

import json
import tempfile
from pathlib import Path
from contract_parser import (
    normalize_route_path,
    OpenApiParser,
    AsyncApiParser,
    ContractCorrelator
)


def test_normalize_route_path():
    assert normalize_route_path("/v1/usuarios/{id}") == "/v1/usuarios/*"
    assert normalize_route_path("/v1/usuarios/:id") == "/v1/usuarios/*"
    assert normalize_route_path("/v1/usuarios/${this.id}") == "/v1/usuarios/*"
    assert normalize_route_path("/api/v2/items/?filter=active") == "/api/v2/items"
    assert normalize_route_path("///v1///orcamentos///") == "/v1/orcamentos"


def test_openapi_parser():
    sample_openapi = {
        "openapi": "3.0.0",
        "info": {"title": "Test API", "version": "1.0"},
        "paths": {
            "/v1/clientes/{id}": {
                "get": {
                    "operationId": "getClienteById",
                    "summary": "Obtém cliente por ID",
                    "responses": {"200": {"description": "OK"}}
                },
                "post": {
                    "operationId": "criarCliente",
                    "summary": "Cria novo cliente",
                    "responses": {"201": {"description": "Created"}}
                }
            }
        }
    }

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump(sample_openapi, tf)
        tf_path = Path(tf.name)

    try:
        endpoints = OpenApiParser.parse_spec_file(tf_path)
        assert len(endpoints) == 2
        get_ep = next(e for e in endpoints if e["method"] == "GET")
        assert get_ep["operation_id"] == "getClienteById"
        assert get_ep["normalized_path"] == "/v1/clientes/*"
    finally:
        tf_path.unlink(missing_ok=True)


def test_contract_correlator_directory_exclusion_and_matching():
    with tempfile.TemporaryDirectory() as temp_dir:
        root_path = Path(temp_dir)
        proj_client = root_path / "client_app"
        proj_server = root_path / "server_app"

        # Cria estrutura de arquivos de código real
        (proj_client / "src").mkdir(parents=True)
        (proj_server / "src").mkdir(parents=True)

        # Cria pasta node_modules que deve ser ignorada
        (proj_client / "node_modules").mkdir(parents=True)
        with open(proj_client / "node_modules" / "vendor.ts", "w", encoding="utf-8") as f:
            f.write("http.get('/v1/vendor-internal');\n")

        # Código cliente em src/
        with open(proj_client / "src" / "user.service.ts", "w", encoding="utf-8") as f:
            f.write("export class UserService {\n  find() { return http.get('/v1/usuarios'); }\n}\n")

        # Código servidor em src/
        with open(proj_server / "src" / "UserController.java", "w", encoding="utf-8") as f:
            f.write("@RequestMapping(\"/v1/usuarios\")\npublic class UserController {\n  @GetMapping\n  public List get() {}\n}\n")

        calls = ContractCorrelator.extract_http_calls_from_source(proj_client)
        endpoints = ContractCorrelator.extract_server_endpoints_from_source(proj_server)

        # Deve encontrar a chamada de src/ e ignorar node_modules
        assert len(calls) == 1
        assert calls[0]["raw_route"] == "/v1/usuarios"
        assert len(endpoints) == 1
        assert endpoints[0]["raw_route"] == "/v1/usuarios"

        # Testa correlação paralela entre projetos
        projects_cfg = [
            {"name": "ClientApp", "path": str(proj_client)},
            {"name": "ServerApp", "path": str(proj_server)}
        ]
        bridges = ContractCorrelator.correlate_projects(projects_cfg, max_workers=2)
        assert len(bridges) == 1
        assert bridges[0]["src_proj"] == "ClientApp"
        assert bridges[0]["tgt_proj"] == "ServerApp"
        assert bridges[0]["auto_detected"] is True



def test_asyncapi_parser():
    sample_asyncapi = {
        "asyncapi": "2.6.0",
        "channels": {
            "vistorias.eventos": {
                "publish": {
                    "operationId": "publicarEventoVistoria",
                    "summary": "Evento de vistoria finalizada"
                },
                "subscribe": {
                    "operationId": "ouvirEventoVistoria",
                    "summary": "Listener de eventos"
                }
            }
        }
    }

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump(sample_asyncapi, tf)
        tf_path = Path(tf.name)

    try:
        channels = AsyncApiParser.parse_spec_file(tf_path)
        assert len(channels) == 2
        pub = next(c for c in channels if c["type"] == "asyncapi_publish")
        assert pub["channel"] == "vistorias.eventos"
        assert pub["operation_id"] == "publicarEventoVistoria"
    finally:
        tf_path.unlink(missing_ok=True)

