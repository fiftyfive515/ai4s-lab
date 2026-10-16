'use strict';

// Monochrome SVG interface icons; no emoji or platform-dependent glyphs.
const labIconPaths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  monitor: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  data: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  spectrum: '<path d="M3 18h3l2-4 3-8 3 11 3-5 2 3h4"/><path d="M3 21h18"/>',
  models: '<circle cx="5" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m7 11 9-5M7 13l9 5"/>',
  experiment: '<path d="M9 3h6M10 3v6l-6 10a1.3 1.3 0 0 0 1.1 2h13.8a1.3 1.3 0 0 0 1.1-2L14 9V3M7 15h10"/>',
  trace: '<rect x="3" y="4" width="6" height="6" rx="1"/><rect x="15" y="14" width="6" height="6" rx="1"/><path d="M9 7h6a3 3 0 0 1 3 3v4M6 10v7h9"/>',
  efficiency: '<path d="M4 20V4M4 20h16M8 15l4-4 3 2 5-7"/><circle cx="8" cy="15" r="1"/><circle cx="15" cy="13" r="1"/>',
  realtime: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M6 11h3l2-3 3 6 2-3h2"/>',
  carriers: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h9v9M6 9v9h9"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  agent: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 10h.01M16 10h.01M8 15h8M12 2v3"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  external: '<path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 16v4h16v-4"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  document: '<path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h8"/>'
};
function labIcon(name) {
  const paths = labIconPaths[name] || labIconPaths.document;
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}
function hydrateLabIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = labIcon(element.dataset.icon); });
}
hydrateLabIcons();
