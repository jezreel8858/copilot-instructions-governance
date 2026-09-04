/**
 * inspector.js — Side Sheet Inspector de Símbolos, Conexões e Pontes REST
 */

function openInspector(node) {
  activeSelectedNode = node;
  var drawer = document.getElementById('sideInspector');
  drawer.style.display = 'flex';
  document.getElementById('sideTitle').innerText = node.label;
  document.getElementById('sideProject').innerText = node.projectDisplayName;
  document.getElementById('sideKind').innerText = node.typeTag + ' (' + node.kind + ')';
  document.getElementById('sideRole').innerText = (node.role || 'core').toUpperCase();
  document.getElementById('sideFile').innerText = node.file + ':' + node.line;
  document.getElementById('sideFanIn').innerText = node.fanIn + ' chamadores';
  document.getElementById('sideFanOut').innerText = node.fanOut + ' dependências';

  var couplingLabel = node.isIsolated ? '<span class="badge-isolated">Isolado (0 lig.)</span>' : (node.fanIn >= 6 ? '<span class="badge-tight">Tight (Forte)</span>' : (bridgeNodeIds.has(node.id) ? '<span class="badge-eventual">REST Bridge</span>' : '<span class="badge-loose">Loose (Leve)</span>'));
  document.getElementById('sideCoupling').innerHTML = couplingLabel;

  var badge = document.getElementById('sideBadge');
  badge.className = 'mat-chip';
  badge.innerText = node.project;

  var bridgeList = document.getElementById('sideBridgeList');
  var callerList = document.getElementById('sideCallerList');
  var calleeList = document.getElementById('sideCalleeList');

  bridgeList.innerHTML = '';
  callerList.innerHTML = '';
  calleeList.innerHTML = '';

  var connEdges = rawEdges.filter(function(e) { return e.from === node.id || e.to === node.id; });
  var hasBridge = false;
  var callerCount = 0;
  var calleeCount = 0;

  connEdges.forEach(function(e) {
    var isOut = e.from === node.id;
    var otherId = isOut ? e.to : e.from;
    var otherNode = nodeMap[otherId];
    var otherLabel = otherNode ? otherNode.label + ' (' + otherNode.project + ')' : otherId;
    var div = document.createElement('div');
    div.className = 'conn-item-card';

    if (e.crossRepo) {
      hasBridge = true;
      div.className += ' bridge-item-card';
      div.innerHTML = '<span class="bridge-badge-label">⚡ ' + (isOut ? 'Chama Provedor REST ➔ ' : 'Recebe Chamada REST ⬅ ') + '</span>' +
        '<a onclick="selectAndFocusNode(\'' + otherId + '\')">' + otherLabel + '</a>' +
        '<small style="color:#db2777; font-weight:600; margin-top:2px;">' + (e.label || '') + '</small>' +
        (e.description ? '<small style="color:#64748b;">' + e.description + '</small>' : '');
      bridgeList.appendChild(div);
    } else if (isOut) {
      calleeCount++;
      div.innerHTML = '<span>➔ <a onclick="selectAndFocusNode(\'' + otherId + '\')">' + otherLabel + '</a></span><small style="color:#94a3b8;">' + e.kind + '</small>';
      calleeList.appendChild(div);
    } else {
      callerCount++;
      div.innerHTML = '<span>⬅ <a onclick="selectAndFocusNode(\'' + otherId + '\')">' + otherLabel + '</a></span><small style="color:#94a3b8;">' + e.kind + '</small>';
      callerList.appendChild(div);
    }
  });

  document.getElementById('countSideCallers').innerText = callerCount;
  document.getElementById('countSideCallees').innerText = calleeCount;
  document.getElementById('sideBridgeCard').style.display = hasBridge ? 'block' : 'none';

  if (callerList.children.length === 0) callerList.innerHTML = '<small style="color:#94a3b8;">Nenhum chamador registrado.</small>';
  if (calleeList.children.length === 0) calleeList.innerHTML = '<small style="color:#94a3b8;">Nenhuma dependência registrada.</small>';
}

function closeInspector() {
  activeSelectedNode = null;
  document.getElementById('sideInspector').style.display = 'none';
}

