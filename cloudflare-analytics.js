'use strict';

// Public site token supplied by the site owner; this is not an API credential.
(() => {
  const hosts = new Set(['fiftyfive515.github.io', 'ai4s-lab.wusr55.workers.dev', 'atlas-ai4s.pages.dev']);
  if (location.protocol !== 'https:' || !hosts.has(location.hostname)) return;
  if (document.querySelector('script[data-lab-analytics="cloudflare"]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token: '0a32a8393428479cbfdc67f0d3030da8' });
  script.dataset.labAnalytics = 'cloudflare';
  document.head.appendChild(script);
})();
