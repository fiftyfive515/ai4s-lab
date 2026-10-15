"""AI Research Lab：独立静态站点 + 最小化访问统计 + 站主后台。仅使用 Python 标准库。"""
from __future__ import annotations

import argparse
import collections
import hashlib
import hmac
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent
PAGES = {'overview', 'monitor', 'data', 'models', 'experiment', 'trace', 'efficiency', 'about', 'realtime', 'carriers'}
PUBLIC = {'index.html', 'app.js', 'cases.js', 'twin.js', 'operations.js', 'operations.css', 'styles.css', 'favicon.svg', 'visit.js', 'visit-config.js', 'owner.js', 'realtime.js', 'showcase.css', 'tbc.html', 'tbc.css', 'tbc.js', 'tbc-tailwind.css', 'cloudflare-analytics.js'}
VENDOR = {'vendor/echarts.min.js', 'vendor/fontawesome/css/all.min.css', 'vendor/fontawesome/webfonts/fa-solid-900.woff2', 'vendor/fontawesome/webfonts/fa-brands-400.woff2', 'vendor/fontawesome/webfonts/fa-regular-400.woff2'}
OPS_ASSETS = {f'process-{i:02d}.webp' for i in range(1, 5)}
UTC = timezone.utc


class LabServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, runtime: Path, *, secure_cookie=False, enabled=True, origin=None):
        runtime.mkdir(parents=True, exist_ok=True)
        self.db = runtime / 'visits.sqlite3'
        token_path = runtime / 'owner-key.txt'
        configured = os.environ.get('ATLAS_OWNER_KEY')
        if configured:
            if len(configured) < 24:
                raise ValueError('ATLAS_OWNER_KEY 至少需要 24 个字符。')
            self.owner_key = configured
        else:
            if not token_path.exists():
                token_path.write_text(secrets.token_urlsafe(32), encoding='utf-8')
                try:
                    token_path.chmod(0o600)
                except OSError:
                    pass
            self.owner_key = token_path.read_text(encoding='utf-8').strip()
        self.signing_key = secrets.token_bytes(32)
        self.secure_cookie = secure_cookie
        self.analytics_enabled = enabled
        self.origin = origin.rstrip('/') if origin else None
        self.failures = collections.OrderedDict()
        self.failure_lock = threading.Lock()
        self.login_window = 900
        self.retention_days = 30
        self.last_cleanup = 0
        self.write_lock = threading.Lock()
        with self.connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS visits (
                id TEXT PRIMARY KEY, session TEXT NOT NULL,
                at TEXT NOT NULL, page TEXT NOT NULL,
                device TEXT NOT NULL, referrer TEXT NOT NULL)''')
            db.execute('CREATE INDEX IF NOT EXISTS visits_at ON visits(at)')
        super().__init__(address, Handler)

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.db, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def session_cookie(self):
        expires = str(int(time.time()) + 8 * 3600)
        nonce = secrets.token_hex(16)
        value = f'{expires}.{nonce}'
        signature = hmac.new(self.signing_key, value.encode(), hashlib.sha256).hexdigest()
        return f'{value}.{signature}'

    def authorized(self, cookie_header):
        try:
            jar = SimpleCookie()
            jar.load(cookie_header or '')
            token = jar['atlas_owner'].value
            expiry, nonce, signature = token.split('.')
            expected = hmac.new(self.signing_key, f'{expiry}.{nonce}'.encode(), hashlib.sha256).hexdigest()
            return len(nonce) == 32 and int(expiry) > time.time() and hmac.compare_digest(signature, expected)
        except (KeyError, ValueError, TypeError):
            return False

    def record(self, body):
        if not self.analytics_enabled:
            return
        uuid = r'[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}'
        if not isinstance(body, dict) or not all(isinstance(body.get(k), str) for k in ('id', 'session', 'page', 'device', 'referrer')):
            raise ValueError('invalid event')
        if not re.fullmatch(uuid, body['id']) or not re.fullmatch(uuid, body['session']):
            raise ValueError('invalid id')
        if body['page'] not in PAGES or body['device'] not in ('small-screen', 'large-screen'):
            raise ValueError('invalid page')
        referrer = body['referrer'].lower()
        if len(referrer) > 253 or (referrer and not re.fullmatch(r'[a-z0-9.-]+', referrer)):
            raise ValueError('invalid referrer')
        now = datetime.now(UTC)
        with self.write_lock, self.connect() as db:
            # 无论收到多少事件，每天清理一次超过 30 天的记录。
            if time.time() - self.last_cleanup > 86400:
                db.execute('DELETE FROM visits WHERE at < ?', ((now - timedelta(days=self.retention_days)).isoformat(),))
                self.last_cleanup = time.time()
            # 每个内存会话一天最多 100 次事件，避免前端误触发。
            count = db.execute('SELECT COUNT(*) FROM visits WHERE session = ? AND at >= ?', (body['session'], (now - timedelta(days=1)).isoformat())).fetchone()[0]
            if count >= 100:
                return
            db.execute('INSERT OR IGNORE INTO visits VALUES (?, ?, ?, ?, ?, ?)', (body['id'], body['session'], now.isoformat(timespec='seconds'), body['page'], body['device'], referrer))

    def stats(self, days):
        now = datetime.now(UTC)
        cutoff = (now - timedelta(days=min(days, self.retention_days))).isoformat()
        with self.write_lock, self.connect() as db:
            db.execute('DELETE FROM visits WHERE at < ?', ((now - timedelta(days=self.retention_days)).isoformat(),))
            total, sessions = db.execute('SELECT COUNT(*), COUNT(DISTINCT session) FROM visits WHERE at >= ?', (cutoff,)).fetchone()
            pages = db.execute('SELECT page, COUNT(*) FROM visits WHERE at >= ? GROUP BY page ORDER BY COUNT(*) DESC', (cutoff,)).fetchall()
            rows = db.execute('SELECT at, session, page, device, referrer FROM visits WHERE at >= ? ORDER BY at DESC, rowid DESC LIMIT 200', (cutoff,)).fetchall()
        return {'views': total, 'sessions': sessions, 'days': days, 'retention_days': self.retention_days,
                'pages': [{'page': p, 'views': n} for p, n in pages],
                'records': [dict(zip(('at', 'session', 'page', 'device', 'referrer'), row)) for row in rows]}


class Handler(BaseHTTPRequestHandler):
    server: LabServer
    protocol_version = 'HTTP/1.1'

    def log_message(self, *_):
        pass  # 不将访客 IP、User-Agent、URL 或口令写入访问日志。

    def reply(self, status, body=b'', content_type='application/json; charset=utf-8', headers=None, head=False):
        if isinstance(body, dict):
            body = json.dumps(body, ensure_ascii=False).encode()
        elif isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        embedded = urlsplit(self.path).path == '/tbc.html'
        self.send_header('X-Frame-Options', 'SAMEORIGIN' if embedded else 'DENY')
        frame_ancestors = "'self'" if embedded else "'none'"
        self.send_header('Content-Security-Policy', f"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors {frame_ancestors}; base-uri 'none'; form-action 'self'")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET(head=True)

    def do_GET(self, head=False):
        path = urlsplit(self.path).path
        if path in ('/owner', '/owner/'):
            return self.reply(200, (ROOT / 'owner.html').read_bytes(), 'text/html; charset=utf-8', head=head)
        if path == '/__lab/stats':
            if not self.server.authorized(self.headers.get('Cookie')):
                return self.reply(401, {'error': '需要站主登录'}, head=head)
            try:
                days = int(parse_qs(urlsplit(self.path).query).get('days', ['7'])[0])
                if days not in (1, 7, 30):
                    raise ValueError()
            except ValueError:
                return self.reply(400, {'error': '时间范围无效'}, head=head)
            return self.reply(200, self.server.stats(days), head=head)
        if path == '/visit-config.js':
            enabled = 'true' if self.server.analytics_enabled else 'false'
            return self.reply(200, f'window.ATLAS_VISIT_ENABLED = {enabled};', 'text/javascript; charset=utf-8', head=head)
        name = 'index.html' if path == '/' else path.lstrip('/')
        asset_path = ROOT / 'ops-assets' / Path(name).name if path.startswith('/ops-assets/') else None
        if name not in PUBLIC and name not in VENDOR and not (asset_path and Path(name).name in OPS_ASSETS and Path(name).name == name.split('/')[-1]):
            return self.reply(404, {'error': 'Not found'}, head=head)
        mime = mimetypes.guess_type(name)[0] or 'application/octet-stream'
        return self.reply(200, (asset_path if asset_path else ROOT / name).read_bytes(), mime + '; charset=utf-8', head=head)

    def same_origin(self):
        # 拒绝跨站提交。反向代理部署应显式设置 ATLAS_PUBLIC_ORIGIN。
        origin = self.headers.get('Origin')
        expected = self.server.origin or f'{"https" if self.server.secure_cookie else "http"}://{self.headers.get("Host", "")}'
        return origin == expected and self.headers.get('Sec-Fetch-Site') not in ('cross-site', 'none')

    def read_json(self):
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 < length <= 2048 or self.headers.get_content_type() != 'application/json':
            raise ValueError('invalid request')
        result = json.loads(self.rfile.read(length))
        if not isinstance(result, dict):
            raise ValueError('invalid body')
        return result

    def do_POST(self):
        # 先限制大小并读取请求体，避免长连接残留请求内容。
        try:
            body = self.read_json()
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            self.close_connection = True
            return self.reply(400, {'error': '请求无效'})
        if not self.same_origin():
            return self.reply(403, {'error': '请求来源无效'})
        path = urlsplit(self.path).path
        if path == '/__lab/visit':
            try:
                self.server.record(body)
            except ValueError:
                return self.reply(400, {'error': '事件无效'})
            return self.reply(204)
        if path == '/__lab/login':
            # 仅内存中临时使用地址限制猜口令；不写入访客记录或磁盘。
            addr, now = self.client_address[0], time.time()
            with self.server.failure_lock:
                bucket = self.server.failures.get(addr, [])
                bucket = [t for t in bucket if now - t < self.server.login_window]
                if len(bucket) >= 5:
                    return self.reply(429, {'error': '尝试过多，请 15 分钟后重试'})
                key = body.get('key')
                if not isinstance(key, str) or not hmac.compare_digest(key.encode(), self.server.owner_key.encode()):
                    self.server.failures[addr] = bucket + [now]
                    self.server.failures.move_to_end(addr)
                    while len(self.server.failures) > 1000:
                        self.server.failures.popitem(last=False)
                    return self.reply(401, {'error': '访问口令无效'})
                self.server.failures.pop(addr, None)
            cookie = f'atlas_owner={self.server.session_cookie()}; HttpOnly; SameSite=Strict; Path=/__lab/; Max-Age=28800'
            if self.server.secure_cookie:
                cookie += '; Secure'
            return self.reply(200, {'ok': True}, headers={'Set-Cookie': cookie})
        if path == '/__lab/logout':
            cookie = 'atlas_owner=; HttpOnly; SameSite=Strict; Path=/__lab/; Max-Age=0'
            if self.server.secure_cookie:
                cookie += '; Secure'
            return self.reply(200, {'ok': True}, headers={'Set-Cookie': cookie})
        return self.reply(404, {'error': 'Not found'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8089)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--runtime', type=Path, default=ROOT / '.runtime')
    parser.add_argument('--no-analytics', action='store_true')
    args = parser.parse_args()
    public_origin = os.environ.get('ATLAS_PUBLIC_ORIGIN')
    if public_origin and (urlsplit(public_origin).scheme not in ('http', 'https') or not urlsplit(public_origin).netloc):
        parser.error('ATLAS_PUBLIC_ORIGIN 应为站点的完整来源地址。')
    secure = bool(public_origin and public_origin.startswith('https://'))
    server = LabServer((args.bind, args.port), args.runtime, secure_cookie=secure, enabled=not args.no_analytics, origin=public_origin)
    print(f'Lab: http://{args.bind}:{args.port} / Owner: http://{args.bind}:{args.port}/owner', flush=True)
    if not os.environ.get('ATLAS_OWNER_KEY'):
        print(f'站主访问口令保存在本机文件：{args.runtime / "owner-key.txt"}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
