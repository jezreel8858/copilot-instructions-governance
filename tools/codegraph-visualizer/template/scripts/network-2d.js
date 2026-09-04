/**
 * network-2d.js — Motor Gráfico 2D (vis-network, Física, Auto-Freeze, Layouts)
 */

var initialData = computeFilteredDataset();
var nodesDataSet = new vis.DataSet(initialData.nodes);
var edgesDataSet = new vis.DataSet(initialData.edges);
var container2D = document.getElementById('networkGraph2D');
var graphData2D = { nodes: nodesDataSet, edges: edgesDataSet };

var baseOptions2D = {
  nodes: {
    shape: 'box',
    margin: 8,
    borderWidth: 2,
    shadow: false
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.6 } },
    smooth: { type: 'continuous', roundness: 0.1 }
  },
  physics: {
    enabled: true,
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -35,
      centralGravity: 0.005,
      springLength: 90,
      springConstant: 0.08,
      damping: 0.5,
      avoidOverlap: 0.2
    },
    stabilization: {
      enabled: true,
      iterations: 100,
      updateInterval: 20,
      onlyDynamicEdges: false,
      fit: true
    },
    adaptiveTimestep: true
  },
  layout: {
    improvedLayout: false
  },
  interaction: {
    hover: true,
    hoverConnectedEdges: false,
    tooltipDelay: 120,
    keyboard: true,
    hideEdgesOnDrag: true,
    hideEdgesOnZoom: true
  }
};

var network2D = new vis.Network(container2D, graphData2D, baseOptions2D);

// Resize handling
window.addEventListener('resize', function() {
  if (network2D) {
    network2D.redraw();
    network2D.fit();
  }
});

// Progress & Auto-Freeze Physics
var progressBar = document.getElementById('stabilizationProgress');
var progressFill = document.getElementById('progressBarFill');

network2D.on('stabilizationProgress', function(params) {
  progressBar.style.display = 'block';
  var widthFactor = params.iterations / params.total;
  progressFill.style.width = Math.round(widthFactor * 100) + '%';
});

function freezePhysics() {
  network2D.setOptions({ physics: { enabled: false } });
  isPhysicsRunning = false;
  updatePhysicsButtonUI();
  progressBar.style.display = 'none';
}

network2D.on('stabilizationIterationsDone', function() {
  freezePhysics();
  setTimeout(function() { network2D.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } }); }, 50);
});

network2D.on('stabilized', function() {
  freezePhysics();
});

// Click Inspector
network2D.on('click', function(params) {
  if (params.nodes.length > 0) {
    var nid = params.nodes[0];
    var node = nodeMap[nid];
    if (node) openInspector(node);
  } else {
    closeInspector();
  }
});

function togglePhysics() {
  isPhysicsRunning = !isPhysicsRunning;
  network2D.setOptions({ physics: { enabled: isPhysicsRunning } });
  updatePhysicsButtonUI();
}

function updatePhysicsButtonUI() {
  var btn = document.getElementById('btnTogglePhysics');
  var txt = document.getElementById('physicsBtnText');
  var icon = btn.querySelector('.material-symbols-outlined');
  if (isPhysicsRunning) {
    btn.className = 'mat-btn mat-btn-physics';
    txt.innerText = 'Física: Ativa';
    icon.innerText = 'play_arrow';
  } else {
    btn.className = 'mat-btn mat-btn-physics frozen';
    txt.innerText = 'Física: Congelada';
    icon.innerText = 'pause';
  }
}

function changeLayout(val) {
  if (val.startsWith('hierarchical')) {
    var dir = val.split('_')[1];
    network2D.setOptions({
      layout: { hierarchical: { enabled: true, direction: dir, sortMethod: 'directed', levelSeparation: 140, nodeSpacing: 160 } },
      physics: { enabled: false }
    });
  } else {
    network2D.setOptions({
      layout: { hierarchical: { enabled: false } },
      physics: {
        enabled: true, solver: 'forceAtlas2Based',
        forceAtlas2Based: { gravitationalConstant: -35, centralGravity: 0.005, springLength: 90, damping: 0.5 }
      }
    });
  }
  setTimeout(function() { network2D.fit({ animation: true }); }, 200);
}

function zoomIn() { network2D.moveTo({ scale: network2D.getScale() * 1.3, animation: true }); }
function zoomOut() { network2D.moveTo({ scale: network2D.getScale() / 1.3, animation: true }); }
function fitView() { network2D.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } }); }

