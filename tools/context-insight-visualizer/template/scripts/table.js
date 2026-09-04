/**
 * table.js — Tabela de Sessões com Paginação e Busca
 */

function renderSessionsTable() {
  var tbody = document.getElementById("sessionsTableBody");
  var pageInfo = document.getElementById("tablePageInfo");
  if (!tbody) return;

  var sessions = AppState.getSessions();
  var query = (AppState.searchQuery || "").toLowerCase().trim();
  var projectFilter = AppState.activeProject;

  var filtered = sessions.filter(function(s) {
    if (projectFilter !== "all" && s.projectDir !== projectFilter) {
      return false;
    }
    if (!query) return true;
    var sid = (s.sessionId || "").toLowerCase();
    var pdir = (s.projectDir || "").toLowerCase();
    var pname = (s.projectName || "").toLowerCase();
    return sid.includes(query) || pdir.includes(query) || pname.includes(query);
  });

  var total = filtered.length;
  var totalPages = Math.max(Math.ceil(total / AppState.pageSize), 1);

  if (AppState.tablePage > totalPages) AppState.tablePage = totalPages;
  if (AppState.tablePage < 1) AppState.tablePage = 1;

  var startIdx = (AppState.tablePage - 1) * AppState.pageSize;
  var pageItems = filtered.slice(startIdx, startIdx + AppState.pageSize);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--md-sys-color-on-surface-variant);">Nenhuma sessão encontrada</td></tr>';
    if (pageInfo) pageInfo.innerText = "Página 0 de 0";
    return;
  }

  var html = "";
  for (var i = 0; i < pageItems.length; i++) {
    var s = pageItems[i];
    var startedFormatted = s.startedAt ? s.startedAt.replace("T", " ").slice(0, 19) : "--";
    var compactBadge = s.compactCount > 0 ?
      '<span style="color:var(--md-sys-color-warning-text);font-weight:600;">' + s.compactCount + '</span>' :
      '<span style="color:var(--md-sys-color-on-surface-variant);">0</span>';

    html += '<tr>' +
              '<td><span class="session-id-pill" title="' + (s.sessionId || "") + '">' + (s.sessionId || "").slice(0, 12) + '...</span></td>' +
              '<td><strong>' + (s.projectName || "Workspace") + '</strong></td>' +
              '<td>' + startedFormatted + '</td>' +
              '<td>' + (s.durationMin || 0) + ' min</td>' +
              '<td>' + (s.eventCount || 0) + '</td>' +
              '<td>' + compactBadge + '</td>' +
            '</tr>';
  }

  tbody.innerHTML = html;
  if (pageInfo) {
    pageInfo.innerText = "Página " + AppState.tablePage + " de " + totalPages + " (" + total + " sessões)";
  }
}

function handleTableSearch(val) {
  AppState.searchQuery = val;
  AppState.tablePage = 1;
  renderSessionsTable();
}

function nextTablePage() {
  var sessions = AppState.getSessions();
  var totalPages = Math.ceil(sessions.length / AppState.pageSize);
  if (AppState.tablePage < totalPages) {
    AppState.tablePage++;
    renderSessionsTable();
  }
}

function prevTablePage() {
  if (AppState.tablePage > 1) {
    AppState.tablePage--;
    renderSessionsTable();
  }
}

