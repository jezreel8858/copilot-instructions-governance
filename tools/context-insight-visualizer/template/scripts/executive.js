/**
 * executive.js — Renderização do Painel Executivo e Personas de Liderança
 */

function renderExecutiveView() {
  var container = document.getElementById("executivePersonasContainer");
  if (!container) return;

  var personas = AppState.getExecutivePersonas();
  if (!personas || personas.length === 0) {
    container.innerHTML = '<p style="color:var(--md-sys-color-on-surface-variant);text-align:center;padding:32px;">Nenhum dado executivo disponível.</p>';
    return;
  }

  var html = "";
  personas.forEach(function(p) {
    var bulletsHtml = "";
    (p.insights || []).forEach(function(ins) {
      bulletsHtml += '<li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--md-sys-color-on-surface-variant);line-height:1.45;">' +
                       '<span class="material-symbols-outlined" style="font-size:14px;color:var(--md-sys-color-primary);margin-top:2px;">arrow_forward</span>' +
                       '<span>' + escapeHtml(ins) + '</span>' +
                     '</li>';
    });

    html += '<div class="persona-card ' + p.colorClass + '">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
                '<div style="display:flex;align-items:center;gap:10px;">' +
                  '<span class="material-symbols-outlined" style="font-size:24px;">' + p.icon + '</span>' +
                  '<h3 style="font-size:15px;font-weight:700;color:#f8fafc;">' + p.role + '</h3>' +
                '</div>' +
                '<span class="mat-badge-tag">' + p.badge + '</span>' +
              '</div>' +
              '<h4 style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:10px;">' + p.metricHeadline + '</h4>' +
              '<ul style="list-style:none;padding:0;margin:0 0 16px;display:flex;flex-direction:column;gap:6px;">' +
                bulletsHtml +
              '</ul>' +
              '<div style="margin-top:auto;background:rgba(0,0,0,0.35);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid rgba(255,255,255,0.05);">' +
                '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--md-sys-color-on-surface-variant);display:block;margin-bottom:2px;">Impacto / ROI</span>' +
                '<span style="font-size:12px;font-weight:600;color:#10b981;">' + p.roi + '</span>' +
              '</div>' +
            '</div>';
  });

  container.innerHTML = html;
}

