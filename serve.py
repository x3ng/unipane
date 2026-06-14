#!/usr/bin/env python3
"""Unipane serve — local HTTP server + file management API."""

import http.server
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path.cwd()
ENGINE = Path(__file__).parent  # Where serve.py / index.html / main.js live
EXCLUDE = {'.unipane', '.git', '__pycache__', 'node_modules'}


def scan_tree(root: Path, prefix: str = '', show_hidden: bool = False) -> list:
    """Scan directory and return tree structure."""
    items = []
    try:
        entries = sorted(root.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return items

    for entry in entries:
        if entry.name in EXCLUDE:
            continue
        if not show_hidden and entry.name.startswith('.'):
            continue
        rel = f"{prefix}/{entry.name}" if prefix else entry.name
        if entry.is_dir():
            items.append({
                'name': entry.name,
                'path': rel,
                'type': 'dir',
                'children': scan_tree(entry, rel, show_hidden),
            })
        else:
            items.append({
                'name': entry.name,
                'path': rel,
                'type': 'file',
            })
    return items


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/tree':
            self._handle_tree(parsed.query)
        elif parsed.path.startswith('/.unipane/'):
            # config.json from user data, everything else from engine
            if parsed.path == '/.unipane/config.json':
                self._serve_file(ROOT / '.unipane' / 'config.json')
            else:
                self._serve_engine(parsed.path)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/file':
            self._handle_write()
        else:
            self.send_error(404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/file':
            self._handle_delete(parsed.query)
        else:
            self.send_error(404)

    def _serve_file(self, target: Path):
        """Serve a single file."""
        if not target.exists():
            self.send_error(404)
            return
        content_type = 'application/json' if target.suffix == '.json' else 'text/plain'
        data = target.read_bytes()
        try:
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except BrokenPipeError:
            pass

    def _serve_engine(self, path: str):
        """Serve engine files (index.html, main.js, themes/) from the project directory."""
        rel = path[len('/.unipane/'):]  # Strip prefix
        if not rel or rel == '/':
            rel = 'index.html'
        target = (ENGINE / rel).resolve()
        if not str(target).startswith(str(ENGINE.resolve())) or not target.exists():
            self.send_error(404)
            return

        content_types = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
        }
        content_type = content_types.get(target.suffix, 'text/plain')
        data = target.read_bytes()
        try:
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except BrokenPipeError:
            pass

    def _handle_tree(self, query: str = ''):
        params = parse_qs(query)
        show_hidden = params.get('hidden', ['false'])[0].lower() == 'true'
        tree = scan_tree(ROOT, show_hidden=show_hidden)
        data = json.dumps(tree, ensure_ascii=False).encode()
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except BrokenPipeError:
            pass

    def _handle_write(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))
        path = body.get('path', '')
        content = body.get('content', '')

        target = (ROOT / path).resolve()
        if not str(target).startswith(str(ROOT.resolve())):
            self.send_error(403, 'Path outside root')
            return

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')

        try:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except BrokenPipeError:
            pass

    def _handle_delete(self, query: str):
        params = parse_qs(query)
        path = params.get('path', [''])[0]

        target = (ROOT / path).resolve()
        if not str(target).startswith(str(ROOT.resolve())):
            self.send_error(403, 'Path outside root')
            return
        if not target.exists():
            self.send_error(404, 'File not found')
            return

        if target.is_dir():
            target.rmdir()
        else:
            target.unlink()

        try:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except BrokenPipeError:
            pass


def main():
    global ROOT
    port = 8000

    args = sys.argv[1:]
    if args:
        root_arg = args[0]
        if root_arg.isdigit():
            port = int(root_arg)
        else:
            ROOT = Path(root_arg).resolve()
    else:
        # Auto-detect: check .unipane/config.json in current directory
        local_config = Path.cwd() / '.unipane' / 'config.json'
        if local_config.exists():
            try:
                cfg = json.loads(local_config.read_text(encoding='utf-8'))
                root_val = cfg.get('root')
                if root_val:
                    ROOT = (local_config.parent / root_val).resolve()
            except (json.JSONDecodeError, OSError):
                pass

    if not ROOT.exists():
        print(f"Error: root directory {ROOT} does not exist")
        sys.exit(1)

    config_path = ROOT / '.unipane' / 'config.json'
    has_config = config_path.exists()

    print(f"Serving {ROOT} at http://localhost:{port}")
    if has_config:
        print(f"Config: {config_path}")
    print(f"Open http://localhost:{port}/.unipane/index.html in browser")

    class ReusableHTTPServer(http.server.HTTPServer):
        allow_reuse_address = True

    server = ReusableHTTPServer(('', port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == '__main__':
    main()
