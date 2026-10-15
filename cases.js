'use strict';
// 场景只提供合成特征的解释名称，不导入业务数据或实际配方。
const labCases = {
  signals: {title:'LPCVD 薄膜响应', target:'膜厚响应', features:['热预算指数','热场均匀性指数','供给强度指数'], question:'相同的沉积任务，为什么不同样本的膜厚表现不一样？', hypothesis:'先检查热场和供给特征，再比较它们与膜厚响应的关联。'},
  response: {title:'材料处理响应', target:'材料响应', features:['能量输入指数','处理窗口指数','介质强度指数'], question:'材料处理结果的变化，主要来自输入能量还是处理窗口？', hypothesis:'将三类输入放在同一尺度，筛查最值得继续实验的变量。'},
  robust: {title:'传感信号响应', target:'信号响应', features:['信号幅度指数','稳定窗口指数','激励强度指数'], question:'输入信号发生变化时，能否保持稳定的响应预测？', hypothesis:'对照简单模型与基线，先建立可重复的评测方法。'},
};
function caseFeatureNames() { return labCases[state.process].features; }
function caseEvidence(data) {
  const c = labCases[state.process], keys = ['temperature','duration','flow'];
  const correlations = keys.map((key,i) => ({name:c.features[i], value:correlation(data.map(d=>d[key]),data.map(d=>d.value))}));
  const strongest = [...correlations].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value))[0];
  return {c,correlations,strongest};
}
function caseGuide(page) {
  const c = labCases[state.process];
  const guides = {
    monitor: {label:'01 / OBSERVE THE PROBLEM', title:'数据观测与质量核查', purpose:'把样本趋势和数据质量放在一起，先找出值得排查的时间段，避免把采样缺失误当成真实波动。', steps:[['输入','带时间索引的样本、响应值与采样覆盖率。'],['处理','查看趋势，按覆盖率规则定位异常样本。'],['产出','一份可追查的预警名单，而不只是一个红色数字。']]},
    data: {label:'02 / PREPARE THE EVIDENCE', title:'场景定义与特征数据准备', purpose:'将连续信号转换成能比较的特征表，明确每一列代表什么，再判断哪些样本需要复核。', steps:[['输入',`${c.features.join('、')}，以及${c.target}。`],['处理','查看阶段信号、检查质量、检索样本并导出统一口径的数据。'],['产出','一张“输入特征 → 结果标签”的分析表，可用于下一步模型评测。']]},
    models: {label:'03 / TURN PREDICTIONS INTO INSIGHT', title:'预测能力评估与候选影响因素分析', purpose:'将预测误差与特征证据结合起来。模型不只给一个分数，也帮助你选择下一轮要验证的实验假设。', steps:[['输入','同一组特征、32 条训练样本和 16 条独立留出样本。'],['处理','比较 kNN、线性回归与均值基线，检查误差和关联。'],['产出','可解释的候选影响因素，以及用留出集支持的预测能力证据。']]},
  };
  const g = guides[page];
  if (!g) return '';
  return `<section class="case-guide"><div class="case-guide-intro"><span class="eyebrow">${g.label}</span><h2>${g.title}</h2><p>${g.purpose}</p></div><div class="case-steps">${g.steps.map(([label,text],i)=>`<div><span>0${i+1} / ${label}</span><p>${text}</p></div>`).join('')}</div><div class="case-question"><span>案例问题 / ${c.title}</span><strong>${c.question}</strong><small>合成案例 · 用于演示分析方法</small></div></section>`;
}
function caseFindings(page) {
  const data = page === 'monitor' ? currentData() : datasets[state.process], {c,strongest} = caseEvidence(data);
  let title, lead, details, next, link;
  if (page === 'monitor') {
    const warnings = data.filter(d=>d.warning), average = data.reduce((s,d)=>s+d.coverage,0)/data.length;
    title = '当前窗口的质量核查结果';
    lead = `当前窗口 ${data.length} 条样本中，${warnings.length} 条采样覆盖率低于 95%，平均覆盖率 ${average.toFixed(1)}%。`;
    details = [`定位到 ${warnings.map(d=>d.id).join('、')}。`, '这说明这些样本的输入证据不够完整，并不直接等于膜厚异常或设备故障。', `案例应用：若${c.target}同时出现波动，先核对这些样本的数据完整性，再分析特征变化。`];
    next = '带着预警去检查样本'; link = 'data';
  } else if (page === 'data') {
    title = '特征表的分析用途与初步关联结果';
    lead = `在这组 ${data.length} 条合成样本中，“${strongest.name}”与${c.target}的绝对相关系数最高：r = ${strongest.value.toFixed(3)}。`;
    details = [`输入特征已映射为 ${c.features.join(' / ')}；输出标签是${c.target}（a.u.）。`, '可导出包含全部 48 条样本的表格，对照覆盖率、分组与响应值复核数据。', `下一步问题：${strongest.name}的变化，是否还能在独立样本上帮助预测${c.target}？`];
    next = '进入模型评测验证'; link = 'models';
  } else if (page === 'models') {
    const current = modelStats(data,state.model), baseline = modelStats(data,'baseline');
    const improvement = (1-current.rmse/baseline.rmse)*100;
    title = '模型结果及后续验证建议';
    lead = `本合成案例发现：“${strongest.name}”与${c.target}的绝对相关系数最高（r = ${strongest.value.toFixed(3)}）。`;
    details = [`当前预测器的留出集 RMSE 为 ${current.rmse.toFixed(3)} a.u.，${improvement>=0?`比均值基线降低 ${improvement.toFixed(1)}%`:`比均值基线增加 ${Math.abs(improvement).toFixed(1)}%`}。`, `可以提出假设：优先围绕${strongest.name}做受控扫描，观察${c.target}及其空间分布是否变化。`, '相关性不等于因果。这里是根据 48 条合成样本计算的分析结论，不是实际产线发现；也没有将相关性排序当作 SHAP 结果。'];
    next = '查看空间响应模拟'; link = 'experiment';
  } else return '';
  return `<section class="case-findings"><div class="case-findings-top"><span class="eyebrow">RESULT → INSIGHT → NEXT EXPERIMENT</span><span class="status">由当前合成数据即时计算</span></div><h2>${title}</h2><p class="case-lead">${lead}</p><ul>${details.map(text=>`<li>${text}</li>`).join('')}</ul><a class="secondary" href="#${link}">${next} <span>↗</span></a></section>`;
}
