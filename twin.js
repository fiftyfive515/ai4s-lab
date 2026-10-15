'use strict';
// 仅复用原虚拟实验的视觉结构。所有管型、热场和响应公式独立虚构。
function twinBaseline(tube = state.twinTube) { return {tube, temperature:50,duration:50,flow:50,zones:[0,0,0,0,0,0]}; }
function twinDraft() { return {tube:state.twinTube,temperature:state.temperature,duration:state.duration,flow:state.flow,zones:[...state.twinZones]}; }
function twinSimulate(input) {
  const shapes = [[-3,-1,2,2,-1,-3],[-4,-2,1,3,2,-2],[-2,1,3,1,-2,-4]];
  const shape = shapes[input.tube-1];
  const heat = shape.map((v,i)=>50+(input.temperature-50)*.18+v+input.zones[i]);
  const meanHeat = heat.reduce((s,v)=>s+v,0)/6;
  const average = 100+(input.temperature-50)*.17+(input.duration-50)*.21+(input.flow-50)*.08+(input.tube-1)*.6;
  const boats = Array.from({length:10},(_,i)=>{
    const position=i/9*5, left=Math.floor(position), mix=position-left;
    const localHeat=heat[left]*(1-mix)+heat[Math.min(5,left+1)]*mix;
    const thickness=average+(localHeat-meanHeat)*.72+Math.sin(i*1.7)*.15;
    const cv=.8+Math.abs(localHeat-meanHeat)*.11+Math.abs(input.flow-50)*.006;
    return {pos:i+1,heat:localHeat,thickness,cv};
  });
  const mean=boats.reduce((s,b)=>s+b.thickness,0)/10;
  const spatialCv=Math.sqrt(boats.reduce((s,b)=>s+(b.thickness-mean)**2,0)/10)/mean*100;
  return {heat,boats,mean,spatialCv,spread:Math.max(...heat)-Math.min(...heat)};
}
function twinCurrent() { return twinSimulate(state.twinApplied || twinBaseline()); }
function twinIsPending() { return JSON.stringify(twinDraft()) !== JSON.stringify(state.twinApplied || twinBaseline()); }
function twinTubeGraphic(result,baseline) {
  const x0=110,step=74;
  return `<svg class="twin-svg" viewBox="0 0 940 305" role="img" aria-label="透明石英炉管内的六温区与十个舟位，显示模拟膜厚和 CV"><defs><linearGradient id="quartz" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#91e8ed" stop-opacity=".20"/><stop offset=".25" stop-color="#62d4df" stop-opacity=".03"/><stop offset=".7" stop-color="#62d4df" stop-opacity=".03"/><stop offset="1" stop-color="#91e8ed" stop-opacity=".22"/></linearGradient><linearGradient id="wafer" x1="0" x2="1"><stop stop-color="#497182"/><stop offset=".45" stop-color="#b7eff1"/><stop offset="1" stop-color="#396074"/></linearGradient><linearGradient id="rail"><stop stop-color="#355669"/><stop offset=".5" stop-color="#7fb3ba"/><stop offset="1" stop-color="#355669"/></linearGradient></defs><text x="32" y="36" class="twin-axis-label">膜厚响应 / a.u.</text><text x="32" y="283" class="twin-axis-label">舟内 CV / %</text><rect x="48" y="92" width="846" height="138" rx="69" fill="url(#quartz)" stroke="#71cfdb" stroke-opacity=".45"/><ellipse cx="99" cy="161" rx="36" ry="66" fill="#59b6cb08" stroke="#73c7d5" stroke-opacity=".30"/><ellipse cx="845" cy="161" rx="36" ry="66" fill="#59b6cb08" stroke="#73c7d5" stroke-opacity=".40"/><path d="M92 110H846 M92 214H846" stroke="#94e5ed" stroke-opacity=".20"/>
    ${result.heat.map((v,i)=>{const x=86+i*128;return `<rect x="${x}" y="100" width="120" height="121" rx="18" fill="hsl(${38-(v-50)*1.5} 85% 58% / ${.04+Math.abs(v-50)*.007})" stroke="#eda66a" stroke-opacity=".15"/><text x="${x+60}" y="211" text-anchor="middle" class="twin-zone-label">Z${i+1}</text>`;}).join('')}
    <rect x="92" y="188" width="756" height="5" rx="2" fill="url(#rail)"/>
    ${result.boats.map((b,i)=>{const x=x0+i*step, selected=state.twinBoat===i,delta=b.thickness-baseline.boats[i].thickness,dcv=b.cv-baseline.boats[i].cv;return `<g class="twin-boat ${selected?'selected':''}" data-boat="${i}" role="button" tabindex="0" aria-label="查看舟位 P${b.pos} 的模拟响应" aria-pressed="${selected}"><title>P${b.pos}：膜厚 ${b.thickness.toFixed(2)} a.u.，CV ${b.cv.toFixed(2)}%</title><rect x="${x-26}" y="120" width="54" height="72" rx="4" class="boat-bed"/><text x="${x+1}" y="57" text-anchor="middle" class="twin-ft">${b.thickness.toFixed(1)}</text><text x="${x+1}" y="75" text-anchor="middle" class="twin-delta">${delta>=0?'+':''}${delta.toFixed(1)}</text>${Array.from({length:7},(_,j)=>`<rect x="${x-20+j*6}" y="126" width="3" height="59" rx="1.5" fill="url(#wafer)"/>`).join('')}<rect x="${x-23}" y="186" width="49" height="4" fill="${selected?'#99f2ee':'#7a9ba5'}"/><text x="${x+1}" y="252" text-anchor="middle" class="twin-cv">${b.cv.toFixed(2)}%</text><text x="${x+1}" y="270" text-anchor="middle" fill="${dcv<=0?'#a6e7a5':'#efb78d'}" font-size="10">${dcv>=0?'+':''}${dcv.toFixed(2)}</text><text x="${x+1}" y="294" text-anchor="middle" class="twin-axis-label">P${b.pos}</text></g>`;}).join('')}<path d="M18 162H44 M899 162H925" stroke="#7fbdc9"/><path d="M30 157L39 162L30 167" fill="none" stroke="#7fbdc9"/></svg>`;
}
function twinDetail(result, baseline) {
  const b=result.boats[state.twinBoat],base=baseline.boats[state.twinBoat];
  return `<span class="twin-position">P${String(b.pos).padStart(2,'0')}</span><div><strong>选中舟位 / 模拟响应</strong><p>局部热场 ${b.heat.toFixed(2)} · 膜厚 ${b.thickness.toFixed(2)} a.u. · CV ${b.cv.toFixed(2)}%</p></div><span class="status">相对基线 ${b.thickness-base.thickness>=0?'+':''}${(b.thickness-base.thickness).toFixed(2)} a.u.</span>`;
}
function twinPlot(result, baseline) {
  if(state.twinTab==='boats')return chart(result.boats.map(b=>b.thickness),baseline.boats.map(b=>b.thickness),{height:200,xLabels:['P1','P3','P6','P8','P10'],label:'十舟位膜厚响应：本次模拟与基线'});
  if(state.twinTab==='steps') {const p=state.twinApplied||twinBaseline();return chart([10,10,24,24,45,45,50+p.temperature*.2,50+p.temperature*.2,50+p.temperature*.2,50+p.temperature*.2,50+p.temperature*.2,50+p.temperature*.2,38,38,18,18,10],null,{height:200,step:true,xLabels:['Step 1','Step 5','Step 9','Step 13','Step 17'],label:'合成的17步设定曲线，使用阶梯保持'});}
  return chart(result.heat,baseline.heat,{height:200,allTicks:true,xLabels:['Z1','Z2','Z3','Z4','Z5','Z6'],label:'六温区热场指数：本次模拟与基线'});
}
function twinExperiment() {
  const result=twinCurrent(), baseline=twinSimulate(twinBaseline()), pending=twinIsPending();
  return `${heading('04 / SPATIAL RESPONSE EXPERIMENT','实验配方推演','在六温区、十舟位的合成模型中计算参数变化与空间响应。')}
  <div class="twin-workspace"><aside class="panel twin-controls"><span class="eyebrow">EXPERIMENT SETUP</span><h2>实验参数</h2><label for="twin-tube" class="twin-control-label">模拟管型</label><select id="twin-tube">${[1,2,3].map(n=>`<option value="${n}" ${state.twinTube===n?'selected':''}>Twin ${String.fromCharCode(64+n)} / 合成热场</option>`).join('')}</select><div class="slider-group">${[['temperature','热预算指数'],['duration','沉积时长指数'],['flow','供给强度指数']].map(([id,label])=>`<div><label for="${id}">${label}<output id="${id}-output">${state[id]}</output></label><input id="${id}" type="range" min="0" max="100" step="1" value="${state[id]}"></div>`).join('')}</div><div class="twin-zones-title"><strong>六温区微调</strong><small>相对指数 / −10 至 +10</small></div><div class="twin-zone-controls">${state.twinZones.map((v,i)=>`<div><label for="zone-${i}">Z${i+1}<output id="zone-output-${i}">${v>=0?'+':''}${v}</output></label><input id="zone-${i}" data-zone="${i}" type="range" min="-10" max="10" step="1" value="${v}"></div>`).join('')}</div><button class="primary twin-run" data-action="twin-run">运行模拟 <span>${labIcon('arrow')}</span></button><button class="text-button twin-reset" data-action="reset">恢复管型基线</button><p class="twin-disclaimer">输入参数均采用归一化指数。</p></aside>
  <section class="twin-main"><div class="panel twin-stage"><div class="panel-head"><div><span class="eyebrow">DIGITAL TWIN / SYNTHETIC</span><h2>石英管透视 · 10 舟位响应</h2></div><span id="twin-status" class="status ${pending?'warn':''}">${pending?'参数已调整 · 待计算':state.twinApplied?'计算完成 · 合成响应':'当前显示基线'}</span></div><div class="twin-top-metrics"><div>膜厚均值 <strong id="prediction">${result.mean.toFixed(2)}</strong><small>a.u.</small></div><div>舟间 CV <strong>${result.spatialCv.toFixed(2)}<small>%</small></strong></div><div>温区极差 <strong>${result.spread.toFixed(1)}</strong><small>指数</small></div></div><div class="twin-viewport" id="twin-graphic">${twinTubeGraphic(result,baseline)}</div><div class="twin-legend"><span><i></i>膜厚 / 基线变化量</span><span>点击舟位查看局部响应</span><span>下方为舟内 CV / 变化量</span></div></div>
  <div class="twin-boat-detail" id="twin-detail">${twinDetail(result,baseline)}</div><div class="panel twin-plots"><div class="panel-head"><h2>空间分布与参数响应对照</h2><div class="twin-tabs">${[['thermal','六温区热场'],['boats','舟位膜厚'],['steps','工艺步曲线']].map(([key,label])=>`<button data-twin-tab="${key}" class="${state.twinTab===key?'active':''}" aria-pressed="${state.twinTab===key}">${label}</button>`).join('')}</div></div><div class="legend"><span><i style="background:#c1f879"></i>当前已运行结果</span><span><i style="background:#72bfb5"></i>当前管型基线（工艺步曲线仅显示设定值）</span></div>${twinPlot(result,baseline)}</div></section></div>
  <section class="twin-insight"><span class="eyebrow">CONTROLLED PARAMETER COMPARISON</span><h2>单温区扰动与空间均匀性</h2><p>保持热预算、时长和供给不变，将 Z1 调高后运行模拟。比较 P1 与 P10 的膜厚变化，以及舟间 CV。再恢复基线，改变沉积时长指数，观察它与局部温区调整的不同。</p><div class="case-question"><span>本次计算结果</span><strong>${state.twinApplied?`膜厚均值较基线变化 ${(result.mean-baseline.mean).toFixed(2)} a.u.；舟间 CV 从 ${baseline.spatialCv.toFixed(2)}% 变为 ${result.spatialCv.toFixed(2)}%。`:'尚未运行新参数，管体与图表正在显示当前管型的基线。'}</strong><small>单温区调整与整体时长调整属于不同扰动方式；比较结果时需保持其他参数一致。</small></div></section>`;
}
function updateTwinDraft() { const status=document.querySelector('#twin-status');if(status){status.textContent=twinIsPending()?'参数已调整 · 待计算':state.twinApplied?'计算完成 · 合成响应':'当前显示基线';status.classList.toggle('warn',twinIsPending());} }
function initTwinControls() {
  document.addEventListener('click',event=>{
    const run=event.target.closest('[data-action="twin-run"]');
    if(run){state.twinApplied=twinDraft();render();toast('计算完成：已更新十舟位响应与温区对比。');return;}
    const boat=event.target.closest('[data-boat]');
    if(boat){state.twinBoat=Number(boat.dataset.boat);const result=twinCurrent(),base=twinSimulate(twinBaseline());document.querySelectorAll('[data-boat]').forEach(g=>{const selected=Number(g.dataset.boat)===state.twinBoat;g.classList.toggle('selected',selected);g.setAttribute('aria-pressed',selected);});document.querySelector('#twin-detail').innerHTML=twinDetail(result,base);return;}
    const tab=event.target.closest('[data-twin-tab]');if(tab){state.twinTab=tab.dataset.twinTab;render();}
  });
  document.addEventListener('input',event=>{if(event.target.matches('[data-zone]')){const i=Number(event.target.dataset.zone),v=Number(event.target.value);state.twinZones[i]=v;document.querySelector(`#zone-output-${i}`).textContent=`${v>=0?'+':''}${v}`;updateTwinDraft();}});
  document.addEventListener('change',event=>{if(event.target.id==='twin-tube'){state.twinTube=Number(event.target.value);state.twinApplied=null;render();}});
  document.addEventListener('keydown',event=>{if(event.target.matches('[data-boat]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
}
