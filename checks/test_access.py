"""Exercise the real HTTP boundary and storage using an isolated database."""
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('lab', ROOT / 'serve.py')
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class AccessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = lab.LabServer(('127.0.0.1', 0), Path(self.temp.name))
        self.origin = 'http://127.0.0.1:' + str(self.server.server_port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, data=None, origin=None, cookie=None):
        headers = {}
        if data is not None:
            headers.update({'Content-Type': 'application/json', 'Origin': origin or self.origin})
        if cookie:
            headers['Cookie'] = cookie
        req = urllib.request.Request(self.origin + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try:
            response = urllib.request.urlopen(req)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read()

    def event(self):
        return dict(id=str(uuid.uuid4()), session=str(uuid.uuid4()), page='realtime', device='large-screen', referrer='')

    def test_guest_cannot_read_records_or_runtime(self):
        for path in ['/__lab/stats', '/__lab/stats?days=30']:
            self.assertEqual(self.request(path)[0], 401)
        for path in ['/.runtime/owner-key.txt', '/.runtime/visits.sqlite3', '/serve.py', '/owner.html', '/README.md', '/../.runtime/owner-key.txt']:
            self.assertEqual(self.request(path)[0], 404)
        status, _, content = self.request('/')
        self.assertEqual(status, 200)
        self.assertNotIn(b'/owner', content)
        self.assertNotIn('访问统计'.encode(), content)
        for path in ['/realtime.js', '/showcase.css', '/ops-assets/process-01.webp']:
            self.assertEqual(self.request(path)[0], 200)

    def test_owner_authentication_and_stats(self):
        event = self.event()
        self.assertEqual(self.request('/__lab/visit', event)[0], 204)
        self.assertEqual(self.request('/__lab/visit', event)[0], 204)
        self.assertEqual(self.request('/__lab/login', {'key':'wrong'})[0], 401)
        status, headers, _ = self.request('/__lab/login', {'key':self.server.owner_key})
        self.assertEqual(status, 200)
        cookie = headers['Set-Cookie'].split(';')[0]
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('SameSite=Strict', headers['Set-Cookie'])
        status, _, raw = self.request('/__lab/stats?days=7', cookie=cookie)
        stats = json.loads(raw)
        self.assertEqual(status, 200)
        self.assertEqual(stats['views'], 1)
        self.assertEqual(stats['sessions'], 1)
        self.assertEqual(stats['records'][0]['page'], 'realtime')
        self.assertNotIn('ip', stats['records'][0])
        self.assertEqual(self.request('/__lab/stats', cookie=cookie+'bad')[0], 401)
        self.assertEqual(self.request('/__lab/stats?days=-1', cookie=cookie)[0], 400)
        self.assertEqual(self.request('/__lab/logout', {})[0], 200)

    def test_cross_origin_and_invalid_event_rejected(self):
        self.assertEqual(self.request('/__lab/visit', self.event(), origin='https://attacker.invalid')[0], 403)
        self.assertEqual(self.request('/__lab/login', {'key':self.server.owner_key}, origin='https://attacker.invalid')[0], 403)
        event = self.event()
        event['page'] = '<script>alert(1)</script>'
        self.assertEqual(self.request('/__lab/visit', event)[0], 400)
        event = self.event()
        event['referrer'] = '<img src=x>'
        self.assertEqual(self.request('/__lab/visit', event)[0], 400)
        event = self.event()
        event['id'] = 'invalid'
        self.assertEqual(self.request('/__lab/visit', event)[0], 400)

    def test_login_rate_limit(self):
        for _ in range(5):
            self.assertEqual(self.request('/__lab/login', {'key':'wrong'})[0], 401)
        self.assertEqual(self.request('/__lab/login', {'key':self.server.owner_key})[0], 429)

if __name__ == '__main__':
    unittest.main(verbosity=2)
