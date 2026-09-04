#!/usr/bin/env python3
"""
extractor.py — Extrator de Telemetria Local do Context Mode
===========================================================
Lê bases de dados SQLite e snapshots JSON locais gerados pelo context-mode:
  - ~/.claude/context-mode/sessions/*.db (e fallback JetBrains)
  - ~/.claude/context-mode/sessions/stats-pid-*.json
  - ~/.claude/context-mode/content/*.db

Aplica regras de introspecção defensiva (PRAGMA table_info),
agregação resiliente e higienização/anonimização de caminhos locais (R-044).
"""

import glob
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def sanitize_project_name(project_dir: str) -> str:
    """Higieniza o caminho do projeto para exibição sem expor nomes de usuário (R-044)."""
    if not project_dir or project_dir in (".", "__unknown__", "unknown"):
        return "Workspace Raiz"
    p = project_dir.replace("\\", "/").rstrip("/")
    # Se terminar em bin ou similar de IDE
    if "JetBrains" in p and p.endswith("/bin"):
        return "JetBrains IDE Session"
    parts = p.split("/")
    return parts[-1] if parts else "Workspace"


def resolve_default_directories(
    custom_sessions_dir: Optional[str] = None,
    custom_content_dir: Optional[str] = None
) -> Tuple[Optional[Path], Optional[Path]]:
    """Localiza as pastas de dados do Context Mode respeitando precedência e fallbacks."""
    home = Path.home()
    
    # 1. Sessions dir
    sessions_path: Optional[Path] = None
    if custom_sessions_dir:
        sp = Path(custom_sessions_dir).expanduser()
        if sp.exists():
            sessions_path = sp
    if not sessions_path:
        default_claude_sessions = home / ".claude" / "context-mode" / "sessions"
        if default_claude_sessions.exists():
            sessions_path = default_claude_sessions
        else:
            # Fallback JetBrains no Windows / Linux / macOS
            jb_patterns = [
                home / ".config" / "JetBrains" / "context-mode" / "sessions",
                home / "AppData" / "Roaming" / "JetBrains" / "context-mode" / "sessions",
            ]
            for candidate in jb_patterns:
                if candidate.exists():
                    sessions_path = candidate
                    break

    # 2. Content dir
    content_path: Optional[Path] = None
    if custom_content_dir:
        cp = Path(custom_content_dir).expanduser()
        if cp.exists():
            content_path = cp
    if not content_path:
        default_claude_content = home / ".claude" / "context-mode" / "content"
        if default_claude_content.exists():
            content_path = default_claude_content
        else:
            jb_content = [
                home / ".config" / "JetBrains" / "context-mode" / "content",
                home / "AppData" / "Roaming" / "JetBrains" / "context-mode" / "content",
            ]
            for candidate in jb_content:
                if candidate.exists():
                    content_path = candidate
                    break

    return sessions_path, content_path


class ContextDataExtractor:
    """Extrator unificado de telemetria e armazenamento local do Context Mode."""

    def __init__(
        self,
        sessions_dir: Optional[str] = None,
        content_dir: Optional[str] = None
    ):
        self.sessions_dir, self.content_dir = resolve_default_directories(sessions_dir, content_dir)
        self.warnings: List[str] = []
        self.source_paths: List[str] = []

    def extract_all(self) -> Dict[str, Any]:
        """Executa a extração completa de sessions, eventos, json e content DBs."""
        now_iso = datetime.now(timezone.utc).isoformat()
        
        session_dbs_data = self._read_session_databases()
        stats_pid_data = self._read_stats_pid_files()
        content_dbs_data = self._read_content_databases()

        if self.sessions_dir:
            self.source_paths.append(str(self.sessions_dir))
        else:
            self.warnings.append("Diretório de sessões do Context Mode não localizado na máquina.")

        if self.content_dir:
            self.source_paths.append(str(self.content_dir))
        else:
            self.warnings.append("Diretório de conteúdo do Context Mode não localizado na máquina.")

        return {
            "meta": {
                "generatedAt": now_iso,
                "sourcePaths": self.source_paths,
                "warnings": self.warnings,
                "statsPidCount": stats_pid_data.get("filesCount", 0),
                "sessionDbsCount": session_dbs_data.get("dbsCount", 0),
                "contentDbsCount": content_dbs_data.get("dbsCount", 0),
            },
            "sessions": session_dbs_data.get("sessions", []),
            "eventsSummary": session_dbs_data.get("eventsSummary", {}),
            "statsPid": stats_pid_data,
            "content": content_dbs_data,
        }

    def _read_session_databases(self) -> Dict[str, Any]:
        """Lê todos os arquivos *.db dentro do diretório de sessões."""
        if not self.sessions_dir or not self.sessions_dir.exists():
            return {"dbsCount": 0, "sessions": [], "eventsSummary": {}}

        db_files = list(self.sessions_dir.glob("*.db"))
        all_sessions: List[Dict[str, Any]] = []

        total_events_count = 0
        total_errors_count = 0
        total_prompts_count = 0
        total_reads_count = 0
        total_writes_count = 0
        hourly_counts: Dict[int, int] = {h: 0 for h in range(24)}
        date_sessions_map: Dict[str, Dict[str, int]] = {}
        tool_counts: Dict[str, int] = {}
        mcp_tool_counts: Dict[str, Dict[str, int]] = {}
        project_agg: Dict[str, Dict[str, Any]] = {}
        subagent_events: List[Dict[str, Any]] = []
        decisions_list: List[Dict[str, Any]] = []
        detailed_events: List[Dict[str, Any]] = []
        session_proj_map: Dict[str, str] = {}

        for db_file in db_files:
            try:
                conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
                cur = conn.cursor()

                # 1. Verifica tabelas existentes
                tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

                # 2. Leitura de session_meta
                if "session_meta" in tables:
                    cols = [c[1] for c in cur.execute("PRAGMA table_info(session_meta)").fetchall()]
                    select_cols = ["session_id", "project_dir", "started_at", "last_event_at", "event_count", "compact_count"]
                    avail_cols = [c for c in select_cols if c in cols]
                    
                    query = f"SELECT {', '.join(avail_cols)} FROM session_meta ORDER BY started_at DESC"
                    rows = cur.execute(query).fetchall()

                    for r in rows:
                        row_dict = dict(zip(avail_cols, r))
                        s_id = row_dict.get("session_id", "unknown")
                        p_dir = row_dict.get("project_dir") or "__unknown__"
                        session_proj_map[s_id] = p_dir
                        started = row_dict.get("started_at")
                        last_ev = row_dict.get("last_event_at")
                        ev_cnt = row_dict.get("event_count") or 0
                        cp_cnt = row_dict.get("compact_count") or 0

                        # Duração em minutos
                        duration_min = 0.0
                        if started and last_ev:
                            try:
                                dt1 = datetime.fromisoformat(started)
                                dt2 = datetime.fromisoformat(last_ev)
                                duration_min = max(round((dt2 - dt1).total_seconds() / 60.0, 1), 0.0)
                            except Exception:
                                duration_min = 0.0

                        proj_name = sanitize_project_name(p_dir)

                        session_entry = {
                            "sessionId": s_id,
                            "projectDir": p_dir,
                            "projectName": proj_name,
                            "startedAt": started,
                            "lastEventAt": last_ev,
                            "durationMin": duration_min,
                            "eventCount": ev_cnt,
                            "compactCount": cp_cnt,
                        }
                        all_sessions.append(session_entry)

                        # Agrega por data
                        if started:
                            dt_key = started.split("T")[0] if "T" in started else started.split(" ")[0]
                            if dt_key not in date_sessions_map:
                                date_sessions_map[dt_key] = {"date": dt_key, "count": 0, "events": 0, "compacts": 0}
                            date_sessions_map[dt_key]["count"] += 1
                            date_sessions_map[dt_key]["events"] += ev_cnt
                            date_sessions_map[dt_key]["compacts"] += cp_cnt

                        # Agrega por projeto
                        if p_dir not in project_agg:
                            project_agg[p_dir] = {
                                "projectDir": p_dir,
                                "projectName": proj_name,
                                "sessions": 0,
                                "events": 0,
                                "compacts": 0,
                            }
                        project_agg[p_dir]["sessions"] += 1
                        project_agg[p_dir]["events"] += ev_cnt
                        project_agg[p_dir]["compacts"] += cp_cnt

                # 3. Leitura de session_events
                if "session_events" in tables:
                    event_cols = [c[1] for c in cur.execute("PRAGMA table_info(session_events)").fetchall()]
                    q_events = "SELECT id, type, category, priority, data, created_at, session_id FROM session_events ORDER BY id DESC"
                    for ev_id, ev_type, ev_cat, ev_prio, ev_data, ev_created, ev_sid in cur.execute(q_events).fetchall():
                        total_events_count += 1

                        # Decisões de arquitetura/técnicas
                        if ev_type == "decision":
                            decisions_list.append({
                                "id": ev_id,
                                "sessionId": ev_sid,
                                "text": str(ev_data or "").strip(),
                                "createdAt": ev_created or "",
                                "projectName": sanitize_project_name(session_proj_map.get(ev_sid, ""))
                            })

                        # Eventos detalhados recentes (para timeline e busca)
                        if len(detailed_events) < 500:
                            detailed_events.append({
                                "id": ev_id,
                                "sessionId": ev_sid,
                                "type": ev_type or "unknown",
                                "priority": ev_prio or 1,
                                "data": str(ev_data or "")[:200],
                                "createdAt": ev_created or ""
                            })

                        # Contagem horária (00..23)
                        if ev_created:
                            try:
                                h_int = int(ev_created[11:13]) if len(ev_created) >= 13 else None
                                if h_int is not None and 0 <= h_int <= 23:
                                    hourly_counts[h_int] = hourly_counts.get(h_int, 0) + 1
                            except Exception:
                                pass

                        # Categorização de ferramenta / tipo
                        if ev_type in ("file_read", "read_file"):
                            total_reads_count += 1
                            tool_counts["Read"] = tool_counts.get("Read", 0) + 1
                        elif ev_type in ("file_write", "write_file", "file_edit", "edit_file"):
                            total_writes_count += 1
                            tool_counts["Write"] = tool_counts.get("Write", 0) + 1
                        elif ev_type in ("file_search", "grep_search"):
                            tool_counts["Search"] = tool_counts.get("Search", 0) + 1
                        elif ev_type in ("file_glob", "find_files"):
                            tool_counts["Glob"] = tool_counts.get("Glob", 0) + 1
                        elif ev_type in ("error_tool", "error"):
                            total_errors_count += 1
                            tool_counts["Error"] = tool_counts.get("Error", 0) + 1
                        elif ev_type == "user_prompt":
                            total_prompts_count += 1
                        elif ev_type == "subagent":
                            tool_counts["Subagent"] = tool_counts.get("Subagent", 0) + 1
                            subagent_events.append({"task": ev_data, "createdAt": ev_created, "sessionId": ev_sid})
                        elif ev_type in ("mcp", "mcp_tool_call", "sandbox-execute"):
                            tool_counts["context-mode"] = tool_counts.get("context-mode", 0) + 1
                            # Identifica o método específico do context-mode
                            d_str = str(ev_data or "")
                            mcp_name = "other"
                            for prefix in ["batch_execute", "execute_file", "execute", "search", "index", "fetch_and_index", "fetch", "stats", "doctor", "purge"]:
                                if prefix in d_str:
                                    mcp_name = f"ctx_{prefix}" if not prefix.startswith("ctx_") else prefix
                                    break
                            if mcp_name not in mcp_tool_counts:
                                mcp_tool_counts[mcp_name] = {"tool": mcp_name, "count": 0, "bytes": 0}
                            mcp_tool_counts[mcp_name]["count"] += 1
                        else:
                            norm_type = ev_type or "other"
                            tool_counts[norm_type] = tool_counts.get(norm_type, 0) + 1

                # 4. Leitura da tabela tool_calls (se existir)
                if "tool_calls" in tables:
                    tc_cols = [c[1] for c in cur.execute("PRAGMA table_info(tool_calls)").fetchall()]
                    if "tool" in tc_cols and "calls" in tc_cols:
                        b_col = "bytes_returned" if "bytes_returned" in tc_cols else "0"
                        for t_name, c_cnt, b_cnt in cur.execute(f"SELECT tool, SUM(calls), SUM({b_col}) FROM tool_calls GROUP BY tool").fetchall():
                            if t_name not in mcp_tool_counts:
                                mcp_tool_counts[t_name] = {"tool": t_name, "count": 0, "bytes": 0}
                            mcp_tool_counts[t_name]["count"] += (c_cnt or 0)
                            mcp_tool_counts[t_name]["bytes"] += (b_cnt or 0)

                conn.close()

            except Exception as ex:
                self.warnings.append(f"Erro ao processar banco SQLite {db_file.name}: {str(ex)}")

        # Ordenação das sessões por data desc
        all_sessions.sort(key=lambda s: s.get("startedAt") or "", reverse=True)

        # Ordenação da atividade diária por data asc
        sessions_by_date = sorted(list(date_sessions_map.values()), key=lambda d: d["date"])

        # Tool usage formatado
        tool_usage_list = [{"tool": k, "count": v} for k, v in sorted(tool_counts.items(), key=lambda x: x[1], reverse=True)]

        # MCP tools formatado
        mcp_tools_list = list(mcp_tool_counts.values())
        mcp_tools_list.sort(key=lambda x: x["count"], reverse=True)

        # Projects formatado
        projects_list = list(project_agg.values())
        projects_list.sort(key=lambda p: p["events"], reverse=True)

        # Subagent burst analysis
        subagent_analysis = self._analyze_subagent_bursts(subagent_events)

        return {
            "dbsCount": len(db_files),
            "sessions": all_sessions,
            "eventsSummary": {
                "totalEvents": total_events_count,
                "totalErrors": total_errors_count,
                "totalPrompts": total_prompts_count,
                "totalReads": total_reads_count,
                "totalWrites": total_writes_count,
                "hourlyPattern": [{"hour": h, "count": hourly_counts[h]} for h in range(24)],
                "sessionsByDate": sessions_by_date,
                "toolUsage": tool_usage_list,
                "mcpTools": mcp_tools_list,
                "projects": projects_list,
                "subagents": subagent_analysis,
                "decisions": decisions_list,
                "detailedEvents": detailed_events,
            }
        }

    def _analyze_subagent_bursts(self, subagents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calcula métricas de paralelismo e tempo economizado por subagentes."""
        if not subagents:
            return {
                "total": 0,
                "bursts": 0,
                "maxConcurrent": 0,
                "parallelCount": 0,
                "sequentialCount": 0,
                "timeSavedMin": 0,
            }

        valid_events = []
        for s in subagents:
            created = s.get("createdAt")
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace(" ", "T"))
                    valid_events.append((dt, s))
                except Exception:
                    pass

        valid_events.sort(key=lambda x: x[0])

        bursts: List[List[Any]] = []
        current_burst: List[Any] = []

        for dt, item in valid_events:
            if not current_burst:
                current_burst.append((dt, item))
                continue
            last_dt = current_burst[-1][0]
            gap_seconds = (dt - last_dt).total_seconds()
            if gap_seconds <= 30:
                current_burst.append((dt, item))
            else:
                bursts.append(current_burst)
                current_burst = [(dt, item)]

        if current_burst:
            bursts.append(current_burst)

        parallel_bursts = [b for b in bursts if len(b) >= 2]
        parallel_count = sum(len(b) for b in parallel_bursts)
        max_concurrent = max((len(b) for b in bursts), default=0)
        time_saved_min = sum((len(b) - 1) * 2 for b in parallel_bursts)

        return {
            "total": len(subagents),
            "bursts": len(parallel_bursts),
            "maxConcurrent": max_concurrent,
            "parallelCount": parallel_count,
            "sequentialCount": len(subagents) - parallel_count,
            "timeSavedMin": time_saved_min,
        }

    def _read_stats_pid_files(self) -> Dict[str, Any]:
        """Lê e agrega os arquivos stats-pid-*.json do context-mode."""
        if not self.sessions_dir or not self.sessions_dir.exists():
            return {"filesCount": 0, "totalCalls": 0, "tokensSaved": 0, "dollarsSaved": 0.0, "byTool": {}}

        json_files = list(self.sessions_dir.glob("stats-pid-*.json"))
        total_calls = 0
        total_bytes_returned = 0
        tokens_saved_lifetime = 0
        dollars_saved_lifetime = 0.0
        by_tool_aggregated: Dict[str, Dict[str, int]] = {}

        for jf in json_files:
            try:
                with open(jf, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                total_calls += data.get("total_calls", 0)
                total_bytes_returned += data.get("bytes_returned", 0)
                
                # O maior lifetime entre todos os arquivos representa o acumulado real
                ts_lt = data.get("tokens_saved_lifetime", 0)
                ds_lt = data.get("dollars_saved_lifetime", 0.0)
                if ts_lt > tokens_saved_lifetime:
                    tokens_saved_lifetime = ts_lt
                if ds_lt > dollars_saved_lifetime:
                    dollars_saved_lifetime = ds_lt

                for tool, stats in data.get("by_tool", {}).items():
                    if tool not in by_tool_aggregated:
                        by_tool_aggregated[tool] = {"calls": 0, "bytes": 0}
                    by_tool_aggregated[tool]["calls"] += stats.get("calls", 0)
                    by_tool_aggregated[tool]["bytes"] += stats.get("bytes", 0)

            except Exception as ex:
                self.warnings.append(f"Aviso ao ler {jf.name}: {str(ex)}")

        return {
            "filesCount": len(json_files),
            "totalCalls": total_calls,
            "bytesReturned": total_bytes_returned,
            "tokensSavedLifetime": tokens_saved_lifetime,
            "dollarsSavedLifetime": round(dollars_saved_lifetime, 2),
            "byTool": by_tool_aggregated,
        }

    def _read_content_databases(self) -> Dict[str, Any]:
        """Lê metadados agregados das bases content/*.db (chunks indexados, tamanho, fontes)."""
        if not self.content_dir or not self.content_dir.exists():
            return {"dbsCount": 0, "totalSources": 0, "totalChunks": 0, "totalSizeBytes": 0, "sources": [], "chunksBySource": {}}

        db_files = list(self.content_dir.glob("*.db"))
        total_sources = 0
        total_chunks = 0
        total_size_bytes = 0
        sources_list: List[Dict[str, Any]] = []
        chunks_by_source: Dict[int, List[Dict[str, Any]]] = {}

        for db_file in db_files:
            try:
                total_size_bytes += db_file.stat().st_size
                conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
                cur = conn.cursor()
                tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

                if "sources" in tables:
                    cnt = cur.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
                    total_sources += cnt
                    s_rows = cur.execute("SELECT id, label, chunk_count, code_chunk_count, indexed_at, file_path FROM sources ORDER BY indexed_at DESC LIMIT 250").fetchall()
                    for sid, slabel, c_cnt, cc_cnt, idx_at, fpath in s_rows:
                        sanitized_path = (fpath or "").replace("\\", "/")
                        if "/" in sanitized_path:
                            sanitized_path = ".../" + "/".join(sanitized_path.split("/")[-3:])
                        sources_list.append({
                            "id": sid,
                            "dbHash": db_file.stem,
                            "label": slabel or "Untitled",
                            "chunkCount": c_cnt or 0,
                            "codeChunkCount": cc_cnt or 0,
                            "indexedAt": idx_at or "",
                            "filePath": sanitized_path or slabel or "Sem caminho",
                        })

                if "chunks" in tables:
                    cnt = cur.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
                    total_chunks += cnt
                    chunk_rows = cur.execute("SELECT source_id, title, content_type, length(content), substr(content, 1, 280) FROM chunks LIMIT 800").fetchall()
                    for ch_sid, ch_title, ch_type, ch_len, ch_prev in chunk_rows:
                        s_key = int(ch_sid) if ch_sid is not None else 0
                        if s_key not in chunks_by_source:
                            chunks_by_source[s_key] = []
                        if len(chunks_by_source[s_key]) < 10:
                            chunks_by_source[s_key].append({
                                "title": ch_title or "(Sem título)",
                                "contentType": ch_type or "text",
                                "charLen": ch_len or 0,
                                "preview": (ch_prev or "").strip(),
                            })
                conn.close()
            except Exception as ex:
                self.warnings.append(f"Aviso ao ler content DB {db_file.name}: {str(ex)}")

        return {
            "dbsCount": len(db_files),
            "totalSources": total_sources,
            "totalChunks": total_chunks,
            "totalSizeBytes": total_size_bytes,
            "sources": sources_list,
            "chunksBySource": chunks_by_source,
        }


if __name__ == "__main__":
    extractor = ContextDataExtractor()
    result = extractor.extract_all()
    print(f"Extracao concluida:")
    print(f"  Sessions DBs: {result['meta']['sessionDbsCount']}")
    print(f"  Total Sessions: {len(result['sessions'])}")
    print(f"  Stats PID files: {result['meta']['statsPidCount']}")
    print(f"  Warnings: {len(result['meta']['warnings'])}")

