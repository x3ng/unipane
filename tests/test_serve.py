import json
import tempfile
import unittest
from pathlib import Path

import serve


class PathSafetyTests(unittest.TestCase):
    def test_safe_child_accepts_paths_inside_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = serve.safe_child(root, 'notes/a.md')
            self.assertEqual(target, (root / 'notes/a.md').resolve())

    def test_safe_child_rejects_sibling_prefix_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            root = base / 'root'
            sibling = base / 'root2'
            root.mkdir()
            sibling.mkdir()

            target = serve.safe_child(root, '../root2/file.md')
            self.assertIsNone(target)

    def test_file_stat_reports_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            note = root / 'note.md'
            note.write_text('hello', encoding='utf-8')

            stat = serve.file_stat(root, 'note.md')
            self.assertIsNotNone(stat)
            self.assertTrue(stat['exists'])
            self.assertEqual(stat['path'], 'note.md')
            self.assertEqual(stat['type'], 'file')
            self.assertEqual(stat['size'], 5)
            self.assertIn('mtimeMs', stat)

    def test_file_stat_reports_missing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            stat = serve.file_stat(Path(tmp), 'missing.md')
            self.assertEqual(stat, {'path': 'missing.md', 'exists': False})


class RootRuntimeTests(unittest.TestCase):
    def test_root_info_reports_config(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            config_dir = root / '.unipane'
            config_dir.mkdir()
            (config_dir / 'config.json').write_text('{}', encoding='utf-8')

            info = serve.root_info(root)
            self.assertEqual(info['root'], str(root.resolve()))
            self.assertTrue(info['hasConfig'])
            self.assertEqual(info['configPath'], str(config_dir / 'config.json'))

    def test_resolve_new_root_accepts_relative_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            child = root / 'child'
            child.mkdir()

            self.assertEqual(serve.resolve_new_root(root, 'child'), child.resolve())

    def test_resolve_new_root_accepts_absolute_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)

            self.assertEqual(serve.resolve_new_root(Path('/'), str(root)), root.resolve())

    def test_resolve_new_root_rejects_missing_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                serve.resolve_new_root(Path(tmp), 'missing')

    def test_resolve_new_root_rejects_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            file_path = root / 'note.md'
            file_path.write_text('x', encoding='utf-8')

            with self.assertRaises(ValueError):
                serve.resolve_new_root(root, 'note.md')


class ConfigTests(unittest.TestCase):
    def test_resolve_root_uses_config_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = Path(tmp)
            data = cwd / 'data'
            config_dir = cwd / '.unipane'
            data.mkdir()
            config_dir.mkdir()
            (config_dir / 'config.json').write_text(
                json.dumps({'root': '../data'}),
                encoding='utf-8',
            )

            self.assertEqual(serve.resolve_root(cwd), data.resolve())

    def test_resolve_root_cli_arg_wins(self):
        with tempfile.TemporaryDirectory() as tmp:
            cwd = Path(tmp)
            other = cwd / 'other'
            other.mkdir()

            self.assertEqual(serve.resolve_root(cwd, str(other)), other.resolve())


class CliTests(unittest.TestCase):
    def test_parse_default_args(self):
        self.assertEqual(serve.parse_args([]), (None, 8000, False))

    def test_parse_port_only(self):
        self.assertEqual(serve.parse_args(['9000']), (None, 9000, True))

    def test_parse_root_only(self):
        self.assertEqual(serve.parse_args(['/tmp/notes']), ('/tmp/notes', 8000, False))

    def test_parse_root_and_port(self):
        self.assertEqual(serve.parse_args(['/tmp/notes', '9000']), ('/tmp/notes', 9000, True))

    def test_parse_rejects_invalid_port(self):
        with self.assertRaises(ValueError):
            serve.parse_args(['/tmp/notes', 'abc'])


if __name__ == '__main__':
    unittest.main()
