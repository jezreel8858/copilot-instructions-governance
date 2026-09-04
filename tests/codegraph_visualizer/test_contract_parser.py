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

