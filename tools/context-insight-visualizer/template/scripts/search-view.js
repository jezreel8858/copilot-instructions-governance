/**
 * search-view.js — Motor de Busca Unificado na Memória Local do Context Mode
 */

function handleMemorySearch(query) {
  AppState.memorySearchQuery = (query || "").trim();
  renderSearchResults();
}

function setMemorySearchFilter(filterType) {
  AppState.memorySearchFilter = filterType;

  var chips = document.querySelectorAll("#searchFilterChips .mat-chip");
  chips.forEach(function(c) {
    if (c.getAttribute("data-filter") === filterType) {
      c.classList.add("active");
    } else {
      c.classList.remove("active");
    }
  });

  renderSearchResults();
}

function renderSearchResults() {
  var container = document.getElementById("searchResultsContainer");
  var countEl = document.getElementById("searchResultCount");
  if (!container) return;

  var q = (AppState.memorySearchQuery || "").toLowerCase();
  var filter = AppState.memorySearchFilter;

  if (!q) {
    container.innerHTML = '<div style="text-align:center;padding:48px 24px;color:var(--md-sys-color-on-surface-variant);">' +
      '<span class="material-symbols-outlined" style="font-size:48px;opacity:0.4;margin-bottom:12px;display:block;">manage_search</span>' +
      '<p style="font-size:14px;color:#f8fafc;font-weight:500;">Digite um termo para pesquisar em toda a memória</p>' +
      '<p style="font-size:12px;margin-top:4px;">Busca instantânea em fontes da Knowledge Base, chunks, decisões técnicas e sessões.</p>' +
      '</div>';
    if (countEl) countEl.innerText = "";
    return;
  }

  var results = [];

  // 1. Busca em Fontes da Knowledge Base
  if (filter === "all" || filter === "sources") {
    var sources = AppState.getSources();
    sources.forEach(function(s) {
      var l = (s.label || "").toLowerCase();
      var p = (s.filePath || "").toLowerCase();
      if (l.includes(q) || p.includes(q)) {
        results.push({
          type: "Fonte (KB)",
          badgeBg: "rgba(208, 188, 255, 0.15)",
          badgeColor: "var(--md-sys-color-primary)",
          title: s.label,
          subtitle: s.filePath,
          snippet: s.chunkCount + " chunks indexados em " + s.indexedAt,
          action: function() { openSourceDetailModal(s.id); }
        });
      }
    });
  }

  // 2. Busca em Decisões
  if (filter === "all" || filter === "decisions") {
    var decisions = AppState.getDecisions();
    decisions.forEach(function(d) {
      var t = (d.text || "").toLowerCase();
      var p = (d.projectName || "").toLowerCase();
      if (t.includes(q) || p.includes(q)) {
        results.push({
          type: "Decisão Técnica",
          badgeBg: "rgba(6, 182, 212, 0.15)",
          badgeColor: "var(--md-sys-color-cyan)",
          title: "Decisão em " + (d.projectName || "Workspace"),
          subtitle: "Registrado em " + d.createdAt,
          snippet: d.text,
          action: null
        });
      }
    });
  }

  // 3. Busca em Sessões
  if (filter === "all" || filter === "sessions") {
    var sessions = AppState.getSessions();
    sessions.forEach(function(s) {
      var sid = (s.sessionId || "").toLowerCase();
      var pname = (s.projectName || "").toLowerCase();
      if (sid.includes(q) || pname.includes(q)) {
        results.push({
          type: "Sessão",
          badgeBg: "rgba(16, 185, 129, 0.15)",
          badgeColor: "#10b981",
          title: "Sessão: " + s.sessionId,
          subtitle: "Projeto: " + s.projectName + " &bull; " + s.startedAt,
          snippet: s.eventCount + " eventos &bull; " + s.durationMin + " min de duração &bull; " + s.compactCount + " compactações",
          action: function() { openSessionEventsModal(s.sessionId); }
        });
      }
    });
  }

  if (countEl) countEl.innerText = results.length + " resultados encontrados";

  if (results.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--md-sys-color-on-surface-variant);">' +
      '<p>Nenhum resultado encontrado para "<strong>' + escapeHtml(q) + '</strong>".</p>' +
      '</div>';
    return;
  }

  var html = "";
  results.slice(0, 50).forEach(function(r) {
    var cursorStyle = r.action ? "cursor:pointer;" : "";
    html += '<div class="search-result-card" style="' + cursorStyle + '">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                '<span class="search-result-badge" style="background:' + r.badgeBg + ';color:' + r.badgeColor + ';">' + r.type + '</span>' +
                '<span style="font-size:11px;color:var(--md-sys-color-on-surface-variant);">' + (r.subtitle || "") + '</span>' +
              '</div>' +
              '<h4 class="search-result-title">' + highlightMatch(r.title, q) + '</h4>' +
              '<div class="search-result-snippet">' + highlightMatch(r.snippet, q) + '</div>' +
            '</div>';
  });

  container.innerHTML = html;
}

function highlightMatch(text, query) {
  if (!text || !query) return escapeHtml(text || "");
  var escaped = escapeHtml(text);
  var regex = new RegExp("(" + query.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + ")", "gi");
  return escaped.replace(regex, '<mark style="background:rgba(208,188,255,0.3);color:#f8fafc;padding:0 2px;border-radius:2px;">$1</mark>');
}

