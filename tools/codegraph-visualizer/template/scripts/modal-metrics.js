/**
 * modal-metrics.js — Modal de Métricas Arquiteturais de Martin, Ciclos e Fronteiras
 */

function openMetricsModal() {
  document.getElementById('metricsModalOverlay').style.display = 'flex';
  document.getElementById('modalCyclesCount').innerText = rawCycles.length;
  document.getElementById('modalViolationsCount').innerText = rawViolations.length;
  renderMetricsTable('');
  renderCyclesList();
  renderViolationsList();
}

function closeMetricsModal() {
  document.getElementById('metricsModalOverlay').style.display = 'none';
}

function switchModalTab(tabKey) {
  var tabM = document.getElementById('modalTabMetrics');
  var tabC = document.getElementById('modalTabCycles');
  var tabV = document.getElementById('modalTabViolations');
  var btnM = document.getElementById('tabBtnMetrics');
  var btnC = document.getElementById('tabBtnCycles');
  var btnV = document.getElementById('tabBtnViolations');

  tabM.style.display = tabKey === 'metrics' ? 'block' : 'none';
  tabC.style.display = tabKey === 'cycles' ? 'block' : 'none';
  tabV.style.display = tabKey === 'violations' ? 'block' : 'none';

  btnM.className = 'modal-tab-btn' + (tabKey === 'metrics' ? ' active' : '');
  btnC.className = 'modal-tab-btn' + (tabKey === 'cycles' ? ' active' : '');
  btnV.className = 'modal-tab-btn' + (tabKey === 'violations' ? ' active' : '');
}

function renderMetricsTable(filterTerm) {
  var tbody = document.getElementById('metricsTableBody');
  tbody.innerHTML = '';
  var term = (filterTerm || '').toLowerCase().trim();
  var filtered = rawMetrics.filter(function(m) {
    return !term || m.packageId.toLowerCase().includes(term) || m.zone.toLowerCase().includes(term);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px;">Nenhum pacote encontrado.</td></tr>';
    return;
  }

  filtered.forEach(function(m) {
    var tr = document.createElement('tr');
    var barColor = m.instability > 0.7 ? '#ef4444' : (m.instability > 0.3 ? '#f59e0b' : '#10b981');
    var zoneBadge = '<span class="zone-tag-' + m.zoneType + '">' + m.zone + '</span>';

    tr.innerHTML = '<td><b>' + m.project + '</b><br><small style="color:#64748b; font-family:monospace;">' + m.packagePath + '</small></td>' +
      '<td>' + m.totalNodes + '</td>' +
      '<td><b>' + m.ca + '</b></td>' +
      '<td><b>' + m.ce + '</b></td>' +
      '<td><div class="instability-bar-container"><div class="instability-bar-fill" style="width:' + (m.instability * 100) + '%; background:' + barColor + ';"></div></div> <b>' + m.instability + '</b></td>' +
      '<td>' + m.abstractness + '</td>' +
      '<td>' + m.distance + '</td>' +
      '<td>' + zoneBadge + '</td>';
    tbody.appendChild(tr);
  });
}

function renderCyclesList() {
  var container = document.getElementById('cyclesListContainer');
  container.innerHTML = '';
  if (!rawCycles || rawCycles.length === 0) {
    container.innerHTML = '<div style="padding:24px; text-align:center; color:#059669; font-weight:600;"><span class="material-symbols-outlined" style="font-size:32px; display:block; margin-bottom:8px;">verified</span>Nenhum ciclo de dependência circular detectado no grafo (100% Acíclico).</div>';
    return;
  }

  rawCycles.forEach(function(cycle, idx) {
    var card = document.createElement('div');
    card.className = 'cycle-card';
    var names = cycle.map(function(nid) { var n = nodeMap[nid]; return n ? n.label : nid; });
    var chainStr = names.join(' ➔ ') + ' ➔ ' + names[0];

    card.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<b>Ciclo #' + (idx + 1) + ' (' + cycle.length + ' nós interdependentes)</b>' +
      '<button class="mat-btn mat-btn-outlined" style="height:24px; font-size:11px;" onclick="focusCycleNodes(' + JSON.stringify(cycle).replace(/"/g, '&quot;') + ')">🔍 Focar no Grafo</button>' +
      '</div>' +
      '<div class="cycle-flow-chain">' + chainStr + '</div>';
    container.appendChild(card);
  });
}

function focusCycleNodes(nodeIds) {
  closeMetricsModal();
  var subNodes = rawNodes.filter(function(n) { return nodeIds.includes(n.id); });
  var subNodeIdSet = new Set(nodeIds);
  var subEdges = rawEdges.filter(function(e) { return subNodeIdSet.has(e.from) && subNodeIdSet.has(e.to); });

  nodesDataSet.clear();
  edgesDataSet.clear();
  nodesDataSet.add(subNodes);
  edgesDataSet.add(subEdges);
  updateStatsUI(subNodes.length, subEdges.length);
  network2D.fit();
}

function renderViolationsList() {
  var container = document.getElementById('violationsListContainer');
  container.innerHTML = '';
  if (!rawViolations || rawViolations.length === 0) {
    container.innerHTML = '<div style="padding:24px; text-align:center; color:#059669; font-weight:600;"><span class="material-symbols-outlined" style="font-size:32px; display:block; margin-bottom:8px;">security</span>Todas as chamadas e arestas estão em conformidade com as regras de fronteira arquitetural.</div>';
    return;
  }

  rawViolations.forEach(function(v, idx) {
    var card = document.createElement('div');
    card.className = 'cycle-card';
    card.style.background = '#fef2f2';
    card.style.borderColor = '#fca5a5';
    card.innerHTML = '<b>Violação #' + (idx + 1) + ': ' + v.type + '</b><br>' +
      '<span style="color:#991b1b; font-size:11.5px;">' + v.rule + '</span><br>' +
      '<small style="color:#64748b; font-family:monospace;">Origem: ' + v.source_node + ' ➔ Destino: ' + v.target_node + '</small>';
    container.appendChild(card);
  });
}

// Initial Fit on load
setTimeout(function() {
  if (typeof network2D !== 'undefined' && network2D) {
    network2D.redraw();
    network2D.fit();
  }
}, 300);

