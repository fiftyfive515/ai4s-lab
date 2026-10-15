'use strict';

// Standalone showcase renderer. All values are generated locally.
const realtimeEvents = [
  { label: '热场分布偏移', device: 1, frame: 8, detail: '热处理段响应偏离参考区间，建议对照载具分组与温区位置。', severity: '待复核' },
  { label: '沉积响应偏低', device: 2, frame: 17, detail: '沉积段出现局部低响应，建议沿流程核查输入与位置分布。', severity: '待复核' },
  { label: '检测覆盖率复核', device: 3, frame: 21, detail: '检测样本覆盖不足，建议先确认数据完整性，再解释指标变化。', severity: '数据核查' }
];

function realtimeChart(values, id, highlight = -1, step = false) {
  const w = 360, h = 185, left = 36, right = 14, top = 18, bottom = 30;
  const min = Math.floor(Math.min(...values) - 1), max = Math.ceil(Math.max(...values) + 1);
  const x = i => left + i / (values.length - 1) * (w - left - right);
  const y = v => h - bottom - (v - min) / (max - min) * (h - top - bottom);
  const line = values.map((v, i) => `${i ? (step ? 'H' + x(i) + 'V' : 'L' + x(i) + ',') : 'M' + x(i) + ','}${y(v)}`).join(' ');
  return `<svg class="rt-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${id}，最近24帧合成响应趋势">
    <defs><linearGradient id="rt-fill-${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    ${Array.from({length: 4}, (_, i) => { const v = min + (max - min) * i / 3; return `<path class="rt-gridline" d="M${left} ${y(v)}H${w-right}"/><text x="${left-7}" y="${y(v)+3}" text-anchor="end">${v.toFixed(1)}</text>`; }).join('')}
    <path d="${line}L${x(values.length-1)} ${h-bottom}H${left}Z" fill="url(#rt-fill-${id})" stroke="none"/>
    <path d="${line}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    ${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i===highlight?5:2}" class="${i===highlight?'rt-highlight':''}" fill="currentColor"><title>第 ${i+1} 帧：${v.toFixed(2)} a.u.</title></circle>`).join('')}
    ${[0,6,12,18,23].map(i => `<text x="${x(i)}" y="${h-9}" text-anchor="middle">F${String(i+1).padStart(2,'0')}</text>`).join('')}
  </svg>`;
}

function realtimeTopology(frame) {
  const positions = [[108,130],[402,130],[402,340],[108,340]];
  const selected = opsState.device;
  const event = opsState.alert === null ? null : realtimeEvents[opsState.alert];
  const path = 'M108 130H402V340H108';
  return `<svg class="rt-topology" viewBox="0 0 510 445" role="group" aria-label="四单元数字孪生流程拓扑">
    <defs><radialGradient id="rt-core-glow"><stop stop-color="#43dce7" stop-opacity=".3"/><stop offset="1" stop-color="#43dce7" stop-opacity="0"/></radialGradient></defs>
    <circle cx="255" cy="230" r="160" fill="url(#rt-core-glow)"/>
    <circle cx="255" cy="230" r="110" class="rt-orbit" fill="none" stroke="#a2d9e7" stroke-dasharray="3 9"/>
    <circle cx="255" cy="230" r="80" fill="none" stroke="#bde0ea"/>
    <text class="rt-center-title" x="255" y="221" text-anchor="middle">DIGITAL TWIN</text>
    <text class="rt-center-sub" x="255" y="242" text-anchor="middle">PROCESS INTELLIGENCE</text>
    <path d="${path}" class="rt-path-bg"/>
    <path id="rt-flow" d="${path}" class="rt-flow ${event?'tracing':''}"/>
    ${positions.map(([x,y],i) => {
      const flagged = event?.device === i;
      const value = (99+i*.7+Math.sin((frame.tick+i)*.3)*1.2-(flagged?3:0)).toFixed(2);
      return `<g transform="translate(${x} ${y})" class="rt-node ${selected===i?'selected':''} ${flagged?'flagged':''}" data-rt-node="${i}" tabindex="0" role="button" aria-label="选择${opsNames[i]}" aria-pressed="${selected===i}">
        <circle class="rt-ring" r="53"/><circle class="rt-ring-inner" r="43"/>
        <circle class="rt-core" r="33"/>
        <text class="rt-node-number" text-anchor="middle" y="-2">0${i+1}</text>
        <text class="rt-node-value" text-anchor="middle" y="14">${value}</text>
        <rect x="-54" y="67" width="108" height="27" rx="4" class="rt-label-bg"/>
        <text class="rt-node-label" text-anchor="middle" y="85">${opsNames[i]}</text>
        ${flagged?'<circle cx="38" cy="-39" r="9" class="rt-alert-mark"/><text x="38" y="-35" text-anchor="middle" class="rt-alert-text">!</text>':''}
      </g>`;
    }).join('')}
  </svg>`;
}

function realtimeDashboard() {
  const frame = opsFrame(), event = opsState.alert === null ? null : realtimeEvents[opsState.alert];
  const film = frame.series.map((v,i) => v + Math.cos(i*.3));
  const uniformity = frame.series.map((v,i) => 98 + Math.cos((i+frame.tick)*.22)*1.5);
  const time = new Date().toLocaleTimeString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false});
  const date = new Date().toLocaleDateString('zh-CN', {timeZone:'Asia/Shanghai'});
  return `${heading('SYSTEM SIMULATION / DIGITAL TWIN', '实时监控总览', '将时序信号、异常线索与流程路径放在同一个视野。点击异常卡片，探索联动分析。')}
  <div class="rt-console ops-console ${opsState.paused?'is-paused':''}">
    <header class="rt-header rt-glass">
      <div class="rt-identity"><div class="rt-atom" aria-hidden="true">◎</div><div><span class="rt-kicker">AI4S / PROCESS INTELLIGENCE</span><h2>Digital Twin Analytics</h2><p>实时数据预警与流程溯源</p></div></div>
      <div class="rt-system"><span class="rt-online"><i></i> ${opsState.paused?'已暂停':'演示运行中'}</span><div class="rt-clock"><b>${time}</b><span>${date} · CST</span></div></div>
    </header>
    <div class="rt-tool-row"><span class="rt-caption">SYNTHETIC SIGNALS · 4 PROCESS UNITS</span>${opsControls()}</div>
    <div class="rt-layout">
      <div class="rt-column">
        <section class="rt-glass rt-trend"><div class="rt-section-head"><div><span class="rt-kicker">RESPONSE MODEL</span><h3>综合响应趋势</h3></div><span class="rt-chip">24 帧</span></div><div class="rt-metric">${frame.series.at(-1).toFixed(2)}<small>a.u.</small><span>合成响应</span></div>${realtimeChart(frame.series,'response',event?.frame??-1)}<div class="rt-chart-legend"><i></i>观测响应 <i class="alert"></i>选中异常</div></section>
        <section class="rt-glass rt-alert-panel"><div class="rt-section-head"><div><span class="rt-kicker">ANOMALY TRACING</span><h3>异常追溯</h3></div><span class="rt-chip warning">03 待复核</span></div><div class="rt-alert-list">${realtimeEvents.map((e,i) => `<button class="rt-alert ${opsState.alert===i?'selected':''}" data-rt-alert="${i}" aria-pressed="${opsState.alert===i}"><span class="rt-alert-symbol">!</span><span><b>匿名样本 ${String.fromCharCode(65+i)}</b><small>${e.label}</small><em>F${String(e.frame+1).padStart(2,'0')} · ${e.severity}</em></span><span class="rt-arrow">↗</span></button>`).join('')}</div><p class="rt-footnote">预设的合成异常，仅用于演示核查流程。</p></section>
      </div>
      <section class="rt-glass rt-map"><div class="rt-section-head"><div><span class="rt-kicker">PROCESS TOPOLOGY MAPPING</span><h3>流程拓扑映射</h3></div><div class="rt-batch"><span>TARGET BATCH</span><b>${event?'SAMPLE_'+String.fromCharCode(65+opsState.alert):'LIVE_AVG_MODE'}</b></div></div>${realtimeTopology(frame)}<div class="rt-diagnostic" aria-live="polite"><span class="rt-diagnostic-icon" aria-hidden="true">⌘</span><div><span class="rt-kicker">DIAGNOSTIC OUTPUT</span><h4>${opsNames[opsState.device]} · ${event?(event.device===opsState.device?event.label:'路径对照'):'总体观测'}</h4><p>${event?(event.device===opsState.device?event.detail:'当前查看异常路径中的'+opsNames[opsState.device]+'。待复核标记位于'+opsNames[event.device]+'，可继续点击节点对照。'):'各单元正在回放合成响应。选择节点查看观测对象，或点击异常卡片定位复核环节。'}</p></div>${event?'<button class="rt-reset" data-ops-action="clear-alert">恢复总览 ↺</button>':''}</div><div class="rt-map-note"><span><i></i> 流程连线</span><span><i class="alert"></i> 待复核环节</span><span>点击任意节点查看</span></div></section>
      <div class="rt-column">
        <section class="rt-glass rt-trend"><div class="rt-section-head"><div><span class="rt-kicker">DEPOSITION / NORMALIZED</span><h3>膜厚响应指数</h3></div><span class="rt-icon">▱</span></div><div class="rt-metric">${film.at(-1).toFixed(2)}<small>a.u.</small><span class="rt-stable">演示信号</span></div>${realtimeChart(film,'film')}<p class="rt-footnote">归一化响应 · 无真实工艺参数</p></section>
        <section class="rt-glass rt-trend rt-secondary"><div class="rt-section-head"><div><span class="rt-kicker">UNIFORMITY / NORMALIZED</span><h3>均匀性响应指数</h3></div><span class="rt-icon">⌁</span></div><div class="rt-metric">${uniformity.at(-1).toFixed(2)}<small>a.u.</small><span class="rt-stable">演示信号</span></div>${realtimeChart(uniformity,'uniformity',-1,true)}<p class="rt-footnote">独立合成曲线 · 24 帧滚动回放</p></section>
      </div>
    </div>
    <div class="rt-bottom"><span><i class="rt-pulse"></i> 演示链路运行正常</span><p>信号观测 → 异常定位 → 流程复核 → 载具追溯</p><a href="#carriers">探索载具路径 <span>→</span></a></div>
  </div>
  <p class="rt-page-note">场景由原项目交互思路抽离，数据为独立合成。异常标记用于提出复核线索，不代表因果诊断。</p>`;
}

document.addEventListener('click', event => {
  const alert = event.target.closest('[data-rt-alert]');
  if (alert) {
    opsState.alert = Number(alert.dataset.rtAlert);
    opsState.device = realtimeEvents[opsState.alert].device;
    opsState.group = (opsState.alert + opsState.device) % 3;
    render();
  }
  const node = event.target.closest('[data-rt-node]');
  if (node) { opsState.device = Number(node.dataset.rtNode); render(); }
});
document.addEventListener('keydown', event => {
  if (event.target.matches('[data-rt-node]') && ['Enter',' '].includes(event.key)) {
    event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  }
});
