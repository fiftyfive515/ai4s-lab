from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'service' / 'admin-assets'
OUT.mkdir(exist_ok=True)
for name in ['owner.html', 'owner.js', 'styles.css', 'favicon.svg']:
    shutil.copy2(ROOT / name, OUT / name)
print('Prepared isolated admin assets.')
