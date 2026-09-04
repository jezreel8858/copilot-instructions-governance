/**
 * insights.js — Renderização Dinâmica dos Cards Insights & Actions
 */

function renderInsightCards() {
  var container = document.getElementById("insightsContainer");
  if (!container) return;

  var insights = AppState.getInsights();
  var filter = AppState.activeSeverity;

  var filtered = insights.filter(function(card) {
    if (filter === "all") return true;
    return card.severity === filter;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--md-sys-color-on-surface-variant); font-size: 13px; background: var(--md-sys-color-surface-container); border-radius: var(--radius-md);">' +
      '<span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.5; margin-bottom: 8px; display: block;">lightbulb</span>' +
      'Nenhum insight para a severidade selecionada.' +
      '</div>';
    return;
  }

  var html = "";
  for (var i = 0; i < filtered.length; i++) {
    var c = filtered[i];
    var sevClass = c.severity || "neutral";

    html += '<div class="insight-card ' + sevClass + '">' +
              '<div class="insight-header">' +
                '<span class="insight-badge">' + (c.badge || "Insight") + '</span>' +
              '</div>' +
              '<div class="insight-headline-wrap">' +
                '<span class="material-symbols-outlined insight-headline-icon">' + (c.icon || "info") + '</span>' +
                '<h4 class="insight-headline">' + c.metric + '</h4>' +
              '</div>' +
              '<p class="insight-evidence">' + c.evidence + '</p>' +
              '<div class="insight-blocks">' +
                '<div class="action-block">' +
                  '<div class="action-block-label">O Que Fazer</div>' +
                  '<div class="action-block-text">' + c.action + '</div>' +
                '</div>' +
                '<div class="action-block">' +
                  '<div class="action-block-label">Por Que Importa</div>' +
                  '<div class="action-block-text">' + c.roi + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
  }

  container.innerHTML = html;
}

function setSeverityFilter(severity) {
  AppState.activeSeverity = severity;

  // Atualiza classes ativas dos chips
  var chips = document.querySelectorAll("#severityChips .mat-chip");
  chips.forEach(function(chip) {
    if (chip.getAttribute("data-sev") === severity) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  renderInsightCards();
}

