#!/usr/bin/env python3
"""
Módulo de Análise de Diff Git Triplo e CI Gate de Fronteiras Arquiteturais
========================================================================
- Analisa mudanças do Git classificando símbolos em:
  * Adicionados (Verde: #10B981)
  * Modificados (Âmbar: #F59E0B)
  * Removidos/Quebrados (Vermelho: #EF4444)
- Valida conformidade de fronteiras arquiteturais (manifesto.boundaries) de .codegraphrc.json
- Executa em modo CI Gate retornando exit code 1 em caso de violação de regra.
"""

import os
import json
import fnmatch
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple, Optional


class DiffChecker:
    """Analisador de Diff Git e validador de fronteiras arquiteturais para CI/CD."""

    @staticmethod
    def get_detailed_git_diff(git_ref: str = "HEAD", repo_path: Optional[Path] = None) -> Dict[str, Set[str]]:
        """Extrai lista detalhada de arquivos adicionados, modificados e removidos do Git."""
        diff_summary = {
            "added": set(),
            "modified": set(),
            "deleted": set()
        }
        cwd = str(repo_path) if repo_path and repo_path.exists() else None

        try:
            # git diff --name-status <git_ref>
            out = subprocess.check_output(
                ["git", "diff", "--name-status", git_ref],
                text=True,
                cwd=cwd,
                stderr=subprocess.DEVNULL
            )
            for line in out.splitlines():
                parts = line.strip().split("\t")
                if len(parts) >= 2:
                    status_code = parts[0][0]
                    file_path = parts[-1].replace("\\", "/")
                    if status_code == "A":
                        diff_summary["added"].add(file_path)
                    elif status_code == "M":
                        diff_summary["modified"].add(file_path)
                    elif status_code == "D":
                        diff_summary["deleted"].add(file_path)
                    else:
                        diff_summary["modified"].add(file_path)
        except Exception:
            pass

        return diff_summary

    @staticmethod
    def check_boundary_violations(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        workspace_root: Path
    ) -> List[Dict[str, Any]]:
        """Verifica se existem arestas que violam regras de manifesto.boundaries em .codegraphrc.json."""
        violations = []
        codegraphrc_path = workspace_root / ".codegraphrc.json"

        if not codegraphrc_path.exists():
            return violations

        try:
            with open(codegraphrc_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception as e:
            print(f"[WARN] Erro ao carregar .codegraphrc.json: {e}")
            return violations

        boundaries = config.get("manifesto", {}).get("boundaries", {})
        modules_def = boundaries.get("modules", {})
        rules = boundaries.get("rules", [])

        if not modules_def or not rules:
            return violations

        # Mapeia cada nó ao seu módulo conforme o padrão de arquivo
        node_module_map = {}
        for n in nodes:
            file_path = n.get("file", "").replace("\\", "/")
            matched_mod = None
            for mod_name, glob_pattern in modules_def.items():
                if fnmatch.fnmatch(file_path, glob_pattern) or glob_pattern in file_path:
                    matched_mod = mod_name
                    break
            node_module_map[n["id"]] = matched_mod or "unassigned"

        # Indexa regras por módulo de origem para avaliação direta
        rules_by_from = {}
        for rule in rules:
            rf = rule.get("from")
            if rf:
                rules_by_from.setdefault(rf, []).append(rule)

        wildcard_rules = rules_by_from.get("*", [])

        # Avalia cada regra contra as arestas existentes
        for e in edges:
            src_id = e["from"]
            tgt_id = e["to"]
            src_mod = node_module_map.get(src_id)
            tgt_mod = node_module_map.get(tgt_id)

            if not src_mod or not tgt_mod or src_mod == tgt_mod or src_mod == "unassigned":
                continue

            applicable_rules = rules_by_from.get(src_mod, []) + wildcard_rules
            for rule in applicable_rules:

                # Regra onlyTo (apenas para os módulos listados)
                if "onlyTo" in rule:
                    allowed = rule["onlyTo"]
                    if tgt_mod not in allowed:
                        violations.append({
                            "type": "onlyTo_violation",
                            "from_module": src_mod,
                            "to_module": tgt_mod,
                            "edge_id": e.get("id"),
                            "source_node": src_id,
                            "target_node": tgt_id,
                            "edge_label": e.get("label", e.get("kind", "calls")),
                            "rule": f"Módulo '{src_mod}' só pode chamar: {allowed}, mas chamou '{tgt_mod}'"
                        })

                # Regra notTo (proibido chamar os módulos listados)
                if "notTo" in rule:
                    forbidden = rule["notTo"]
                    if tgt_mod in forbidden or "*" in forbidden:
                        violations.append({
                            "type": "notTo_violation",
                            "from_module": src_mod,
                            "to_module": tgt_mod,
                            "edge_id": e.get("id"),
                            "source_node": src_id,
                            "target_node": tgt_id,
                            "edge_label": e.get("label", e.get("kind", "calls")),
                            "rule": f"Módulo '{src_mod}' NÃO pode chamar: {forbidden}, mas chamou '{tgt_mod}'"
                        })

        return violations

