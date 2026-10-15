'use strict';

// Render the supplied TBC document in isolation so the lab theme cannot alter it.
function realtimeDashboard() {
  return '<iframe class="tbc-frame" src="./tbc.html?v=7.0.0" title="TBC Digital Twin Analytics 实时监控看板"></iframe>';
}
