#!/usr/bin/env python3
"""Unipane serve — local HTTP server + file management API."""

import http.server
import json
import errno
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path.cwd()
ENGINE = Path(__file__).parent  # Where serve.py / index.html / main.js live
EXCLUDE = {'.unipane', '.git', '__pycache__', 'node_modules'}
HOST = '127.0.0.1'
PORT_RETRIES = 20


def is_relative_to(path: Path, root: Path) -> bool:
    """Return True when path is inside root after resolving symlinks."""
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def safe_child(root: Path, path: str) -> Path | None:
    """Resolve a user path under root, rejecting traversal outside root."""
    target = (root / path).resolve()
    if not is_relative_to(target, root):
        return None
    return target


def relative_path(root: Path, target: Path) -> str:
    """Return a slash-delimited relative path from root to target."""
    return target.resolve().relative_to(root.resolve()).as_posix()


def resolve_root(cwd: Path, root_arg: str | None = None) -> Path:
    """Resolve the served content root from CLI args or .unipane/config.json."""
    if root_arg:
        return Path(root_arg).resolve()

    local_config = cwd / '.unipane' / 'config.json'
    if not local_config.exists():
        return cwd.resolve()

    try:
        cfg = json.loads(local_config.read_text(encoding='utf-8'))
        root_val = cfg.get('root')
        if root_val:
            return (local_config.parent / root_val).resolve()
    except (json.JSONDecodeError, OSError):
        pass

    return cwd.resolve()


def file_stat(root: Path, path: str) -> dict | None:
    """Return JSON-serializable stat data for a file under root."""
    target = safe_child(root, path)
    if target is None:
        return None

    exists = target.exists()
    result = {
        'path': relative_path(root, target) if exists else path,
        'exists': exists,
    }
    if not exists:
        return result

    stat = target.stat()
    result.update({
        'type': 'dir' if target.is_dir() else 'file',
        'size': stat.st_size,
        'mtime': stat.st_mtime,
        'mtimeMs': int(stat.st_mtime * 1000),
    })
    return result


def root_info(root: Path) -> dict:
    """Return JSON-serializable runtime root information."""
    config_path = root / '.unipane' / 'config.json'
    return {
        'root': str(root.resolve()),
        'configPath': str(config_path),
        'hasConfig': config_path.exists(),
    }


def resolve_new_root(current_root: Path, root_value: str) -> Path:
    """Resolve a requested root change relative to the current root."""
    candidate = Path(root_value).expanduser()
    if not candidate.is_absolute():
        candidate = current_root / candidate
    candidate = candidate.resolve()
    if not candidate.exists():
        raise ValueError(f'Root does not exist: {candidate}')
    if not candidate.is_dir():
        raise ValueError(f'Root is not a directory: {candidate}')
    return candidate


def parse_args(args: list[str]) -> tuple[str | None, int, bool]:
    """Parse CLI args as optional root and port.

    Supported forms:
      serve.py
      serve.py 8001
      serve.py /path/to/root
      serve.py /path/to/root 8001
    """
    root_arg = None
    port = 8000
    explicit_port = False

    if not args:
        return root_arg, port, explicit_port
    if len(args) > 2:
        raise ValueError('Usage: serve.py [root] [port]')

    if args[0].isdigit():
        port = int(args[0])
        explicit_port = True
    else:
        root_arg = args[0]

    if len(args) == 2:
        if not args[1].isdigit():
            raise ValueError('Port must be a number')
        port = int(args[1])
        explicit_port = True

    if not 1 <= port <= 65535:
        raise ValueError('Port must be between 1 and 65535')

    return root_arg, port, explicit_port


def is_allowed_origin(origin: str | None, port: int | None = None) -> bool:
    """Allow browser API access only from the local Unipane server origin."""
    if not origin:
        return True
    parsed = urlparse(origin)
    if parsed.scheme not in {'http', 'https'}:
        return False
    if parsed.hostname not in {'localhost', '127.0.0.1', '::1'}:
        return False
    if port is not None and parsed.port not in {None, port}:
        return False
    return True


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
        origin = self.headers.get('Origin')
        if is_allowed_origin(origin, self.server.server_port) and origin:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        if not is_allowed_origin(self.headers.get('Origin'), self.server.server_port):
            self.send_error(403, 'Origin not allowed')
            return
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        self._handle_get()

    def do_HEAD(self):
        self._handle_get()

    def _handle_get(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/tree':
            self._handle_tree(parsed.query)
        elif parsed.path == '/api/stat':
            self._handle_stat(parsed.query)
        elif parsed.path == '/api/root':
            self._handle_root_get()
        elif parsed.path == '/' or parsed.path == '/index.html':
            self._serve_engine('/index.html')
        elif parsed.path.startswith('/__unipane__/'):
            self._serve_engine(parsed.path)
        else:
            super().do_GET()

    def do_POST(self):
        if not is_allowed_origin(self.headers.get('Origin'), self.server.server_port):
            self.send_error(403, 'Origin not allowed')
            return
        parsed = urlparse(self.path)
        if parsed.path == '/api/file':
            self._handle_write()
        elif parsed.path == '/api/root':
            self._handle_root_set()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if not is_allowed_origin(self.headers.get('Origin'), self.server.server_port):
            self.send_error(403, 'Origin not allowed')
            return
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
            if self.command != 'HEAD':
                self.wfile.write(data)
        except BrokenPipeError:
            pass

    def _serve_engine(self, path: str):
        """Serve engine files (index.html, main.js, themes/) from the project directory."""
        if path.startswith('/__unipane__/'):
            rel = path[len('/__unipane__/'):]
        else:
            rel = path.lstrip('/')
        if not rel or rel == '/':
            rel = 'index.html'
        target = (ENGINE / rel).resolve()
        if not is_relative_to(target, ENGINE) or not target.exists():
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
            if self.command != 'HEAD':
                self.wfile.write(data)
        except BrokenPipeError:
            pass

    def _handle_tree(self, query: str = ''):
        params = parse_qs(query)
        show_hidden = params.get('hidden', ['false'])[0].lower() == 'true'
        tree = scan_tree(ROOT, show_hidden=show_hidden)
        self._send_json(tree)

    def _handle_stat(self, query: str = ''):
        params = parse_qs(query)
        paths = params.get('path', [])
        if not paths:
            self._send_json({'error': 'Missing path'}, status=400)
            return

        stats = []
        for path in paths:
            item = file_stat(ROOT, path)
            if item is None:
                self._send_json({'error': 'Path outside root'}, status=403)
                return
            stats.append(item)

        self._send_json(stats[0] if len(stats) == 1 else stats)

    def _handle_root_get(self):
        self._send_json(root_info(ROOT))

    def _handle_root_set(self):
        global ROOT
        body = self._read_json_body()
        if body is None:
            return

        root_value = body.get('root', '')
        if not isinstance(root_value, str) or not root_value:
            self._send_json({'error': 'root must be a non-empty string'}, status=400)
            return

        try:
            ROOT = resolve_new_root(ROOT, root_value)
        except ValueError as exc:
            self._send_json({'error': str(exc)}, status=400)
            return

        self.directory = str(ROOT)
        self._send_json(root_info(ROOT))

    def _read_json_body(self) -> dict | None:
        length = int(self.headers.get('Content-Length', 0))
        try:
            body = json.loads(self.rfile.read(length) or b'{}')
        except json.JSONDecodeError:
            self._send_json({'error': 'Invalid JSON'}, status=400)
            return None
        if not isinstance(body, dict):
            self._send_json({'error': 'JSON body must be an object'}, status=400)
            return None
        return body

    def _send_json(self, value, status: int = 200):
        data = json.dumps(value, ensure_ascii=False).encode()
        self._send_bytes(data, 'application/json', status)

    def _send_bytes(self, data: bytes, content_type: str, status: int = 200):
        try:
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(data)
        except BrokenPipeError:
            pass

    def _handle_write(self):
        body = self._read_json_body()
        if body is None:
            return
        path = body.get('path', '')
        content = body.get('content', '')
        if not isinstance(path, str) or not isinstance(content, str):
            self._send_json({'error': 'path and content must be strings'}, status=400)
            return

        target = safe_child(ROOT, path)
        if target is None:
            self._send_json({'error': 'Path outside root'}, status=403)
            return

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')

        self._send_json({'ok': True})

    def _handle_delete(self, query: str):
        params = parse_qs(query)
        path = params.get('path', [''])[0]

        target = safe_child(ROOT, path)
        if target is None:
            self._send_json({'error': 'Path outside root'}, status=403)
            return
        if not target.exists():
            self._send_json({'error': 'File not found'}, status=404)
            return

        if target.is_dir():
            target.rmdir()
        else:
            target.unlink()

        self._send_json({'ok': True})


def main():
    global ROOT
    try:
        root_arg, port, explicit_port = parse_args(sys.argv[1:])
    except ValueError as exc:
        print(f"Error: {exc}")
        sys.exit(2)

    ROOT = resolve_root(Path.cwd(), root_arg)

    if not ROOT.exists():
        print(f"Error: root directory {ROOT} does not exist")
        sys.exit(1)

    config_path = ROOT / '.unipane' / 'config.json'
    has_config = config_path.exists()

    class ReusableHTTPServer(http.server.HTTPServer):
        allow_reuse_address = True

    server = None
    selected_port = port
    for candidate in range(port, port + (1 if explicit_port else PORT_RETRIES)):
        try:
            server = ReusableHTTPServer((HOST, candidate), Handler)
            selected_port = candidate
            break
        except OSError as exc:
            if exc.errno != errno.EADDRINUSE:
                raise
            if explicit_port:
                print(f"Error: http://{HOST}:{candidate} is already in use")
                print("Choose another port, for example: python3 serve.py 8001")
                sys.exit(1)

    if server is None:
        end_port = port + PORT_RETRIES - 1
        print(f"Error: no free port found in {HOST}:{port}-{end_port}")
        sys.exit(1)

    if selected_port != port:
        print(f"Port {port} is in use; using {selected_port} instead.")
    print(f"Serving {ROOT} at http://{HOST}:{selected_port}")
    if has_config:
        print(f"Config: {config_path}")
    print(f"Open http://{HOST}:{selected_port}/index.html in browser")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == '__main__':
    main()
