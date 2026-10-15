'use strict';
// 场景只提供合成特征的解释名称，不导入业务数据或实际配方。
const labCases = {
  signals: {title:'LPCVD 薄膜响应', target:'膜厚响应', features:['热预算指数','热场均匀性指数','供给强度指数'], question:'热预算、热场均匀性与供给强度对膜厚响应的统计关联。', hypothesis:'比较归一化输入特征与膜厚响应的 Pearson 相关系数。'},
  response: {title:'材料处理响应', target:'材料响应', features:['能量输入指数','处理窗口指数','介质强度指数'], question:'能量输入、处理窗口及介质强度与材料响应的统计关系。', hypothesis:'在相同特征尺度下比较关联强度与留出集预测误差。'},
  robust: {title:'传感信号响应', target:'信号响应', features:['信号幅度指数','稳定窗口指数','激励强度指数'], question:'输入幅度、窗口长度与激励强度变化下的响应预测误差。', hypothesis:'使用固定训练集与留出集比较回归模型及均值基线。'},
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
    monitor: {label:'01 / DATA QUALITY', title:'数据观测与质量核查', purpose:'联合观测响应趋势与采样覆盖率，区分数据缺失和响应波动。', steps:[['输入','带时间索引的样本、响应值与采样覆盖率。'],['处理','根据覆盖率阈值标记待复核样本。'],['产出','样本编号、覆盖率及对应的质量标记。']]},
    data: {label:'02 / FEATURE PREPARATION', title:'场景定义与特征数据准备', purpose:'定义输入特征、目标变量和质量指标，并组织为可用于建模的样本表。', steps:[['输入',`${c.features.join('、')}，以及${c.target}。`],['处理','检查阶段信号与样本质量，按编号或分组筛选并导出。'],['产出','包含输入特征、响应标签与质量指标的合成数据表。']]},
    models: {label:'03 / MODEL EVALUATION', title:'预测能力评估与候选影响因素分析', purpose:'使用独立留出集计算回归误差，并对照输入特征的统计关联。', steps:[['输入','同一组特征、32 条训练样本和 16 条独立留出样本。'],['处理','比较 kNN、线性回归与均值基线，检查误差和关联。'],['产出','各预测器的 R²、RMSE、MAE 及特征关联结果。']]},
  };
  const g = guides[page];
  if (!g) return '';
  return `<section class="case-guide"><div class="case-guide-intro"><span class="eyebrow">${g.label}</span><h2>${g.title}</h2><p>${g.purpose}</p></div><div class="case-steps">${g.steps.map(([label,text],i)=>`<div><span>0${i+1} / ${label}</span><p>${text}</p></div>`).join('')}</div><div class="case-question"><span>研究问题 / ${c.title}</span><strong>${c.question}</strong><small>变量定义与评估结果</small></div></section>`;
}
function caseFindings(page) {
  const data = page === 'monitor' ? currentData() : datasets[state.process], {c,strongest} = caseEvidence(data);
  let title, lead, details, next, link;
  if (page === 'monitor') {
    const warnings = data.filter(d=>d.warning), average = data.reduce((s,d)=>s+d.coverage,0)/data.length;
    title = '当前窗口的质量核查结果';
    lead = `当前窗口 ${data.length} 条样本中，${warnings.length} 条采样覆盖率低于 95%，平均覆盖率 ${average.toFixed(1)}%。`;
    details = [`定位到 ${warnings.map(d=>d.id).join('、')}。`, '覆盖率不足的样本需要进行数据完整性复核，质量标记不等同于响应异常。', `分析范围：若${c.target}同时出现波动，需结合采样完整性解释特征变化。`];
    next = '查看待复核样本'; link = 'data';
  } else if (page === 'data') {
    title = '特征定义与统计关联';
    lead = `在这组 ${data.length} 条合成样本中，“${strongest.name}”与${c.target}的绝对相关系数最高：r = ${strongest.value.toFixed(3)}。`;
    details = [`输入特征已映射为 ${c.features.join(' / ')}；输出标签是${c.target}（a.u.）。`, '可导出包含全部 48 条样本的表格，对照覆盖率、分组与响应值复核数据。', `验证方向：在独立留出集上评估这组输入特征对${c.target}的预测误差。`];
    next = '查看模型评测'; link = 'models';
  } else if (page === 'models') {
    const current = modelStats(data,state.model), baseline = modelStats(data,'baseline');
    const improvement = (1-current.rmse/baseline.rmse)*100;
    title = '模型结果及后续验证建议';
    lead = `当前合成样本中，“${strongest.name}”与${c.target}的绝对相关系数最高（r = ${strongest.value.toFixed(3)}）。`;
    details = [`当前预测器的留出集 RMSE 为 ${current.rmse.toFixed(3)} a.u.，${improvement>=0?`比均值基线降低 ${improvement.toFixed(1)}%`:`比均值基线增加 ${Math.abs(improvement).toFixed(1)}%`}。`, `后续计算实验可围绕${strongest.name}设置受控参数扫描，比较${c.target}及其空间分布的变化。`, '相关系数仅描述当前 48 条合成样本的统计关联。因果解释需要独立实验验证，相关性排序不等同于 SHAP 归因。'];
    next = '查看参数响应实验'; link = 'experiment';
  } else return '';
  return `<section class="case-findings"><div class="case-findings-top"><span class="eyebrow">RESULTS / VALIDATION</span><span class="status">当前数据计算结果</span></div><h2>${title}</h2><p class="case-lead">${lead}</p><ul>${details.map(text=>`<li>${text}</li>`).join('')}</ul><a class="secondary" href="#${link}">${next} <span>${labIcon('arrow')}</span></a></section>`;
}
