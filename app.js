'use strict';

// 展示站仅使用确定性生成的合成数据；不导入主平台模块或任何本地数据文件。
const $ = (selector, root = document) => root.querySelector(selector);
const names = { overview: '实验室总览', monitor: '数据观测', data: '数据与特征', spectrum: '谱图拟合', structure: '结构可视化', models: '模型评测', experiment: '实验配方推演', trace: '分析工作流', efficiency: '关联分析', about: '关于 Lab', realtime: '实时监控总览', carriers: '载具路径追溯' };
const state = { process: 'signals', window: '24', search: '', model: 'boost', temperature: 50, duration: 50, flow: 50, carrier: 'DEMO-C001', twinTube: 1, twinZones: [0,0,0,0,0,0], twinBoat: 4, twinTab: 'thermal', twinApplied: null };
const processes = {
  signals: { title: 'Signal Regression / LPCVD 案例', target: '膜厚响应', unit: 'a.u.', base: 100, features: 3, seed: 11 },
  response: { title: 'Multivariate Study', target: '响应', unit: 'a.u.', base: 80, features: 3, seed: 29 },
  robust: { title: 'Robustness Study', target: '响应', unit: 'a.u.', base: 120, features: 3, seed: 47 },
};
function random(seed) { let value = seed >>> 0; return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; }; }
function makeBatches(process) {
  const p = processes[process], rand = random(p.seed);
  return Array.from({ length: 48 }, (_, i) => {
    const temperature = 30 + rand() * 40, duration = 25 + rand() * 50, flow = 35 + rand() * 30;
    const value = p.base + (temperature - 50) * .17 + (duration - 50) * .21 + (flow - 50) * .08 + (rand() - .5) * 1.3;
    const prediction = value + (rand() - .5) * 2.4;
    return { id: `DEMO-${process.toUpperCase()}-${String(i + 1).padStart(3, '0')}`, tube: `V-${i % 4 + 1}`, temperature, duration, flow, value, prediction, cv: 1.1 + rand() * 2.2, coverage: i % 13 === 0 ? 92.4 : 98 + rand() * 2, warning: i % 13 === 0, hour: i / 2, carrier: `DEMO-C${String(i % 6 + 1).padStart(3, '0')}` };
  });
}
const datasets = Object.fromEntries(Object.keys(processes).map(p => [p, makeBatches(p)]));
const modules = [
  ['realtime','realtime','SYSTEM / MONITOR','实时监控总览','合成时序信号、异常标记与流程拓扑观测。','DYNAMIC MONITORING · TRACE CONTEXT'],
  ['carriers','carriers','SYSTEM / TRACE','载具路径追溯','匿名载具分组、流程路径与空间分布分析。','TOPOLOGY · SPATIAL ENRICHMENT'],
  ['monitor', 'monitor', '01 / OBSERVE', '数据观测与预警', '时序样本观测、采样覆盖率检查与异常标记。', 'TIME SERIES · ANOMALY DETECTION'],
  ['data', 'data', '02 / ENGINEER', '数据与特征', '合成数据整理、特征定义与样本质量检查。', 'DATA PIPELINE · FEATURE ENGINEERING'],
  ['spectrum', 'spectrum', '03 / FIT', '谱图拟合', '上传或选择 PL 光谱，计算基线、峰位、半峰宽与峰面积。', 'PL SPECTRUM · PEAK DECOMPOSITION'],
  ['structure', 'structure', '04 / STRUCTURE', '结构可视化', '查看分子与晶体的三维结构、晶胞、原子表和格式转换。', 'MOLECULES · CRYSTALS · 3D VIEW'],
  ['models', 'models', '05 / LEARN', '模型评测', '基于相同训练集和留出集比较回归模型误差。', 'REGRESSION · MODEL EVALUATION'],
  ['experiment', 'experiment', '05 / SIMULATE', '实验配方推演', '在设定参数下计算温区与舟位响应。', 'WHAT-IF · RESPONSE SIMULATION'],
  ['trace', 'trace', '06 / ORCHESTRATE', '分析工作流', '记录数据读取、质量检查、拟合与评估的计算结果。', 'TOOL USE · OBSERVABLE WORKFLOW'],
  ['efficiency', 'efficiency', '07 / CONNECT', '关联分析', '计算输入特征与目标响应的 Pearson 相关系数。', 'CORRELATION · INTERPRETABILITY'],
];
const processSelect = () => `<label for="process">实验数据集</label><select id="process">${Object.entries(processes).map(([key, p]) => `<option value="${key}" ${state.process === key ? 'selected' : ''}>${p.title}</option>`).join('')}</select>`;
const heading = (eyebrow, title, subtitle) => `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="date-stamp">INDEPENDENT AI LAB<span> / 2026</span><br>DATA · METHODS · EXPERIMENTS</div></div>`;
function sparkline(seed = 1, color = '#c1f879') { const rand = random(seed); return `<svg class="sparkline" viewBox="0 0 70 28" aria-hidden="true"><path d="${Array.from({ length: 13 }, (_, i) => `${i ? 'L' : 'M'}${i * 5.8},${24 - i * 1.2 - rand() * 9}`).join(' ')}" fill="none" stroke="${color}" stroke-width="1.4"/></svg>`; }
const stat = (label, value, unit, note, seed = 1) => `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}<small>${unit}</small></div><div class="stat-note">${note}</div>${sparkline(seed)}</div>`;
function art() {
  const rings = Array.from({ length: 17 }, (_, i) => `<ellipse cx="240" cy="143" rx="${88 + i * 2.3}" ry="${20 + i * 3.6}" fill="none" stroke="${i % 3 ? '#91bd61' : '#d4ff91'}" stroke-opacity="${.15 + i * .025}" stroke-width=".7" transform="rotate(-28 240 143)"/>`).join('');
  return `<div class="hero-art"><span class="art-label top">FEATURE SPACE / MODEL REPRESENTATION</span><svg viewBox="0 0 480 285" aria-label="抽象智能网络轨道图"><defs><radialGradient id="glow"><stop stop-color="#cbff86" stop-opacity=".22"/><stop offset="1" stop-color="#cbff86" stop-opacity="0"/></radialGradient><linearGradient id="core"><stop stop-color="#d7ffa7"/><stop offset="1" stop-color="#80b34d"/></linearGradient></defs><circle cx="240" cy="143" r="140" fill="url(#glow)"/><g>${rings}</g><g class="orbital"><ellipse cx="240" cy="140" rx="162" ry="65" transform="rotate(32 240 140)" stroke="#b6e67e" stroke-opacity=".3" fill="none"/><circle cx="379" cy="208" r="4" fill="#d1ffa0"/></g><g class="orbital reverse"><ellipse cx="240" cy="140" rx="175" ry="40" transform="rotate(-40 240 140)" stroke="#b6e67e" stroke-opacity=".45" fill="none" stroke-dasharray="2 6"/><circle cx="111" cy="238" r="3" fill="#d1ffa0"/></g><path d="M240 107 L270 125 L270 160 L240 179 L210 160 L210 125Z" fill="#1e2d16" stroke="#b8eb7f"/><path d="M210 125 L240 143 L270 125 M240 143V179 M240 107V142" stroke="url(#core)" stroke-width="1" fill="none"/><circle cx="240" cy="143" r="5" fill="#d4ff9f"/><path d="M105 98H147L169 120 M309 185L333 205H388" stroke="#6b8854" fill="none"/><text x="71" y="89" fill="#a0ba8b" font-size="8" font-family="Consolas">DATA IN</text><text x="347" y="220" fill="#a0ba8b" font-size="8" font-family="Consolas">MODEL OUTPUT</text></svg><span class="art-label bottom">SYNTHETIC DATA / CONTROLLED EVALUATION</span></div>`;
}
function chart(values, second, opts = {}) {
  const width = 650, height = opts.height || 220, left = 43, right = 20, top = 18, bottom = 32;
  const all = [...values, ...(second || [])], min = Math.min(...all) - 2, max = Math.max(...all) + 2;
  const x = i => left + i / Math.max(1, values.length - 1) * (width - left - right), y = v => height - bottom - (v - min) / (max - min || 1) * (height - top - bottom);
  const path = series => series.map((v, i) => `${i ? (opts.step ? `H${x(i)}V` : `L${x(i)},`) : `M${x(i)},`}${y(v)}`).join(' ');
  return `<svg class="chart" role="img" aria-label="${opts.label || '合成数据趋势图'}" viewBox="0 0 ${width} ${height}">${Array.from({ length: 5 }, (_, i) => { const v = min + (max - min) * i / 4; return `<path d="M${left},${y(v)}H${width - right}" stroke="#30392b" stroke-dasharray="3 5"/><text x="${left - 8}" y="${y(v) + 3}" text-anchor="end">${v.toFixed(1)}</text>`; }).join('')}${(opts.allTicks ? values.map((_, i) => i / Math.max(1, values.length - 1)) : [0, .25, .5, .75, 1]).map(t => `<text x="${left + t * (width - left - right)}" y="${height - 9}" text-anchor="middle">${opts.xLabels ? opts.xLabels[Math.round(t * (opts.xLabels.length - 1))] : `${Math.round(t * 24)}:00`}</text>`).join('')}<path d="${path(values)}" fill="none" stroke="#c1f879" stroke-width="2" stroke-linejoin="round"/>${second ? `<path d="${path(second)}" fill="none" stroke="#72bfb5" stroke-width="1.7" stroke-dasharray="4 4"/>` : ''}${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="2.3" fill="#c1f879"><title>${opts.pointLabel || '合成样本'} ${i + 1}：${v.toFixed(2)} a.u.</title></circle>`).join('')}</svg>`;
}
function overview() {
  const data = datasets.signals.slice(0, 24);
  return `${heading('AI RESEARCH LAB / RESEARCH OVERVIEW', 'AI Research Lab', '实验数据、回归模型与参数响应。')}
    <section class="hero lab-hero"><div class="hero-copy"><span class="eyebrow">AI RESEARCH LAB / METHODS & EVALUATION</span><h2>实验数据分析<br><em>与模型评估</em></h2><p>比较回归方法的预测误差，分析输入变量与响应之间的关系。<br>通过实验配方推演考察空间分布与均匀性变化。</p><div class="hero-actions"><a class="primary" href="#realtime">实时观测 <span>${labIcon('arrow')}</span></a><a class="secondary" href="#experiment">实验配方推演 <span>${labIcon('arrow')}</span></a></div><div class="lab-hero-tags"><span>APPLIED ML</span><span>MODEL EVALUATION</span><span>COMPUTATIONAL EXPERIMENTS</span></div></div>${art()}</section>
    <div class="lab-strip"><span><i class="mint-dot"></i> DATA / MODELS / EXPERIMENTS</span><span>特征分析 · 回归评估 · 实验配方推演</span></div>
    <div class="visit-path"><span>研究内容</span><a href="#realtime"><b>01</b>实时监控</a><i>/</i><a href="#models"><b>02</b>模型评测</a><i>/</i><a href="#experiment"><b>03</b>实验配方推演</a></div>
    <div class="stats">${stat('实验数据集', '03', '组', '<span class="up">144 个样本</span> 3 个数据集', 2)}${stat('回归方法', '02', '种', '<span class="up">kNN + 线性回归</span> 统一训练与评估协议', 4)}${stat('分析模块', '08', '个', '<span class="up">特征构建 · 模型评估 · 结果分析</span>', 7)}${stat('评测协议', '32 / 16', '', '<span class="up">训练 / 留出</span> 每数据集', 9)}</div>
    <div class="section-heading"><h2>研究模块 <small>RESEARCH MODULES</small></h2><span>数据、模型与实验</span></div>
    <section class="module-grid">${modules.map(([page, icon, index, title, desc, tags]) => `<a class="module-card" href="#${page}"><div class="module-top"><span class="module-icon">${labIcon(icon)}</span><small>${index}</small></div><h3>${title}</h3><p>${desc}</p><div class="module-foot"><span>${tags}</span><span>${labIcon('arrow')}</span></div></a>`).join('')}</section>
    <section class="bottom-grid"><div class="panel"><div class="panel-head"><h2>实验记录 / Signal Regression</h2><small>EXPERIMENT 001 · SYNTHETIC DATA</small></div><p class="muted">含噪声合成数据的线性回归拟合与留出集评估。</p><div class="legend"><span><i style="background:#c1f879"></i>合成观测</span><span><i style="background:#72bfb5"></i>线性回归输出</span></div>${chart(data.map(d => d.value), modelStats(datasets.signals, 'linear').predictions.slice(0,24), { height: 180, xLabels: ['S01', 'S06', 'S12', 'S18', 'S24'] })}<a class="text-button" href="#models">查看独立留出集评测</a></div><div class="panel"><div class="panel-head"><h2>研究流程</h2><span class="eyebrow">METHODS & EVALUATION</span></div><div class="skill-list"><div class="skill"><span>01</span><div><strong>Data / 数据与特征</strong><small>合成数据 · 特征设计 · 基线建模</small></div><i>${labIcon('check')}</i></div><div class="skill"><span>02</span><div><strong>Model / 模型评估</strong><small>留出集验证 · 误差度量 · 预测器比较</small></div><i>${labIcon('check')}</i></div><div class="skill"><span>03</span><div><strong>Analysis / 结果分析</strong><small>特征关联 · 响应扫描 · 分析工作流</small></div><i>${labIcon('check')}</i></div></div><div class="bottom-note">记录数据分析、模型比较与实验配方推演的结果。</div></div></section>`;
}
function batchTable(data, full = false) {
  return `<div class="table-scroll"><table><thead><tr><th>合成样本</th><th>样本分组</th>${full ? `<th>${caseFeatureNames()[0]}</th><th>${caseFeatureNames()[1]}</th>` : ''}<th>观测响应 / a.u.</th><th>CV / %</th><th>覆盖率</th><th>状态</th></tr></thead><tbody>${data.length ? data.map(d => `<tr><td>${d.id}</td><td>${d.tube}</td>${full ? `<td>${d.temperature.toFixed(1)}</td><td>${d.duration.toFixed(1)}</td>` : ''}<td>${d.value.toFixed(2)}</td><td>${d.cv.toFixed(2)}</td><td>${d.coverage.toFixed(1)}%</td><td><span class="status ${d.warning ? 'warn' : ''}">${d.warning ? '覆盖率预警' : '正常'}</span></td></tr>`).join('') : '<tr><td colspan="8" class="empty">没有匹配的合成样本，请调整搜索条件。</td></tr>'}</tbody></table></div>`;
}
function currentData() { return datasets[state.process].filter(d => d.hour < Number(state.window)); }
function monitor() {
  const p = processes[state.process], data = currentData(), warnings = data.filter(d => d.warning).length, mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  return `${heading('01 / OBSERVE', '样本趋势与数据质量观测', '显示合成时序样本及采样覆盖率；覆盖率低于 95% 时标记为待复核。')}<div class="toolbar">${processSelect()}<label for="window">时间窗口</label><select id="window"><option value="24" ${state.window === '24' ? 'selected' : ''}>24 小时窗口</option><option value="12" ${state.window === '12' ? 'selected' : ''}>12 小时窗口</option></select><button class="secondary" data-action="playback">回放合成样本</button></div><div class="stats">${stat('窗口内样本', data.length, '条', '每 30 分钟一个合成样本')}${stat(`平均${p.target}`, mean.toFixed(2), 'a.u.', '无量纲演示值', 3)}${stat('覆盖率预警', warnings, '条', '阈值规则：覆盖率低于 95%', 5)}${stat('样本分组', 4, '组', 'V-1 / V-2 / V-3 / V-4', 8)}</div><div class="panel"><div class="panel-head"><h2>${p.title} · ${p.target}趋势</h2><span class="status">合成数据回放</span></div><div class="legend"><span><i style="background:#c1f879"></i>合成观测值</span><span><i style="background:#72bfb5"></i>合成参考值</span></div><div id="monitor-chart">${chart(data.map(d => d.value), data.map(d => d.prediction), { label: `${p.title} 合成样本趋势`, xLabels: ['B01', `B${Math.ceil(data.length / 4)}`, `B${Math.ceil(data.length / 2)}`, `B${Math.ceil(data.length * .75)}`, `B${data.length}`] })}</div></div><div class="section-heading" style="margin-top:25px"><h2>最近样本</h2><span>按样本索引展示 · 下表为最近 10 条</span></div>${batchTable(data.slice(-10))}`;
}
const featureNames = ['特征 A · 加权均值', '特征 B · 窗口长度', '特征 C · 累积强度', '梯度特征', '稳定性特征', '累积特征'];
function bars(values, labels = featureNames) { return `<div class="feature-bars">${values.map((v, i) => `<div class="feature-row"><span>${labels[i]}</span><div class="bar-track"><span style="width:${Math.abs(v) * 100}%"></span></div><span>${v.toFixed(2)}</span></div>`).join('')}</div>`; }
function dataPage() {
  const data = datasets[state.process], p = processes[state.process];
  return `${heading('02 / ENGINEER', '信号处理与特征数据集', '查看信号阶段、输入特征、响应变量及样本质量。')}<div class="toolbar">${processSelect()}<input type="search" id="batch-search" placeholder="搜索样本编号或分组，如 V-1" aria-label="搜索合成样本"><button class="primary" data-action="export">导出数据</button></div><div class="two-col"><div class="panel"><div class="panel-head"><h2>信号阶段与设定值</h2><small>归一化指数 · 阶梯保持</small></div>${chart([12, 12, 38, 38, 63, 63, 78, 78, 78, 41, 41, 12], null, { step: true, xLabels: ['基线', '激励', '增强', '稳定', '恢复'], label: '合成信号设定值阶梯曲线' })}<div class="legend"><span><i style="background:#c1f879"></i>信号设定指数</span><span>采用零阶保持表示分阶段设定值</span></div></div><div class="panel"><h2>${p.title} 特征概览</h2><p class="muted">${p.features} 维输入特征 · 当前模型使用 A / B / C</p><div class="mini-stats"><div><small>合成样本</small><b>48</b></div><div><small>信号阶段</small><b>5</b></div><div><small>质量预警</small><b>4</b></div></div><p class="muted">A / B / C 对应：${caseFeatureNames().join("、")}。各特征使用相同的归一化尺度；覆盖率与离散度用于数据质量评估。</p></div></div><div class="section-heading" style="margin-top:26px"><h2>数据集预览</h2><span id="result-count">共 48 条 · 默认展示前 12 条</span></div><div id="batch-table">${batchTable(data.slice(0, 12), true)}</div><div class="callout">特征 A、B、C 均采用 0–100 的归一化尺度；覆盖率与 CV 用于检查样本质量。</div>`;
}
// 固定前 32 条样本用于训练，最后 16 条用于独立评测。
function modelStats(data, model) {
  const train = data.slice(0, 32), testStart = 32;
  const vector = d => [1, d.temperature / 100, d.duration / 100, d.flow / 100];
  const matrix = Array.from({ length: 4 }, () => Array(5).fill(0));
  for (const d of train) { const x = vector(d); for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) matrix[i][j] += x[i] * x[j]; matrix[i][4] += x[i] * d.value; } }
  for (let i = 0; i < 4; i++) {
    let pivot = i; for (let j = i + 1; j < 4; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const scale = matrix[i][i]; for (let j = i; j < 5; j++) matrix[i][j] /= scale;
    for (let k = 0; k < 4; k++) if (k !== i) { const factor = matrix[k][i]; for (let j = i; j < 5; j++) matrix[k][j] -= factor * matrix[i][j]; }
  }
  const coefficients = matrix.map(row => row[4]);
  const baseline = train.reduce((sum, d) => sum + d.value, 0) / train.length;
  const predictions = data.map(d => {
    if (model === 'baseline') return baseline;
    if (model === 'linear') return vector(d).reduce((sum, v, i) => sum + v * coefficients[i], 0);
    const neighbors = train.map(t => ({ value: t.value, distance: Math.hypot((d.temperature - t.temperature) / 100, (d.duration - t.duration) / 100, (d.flow - t.flow) / 100) })).sort((a,b) => a.distance - b.distance).slice(0,5);
    const weights = neighbors.map(n => 1 / Math.max(n.distance, .00001));
    return neighbors.reduce((sum, n, i) => sum + n.value * weights[i], 0) / weights.reduce((a,b) => a + b, 0);
  });
  const test = data.slice(testStart), testPredictions = predictions.slice(testStart), mean = test.reduce((sum,d) => sum + d.value, 0) / test.length;
  const mse = test.reduce((sum,d,i) => sum + (d.value - testPredictions[i]) ** 2, 0) / test.length;
  const variance = test.reduce((sum,d) => sum + (d.value - mean) ** 2, 0) / test.length;
  return { predictions, coefficients, trainCount: train.length, testCount: test.length, r2: 1 - mse / variance, rmse: Math.sqrt(mse), mae: test.reduce((sum,d,i) => sum + Math.abs(d.value - testPredictions[i]), 0) / test.length };
}
function models() {
  const data = datasets[state.process], result = modelStats(data, state.model), test = data.slice(32);
  const linear = modelStats(data, 'linear'), magnitude = linear.coefficients.slice(1).map(Math.abs), total = magnitude.reduce((a,b) => a+b,0);
  return `${heading('03 / LEARN', '回归模型比较与独立样本评估', '比较 kNN、线性回归与均值基线在相同独立留出集上的预测误差。')}<div class="toolbar">${processSelect()}<label for="model">预测器</label><select id="model"><option value="boost" ${state.model === 'boost' ? 'selected' : ''}>kNN 回归 · k = 5</option><option value="linear" ${state.model === 'linear' ? 'selected' : ''}>线性回归 · 最小二乘</option><option value="baseline" ${state.model === 'baseline' ? 'selected' : ''}>训练均值基线</option></select><span class="status">32 TRAIN / 16 HOLDOUT</span></div><div class="stats">${stat('留出集 R²', result.r2.toFixed(3), '', '仅使用后 16 条样本计算')}${stat('留出集 RMSE', result.rmse.toFixed(3), 'a.u.', '不使用评测样本拟合', 4)}${stat('留出集 MAE', result.mae.toFixed(3), 'a.u.', '不使用评测样本拟合', 7)}${stat('评测样本', result.testCount, '条', '32 条训练 · 16 条独立评测', 10)}</div><div class="two-col"><div class="panel"><div class="panel-head"><h2>独立留出集 / 观测与预测</h2><small>${processes[state.process].title}</small></div><div class="legend"><span><i style="background:#c1f879"></i>合成观测</span><span><i style="background:#72bfb5"></i>模型预测</span></div>${chart(test.map(d => d.value), result.predictions.slice(32), { xLabels: ['S33', 'S37', 'S41', 'S44', 'S48'], height: 260 })}</div><div class="panel"><h2>线性回归系数</h2><p class="muted">对相同尺度的输入拟合后，将回归系数绝对值归一化。</p>${bars(magnitude.map(v => v / total), caseFeatureNames())}<div class="bottom-note">来自实际拟合系数；仅解释线性模型，不表示其他预测器的特征重要性。</div></div></div><div class="callout">评测协议：前 32 条样本训练，后 16 条样本评测。kNN 使用归一化特征的欧氏距离与距离加权；线性回归拟合截距与三个特征系数。所有指标均由合成实验数据计算，泛化能力需使用独立实验数据检验。</div><div class="panel"><div class="panel-head"><h2>模型对照实验</h2><small>相同训练集 · 相同留出集</small></div><div class="table-scroll"><table><thead><tr><th>预测器</th><th>R²</th><th>RMSE</th><th>MAE</th><th>评测集</th></tr></thead><tbody>${[['boost', 'kNN / k = 5'], ['linear', '线性回归 / OLS'], ['baseline', '训练均值基线']].map(([id, name]) => { const m = modelStats(data, id); return `<tr><td>${name}</td><td>${m.r2.toFixed(3)}</td><td>${m.rmse.toFixed(3)}</td><td>${m.mae.toFixed(3)}</td><td>16 条留出样本</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function predict() { return 100 + (state.temperature - 50) * .17 + (state.duration - 50) * .21 + (state.flow - 50) * .08; }
function experiment() { return twinExperiment(); }
function updatePrediction() { updateTwinDraft(); }
function trace() {
  const run = Number(state.carrier.slice(-3)), dataset = Object.keys(datasets)[(run - 1) % 3], data = datasets[dataset], result = modelStats(data, 'linear');
  const steps = [
    ['读取数据', 'DATA TOOL', `${data.length} 个合成样本 / ${processes[dataset].title}`],
    ['质量检查', 'VALIDATION TOOL', `${data.filter(d => d.warning).length} 条覆盖率预警 / 规则检查`],
    ['拟合模型', 'REGRESSION TOOL', `${result.trainCount} 条训练样本 / 线性回归`],
    ['独立评测', 'EVALUATION TOOL', `${result.testCount} 条留出样本 / RMSE ${result.rmse.toFixed(3)}`],
    ['组织结论', 'REPORT TEMPLATE', '根据结构化结果生成摘要'],
  ];
  return `${heading('05 / ORCHESTRATE', '分析任务编排与执行记录', '记录数据读取、质量检查、模型拟合、独立评测与摘要生成的计算过程。')}<div class="toolbar"><label for="carrier">分析运行</label><select id="carrier">${Array.from({ length: 6 }, (_, i) => `DEMO-C${String(i + 1).padStart(3, '0')}`).map((id,i) => `<option value="${id}" ${id === state.carrier ? 'selected' : ''}>LAB-RUN-${String(i+1).padStart(3,'0')}</option>`).join('')}</select><span class="status">分析步骤</span></div><div class="panel"><div class="panel-head"><h2>LAB-RUN-${String(run).padStart(3,'0')} / 分析链路</h2><small>OBSERVABLE AI WORKFLOW</small></div><div class="flow">${steps.map(([title,tool],i) => `${i ? '<div class="flow-arrow">/</div>' : ''}<div class="flow-step"><span>${labIcon(['data','check','models','monitor','document'][i])}</span><strong>${title}</strong><small>${tool}</small></div>`).join('')}</div></div><div class="stats">${stat('工具阶段', 5, '步', '数据读取至结果汇总')}${stat('训练样本', result.trainCount, '条', '从合成数据集读取',3)}${stat('留出样本',result.testCount,'条','不参与拟合',6)}${stat('评测 RMSE',result.rmse.toFixed(3),'a.u.','当前运行即时计算',9)}</div><div class="panel"><div class="panel-head"><h2>执行证据</h2><span class="eyebrow">INPUT → TOOL → OUTPUT</span></div><div class="table-scroll"><table><thead><tr><th>阶段</th><th>工具</th><th>输出证据</th><th>状态</th></tr></thead><tbody>${steps.map(([title,tool,evidence],i) => `<tr><td>0${i+1} / ${title}</td><td>${tool}</td><td>${evidence}</td><td><span class="status">已完成</span></td></tr>`).join('')}</tbody></table></div></div><div class="callout">运行摘要：${processes[dataset].title} 的线性回归在 16 条留出样本上取得 R² ${result.r2.toFixed(3)}、MAE ${result.mae.toFixed(3)} a.u.。数据质量规则发现 4 条覆盖率预警，未自动剔除。</div><p class="muted">分析记录包括各阶段的输入、计算结果与质量标记，可对照样本和评测指标逐步复核。</p>`;
}
function correlation(a, b) { const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length, ma = mean(a), mb = mean(b); return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0)); }
function efficiency() {
  const data = datasets[state.process], rand = random(71), target = data.map(d => 50 + (d.value - processes[state.process].base) * .6 + (rand() - .5) * 4);
  const features = ['temperature', 'duration', 'flow', 'cv'], corr = features.map(key => correlation(data.map(d => d[key]), target));
  const points = data.map((d, i) => `<circle cx="${45 + (d.value - processes[state.process].base + 11) / 22 * 545}" cy="${210 - (target[i] - 40) / 20 * 185}" r="4" fill="#c1f879" fill-opacity=".65"><title>${d.id}：合成目标 ${target[i].toFixed(2)}</title></circle>`).join('');
  return `${heading('06 / CONNECT', '输入特征与目标响应的关联分析', '计算合成样本的特征相关系数，并显示响应与目标指数的分布。')}<div class="toolbar">${processSelect()}</div><div class="two-col"><div class="panel"><div class="panel-head"><h2>响应值 × 目标指数</h2><small>Pearson r = ${correlation(data.map(d => d.value), target).toFixed(3)}</small></div><svg class="chart" role="img" aria-label="合成响应与目标指数散点图" viewBox="0 0 650 250">${[40, 45, 50, 55, 60].map(v => `<path d="M45,${210 - (v - 40) / 20 * 185}H605" stroke="#34402d" stroke-dasharray="3 5"/><text x="32" y="${214 - (v - 40) / 20 * 185}" text-anchor="end">${v}</text>`).join('')}${points}<text x="280" y="240">合成响应 / a.u.</text><text x="45" y="14">目标指数 / a.u.</text></svg></div><div class="panel"><h2>特征相关性</h2><p class="muted">Pearson 系数 · 在当前 48 条合成样本上计算</p>${bars(corr, ['特征 A', '特征 B', '特征 C', '离散度 CV'])}<div class="bottom-note">条形长度为相关系数绝对值，右侧保留正负号。</div></div></div><div class="callout">相关性不等于因果关系。合成目标指数由合成响应加随机扰动生成；结果仅描述当前合成数据的统计关系。</div>`;
}
function about() {
  return `${heading('ABOUT THE LAB', '研究范围与方法', 'AI Research Lab / 数据分析、模型评估与实验配方推演。')}<p class="about-intro">研究内容：实验数据分析、<br>模型验证与<em>动态流程可视化。</em></p><div class="two-col equal"><div class="panel"><span class="eyebrow">RESEARCH SCOPE</span><h2 style="margin-top:18px">实验数据、模型与分析流程</h2><p class="muted">研究示例涵盖特征构建、回归模型比较、统计关联分析及参数响应模拟。</p><p class="muted">支持在三个合成数据集上比较预测器，并在独立的流程模型中观测时序信号、载具分组与空间响应。</p><div class="tag-list"><span>Applied ML</span><span>Model Evaluation</span><span>Agent Workflows</span><span>Interpretability</span><span>Scientific Visualization</span></div></div><div class="panel"><span class="eyebrow">COMPUTATIONAL METHODS</span><h2 style="margin-top:18px">模型与评估方法</h2><div class="architecture">回归方法 / 最小二乘与 kNN（k = 5）<br>评估协议 / 32 条训练样本，16 条留出样本<br>误差指标 / R²、RMSE、MAE<br>实验配方推演 / 六温区与十舟位响应</div></div></div><div class="callout">数据说明：本站采用合成数据进行方法演示，结果不作为真实实验结论。</div><div class="section-heading" style="margin-top:30px"><h2>研究模块索引</h2><span>DATA / METHODS / EXPERIMENTS</span></div><div class="module-grid">${modules.map(([page, icon, index, title, desc]) => `<a class="module-card" href="#${page}"><div class="module-top"><span class="module-icon">${labIcon(icon)}</span><small>${index}</small></div><h3>${title}</h3><p>${desc}</p><div class="module-foot"><span>查看模块</span><span>${labIcon('arrow')}</span></div></a>`).join('')}</div>`;
}
function structurePage() { return '<iframe class="structure-frame" src="./structure-viewer.html?v=9.0.1" title="分子与晶体三维结构可视化"></iframe>'; }
const pages = { realtime: realtimeDashboard, carriers: opsCarriers, overview, monitor, data: dataPage, spectrum: spectrumPage, structure: structurePage, models, experiment, trace, efficiency, about };
let page = 'overview', playbackTimer, toastTimer;
function render(live = false) {
  const particleTime = live ? document.querySelector('.ops-network,.ops-fiber')?.getCurrentTime?.() : undefined;
  stopOpsSimulation();
  clearInterval(playbackTimer);
  page = location.hash.slice(1) || 'overview';
  if (!pages[page]) page = 'overview';
  document.body.classList.toggle('is-realtime', page === 'realtime');
  const opsFocus = document.activeElement?.getAttribute('data-ops-action');
  $('#content').innerHTML = pages[page]();
  hydrateLabIcons($('#content'));
  if (opsFocus) document.querySelector('[data-ops-action="' + opsFocus + '"]')?.focus({preventScroll:true});
  if (['monitor','data','models'].includes(page)) {
    $('#content .page-heading').insertAdjacentHTML('afterend', caseGuide(page));
    $('#content').insertAdjacentHTML('beforeend', caseFindings(page));
  }
  if (!live) { $('#content').classList.remove('reveal'); requestAnimationFrame(() => $('#content').classList.add('reveal')); }
  $('#breadcrumb').textContent = names[page];
  document.title = `${names[page]} · AI Research Lab`;
  document.querySelectorAll('[data-page]').forEach(a => { const active = a.dataset.page === page; a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (page === 'data') { $('#batch-search').value = state.search; filterBatches(); }
  startOpsSimulation(page);
  if (live && Number.isFinite(particleTime)) document.querySelector('.ops-network,.ops-fiber')?.setCurrentTime?.(particleTime);
}
function filterBatches() {
  const needle = state.search.trim().toLowerCase(), data = datasets[state.process].filter(d => `${d.id} ${d.tube}`.toLowerCase().includes(needle));
  $('#batch-table').innerHTML = batchTable(data.slice(0, 12), true);
  $('#result-count').textContent = `匹配 ${data.length} 条 · 展示 ${Math.min(12, data.length)} 条`;
}
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('show'); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3600); }
function exportData() {
  const headers = ['source', 'dataset', 'sample_id', 'group', 'feature_a', 'feature_b', 'feature_c', 'observed_au', 'synthetic_reference_au', 'cv_pct', 'coverage_pct', 'run_group'];
  const rows = datasets[state.process].map(d => ['SYNTHETIC_DEMO_ONLY', state.process, d.id, d.tube, d.temperature.toFixed(3), d.duration.toFixed(3), d.flow.toFixed(3), d.value.toFixed(3), d.prediction.toFixed(3), d.cv.toFixed(3), d.coverage.toFixed(3), d.carrier]);
  const url = URL.createObjectURL(new Blob(['\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `synthetic-demo-${state.process}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('已导出 48 条虚拟数据，文件含 SYNTHETIC_DEMO_ONLY 标识。');
}
function addMessage(text, user = false) { const element = document.createElement('div'); element.className = `message${user ? ' user' : ''}`; element.textContent = text; $('#messages').append(element); $('#messages').scrollTop = $('#messages').scrollHeight; }
function answer(question) {
  const data = datasets[state.process], p = processes[state.process];
  if (/Agent|agent|工作流|工具/.test(question)) return '分析流程包含数据读取、质量检查、模型拟合、独立评测和结果汇总五个阶段。\n\n可在「分析工作流」查看每一步的结构化证据。各阶段均提供输入与输出结果供复核。';
  if (/异常|预警|覆盖/.test(question)) { const rows = data.filter(d => d.warning); return `${p.title} 的 48 条合成样本中，有 ${rows.length} 条覆盖率低于 95%：\n${rows.map(d => `${d.id}（${d.coverage}%）`).join('\n')}\n\n可在「数据观测」中查看。这些是合成数据中按阈值标记的质量事件。`; }
  if (/模型|效果|精度|预测/.test(question)) { const result = modelStats(data, state.model); return `在 ${p.title} 数据集上，当前预测器的 R² = ${result.r2.toFixed(3)}，RMSE = ${result.rmse.toFixed(3)} a.u.。\n\n模型在 32 条合成样本上拟合，指标在另外 16 条留出样本上计算。可在「模型评测」切换预测器进行比较。`; }
  if (/炉管|舟位|温区|孪生/.test(question)) return '实验配方推演使用六温区、十舟位的合成空间响应模型。\n\n调整 Z1 并运行模拟后，可比较 P1 与 P10 的膜厚、舟内 CV 和舟间 CV。未运行的输入不会覆盖上次结果。响应由独立的合成公式计算，未连接真实设备。';
  if (/响应|因素|特征|参数/.test(question)) { const evidence = caseEvidence(data); return `在当前 ${evidence.c.title} 合成案例中，${evidence.strongest.name}与${evidence.c.target}的绝对相关系数最高，r = ${evidence.strongest.value.toFixed(3)}。\n\n这是当前 48 条合成样本的关联结果，不等于因果关系。可在模型评测中比较独立留出集误差，在实验配方推演中比较局部热场变化。该空间模型采用独立的合成公式。`; }
  if (/效率|相关|因果/.test(question)) return '「关联分析」按当前数据集的 48 条合成样本计算 Pearson 相关系数。演示目标由合成响应加扰动生成。\n\n相关性用于发现线索，不能直接证明因果。因果分析还需控制混杂因素并进行独立实验验证。';
  if (/数据|配方|安全|真实/.test(question)) return '本站数据用于研究方法演示。输入变量采用归一化尺度，数据性质见研究说明。\n\nCSV 包含当前数据集的输入变量、响应值及质量指标。';
  return 'AI agent 支持以下结果查询：\n1. 异常样本\n2. 特征相关性\n3. 模型评测结果\n4. 关联分析说明\n\n查询结果基于当前选定的合成数据集。';
}
function ask(question) { addMessage(question, true); addMessage(answer(question)); }
document.addEventListener('click', event => {
  const question = event.target.closest('[data-question]'); if (question) { ask(question.dataset.question); return; }
  const control = event.target.closest('[data-action]'); if (!control) return;
  const action = control.dataset.action;
  if (action === 'chat') { if (!$('#messages').children.length) addMessage('可查询当前数据集的模型评测结果、样本质量和特征相关性。'); $('#assistant').showModal(); }
  if (action === 'close-chat') $('#assistant').close();
  if (action === 'export') exportData();
  if (action === 'tour') { location.hash = 'about'; toast('研究模块顺序：数据观测 → 数据与特征 → 模型评测 → 实验配方推演。'); }
  if (action === 'reset') { state.temperature = state.duration = state.flow = 50; state.twinZones = [0,0,0,0,0,0]; state.twinApplied = null; render(); toast('已恢复参数基线。'); }
  if (action === 'playback') {
    if (control.dataset.playing) { clearInterval(playbackTimer); render(); return; }
    control.dataset.playing = 'yes'; control.textContent = '停止回放'; let n = 4; const data = currentData();
    playbackTimer = setInterval(() => { n = Math.min(n + 2, data.length); $('#monitor-chart').innerHTML = chart(data.slice(0, n).map(d => d.value), data.slice(0, n).map(d => d.prediction), { xLabels: ['B01', `B${Math.ceil(n / 4)}`, `B${Math.ceil(n / 2)}`, `B${Math.ceil(n * .75)}`, `B${n}`] }); if (n === data.length) { clearInterval(playbackTimer); control.textContent = '回放合成样本'; delete control.dataset.playing; toast('合成样本回放完成。'); } }, 400);
  }
});
document.addEventListener('change', event => { const id = event.target.id; if (['process', 'window', 'model', 'carrier'].includes(id)) { state[id] = event.target.value; render(); } });
document.addEventListener('input', event => { const id = event.target.id; if (id === 'batch-search') { state.search = event.target.value; filterBatches(); } if (['temperature', 'duration', 'flow'].includes(id)) { state[id] = Number(event.target.value); $(`#${id}-output`).textContent = state[id]; updatePrediction(); } });
$('#chat-form').addEventListener('submit', event => { event.preventDefault(); const input = $('#chat-form input'), text = input.value.trim(); if (text) ask(text); input.value = ''; });
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'instant' }); });
render();
initTwinControls();
initOpsControls();

document.getElementById("skip-to-content").addEventListener("click", event => { event.preventDefault(); document.getElementById("content").focus(); });
