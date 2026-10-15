"""Build an explicit public allowlist. Never copy credentials or visitor data."""
import json
import os
from pathlib import Path
import shutil
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public-site'
FILES = [
    'index.html', 'app.js', 'cases.js', 'twin.js', 'operations.js',
    'realtime.js', 'styles.css', 'operations.css', 'showcase.css',
    'favicon.svg', 'visit.js', 'cloudflare-analytics.js', 'tbc.html', 'tbc.css', 'tbc.js', 'tbc-tailwind.css'
]
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(exist_ok=True)
for name in FILES:
    shutil.copy2(ROOT / name, OUT / name)
(OUT / 'ops-assets').mkdir(exist_ok=True)
for asset in (ROOT / 'ops-assets').glob('*.webp'):
    shutil.copy2(asset, OUT / 'ops-assets' / asset.name)
shutil.copytree(ROOT / 'vendor', OUT / 'vendor')
endpoint = os.environ.get('ANALYTICS_ENDPOINT', '').strip()
if endpoint and (urlsplit(endpoint).scheme != 'https' or not urlsplit(endpoint).netloc):
    raise SystemExit('ANALYTICS_ENDPOINT must be an HTTPS URL')
(OUT / 'visit-config.js').write_text(
    'window.ATLAS_VISIT_ENABLED = ' + ('true' if endpoint else 'false') + ';\n'
    + 'window.AI_RESEARCH_ANALYTICS_ENDPOINT = ' + json.dumps(endpoint) + ';\n'
)
(OUT / '.nojekyll').touch()
(OUT / '404.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面不存在</title><body style="background:#101212;color:#c1f879;font:16px system-ui;padding:60px"><h1>这个页面还未开放。</h1><p><a style="color:inherit" href="./">返回 AI4S Lab →</a></p></body></html>')
print('Built public-site; owner files and runtime data excluded.')
