/**
 * network-3d.js — Motor Gráfico 3D (Three.js / 3d-force-graph WebGL GPU)
 */

var Graph3D = null;

function init3DGraph() {
  var container3D = document.getElementById('networkGraph3D');
  container3D.innerHTML = '';
  var currentDisplayNodes = nodesDataSet.get();
  var currentDisplayEdges = edgesDataSet.get();

  var gData3D = {
    nodes: currentDisplayNodes.map(function(n) {
      return {
        id: n.id,
        name: n.label,
        project: n.project,
        group: n.project,
        kind: n.kind,
        color: n.isIsolated ? '#ef4444' : ((n.color && n.color.highlight && n.color.highlight.background) || (n.color && n.color.border) || '#1976D2'),
        val: bridgeNodeIds.has(n.id) ? 14 : (n.isIsolated ? 1 : Math.max(2, n.fanIn))
      };
    }),
    links: currentDisplayEdges.map(function(e) {
      return {
        source: e.from,
        target: e.to,
        color: e.crossRepo ? '#E91E63' : '#94a3b8',
        width: e.crossRepo ? 3.5 : 1,
        crossRepo: e.crossRepo
      };
    })
  };

  Graph3D = ForceGraph3D()(container3D)
    .graphData(gData3D)
    .nodeLabel('name')
    .nodeColor('color')
    .nodeVal('val')
    .linkColor('color')
    .linkWidth('width')
    .linkDirectionalParticles(function(link) { return link.crossRepo ? 4 : 0; })
    .linkDirectionalParticleWidth(3)
    .linkDirectionalParticleSpeed(0.006)
    .warmupTicks(50)
    .cooldownTicks(90)
    .cooldownTime(4000)
    .onNodeClick(function(node) {
      var n = nodeMap[node.id];
      if (n) openInspector(n);
    });
}

function toggleDimensionMode() {
  is3DMode = !is3DMode;
  var container2D = document.getElementById('networkGraph2D');
  var container3D = document.getElementById('networkGraph3D');
  var modeText = document.getElementById('modeText');
  var layoutGroup = document.getElementById('layoutGroup');
  var physicsBtn = document.getElementById('btnTogglePhysics');

  if (is3DMode) {
    container2D.style.display = 'none';
    container3D.style.display = 'block';
    modeText.innerText = 'Modo 2D (Canvas)';
    layoutGroup.style.display = 'none';
    physicsBtn.style.display = 'none';
    init3DGraph();
  } else {
    container2D.style.display = 'block';
    container3D.style.display = 'none';
    modeText.innerText = 'Modo 3D (WebGL GPU)';
    layoutGroup.style.display = 'flex';
    physicsBtn.style.display = 'inline-flex';
    network2D.fit();
  }
}

