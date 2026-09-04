/**
 * sessions-view.js — Gerenciamento da Aba Sessions e Diário de Decisões Técnicas
 */

var activeSessionsSubTab = "sessions"; // "sessions" | "decisions"

function setSessionsSubTab(tab) {
  activeSessionsSubTab = tab;

  var btnSessions = document.getElementById("subtabBtnSessions");
  var btnDecisions = document.getElementById("subtabBtnDecisions");
  var secSessions = document.getElementById("sessionsSubTabContent");
  var secDecisions = document.getElementById("decisionsSubTabContent");

  if (tab === "sessions") {
    if (btnSessions) btnSessions.classList.add("active");
    if (btnDecisions) btnDecisions.classList.remove("active");
    if (secSessions) secSessions.style.display = "block";
    if (secDecisions) secDecisions.style.display = "none";
  } else {
    if (btnSessions) btnSessions.classList.remove("active");
    if (btnDecisions) btnDecisions.classList.add("active");
    if (secSessions) secSessions.style.display = "none";
    if (secDecisions) secDecisions.style.display = "block";
    renderDecisionsStream();
  }
}

function renderDecisionsStream() {
  var container = document.getElementById("decisionsListContainer");
  var countEl = document.getElementById("decisionsTotalCount");
  if (!container) return;

  var decisions = AppState.getDecisions();
  if (countEl) countEl.innerText = decisions.length;

  if (decisions.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--md-sys-color-on-surface-variant);padding:32px;">Nenhuma decisão técnica registrada nos eventos das sessões.</p>';
    return;
  }

  var html = "";
  decisions.forEach(function(d, i) {
    html += '<div class="decision-card">' +
              '<div class="decision-header">' +
                '<span style="font-weight:600;color:var(--md-sys-color-cyan);">' + (d.projectName || "Workspace") + ' &bull; Sessão: ' + (d.sessionId || "").slice(0, 10) + '...</span>' +
                '<span>' + (d.createdAt || "") + '</span>' +
              '</div>' +
              '<div class="decision-text">' + escapeHtml(d.text) + '</div>' +
            '</div>';
  });

  container.innerHTML = html;
}

function exportDecisionsMarkdown() {
  var decisions = AppState.getDecisions();
  if (decisions.length === 0) {
    alert("Nenhuma decisão disponível para exportação.");
    return;
  }

  var md = "# Diário de Decisões Técnicas — Context Mode\n\n";
  md += "> Exportado via Context Insight Visualizer em " + new Date().toISOString() + "\n\n---\n\n";

  decisions.forEach(function(d, i) {
    md += "### Decisão #" + (i + 1) + " — " + (d.projectName || "Workspace") + "\n";
    md += "- **Data**: " + d.createdAt + "\n";
    md += "- **Sessão**: `" + d.sessionId + "`\n\n";
    md += d.text + "\n\n---\n\n";
  });

  var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "decisoes-tecnicas-context-mode.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openSessionEventsModal(sessionId) {
  var modal = document.getElementById("sessionEventsModal");
  var titleEl = document.getElementById("sessionModalTitle");
  var bodyEl = document.getElementById("sessionModalBody");
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.innerText = "Timeline da Sessão: " + sessionId;

  var detailedEvents = AppState.getDetailedEvents();
  var sessionEvents = detailedEvents.filter(function(e) { return e.sessionId === sessionId; });

  if (sessionEvents.length === 0) {
    bodyEl.innerHTML = '<p style="color:var(--md-sys-color-on-surface-variant);text-align:center;padding:24px;">Nenhum evento detalhado em memória para esta sessão específica (exibição limitada ao histórico recente).</p>';
  } else {
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    sessionEvents.forEach(function(e) {
      var isError = e.type === "error" || e.type === "error_tool";
      var color = isError ? "var(--md-sys-color-critical-text)" : "var(--md-sys-color-primary)";

      html += '<div style="background:var(--md-sys-color-surface-container-high);border:1px solid var(--md-sys-color-outline-variant);border-radius:var(--radius-sm);padding:10px 14px;font-size:12px;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                  '<span style="font-weight:600;color:' + color + ';">' + e.type + ' (Prioridade ' + e.priority + ')</span>' +
                  '<span style="color:var(--md-sys-color-on-surface-variant);">' + (e.createdAt || "") + '</span>' +
                '</div>' +
                '<div style="font-family:var(--font-family-mono);color:#f1f5f9;font-size:11px;white-space:pre-wrap;">' +
                  escapeHtml(e.data) +
                '</div>' +
              '</div>';
    });
    html += '</div>';
    bodyEl.innerHTML = html;
  }

  modal.classList.add("open");
}

function closeSessionEventsModal() {
  var modal = document.getElementById("sessionEventsModal");
  if (modal) modal.classList.remove("open");
}

