/**
 * filters.js — Lógica de Filtragem com Angular Material CDK Overlay, Multi-Select e Autocomplete
 */

var SELECT_DEFINITIONS = {
  connectivitySelect: {
    label: "Conectividade",
    options: [
      { value: "all", label: "Todos os Nós" },
      { value: "connected", label: "🔗 Apenas Conectados (Sem Órfãos)" },
      { value: "isolated", label: "🏝️ Apenas Isolados / Órfãos (0 Chamadores/Deps)" },
      { value: "bridges_chain", label: "⚡ Pontes REST & Vizinhos (1º e 2º Grau)" }
    ]
  },
  roleSelect: {
    label: "Papel (Role)",
    options: [
      { value: "all", label: "Todos os Papéis" },
      { value: "entry", label: "🚪 Entrypoints (APIs / Controllers)" },
      { value: "core", label: "🧠 Core de Negócio (Central)" },
      { value: "utility", label: "🔧 Utilitários & Helpers" },
      { value: "dead", label: "⚠️ Dead / Sem Consumidores" },
      { value: "leaf", label: "🍃 Leaves (Folhas)" }
    ]
  },
  kindSelect: {
    label: "Tipo",
    options: [
      { value: "all", label: "Todos os Tipos" },
      { value: "Controller", label: "🎮 Controllers / Endpoints" },
      { value: "Service", label: "⚙️ Services / Lógica" },
      { value: "Repository", label: "💾 Repositories / DB" },
      { value: "Component", label: "🖥️ Componentes / UI" },
      { value: "interface", label: "📜 Interfaces & Contratos" },
      { value: "class", label: "📦 Classes / Modelos" }
    ]
  },
  couplingSelect: {
    label: "Acoplamento",
    options: [
      { value: "all", label: "Todos" },
      { value: "tight", label: "🔴 Tight (Alto Impacto / Fan-In ≥ 6)" },
      { value: "loose", label: "🟢 Loose (Desacoplado / Fan-In < 6)" },
      { value: "bridge", label: "🟣 Pontes REST (Cross-Repo)" }
    ]
  },
  densitySelect: {
    label: "Densidade",
    options: [
      { value: "bridges", label: "🌟 Pontes & Core (Rápido)" },
      { value: "architectural", label: "🚀 Arquitetural (Fan-In ≥ 2)" },
      { value: "full", label: "🌐 Completo (Todos os Nós)" }
    ]
  },
  layoutSelect: {
    label: "Layout",
    options: [
      { value: "force", label: "Orgânico (Força)" },
      { value: "hierarchical_UD", label: "Hierárquico (Cima ➔ Baixo)" },
      { value: "hierarchical_LR", label: "Hierárquico (Esquerda ➔ Direita)" }
    ]
  }
};

var currentActiveTrigger = null;

// Populate Top Bar Header Chips
var headerChips = document.getElementById('headerChips');
var countAll = document.getElementById('countAll');
if (countAll) countAll.innerText = rawNodes.length;

var legendRows = document.getElementById('legendRows');

var CHIP_PALETTE = [
  { color: "#1976D2", bgColor: "#E3F2FD", borderColor: "#1565C0" },
  { color: "#2E7D32", bgColor: "#E8F5E9", borderColor: "#1B5E20" },
  { color: "#E65100", bgColor: "#FFF3E0", borderColor: "#BF360C" },
  { color: "#7B1FA2", bgColor: "#F3E5F5", borderColor: "#4A148C" },
  { color: "#00838F", bgColor: "#E0F7FA", borderColor: "#006064" },
  { color: "#C2185B", bgColor: "#FCE4EC", borderColor: "#880E4F" },
  { color: "#5D4037", bgColor: "#EFEBE9", borderColor: "#3E2723" },
  { color: "#455A64", bgColor: "#ECEFF1", borderColor: "#263238" }
];

rawProjects.forEach(function(p, idx) {
  var pId = p.id || p.name;
  var count = rawNodes.filter(function(n) { return n.project === pId || n.project === p.name; }).length;
  var pal = p.palette || CHIP_PALETTE[idx % CHIP_PALETTE.length];
  var pColor = pal.color || '#1976D2';
  var pBg = pal.bgColor || '#E3F2FD';
  var pBorder = pal.borderColor || '#1565C0';

  // 1. Header Chip com cor distinta e indicador visual
  var chip = document.createElement('div');
  chip.className = 'mat-chip mat-chip-project';
  chip.style.setProperty('--proj-color', pColor);
  chip.style.setProperty('--proj-border', pBorder);
  chip.style.setProperty('--proj-bg', pBg);
  chip.title = 'Filtrar projeto ' + p.displayName + ' (segundo clique desfaz)';
  chip.onclick = function(e) { toggleProjectChip(pId, e); };
  chip.innerHTML = '<span class="chip-color-dot" style="background:' + pColor + '; box-shadow:0 0 6px ' + pColor + ';"></span>' +
    '<span>' + p.displayName + '</span>' +
    '<span class="chip-count">' + count + '</span>';
  chip.setAttribute('data-proj', pId);
  headerChips.appendChild(chip);

  // 2. Legend Row
  var leg = document.createElement('div');
  leg.className = 'legend-row';
  leg.innerHTML = '<span class="legend-dot" style="background:' + pColor + ';"></span><span><b>' + p.displayName + '</b> (' + p.type + ')</span>';
  legendRows.appendChild(leg);
});

// Bridge Chip com suporte a toggle (segundo clique desfaz)
var bridgeChip = document.createElement('div');
bridgeChip.className = 'mat-chip mat-chip-bridge';
bridgeChip.id = 'headerChipBridge';
bridgeChip.title = 'Filtrar pontes REST cross-repo (segundo clique desfaz)';
bridgeChip.onclick = function() { toggleConnectivityChip('bridges_chain'); };
bridgeChip.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;">conversion_path</span><span>Pontes REST</span><span class="chip-count">' + bridgeNodeIds.size + '</span>';
headerChips.appendChild(bridgeChip);

// Isolated Nodes Chip com suporte a toggle (segundo clique desfaz)
var isolatedChip = document.createElement('div');
isolatedChip.className = 'mat-chip mat-chip-isolated';
isolatedChip.id = 'headerChipIsolated';
isolatedChip.title = 'Filtrar nós isolados/órfãos (segundo clique desfaz)';
isolatedChip.onclick = function() { toggleConnectivityChip('isolated'); };
isolatedChip.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;">link_off</span><span>Isolados</span><span class="chip-count">' + isolatedNodeIds.size + '</span>';
headerChips.appendChild(isolatedChip);

function toggleConnectivityChip(targetMode) {
  if (filterState.connectivity === targetMode) {
    // Segundo clique: desfaz a ação e volta para todos os nós
    setConnectivityFilter('all');
  } else {
    // Primeiro clique: ativa o filtro
    setConnectivityFilter(targetMode);
  }
}

function updateConnectivityChipsUI() {
  var bChip = document.getElementById('headerChipBridge');
  var iChip = document.getElementById('headerChipIsolated');
  if (bChip) {
    if (filterState.connectivity === 'bridges_chain') {
      bChip.className = 'mat-chip mat-chip-bridge active';
    } else {
      bChip.className = 'mat-chip mat-chip-bridge';
    }
  }
  if (iChip) {
    if (filterState.connectivity === 'isolated') {
      iChip.className = 'mat-chip mat-chip-isolated active';
    } else {
      iChip.className = 'mat-chip mat-chip-isolated';
    }
  }
}

// ==========================================================================
// Angular Material CDK Overlay Core Engine
// ==========================================================================

var overlayCloseTimer = null;

function openMatSelectOverlay(selectId, triggerEl, event) {
  if (event) {
    event.stopPropagation();
    if (event.preventDefault) event.preventDefault();
  }

  if (currentActiveTrigger === triggerEl) {
    closeAllOverlays(false);
    return;
  }

  closeAllOverlays(true);

  if (overlayCloseTimer) {
    clearTimeout(overlayCloseTimer);
    overlayCloseTimer = null;
  }

  currentActiveTrigger = triggerEl;
  triggerEl.classList.add('mat-mdc-select-active');

  var def = SELECT_DEFINITIONS[selectId];
  if (!def) return;

  var container = document.getElementById('cdkOverlayContainer');
  var backdrop = document.getElementById('cdkOverlayBackdrop');
  var pane = document.getElementById('cdkOverlayPane');

  var currentValue = (selectId === 'layoutSelect') ? (filterState.currentLayout || 'force') : (filterState[selectId.replace('Select', '')] || 'all');
  if (selectId === 'densitySelect') currentValue = filterState.density || 'bridges';

  var html = '<div class="mat-mdc-select-panel">';
  def.options.forEach(function(opt) {
    var isSelected = opt.value === currentValue;
    html += '<div class="mat-mdc-option' + (isSelected ? ' mdc-list-item--selected' : '') + '" onclick="selectMatOption(\'' + selectId + '\', \'' + opt.value + '\', \'' + opt.label.replace(/'/g, "\\'") + '\')">' +
      '<span>' + opt.label + '</span>' +
      '<span class="material-symbols-outlined mat-mdc-option-check">check</span>' +
      '</div>';
  });
  html += '</div>';

  pane.innerHTML = html;
  positionOverlayPane(triggerEl, pane);

  container.style.display = 'block';
  void pane.offsetWidth;
  backdrop.classList.add('cdk-overlay-backdrop-showing');
  pane.classList.add('cdk-overlay-pane-visible');
}

function selectMatOption(selectId, value, label) {
  var labelEl = document.getElementById('label_' + selectId);
  if (labelEl) labelEl.innerText = label;

  closeAllOverlays(true);

  if (selectId === 'connectivitySelect') {
    setConnectivityFilter(value);
  } else if (selectId === 'roleSelect') {
    setRoleFilter(value);
  } else if (selectId === 'kindSelect') {
    setKindFilter(value);
  } else if (selectId === 'couplingSelect') {
    setCouplingFilter(value);
  } else if (selectId === 'densitySelect') {
    setDensityFilter(value);
  } else if (selectId === 'layoutSelect') {
    filterState.currentLayout = value;
    changeLayout(value);
  }
}

function openRepoMenuOverlay(triggerEl, event) {
  if (event) {
    event.stopPropagation();
    if (event.preventDefault) event.preventDefault();
  }

  if (currentActiveTrigger === triggerEl) {
    closeAllOverlays(false);
    return;
  }

  closeAllOverlays(true);

  if (overlayCloseTimer) {
    clearTimeout(overlayCloseTimer);
    overlayCloseTimer = null;
  }

  currentActiveTrigger = triggerEl;
  triggerEl.classList.add('mat-mdc-select-active');

  var container = document.getElementById('cdkOverlayContainer');
  var backdrop = document.getElementById('cdkOverlayBackdrop');
  var pane = document.getElementById('cdkOverlayPane');

  var allCount = rawProjects.length;
  var selCount = selectedProjectIds.size;
  var isAllChecked = (selCount === allCount);

  var html = '<div class="mat-mdc-select-panel" style="padding:4px 0;">' +
    '<div class="mat-mdc-checkbox-option" onclick="toggleAllProjectsFromOverlay(event)">' +
    '<input type="checkbox" class="mat-mdc-checkbox" id="chkAllReposOverlay"' + (isAllChecked ? ' checked' : '') + '>' +
    '<label for="chkAllReposOverlay" style="font-weight:700; cursor:pointer;">(Selecionar Todos)</label>' +
    '</div>' +
    '<hr class="mat-menu-divider">';

  rawProjects.forEach(function(p) {
    var pId = p.id || p.name;
    var isChecked = selectedProjectIds.has(pId) || selectedProjectIds.has(p.name);
    var count = rawNodes.filter(function(n) { return n.project === pId || n.project === p.name; }).length;
    var color = (p.palette ? p.palette.color : '#1976D2');

    html += '<div class="mat-mdc-checkbox-option" onclick="toggleProjectCheckboxFromOverlay(\'' + pId + '\', event)">' +
      '<input type="checkbox" class="mat-mdc-checkbox" id="chk_proj_overlay_' + pId + '"' + (isChecked ? ' checked' : '') + '>' +
      '<label style="cursor:pointer; display:flex; align-items:center; gap:8px;">' +
      '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + color + ';"></span>' +
      '<span>' + p.displayName + '</span> <small style="color:#64748b;">(' + count + ')</small>' +
      '</label>' +
      '</div>';
  });

  html += '</div>';

  pane.innerHTML = html;
  positionOverlayPane(triggerEl, pane);

  container.style.display = 'block';
  void pane.offsetWidth;
  backdrop.classList.add('cdk-overlay-backdrop-showing');
  pane.classList.add('cdk-overlay-pane-visible');
}

function positionOverlayPane(triggerEl, paneEl) {
  var rect = triggerEl.getBoundingClientRect();
  var top = rect.bottom + 4;
  var left = rect.left;
  var minWidth = Math.max(rect.width, 180);

  if (left + minWidth > window.innerWidth - 16) {
    left = Math.max(16, window.innerWidth - minWidth - 16);
  }

  paneEl.style.top = top + 'px';
  paneEl.style.left = left + 'px';
  paneEl.style.minWidth = minWidth + 'px';
}

function closeAllOverlays(immediate) {
  if (overlayCloseTimer) {
    clearTimeout(overlayCloseTimer);
    overlayCloseTimer = null;
  }

  var container = document.getElementById('cdkOverlayContainer');
  var backdrop = document.getElementById('cdkOverlayBackdrop');
  var pane = document.getElementById('cdkOverlayPane');

  if (backdrop) backdrop.classList.remove('cdk-overlay-backdrop-showing');
  if (pane) pane.classList.remove('cdk-overlay-pane-visible');

  if (currentActiveTrigger) {
    currentActiveTrigger.classList.remove('mat-mdc-select-active');
    currentActiveTrigger = null;
  }

  if (immediate) {
    if (container) container.style.display = 'none';
  } else {
    overlayCloseTimer = setTimeout(function() {
      if (!currentActiveTrigger && container) {
        container.style.display = 'none';
      }
      overlayCloseTimer = null;
    }, 150);
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAllOverlays(true);
  }
});

function toggleProjectCheckboxFromOverlay(projId, event) {
  var chk = document.getElementById('chk_proj_overlay_' + projId);
  if (event.target !== chk && chk) {
    chk.checked = !chk.checked;
  }
  var isChecked = chk ? chk.checked : true;
  if (isChecked) {
    selectedProjectIds.add(projId);
  } else {
    selectedProjectIds.delete(projId);
  }

  var chkAll = document.getElementById('chkAllReposOverlay');
  if (chkAll) {
    chkAll.checked = (selectedProjectIds.size === rawProjects.length);
  }

  filterState.egoFocusNodeId = null;
  updateRepoUI();
  applyFilters();
}

function toggleAllProjectsFromOverlay(event) {
  var chkAll = document.getElementById('chkAllReposOverlay');
  if (event.target !== chkAll && chkAll) {
    chkAll.checked = !chkAll.checked;
  }
  var isChecked = chkAll ? chkAll.checked : true;

  if (isChecked) {
    selectedProjectIds = new Set(rawProjects.map(function(p) { return p.id || p.name; }));
  } else {
    selectedProjectIds.clear();
  }

  rawProjects.forEach(function(p) {
    var pId = p.id || p.name;
    var chk = document.getElementById('chk_proj_overlay_' + pId);
    if (chk) chk.checked = isChecked;
  });

  filterState.egoFocusNodeId = null;
  updateRepoUI();
  applyFilters();
}

function updateRepoUI() {
  var allCount = rawProjects.length;
  var selCount = selectedProjectIds.size;
  var summary = document.getElementById('repoSelectedSummary');
  var allChip = document.querySelector('.mat-chip-all');

  // Modo "Todos os Projetos": quando nenhum projeto específico está em solo e todos estão selecionados
  var isAllMode = (!filterState.soloProjectActive && selCount === allCount);

  if (isAllMode) {
    if (summary) summary.innerText = 'Todos (' + allCount + '/' + allCount + ')';
    if (allChip) allChip.className = 'mat-chip mat-chip-all active';
  } else if (selCount === 0) {
    if (summary) summary.innerText = 'Nenhum (0/' + allCount + ')';
    if (allChip) allChip.className = 'mat-chip mat-chip-all dimmed';
  } else {
    if (summary) summary.innerText = selCount + ' de ' + allCount + ' repos';
    if (allChip) allChip.className = 'mat-chip mat-chip-all dimmed';
  }

  rawProjects.forEach(function(p) {
    var pId = p.id || p.name;
    var chip = document.querySelector('.mat-chip[data-proj="' + pId + '"]');
    if (chip) {
      if (isAllMode) {
        // No modo "Todos", os chips individuais ficam em repouso elegante com suas cores características
        chip.className = 'mat-chip mat-chip-project';
      } else if (selectedProjectIds.has(pId)) {
        // Projeto com filtro ATIVO: destaque vibrante com a cor do projeto e glow
        chip.className = 'mat-chip mat-chip-project active';
      } else {
        // Projeto inativo/deselecionado: esmaecido (dimmed)
        chip.className = 'mat-chip mat-chip-project dimmed';
      }
    }
  });

  updateConnectivityChipsUI();
}

function toggleProjectChip(projId, event) {
  if (event && (event.ctrlKey || event.metaKey || event.shiftKey)) {
    // Multi-seleção com tecla modificadora
    if (selectedProjectIds.has(projId)) {
      if (selectedProjectIds.size > 1) {
        selectedProjectIds.delete(projId);
        filterState.soloProjectActive = (selectedProjectIds.size === 1) ? Array.from(selectedProjectIds)[0] : 'subset';
      }
    } else {
      selectedProjectIds.add(projId);
      if (selectedProjectIds.size === rawProjects.length) {
        filterState.soloProjectActive = null;
      } else {
        filterState.soloProjectActive = 'subset';
      }
    }
  } else {
    // Clique simples: se este projeto já era o único ativo, o SEGUNDO CLIQUE DESFAZ a ação!
    if (filterState.soloProjectActive === projId) {
      // Segundo clique: desfaz a seleção e volta para todos os projetos
      filterState.soloProjectActive = null;
      selectedProjectIds = new Set(rawProjects.map(function(p) { return p.id || p.name; }));
    } else {
      // Primeiro clique: ativa exclusivamente este projeto
      filterState.soloProjectActive = projId;
      selectedProjectIds = new Set([projId]);
    }
  }

  filterState.egoFocusNodeId = null;
  updateRepoUI();
  applyFilters();
}

function toggleAllProjects() {
  filterState.soloProjectActive = null;
  selectedProjectIds = new Set(rawProjects.map(function(p) { return p.id || p.name; }));
  filterState.egoFocusNodeId = null;
  updateRepoUI();
  applyFilters();
}

// Filter Calculation
function computeFilteredDataset() {
  var nodes = rawNodes;

  // 1. Ego Subgraph Focus
  if (filterState.egoFocusNodeId) {
    var egoId = filterState.egoFocusNodeId;
    var egoNeighborIds = new Set([egoId]);
    rawEdges.forEach(function(e) {
      if (e.from === egoId) egoNeighborIds.add(e.to);
      if (e.to === egoId) egoNeighborIds.add(e.from);
    });
    nodes = rawNodes.filter(function(n) { return egoNeighborIds.has(n.id); });
    var egoEdgeSet = new Set(nodes.map(function(n) { return n.id; }));
    var edges = rawEdges.filter(function(e) { return egoEdgeSet.has(e.from) && egoEdgeSet.has(e.to); });
    return { nodes: nodes, edges: edges };
  }

  // 2. Multi-Select Project Filter
  if (selectedProjectIds.size < rawProjects.length) {
    nodes = nodes.filter(function(n) { return selectedProjectIds.has(n.project); });
  }

  // 3. Connectivity / Isolation Filter
  if (filterState.connectivity === 'connected') {
    nodes = nodes.filter(function(n) { return connectedNodeIds.has(n.id); });
  } else if (filterState.connectivity === 'isolated') {
    nodes = nodes.filter(function(n) { return isolatedNodeIds.has(n.id); });
  } else if (filterState.connectivity === 'bridges_chain') {
    nodes = nodes.filter(function(n) { return bridgeNeighborIds.has(n.id); });
  }

  // 4. Role Filter
  if (filterState.role !== 'all') {
    if (filterState.role === 'entry') {
      nodes = nodes.filter(function(n) { return n.role === 'entry' || n.typeTag === 'Controller'; });
    } else if (filterState.role === 'core') {
      nodes = nodes.filter(function(n) { return n.role === 'core' || n.fanIn >= 4; });
    } else if (filterState.role === 'utility') {
      nodes = nodes.filter(function(n) { return n.role === 'utility' || n.typeTag === 'Util'; });
    } else if (filterState.role === 'dead') {
      nodes = nodes.filter(function(n) { return (n.role && n.role.includes('dead')) || n.fanIn === 0; });
    } else if (filterState.role === 'leaf') {
      nodes = nodes.filter(function(n) { return n.role === 'leaf' || n.fanOut === 0; });
    }
  }

  // 5. Kind / Type Tag Filter
  if (filterState.kind !== 'all') {
    if (filterState.kind === 'Controller' || filterState.kind === 'Service' || filterState.kind === 'Repository' || filterState.kind === 'Component') {
      nodes = nodes.filter(function(n) { return n.typeTag === filterState.kind; });
    } else {
      nodes = nodes.filter(function(n) { return n.kind === filterState.kind; });
    }
  }

  // 6. Coupling Filter
  if (filterState.coupling === 'tight') {
    nodes = nodes.filter(function(n) { return n.fanIn >= 6 || bridgeNodeIds.has(n.id); });
  } else if (filterState.coupling === 'loose') {
    nodes = nodes.filter(function(n) { return n.fanIn < 6; });
  } else if (filterState.coupling === 'bridge') {
    nodes = nodes.filter(function(n) { return bridgeNodeIds.has(n.id); });
  }

  // 7. Density LOD
  if (filterState.connectivity === 'all' && filterState.role === 'all' && filterState.kind === 'all') {
    if (filterState.density === 'bridges') {
      var filteredBridges = nodes.filter(function(n) { return bridgeNeighborIds.has(n.id) || n.fanIn >= 4; });
      if (filteredBridges.length > 0) {
        nodes = filteredBridges;
      }
    } else if (filterState.density === 'architectural') {
      var filteredArch = nodes.filter(function(n) { return bridgeNodeIds.has(n.id) || n.fanIn >= 2; });
      if (filteredArch.length > 0) {
        nodes = filteredArch;
      }
    }
  }

  var validSet = new Set(nodes.map(function(n) { return n.id; }));
  var edges = rawEdges.filter(function(e) { return validSet.has(e.from) && validSet.has(e.to); });
  return { nodes: nodes, edges: edges };
}

function toggleControlBar() {
  var bar = document.getElementById('matControlBar');
  var icon = document.getElementById('iconToggleControlBar');
  var text = document.getElementById('textToggleControlBar');
  var btn = document.getElementById('btnToggleControlBar');

  if (!bar) return;

  closeAllOverlays(true);
  var isCollapsed = bar.classList.toggle('collapsed');

  if (isCollapsed) {
    if (icon) icon.innerText = 'tune';
    if (text) text.innerText = 'Mostrar Filtros';
    if (btn) btn.classList.add('active');
  } else {
    if (icon) icon.innerText = 'expand_less';
    if (text) text.innerText = 'Ocultar Filtros';
    if (btn) btn.classList.remove('active');
  }

  setTimeout(function() {
    if (typeof network2D !== 'undefined' && network2D) {
      network2D.redraw();
      network2D.fit();
    }
    window.dispatchEvent(new Event('resize'));
  }, 260);
}

// Master Filter Apply Function
function applyFilters() {
  var res = computeFilteredDataset();
  nodesDataSet.clear();
  edgesDataSet.clear();
  nodesDataSet.add(res.nodes);
  edgesDataSet.add(res.edges);
  updateStatsUI(res.nodes.length, res.edges.length);

  if (is3DMode && Graph3D) {
    init3DGraph();
  } else {
    network2D.setOptions({ physics: { enabled: true } });
    isPhysicsRunning = true;
    updatePhysicsButtonUI();
    network2D.stabilize(50);
  }
}

// Action Handlers
function setConnectivityFilter(val) {
  filterState.connectivity = val;
  filterState.egoFocusNodeId = null;
  var opt = SELECT_DEFINITIONS.connectivitySelect.options.find(function(o) { return o.value === val; });
  if (opt && document.getElementById('label_connectivitySelect')) {
    document.getElementById('label_connectivitySelect').innerText = opt.label;
  }
  updateConnectivityChipsUI();
  applyFilters();
}

function setRoleFilter(val) {
  filterState.role = val;
  filterState.egoFocusNodeId = null;
  var opt = SELECT_DEFINITIONS.roleSelect.options.find(function(o) { return o.value === val; });
  if (opt && document.getElementById('label_roleSelect')) {
    document.getElementById('label_roleSelect').innerText = opt.label;
  }
  applyFilters();
}

function setKindFilter(val) {
  filterState.kind = val;
  filterState.egoFocusNodeId = null;
  var opt = SELECT_DEFINITIONS.kindSelect.options.find(function(o) { return o.value === val; });
  if (opt && document.getElementById('label_kindSelect')) {
    document.getElementById('label_kindSelect').innerText = opt.label;
  }
  applyFilters();
}

function setCouplingFilter(val) {
  filterState.coupling = val;
  filterState.egoFocusNodeId = null;
  var opt = SELECT_DEFINITIONS.couplingSelect.options.find(function(o) { return o.value === val; });
  if (opt && document.getElementById('label_couplingSelect')) {
    document.getElementById('label_couplingSelect').innerText = opt.label;
  }
  applyFilters();
}

function setDensityFilter(val) {
  filterState.density = val;
  filterState.egoFocusNodeId = null;
  var opt = SELECT_DEFINITIONS.densitySelect.options.find(function(o) { return o.value === val; });
  if (opt && document.getElementById('label_densitySelect')) {
    document.getElementById('label_densitySelect').innerText = opt.label;
  }
  applyFilters();
}

function focusSelectedNodeSubgraph() {
  if (activeSelectedNode) {
    filterState.egoFocusNodeId = activeSelectedNode.id;
    applyFilters();
  }
}

function clearSubtreeFocus() {
  filterState.egoFocusNodeId = null;
  applyFilters();
}

function resetAllFilters() {
  selectedProjectIds = new Set(rawProjects.map(function(p) { return p.id || p.name; }));
  filterState = {
    connectivity: 'all',
    role: 'all',
    kind: 'all',
    coupling: 'all',
    density: 'bridges',
    egoFocusNodeId: null,
    soloProjectActive: null
  };

  // Reseta todos os labels visuais
  if (document.getElementById('label_connectivitySelect')) document.getElementById('label_connectivitySelect').innerText = 'Todos os Nós';
  if (document.getElementById('label_roleSelect')) document.getElementById('label_roleSelect').innerText = 'Todos os Papéis';
  if (document.getElementById('label_kindSelect')) document.getElementById('label_kindSelect').innerText = 'Todos os Tipos';
  if (document.getElementById('label_couplingSelect')) document.getElementById('label_couplingSelect').innerText = 'Todos';
  if (document.getElementById('label_densitySelect')) document.getElementById('label_densitySelect').innerText = '🌟 Pontes & Core (Rápido)';
  if (document.getElementById('label_layoutSelect')) document.getElementById('label_layoutSelect').innerText = 'Orgânico (Força)';

  updateRepoUI();
  updateConnectivityChipsUI();
  changeLayout('force');
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  suggestionsBox.style.display = 'none';
  applyFilters();
  closeInspector();
}

// Search & Autocomplete
var searchInput = document.getElementById('searchInput');
var searchClearBtn = document.getElementById('searchClearBtn');
var suggestionsBox = document.getElementById('searchSuggestions');

searchInput.addEventListener('input', function() {
  var q = this.value.trim().toLowerCase();
  searchClearBtn.style.display = q ? 'block' : 'none';
  if (!q) {
    suggestionsBox.style.display = 'none';
    applyFilters();
    return;
  }
  var matches = rawNodes.filter(function(n) { return n.label.toLowerCase().includes(q) || n.file.toLowerCase().includes(q); });
  if (matches.length > 0) {
    suggestionsBox.innerHTML = '';
    matches.slice(0, 10).forEach(function(m) {
      var item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = '<span><b>' + m.label + '</b> <small style="color:#64748b;">(' + m.typeTag + ')</small></span><span style="font-size:10.5px; color:#94a3b8;">' + m.projectDisplayName + '</span>';
      item.onclick = function() {
        selectAndFocusNode(m.id);
        suggestionsBox.style.display = 'none';
      };
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.style.display = 'block';
    if (!nodesDataSet.get(matches[0].id)) {
      nodesDataSet.add(matches[0]);
    }
    network2D.selectNodes([matches[0].id]);
    network2D.focus(matches[0].id, { scale: 1.2, animation: true });
    openInspector(matches[0]);
  } else {
    suggestionsBox.style.display = 'none';
    network2D.unselectAll();
  }
});

searchClearBtn.addEventListener('click', function() {
  searchInput.value = '';
  this.style.display = 'none';
  suggestionsBox.style.display = 'none';
  applyFilters();
  closeInspector();
});

document.addEventListener('click', function(e) {
  if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = 'none';
  }
});

function selectAndFocusNode(nid) {
  var n = nodeMap[nid];
  if (!nodesDataSet.get(nid) && n) {
    nodesDataSet.add(n);
  }
  network2D.selectNodes([nid]);
  network2D.focus(nid, { scale: 1.3, animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  if (n) openInspector(n);
}



