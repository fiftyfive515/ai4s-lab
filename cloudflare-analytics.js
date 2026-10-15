'use strict';

// Public site token supplied by the site owner; this is not an API credential.
(() => {
  if (location.protocol !== 'https:' || location.hostname !== 'fiftyfive515.github.io') return;
  if (!location.pathname.startsWith('/ai4s-lab/')) return;
  if (document.querySelector('script[data-lab-analytics="cloudflare"]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token: '0a32a8393428479cbfdc67f0d3030da8' });
  script.dataset.labAnalytics = 'cloudflare';
  document.head.appendChild(script);
})();
