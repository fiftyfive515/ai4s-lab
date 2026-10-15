'use strict';
// 仅向本站发送最小页面访问事件。不使用 cookie、持久存储或设备指纹。
(() => {
  if (window.ATLAS_VISIT_ENABLED !== true || !/^https?:$/.test(location.protocol)) return;
  const pages = new Set(['overview', 'monitor', 'data', 'models', 'experiment', 'trace', 'efficiency', 'about', 'realtime', 'carriers']);
  const session = crypto.randomUUID(); // 仅驻留当前标签页内存，刷新后重新生成。
  let lastPage;
  function record() {
    const page = location.hash.slice(1) || 'overview';
    if (!pages.has(page) || page === lastPage) return;
    lastPage = page;
    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* 忽略无效来源 */ }
    const body = JSON.stringify({ id: crypto.randomUUID(), session, page, device: matchMedia('(max-width: 620px)').matches ? 'small-screen' : 'large-screen', referrer });
    const endpoint = window.AI_RESEARCH_ANALYTICS_ENDPOINT || '/__lab/visit';
    try { navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' })); } catch { /* 统计失败不影响页面 */ }
  }
  window.addEventListener('hashchange', record);
  record();
})();
