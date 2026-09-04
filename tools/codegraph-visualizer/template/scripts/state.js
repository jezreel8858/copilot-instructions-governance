/**
 * state.js — Estado Reativo, Lookup Maps e Contadores Globais
 */

// Injected Data from CLI Generator / Bundler
var rawProjects = /* __INJECT_RAW_PROJECTS__ */ [];
var rawNodes = /* __INJECT_RAW_NODES__ */ [];
var rawEdges = /* __INJECT_RAW_EDGES__ */ [];
var rawMetrics = /* __INJECT_RAW_METRICS__ */ [];
var rawCycles = /* __INJECT_RAW_CYCLES__ */ [];
var rawViolations = /* __INJECT_RAW_VIOLATIONS__ */ [];

// Node Lookup Map & Degree Map
var nodeMap = {};
var connectedNodeIds = new Set();
var bridgeNodeIds = new Set();
var bridgeNeighborIds = new Set();

rawEdges.forEach(function(e) {
  connectedNodeIds.add(e.from);
  connectedNodeIds.add(e.to);
  if (e.crossRepo) {
    bridgeNodeIds.add(e.from);
    bridgeNodeIds.add(e.to);
    bridgeNeighborIds.add(e.from);
    bridgeNeighborIds.add(e.to);
  }
});

rawEdges.forEach(function(e) {
  if (bridgeNodeIds.has(e.from)) bridgeNeighborIds.add(e.to);
  if (bridgeNodeIds.has(e.to)) bridgeNeighborIds.add(e.from);
});

// Identify Isolated Nodes (0 callers, 0 callees, not in edges)
var isolatedNodeIds = new Set();
rawNodes.forEach(function(n) {
  nodeMap[n.id] = n;
  var isConnected = connectedNodeIds.has(n.id);
  n.isIsolated = !isConnected;
  if (!isConnected) {
    isolatedNodeIds.add(n.id);
    n.borderWidth = 1.5;
    n.shapeProperties = { borderDashes: [4, 4] };
  }
});

// Multi-Select Project Filter Set (All selected by default)
var selectedProjectIds = new Set(rawProjects.map(function(p) { return p.id || p.name; }));

// Global Filter States
var filterState = {
  connectivity: 'all',
  role: 'all',
  kind: 'all',
  coupling: 'all',
  density: 'bridges',
  egoFocusNodeId: null,
  soloProjectActive: null
};

var is3DMode = false;
var isPhysicsRunning = false;
var activeSelectedNode = null;

// Update Statistics Strip
function updateStatsUI(visibleNodesCount, visibleEdgesCount) {
  document.getElementById('statVisibleNodes').innerText = visibleNodesCount;
  document.getElementById('statTotalNodes').innerText = rawNodes.length;
  document.getElementById('statVisibleEdges').innerText = visibleEdgesCount;
  document.getElementById('statBridgeCount').innerText = bridgeNodeIds.size;
  document.getElementById('statIsolatedCount').innerText = isolatedNodeIds.size;
  var focusAlert = document.getElementById('statFocusAlert');
  if (filterState.egoFocusNodeId) {
    var fn = nodeMap[filterState.egoFocusNodeId];
    document.getElementById('statFocusName').innerText = fn ? fn.label : filterState.egoFocusNodeId;
    focusAlert.style.display = 'inline-flex';
  } else {
    focusAlert.style.display = 'none';
  }
}

