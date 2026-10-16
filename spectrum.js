'use strict';

// Client-side PL spectrum demo. Uploaded files stay in the browser and are never sent to a server.
const spectrumState = { points: null, fit: null, source: 'PL demo spectrum', peaks: 3, busy: false };
const spectrumQuery = selector => document.querySelector(selector);

function spectrumRandom(seed = 17) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}
function gaussian(x, center, sigma, amplitude) { return amplitude * Math.exp(-0.5 * ((x - center) / Math.max(1e-6, sigma)) ** 2); }
function createPLDemo() {
  const random = spectrumRandom(), peaks = [[520, 15, 0.74], [585, 21, 0.48], [660, 26, 0.34]];
  return Array.from({ length: 401 }, (_, index) => {
    const x = 400 + index;
    const baseline = 0.035 + (x - 400) * 0.000045;
    const signal = peaks.reduce((sum, [center, sigma, amplitude]) => sum + gaussian(x, center, sigma, amplitude), baseline);
    return { x, y: Math.max(0, signal + (random() - 0.5) * 0.012) };
  });
}
function parseSpectrumText(text) {
  const points = [];
  for (const line of text.split(/\r?\n/)) {
    const numbers = line.trim().replace(/;/g, ',').split(/[\s,]+/).map(Number).filter(Number.isFinite);
    if (numbers.length >= 2) points.push({ x: numbers[0], y: numbers[1] });
  }
  points.sort((a, b) => a.x - b.x);
  const deduped = points.filter((point, index) => index === 0 || point.x !== points[index - 1].x);
  if (deduped.length < 20) throw new Error('至少需要 20 行包含 X、Y 两列的光谱数据。');
  return deduped;
}
function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b), position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}
function initialCenters(points, count) {
  const candidates = points.slice(2, -2).filter((point, index) => {
    const offset = index + 2;
    return point.y >= points[offset - 1].y && point.y >= points[offset + 1].y;
  }).sort((a, b) => b.y - a.y);
  const minDistance = Math.max(16, (points.at(-1).x - points[0].x) / (count * 7));
  const selected = [];
  for (const candidate of candidates) {
    if (selected.every(existing => Math.abs(existing.x - candidate.x) >= minDistance)) selected.push(candidate);
    if (selected.length === count) break;
  }
  while (selected.length < count) selected.push(points[Math.round((selected.length + 1) * (points.length - 1) / (count + 1))]);
  return selected.sort((a, b) => a.x - b.x).map(point => point.x);
}
function buildFit(points, count) {
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  const xMin = xs[0], xMax = xs.at(-1), span = xMax - xMin;
  const edgeCount = Math.max(3, Math.floor(points.length * .05));
  const left = percentile(ys.slice(0, edgeCount), .45), right = percentile(ys.slice(-edgeCount), .45);
  const baseline = { intercept: left, slope: (right - left) / Math.max(1, span) };
  const centers = initialCenters(points, count);
  const params = centers.map(center => ({ center, sigma: Math.max(8, span / 24), amplitude: Math.max(.02, Math.max(...ys) - (baseline.intercept + baseline.slope * (center - xMin))) }));
  const evaluate = candidate => {
    const fitted = xs.map(x => baseline.intercept + baseline.slope * (x - xMin) + candidate.reduce((sum, peak) => sum + gaussian(x, peak.center, peak.sigma, peak.amplitude), 0));
    const sse = fitted.reduce((sum, value, index) => sum + (ys[index] - value) ** 2, 0);
    return { fitted, sse };
  };
  let current = evaluate(params), steps = { center: Math.max(1.2, span / 110), sigma: Math.max(1.2, span / 150), amplitude: Math.max(.004, Math.max(...ys) / 35) };
  for (let iteration = 0; iteration < 110; iteration++) {
    let improved = false;
    for (const key of ['center', 'sigma', 'amplitude']) for (let peakIndex = 0; peakIndex < params.length; peakIndex++) {
      for (const direction of [-1, 1]) {
        const trial = params.map(peak => ({ ...peak }));
        const peak = trial[peakIndex]; peak[key] += direction * steps[key];
        if (key === 'center') peak[key] = Math.min(xMax, Math.max(xMin, peak[key]));
        if (key === 'sigma') peak[key] = Math.min(span / 2, Math.max(3, peak[key]));
        if (key === 'amplitude') peak[key] = Math.max(0, peak[key]);
        const candidate = evaluate(trial);
        if (candidate.sse < current.sse) { params.splice(0, params.length, ...trial); current = candidate; improved = true; }
      }
    }
    if (!improved) { steps.center *= .78; steps.sigma *= .78; steps.amplitude *= .78; }
    if (Math.max(steps.center, steps.sigma, steps.amplitude) < 0.0008) break;
  }
  const mean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const total = ys.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const rmse = Math.sqrt(current.sse / ys.length);
  const r2 = total > 0 ? 1 - current.sse / total : 0;
  const componentCurves = params.map(peak => xs.map(x => gaussian(x, peak.center, peak.sigma, peak.amplitude)));
  const peaks = params.map((peak, index) => ({ index: index + 1, center: peak.center, amplitude: peak.amplitude, sigma: peak.sigma, fwhm: 2.35482 * peak.sigma, area: peak.amplitude * peak.sigma * Math.sqrt(2 * Math.PI) }));
  return { xMin, xMax, baseline, params, peaks, fitted: current.fitted, componentCurves, rmse, r2 };
}
function spectrumPath(points, width, height, padding, xMin, xMax, yMax) {
  const x = value => padding.left + (value - xMin) / Math.max(1e-9, xMax - xMin) * (width - padding.left - padding.right);
  const y = value => height - padding.bottom - value / Math.max(1e-9, yMax) * (height - padding.top - padding.bottom);
  return points.map((point, index) => `${index ? 'L' : 'M'}${x(point.x).toFixed(2)},${y(point.y).toFixed(2)}`).join(' ');
}
function renderSpectrumChart() {
  const canvas = spectrumQuery('#spectrum-canvas'); if (!canvas || !spectrumState.points) return;
  const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, width = Math.max(300, rect.width), height = Math.max(260, rect.height);
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
  const padding = { left: 48, right: 18, top: 22, bottom: 36 }, fit = spectrumState.fit;
  const values = spectrumState.points.map(point => point.y).concat(fit ? fit.fitted : []), yMax = Math.max(...values) * 1.1;
  const xMin = spectrumState.points[0].x, xMax = spectrumState.points.at(-1).x;
  const x = value => padding.left + (value - xMin) / Math.max(1e-9, xMax - xMin) * (width - padding.left - padding.right);
  const y = value => height - padding.bottom - value / Math.max(1e-9, yMax) * (height - padding.top - padding.bottom);
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.lineWidth = 1;
  ctx.strokeStyle = '#d5e3ea'; ctx.fillStyle = '#6d8490';
  for (let i = 0; i <= 4; i++) { const value = yMax * i / 4, yy = y(value); ctx.beginPath(); ctx.moveTo(padding.left, yy); ctx.lineTo(width - padding.right, yy); ctx.stroke(); ctx.fillText(value.toFixed(2), 5, yy + 4); }
  for (let i = 0; i <= 4; i++) { const value = xMin + (xMax - xMin) * i / 4, xx = x(value); ctx.fillText(value.toFixed(0), xx - 14, height - 12); }
  ctx.strokeStyle = '#1b8ca8'; ctx.lineWidth = 1.7; ctx.beginPath(); spectrumState.points.forEach((point, index) => { const xx=x(point.x), yy=y(point.y); index ? ctx.lineTo(xx,yy) : ctx.moveTo(xx,yy); }); ctx.stroke();
  if (fit) {
    ctx.strokeStyle = '#d24d6d'; ctx.lineWidth = 2.2; ctx.beginPath(); fit.fitted.forEach((value,index)=>{const xx=x(spectrumState.points[index].x),yy=y(value);index?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}); ctx.stroke();
    const colors=['#c68a2d','#764fc5','#1e9b73','#d96b31'];
    fit.componentCurves.forEach((curve,index)=>{ctx.strokeStyle=colors[index%colors.length];ctx.lineWidth=1.1;ctx.globalAlpha=.82;ctx.beginPath();curve.forEach((value,i)=>{const xx=x(spectrumState.points[i].x),yy=y(value+fit.baseline.intercept+fit.baseline.slope*(spectrumState.points[i].x-fit.xMin));i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.stroke();ctx.globalAlpha=1;});
  }
}
function spectrumTable() {
  const fit = spectrumState.fit; if (!fit) return '<div class="spectrum-empty">运行拟合后显示峰参数。</div>';
  return `<div class="table-scroll"><table class="spectrum-table"><thead><tr><th>峰</th><th>峰位 / nm</th><th>幅值</th><th>FWHM / nm</th><th>面积</th></tr></thead><tbody>${fit.peaks.map(peak => `<tr><td>Peak ${peak.index}</td><td>${peak.center.toFixed(2)}</td><td>${peak.amplitude.toFixed(4)}</td><td>${peak.fwhm.toFixed(2)}</td><td>${peak.area.toFixed(4)}</td></tr>`).join('')}</tbody></table></div>`;
}
function spectrumSummary() {
  const fit = spectrumState.fit; if (!fit) return '<span>等待拟合</span>';
  return `<span>R² <strong>${fit.r2.toFixed(4)}</strong></span><span>RMSE <strong>${fit.rmse.toFixed(5)}</strong></span><span>峰数 <strong>${fit.peaks.length}</strong></span>`;
}
function spectrumPage() {
  return `${heading('03 / FIT', 'PL 光谱分峰拟合', '上传两列光谱数据或加载示例，计算基线、峰位、FWHM 与峰面积。数据只在当前浏览器中处理。')}
  <div class="spectrum-workspace">
    <aside class="panel spectrum-controls"><span class="eyebrow">PL SPECTRUM / PEAK FIT</span><h2>数据与拟合设置</h2><p class="muted">支持 CSV、TXT、TSV。第一列为波长（nm），第二列为强度。</p><div class="spectrum-actions"><label class="spectrum-file"><input id="spectrum-file" type="file" accept=".csv,.txt,.tsv,text/csv,text/plain"><span>选择光谱文件</span></label><button class="secondary" data-spectrum-action="sample">加载 PL 示例</button></div><div class="spectrum-file-name" id="spectrum-file-name">${spectrumState.source}</div><label for="spectrum-peaks">拟合峰数</label><select id="spectrum-peaks"><option value="1" ${spectrumState.peaks===1?'selected':''}>1 个峰</option><option value="2" ${spectrumState.peaks===2?'selected':''}>2 个峰</option><option value="3" ${spectrumState.peaks===3?'selected':''}>3 个峰</option><option value="4" ${spectrumState.peaks===4?'selected':''}>4 个峰</option></select><button class="primary spectrum-run" data-spectrum-action="fit">运行分峰拟合 <span>${labIcon('arrow')}</span></button><button class="secondary" data-spectrum-action="export" ${spectrumState.fit?'':'disabled'}>导出峰参数 CSV</button><div class="spectrum-method"><strong>当前方法</strong><p>线性基线 + 高斯峰。适合展示 PL 发光峰的峰位、半峰宽和相对面积。</p></div><p class="spectrum-status" id="spectrum-status" aria-live="polite">${spectrumState.busy?'正在计算…':spectrumState.fit?'拟合完成':'请选择文件或加载示例。'}</p></aside>
    <section class="spectrum-main"><div class="panel spectrum-chart-panel"><div class="panel-head"><div><span class="eyebrow">SPECTRUM VIEW</span><h2>强度 / 波长</h2></div><div class="spectrum-legend"><span><i class="raw"></i>原始数据</span><span><i class="fit"></i>总拟合</span></div></div><canvas id="spectrum-canvas" aria-label="PL 光谱原始曲线与拟合曲线"></canvas><div class="spectrum-summary">${spectrumSummary()}</div></div><div class="panel spectrum-results"><div class="panel-head"><div><span class="eyebrow">PEAK PARAMETERS</span><h2>分峰结果</h2></div><span class="muted">Gaussian components</span></div>${spectrumTable()}</div></section>
  </div>`;
}
function updateSpectrumPage() { if (page !== 'spectrum') return; const status=spectrumQuery('#spectrum-status'); if(status)status.textContent=spectrumState.busy?'正在计算…':spectrumState.fit?'拟合完成':'请选择文件或加载示例。'; const name=spectrumQuery('#spectrum-file-name');if(name)name.textContent=spectrumState.source;const select=spectrumQuery('#spectrum-peaks');if(select)select.value=String(spectrumState.peaks);const run=spectrumQuery('[data-spectrum-action="fit"]');if(run)run.disabled=!spectrumState.points||spectrumState.busy;const exportButton=spectrumQuery('[data-spectrum-action="export"]');if(exportButton)exportButton.disabled=!spectrumState.fit;const summary=spectrumQuery('.spectrum-summary');if(summary)summary.innerHTML=spectrumSummary();const results=spectrumQuery('.spectrum-results');if(results){const table=results.querySelector('.table-scroll,.spectrum-empty');if(table)table.outerHTML=spectrumTable();}renderSpectrumChart();}
function loadSpectrum(points, source) { spectrumState.points=points; spectrumState.source=source; spectrumState.fit=null; updateSpectrumPage(); }
function exportSpectrum() { const fit=spectrumState.fit;if(!fit)return;const rows=[['peak','center_nm','amplitude','fwhm_nm','area'],...fit.peaks.map(p=>[p.index,p.center.toFixed(6),p.amplitude.toFixed(8),p.fwhm.toFixed(6),p.area.toFixed(8)])];const blob=new Blob(['\ufeff'+rows.map(row=>row.join(',')).join('\n')],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='pl_peak_fit_results.csv';link.click();URL.revokeObjectURL(link.href);}
document.addEventListener('change', event => { if (event.target.id==='spectrum-file' && event.target.files?.[0]) { const file=event.target.files[0], reader=new FileReader(); reader.onload=()=>{try{loadSpectrum(parseSpectrumText(reader.result),file.name);}catch(error){spectrumState.source='读取失败';updateSpectrumPage();toast(error.message);}};reader.readAsText(file); } if(event.target.id==='spectrum-peaks'){spectrumState.peaks=Number(event.target.value);spectrumState.fit=null;updateSpectrumPage();} });
document.addEventListener('click', event => { const action=event.target.closest('[data-spectrum-action]')?.dataset.spectrumAction;if(!action)return;if(action==='sample'){loadSpectrum(createPLDemo(),'PL demo spectrum');return;}if(action==='export'){exportSpectrum();return;}if(action==='fit'&&spectrumState.points&&!spectrumState.busy){spectrumState.busy=true;updateSpectrumPage();requestAnimationFrame(()=>{spectrumState.fit=buildFit(spectrumState.points,spectrumState.peaks);spectrumState.busy=false;updateSpectrumPage();});} });
window.addEventListener('resize',()=>{if(page==='spectrum')renderSpectrumChart();});
