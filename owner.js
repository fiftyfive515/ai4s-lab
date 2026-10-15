'use strict';
const ownerQuery = selector => document.querySelector(selector);
const pageNames = {overview:'实验室总览', monitor:'数据观测', data:'数据工作台', models:'模型评测', experiment:'实验沙盒', trace:'Agent 工作流', efficiency:'关联洞察', about:'关于 Lab', realtime:'实时监控总览', carriers:'载具路径追溯'};
const showOwnerError = text => { ownerQuery('#owner-error').textContent = text; };
function showLogin() { ownerQuery('#dashboard').hidden = true; ownerQuery('#login-panel').hidden = false; }
async function loadStats() {
  showOwnerError('');
  try {
    const response = await fetch(`/__lab/stats?days=${ownerQuery('#range').value}`, {credentials:'same-origin', cache:'no-store'});
    if (response.status === 401) { showLogin(); return; }
    if (!response.ok) throw new Error('读取统计失败，请稍后刷新。');
    const data = await response.json();
    ownerQuery('#dashboard').hidden = false; ownerQuery('#login-panel').hidden = true;
    ownerQuery('#views').textContent = data.views;
    ownerQuery('#sessions').textContent = data.sessions;
    ownerQuery('#page-count').textContent = data.pages.length;
    ownerQuery('#last-updated').textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'})}`;
    const bars = ownerQuery('#page-bars'); bars.replaceChildren();
    const maximum = Math.max(1, ...data.pages.map(page => page.views));
    for (const page of data.pages) {
      const row = document.createElement('div'); row.className = 'page-row';
      const label = document.createElement('span'); label.textContent = pageNames[page.page] || page.page;
      const track = document.createElement('div'); track.className = 'bar-track';
      const fill = document.createElement('span'); fill.style.width = `${page.views / maximum * 100}%`; track.append(fill);
      const count = document.createElement('span'); count.textContent = page.views;
      row.append(label,track,count); bars.append(row);
    }
    if (!data.pages.length) bars.textContent = '还没有访问记录。打开公开页面并浏览后即可查看。';
    const tbody = ownerQuery('#records tbody'); tbody.replaceChildren();
    for (const record of data.records) {
      const row = document.createElement('tr');
      const values = [new Date(record.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}), record.session.slice(0,8), pageNames[record.page] || record.page, record.device === 'small-screen' ? '小屏设备' : '大屏设备', record.referrer || '直接访问 / 未提供'];
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      tbody.append(row);
    }
    if (!data.records.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 5; cell.textContent = '当前时间范围暂无记录'; cell.className = 'empty'; row.append(cell); tbody.append(row); }
  } catch (error) { showOwnerError(error.message || '连接失败，请检查服务是否启动。'); }
}
ownerQuery('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); showOwnerError('');
  const input = ownerQuery('#owner-key'), button = event.target.querySelector('button'); button.disabled = true;
  try {
    const response = await fetch('/__lab/login', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({key:input.value})});
    input.value = '';
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || '登录失败'); }
    await loadStats();
  } catch (error) { showOwnerError(error.message || '连接失败'); }
  finally { button.disabled = false; }
});
ownerQuery('#refresh').addEventListener('click',loadStats);
ownerQuery('#range').addEventListener('change',loadStats);
ownerQuery('#logout').addEventListener('click',async () => {
  try {
    const response = await fetch('/__lab/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
    if (!response.ok) throw new Error('退出失败，请重试。');
    ownerQuery('#records tbody').replaceChildren(); ownerQuery('#page-bars').replaceChildren(); showLogin();
  } catch(error) { showOwnerError(error.message); }
});
loadStats();
