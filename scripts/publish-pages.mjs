import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Нет dist/index.html. Сначала выполните: npm run build');
  process.exit(1);
}

const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

let remote;
try {
  remote = git(['remote', 'get-url', 'origin']);
} catch {
  console.error('Не найден remote origin. Добавьте репозиторий GitHub: git remote add origin <url>');
  process.exit(1);
}

const name = (() => { try { return git(['config', 'user.name']) || 'GitHub Pages'; } catch { return 'GitHub Pages'; } })();
const email = (() => { try { return git(['config', 'user.email']) || 'noreply@github.com'; } catch { return 'noreply@github.com'; } })();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-pages-'));

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else if (entry.isFile()) fs.copyFileSync(source, target);
  }
}

try {
  copyDir(dist, tmp);
  fs.writeFileSync(path.join(tmp, '.nojekyll'), '');

  const run = (args) => execFileSync('git', args, { cwd: tmp, stdio: 'inherit' });
  run(['init', '-b', 'gh-pages']);
  run(['config', 'user.name', name]);
  run(['config', 'user.email', email]);
  run(['add', '-A']);
  run(['commit', '-m', 'Сборка сайта для GitHub Pages']);
  run(['remote', 'add', 'origin', remote]);
  run(['push', '-f', 'origin', 'HEAD:gh-pages']);

  console.log('\nГотово. GitHub Pages обновится в течение минуты:');
  console.log('https://real1zator.github.io/rusresurs-site/');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
