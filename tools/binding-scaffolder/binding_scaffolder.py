#!/usr/bin/env python3
"""
binding-scaffolder-agent: Gerador automático de artefatos de binding

Uso:
  python binding_scaffolder.py generate adapter novo_adapter.yaml
  python binding_scaffolder.py generate projeto novo_projeto.yaml
  python binding_scaffolder.py validate novo_adapter.yaml
"""

# Força encoding UTF-8 em I/O (crítico para Windows com acentos)
import sys
import os

# Reconfigure stdout para UTF-8 no Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import json
import yaml
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import hashlib
from datetime import datetime

try:
    from jinja2 import Environment, FileSystemLoader, Template
except ImportError:
    print("❌ Falta: pip install jinja2")
    sys.exit(1)


class ArtefatoType(Enum):
    ADAPTER = "adapter"
    PROJETO = "projeto"
    SKILL = "skill"


@dataclass
class Schema:
    """Validacao de entrada"""
    pass


@dataclass
class ManifestEntry:
    """Entrada no manifest de arquivos a criar"""
    path: str
    action: str  # CREATE, UPDATE, MERGE
    template: Optional[str] = None
    section: Optional[str] = None
    content: Optional[str] = None
    priority: int = 0


@dataclass
class Manifest:
    """Plano de execucao atomica"""
    artefato: str
    nome: str
    entries: List[ManifestEntry]
    timestamp: str = ""

    def __post_init__(self):
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return {
            "artefato": self.artefato,
            "nome": self.nome,
            "timestamp": self.timestamp,
            "entries": [
                {
                    "path": e.path,
                    "action": e.action,
                    "section": e.section,
                    "priority": e.priority
                }
                for e in self.entries
            ]
        }


class BindingScaffolder:
    """Orquestrador principal"""

    def __init__(self):
        self.base_path = Path(__file__).parent.parent.parent
        self.catalog_path = self.base_path / "docs/ai-context/catalog.yaml"
        self.templates_path = self.base_path / "tools/binding-scaffolder/templates"
        self.schemas_path = self.base_path / "tools/binding-scaffolder/schemas.json"

        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_path)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )

        self.schemas = self._load_schemas()
        self.backup = {}
        self.current_data = None

    def _load_schemas(self) -> Dict:
        """Carregar definicoes de schema"""
        with open(self.schemas_path, encoding='utf-8') as f:
            return json.load(f)

    def validate_input(self, data: Dict, artefato: str) -> bool:
        """Validar entrada contra schema"""
        schema_def = self.schemas["schemas"].get(artefato)
        if not schema_def:
            print(f"❌ Artefato '{artefato}' desconhecido")
            return False

        required = schema_def.get("required", [])
        for field in required:
            if field not in data:
                print(f"❌ Campo obrigatorio ausente: {field}")
                return False

        # Validacoes customizadas
        if "nome" in data:
            if not self._is_valid_name(data["nome"], artefato):
                print(f"❌ Nome invalido: {data['nome']}")
                return False

            # Check duplicado
            if self._exists_in_catalog(data["nome"], artefato):
                print(f"❌ Nome '{data['nome']}' ja existe em catalog.yaml")
                return False

        if artefato == "adapter" and "applyTo" in data:
            for pattern in data["applyTo"]:
                if not self._is_valid_glob_pattern(pattern):
                    print(f"❌ Pattern invalido: {pattern}")
                    return False

        return True

    def _is_valid_name(self, name: str, artefato: str) -> bool:
        """Validar formato de nome"""
        import re
        if artefato == "adapter":
            return re.match(r"^[a-z-]+$", name) and len(name) >= 3
        elif artefato == "projeto":
            return re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", name) and len(name) >= 3
        return True

    def _is_valid_glob_pattern(self, pattern: str) -> bool:
        """Validar glob pattern"""
        return pattern.startswith("**") and "." in pattern

    def _exists_in_catalog(self, nome: str, artefato: str) -> bool:
        """Verificar se nome ja existe em catalog.yaml"""
        try:
            with open(self.catalog_path, encoding='utf-8') as f:
                catalog = yaml.safe_load(f)

            key = "adapters" if artefato == "adapter" else "projetos"
            existing = catalog.get(key, [])
            return any(item.get("name") == nome for item in existing)
        except Exception as e:
            print(f"⚠️  Nao foi possivel verificar duplicadas: {e}")
            return False

    def plan_adapter(self, data: Dict) -> Manifest:
        """Gerar plano para novo adapter"""
        entries = [
            ManifestEntry(
                path=f".github/instructions/{data['nome']}.instructions.md",
                action="CREATE",
                template="adapter-instructions.hbs",
                priority=1
            ),
            ManifestEntry(
                path="docs/ai-context/catalog.yaml",
                action="UPDATE",
                section="adapters",
                priority=2
            ),
            ManifestEntry(
                path="docs/ai-context/binding.md",
                action="UPDATE",
                section="adapters_ref",
                priority=3
            ),
            ManifestEntry(
                path=".github/instructions/README.md",
                action="UPDATE",
                section="tabela_adapters",
                priority=4
            ),
            ManifestEntry(
                path="tools/binding-scaffolder/manifest.json",
                action="UPDATE",
                section="registros",
                priority=5
            ),
        ]
        return Manifest(artefato="adapter", nome=data["nome"], entries=entries)

    def plan_projeto(self, data: Dict) -> Manifest:
        """Gerar plano para novo projeto"""
        entries = [
            ManifestEntry(
                path="docs/ai-context/catalog.yaml",
                action="UPDATE",
                section="projetos",
                priority=1
            ),
            ManifestEntry(
                path="docs/ai-context/README.md",
                action="UPDATE",
                section=data["tipo"],
                priority=2
            ),
            ManifestEntry(
                path="docs/ai-context/binding.md",
                action="UPDATE",
                section="projetos_ref",
                priority=3
            ),
            ManifestEntry(
                path=".github/instructions/README.md",
                action="UPDATE",
                section="tabela_projetos",
                priority=4
            ),
        ]
        return Manifest(artefato="projeto", nome=data["nome"], entries=entries)

    def render_templates(self, manifest: Manifest, data: Dict) -> Manifest:
        """Renderizar templates com variáveis"""
        context = {
            **data,
            "data": datetime.now().strftime("%Y-%m-%d"),
            "id": data["nome"].replace("-", "_"),
            "applyToJson": json.dumps(data.get("applyTo", [])),
            "applyToList": ", ".join(data.get("applyTo", [])),
            "escopo_humanizado": data.get("descrição", ""),
            "titulo_humanizado": data["nome"].replace("-", " ").title(),
            "tipo_humanizado": data.get("tipo", "").title(),
            "tipo_capitalized": data.get("tipo", "").capitalize(),
        }

        for entry in manifest.entries:
            if entry.template:
                try:
                    template = self.jinja_env.get_template(entry.template)
                    entry.content = template.render(context)
                except Exception as e:
                    print(f"❌ Erro ao renderizar {entry.template}: {e}")
                    return None

        return manifest

    def preview_changes(self, manifest: Manifest, auto_approve: bool = False) -> bool:
        """Exibir preview de mudancas antes de executar"""
        print("\n" + "="*70)
        print(f"📋 PLANO: {len(manifest.entries)} arquivos serao modificados")
        print("="*70)

        for entry in sorted(manifest.entries, key=lambda x: x.priority):
            action_icon = "📝" if entry.action == "UPDATE" else "✨"
            print(f"{action_icon} [{entry.action}] {entry.path}")
            if entry.section:
                print(f"    └─ section: {entry.section}")

        print("\n" + "="*70)

        if auto_approve:
            print("✅ Modo não-interativo ativado (auto-approve)")
            return True

        resposta = input("✅ Proceder com essas mudancas? (y/n): ").strip().lower()
        return resposta == "y"

    def execute_manifest(self, manifest: Manifest) -> bool:
        """Executar manifest atomicamente"""
        print("\n🚀 Executando...")

        try:
            # Backup
            for entry in manifest.entries:
                if entry.action == "UPDATE" and (entry.path.startswith("docs") or entry.path.startswith(".github")):
                    try:
                        with open(self.base_path / entry.path, encoding='utf-8') as f:
                            self.backup[entry.path] = f.read()
                    except FileNotFoundError:
                        self.backup[entry.path] = None

            # Criacao/Atualizacao
            for entry in sorted(manifest.entries, key=lambda x: x.priority):
                file_path = self.base_path / entry.path

                if entry.action == "CREATE":
                    file_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(file_path, "w", encoding='utf-8') as f:
                        f.write(entry.content or "")
                    print(f"✅ Criado: {entry.path}")

                elif entry.action == "UPDATE":
                    if file_path.suffix in {".yaml", ".yml"} and entry.section:
                        if self._update_yaml_section(file_path, entry.section):
                            print(f"✅ Atualizado: {entry.path}")
                    elif entry.section and entry.content:
                        self._update_file_section(file_path, entry.section, entry.content)
                        print(f"✅ Atualizado: {entry.path}")

            print("\n✅ Sucesso! Todos os arquivos foram processados.")
            return True

        except Exception as e:
            print(f"\n❌ Erro na execucao: {e}")
            self._rollback()
            return False

    def _update_file_section(self, file_path: Path, section: str, content: str):
        """Atualizar secao especifica de arquivo"""
        # Implementacao simplificada - em producao, usar mergers mais sofisticados
        if not file_path.exists():
            with open(file_path, "w", encoding='utf-8') as f:
                f.write(content)
        else:
            with open(file_path, "a", encoding='utf-8') as f:
                f.write("\n" + content + "\n")

    def _update_yaml_section(self, file_path: Path, section: str) -> bool:
        """Atualiza seção YAML preservando comentários e estrutura existente."""
        if section != "projetos":
            return False

        if not self.current_data:
            raise ValueError("Dados de entrada não carregados para merge YAML")

        nome = self.current_data.get("nome", "")
        if not nome:
            raise ValueError("Campo 'nome' ausente para merge de projeto")

        with open(file_path, encoding='utf-8') as f:
            original = f.read()

        if f'id: "{nome}"' in original or f'name: "{nome}"' in original:
            print(f"ℹ️  Projeto '{nome}' já presente em {file_path.name} (sem alterações)")
            return True

        lines = original.splitlines()
        section_idx = next(
            (i for i, line in enumerate(lines) if line.strip().startswith("projetos:")),
            None,
        )
        if section_idx is None:
            raise ValueError("Seção 'projetos:' não encontrada no YAML")

        section_end = len(lines)
        for i in range(section_idx + 1, len(lines)):
            stripped = lines[i].strip()
            if not stripped or stripped.startswith("#"):
                continue
            if not lines[i].startswith(" "):
                section_end = i
                break

        section_lines = []
        for line in lines[section_idx + 1:section_end]:
            if line.strip() == "[]":
                continue
            section_lines.append(line)

        # Normaliza linha inline `projetos: []` para `projetos:` antes de anexar blocos.
        if lines[section_idx].strip() == "projetos: []":
            lines[section_idx] = "projetos:"

        extends = self.current_data.get("extends") or []
        block = [
            f'  - id: "{nome}"',
            f'    name: "{nome}"',
            f'    tipo: "{self.current_data.get("tipo", "")}"',
            f'    path_externo: "{self.current_data.get("path_externo", "")}"',
            "    extends:",
        ]
        block.extend([f'      - "{adapter}"' for adapter in extends])
        block.append(f'    descrição: "{self.current_data.get("descrição", "")}"')

        merged = lines[:section_idx + 1] + section_lines
        if merged and merged[-1].strip() != "":
            merged.append("")
        merged.extend(block)

        if section_end < len(lines):
            if merged and merged[-1].strip() != "":
                merged.append("")
            merged.extend(lines[section_end:])

        with open(file_path, "w", encoding='utf-8', newline='\n') as f:
            f.write("\n".join(merged) + "\n")

        return True

    def _rollback(self):
        """Reverter mudancas em caso de erro"""
        print("🔄 Rollback em andamento...")
        for path, conteudo_original in self.backup.items():
            try:
                file_path = self.base_path / path
                if conteudo_original is not None:
                    with open(file_path, "w", encoding='utf-8') as f:
                        f.write(conteudo_original)
                else:
                    file_path.unlink(missing_ok=True)
            except Exception as e:
                print(f"⚠️  Erro ao reverter {path}: {e}")

    def validate_output(self, manifest: Manifest) -> bool:
        """Validar arquivos gerados"""
        print("\n✓ Validando output...")

        for entry in manifest.entries:
            if entry.path.endswith(".yaml"):
                try:
                    with open(self.base_path / entry.path, encoding='utf-8') as f:
                        yaml.safe_load(f)
                    print(f"✅ {entry.path} — YAML válido")
                except Exception as e:
                    print(f"❌ {entry.path} — YAML inválido: {e}")
                    return False

        return True


def main():
    """CLI"""
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    auto_approve = "--yes" in sys.argv
    args = [arg for arg in sys.argv[2:] if arg != "--yes"]

    if command not in {"generate", "validate"}:
        print(f"❌ Comando inválido: {command}")
        print(__doc__)
        sys.exit(1)

    # Compatível com os dois formatos:
    # - generate <arquivo.yaml>
    # - generate <artefato> <arquivo.yaml>
    input_file = None
    artefato_cli = None
    if command == "generate":
        if len(args) == 1:
            input_file = args[0]
        elif len(args) == 2:
            artefato_cli = args[0]
            input_file = args[1]
        else:
            print(__doc__)
            sys.exit(1)
    else:  # validate
        if len(args) != 1:
            print(__doc__)
            sys.exit(1)
        input_file = args[0]

    scaffolder = BindingScaffolder()

    # Carregar input
    if not input_file or not Path(input_file).exists():
        print(f"❌ Arquivo nao encontrado: {input_file}")
        sys.exit(1)

    with open(input_file, encoding='utf-8') as f:
        data = yaml.safe_load(f)

    artefato = data.get("artefato")
    scaffolder.current_data = data

    if artefato_cli and artefato_cli != artefato:
        print(f"❌ Artefato no CLI ('{artefato_cli}') difere do YAML ('{artefato}')")
        sys.exit(1)

    # Validar
    if not scaffolder.validate_input(data, artefato):
        sys.exit(1)

    # Planejar
    if artefato == "adapter":
        manifest = scaffolder.plan_adapter(data)
    elif artefato == "projeto":
        manifest = scaffolder.plan_projeto(data)
    else:
        print(f"❌ Artefato desconhecido: {artefato}")
        sys.exit(1)

    # Renderizar
    manifest = scaffolder.render_templates(manifest, data)
    if not manifest:
        sys.exit(1)

    # Preview
    if not scaffolder.preview_changes(manifest, auto_approve=auto_approve):
        print("❌ Cancelado pelo usuario.")
        sys.exit(0)

    # Executar
    if scaffolder.execute_manifest(manifest):
        # Validar
        if scaffolder.validate_output(manifest):
            print("\n🎉 Artefato gerado com sucesso!")
        else:
            print("\n⚠️  Validacao pos-execucao falhou.")
            sys.exit(1)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

