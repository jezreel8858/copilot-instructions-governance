"""
Testes Unitários para DiffChecker e Boundaries CI Gate (Codegraph Visualizer)
"""

import json
import tempfile
from pathlib import Path
from diff_checker import DiffChecker


def test_boundary_violations_detection():
    with tempfile.TemporaryDirectory() as temp_dir:
        ws_root = Path(temp_dir)
        codegraphrc_path = ws_root / ".codegraphrc.json"

        # Define regra onde 'ui' só pode chamar 'services' (proibido chamar 'db' diretamente)
        config = {
            "manifesto": {
                "boundaries": {
                    "modules": {
                        "ui": "src/ui/**",
                        "services": "src/services/**",
                        "db": "src/db/**"
                    },
                    "rules": [
                        {"from": "ui", "onlyTo": ["services"]},
                        {"from": "services", "onlyTo": ["db"]}
                    ]
                }
            }
        }
        with open(codegraphrc_path, "w", encoding="utf-8") as f:
            json.dump(config, f)

        sample_nodes = [
            {"id": "n_ui", "label": "UserComponent", "file": "src/ui/user.component.ts"},
            {"id": "n_srv", "label": "UserService", "file": "src/services/user.service.ts"},
            {"id": "n_db", "label": "UserRepository", "file": "src/db/user.repository.ts"}
        ]

        # Aresta válida: ui -> services
        # Aresta violadora: ui -> db
        sample_edges = [
            {"id": "e_valid", "from": "n_ui", "to": "n_srv", "kind": "calls"},
            {"id": "e_invalid", "from": "n_ui", "to": "n_db", "kind": "calls"}
        ]

        violations = DiffChecker.check_boundary_violations(sample_nodes, sample_edges, ws_root)
        assert len(violations) == 1
        assert violations[0]["from_module"] == "ui"
        assert violations[0]["to_module"] == "db"
        assert violations[0]["type"] == "onlyTo_violation"

