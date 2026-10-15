"""Check public artifact isolation and the server's statistics authorization."""
import importlib.util
import io
import json
from pathlib import Path
import secrets
import subprocess
import sys
import unittest
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('lab_boundary', ROOT / 'serve.py')
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class PublicBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, str(ROOT / 'tools/build_site.py')], check=True, capture_output=True)

    def handler(self, path, cookie=''):
        server = object.__new__(lab.LabServer)
        server.signing_key = secrets.token_bytes(32)
        server.stats = Mock(return_value={'views': 7, 'sessions': 2, 'pages': [], 'records': []})
        handler = object.__new__(lab.Handler)
        handler.server = server
        handler.path = path
        handler.headers = {'Cookie': cookie}
        handler.wfile = io.BytesIO()
        handler.response_headers = {}
        handler.send_response = lambda status: setattr(handler, 'status', status)
        handler.send_header = lambda key, value: handler.response_headers.__setitem__(key, value)
        handler.end_headers = lambda: None
        return handler

    def test_public_bundle_excludes_all_private_artifacts(self):
        names = {p.relative_to(ROOT / 'public-site').as_posix() for p in (ROOT / 'public-site').rglob('*') if p.is_file()}
        for name in names:
            self.assertNotIn('owner', name)
            self.assertFalse(name.startswith(('.runtime/', 'service/', 'checks/', '.git/')))
            self.assertNotIn(Path(name).suffix, ('.sqlite3', '.db', '.py', '.env'))
        self.assertIn('cloudflare-analytics.js', names)
        self.assertIn('icons.js', names)
        self.assertIn('404.html', names)

    def test_public_scripts_have_no_statistics_read_interface(self):
        for path in (ROOT / 'public-site').glob('*.js'):
            source = path.read_text()
            self.assertNotIn('/__lab/stats', source, path.name)
            self.assertNotIn('/__lab/login', source, path.name)
        public_html = (ROOT / 'public-site/index.html').read_text()
        self.assertNotIn('/owner', public_html)
        self.assertNotIn('访问统计', public_html)
        self.assertNotIn('访客记录', public_html)

    def test_guest_and_forged_cookie_cannot_read_statistics(self):
        for cookie in ('', 'atlas_owner=forged', 'atlas_owner=9999999999.invalid.invalid'):
            handler = self.handler('/__lab/stats?days=7', cookie)
            handler.do_GET()
            self.assertEqual(handler.status, 401)
            handler.server.stats.assert_not_called()
            self.assertNotIn('records', json.loads(handler.wfile.getvalue()))

    def test_signed_owner_session_can_read_statistics(self):
        handler = self.handler('/__lab/stats?days=7')
        token = handler.server.session_cookie()
        handler.headers['Cookie'] = 'atlas_owner=' + token
        handler.do_GET()
        self.assertEqual(handler.status, 200)
        self.assertEqual(json.loads(handler.wfile.getvalue())['views'], 7)
        handler.server.stats.assert_called_once_with(7)

    def test_private_files_are_not_served(self):
        for path in ('/.runtime/owner-key.txt', '/.runtime/visits.sqlite3', '/owner.html', '/serve.py', '/checks/test_public_boundary.py'):
            handler = self.handler(path)
            handler.do_GET()
            self.assertEqual(handler.status, 404)

    def test_only_reference_dashboard_allows_same_origin_framing(self):
        for path in ('/tbc.html', '/', '/owner', '/__lab/stats'):
            handler = self.handler(path)
            handler.reply(200, head=True)
            self.assertEqual(handler.response_headers['X-Frame-Options'], 'SAMEORIGIN' if path == '/tbc.html' else 'DENY')


if __name__ == '__main__':
    unittest.main(verbosity=2)
