#!/usr/bin/env node
/* Собрать сайт, закоммитить в main и опубликовать на GitHub Pages одной командой. */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const capture = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();

const message = process.argv.slice(2).join(' ') || 'Обновление сайта';

console.log('› сборка');
run(process.execPath, ['build.mjs']);

console.log('› коммит');
run('git', ['add', '-A']);
let hasChanges = true;
try {
  capture('git', ['diff', '--cached', '--quiet']);
  hasChanges = false;
} catch {
  hasChanges = true;
}
if (hasChanges) {
  run('git', ['commit', '-m', message]);
} else {
  console.log('  нечего коммитить, публикую текущую сборку');
}

console.log('› пуш в main');
try {
  run('git', ['push', 'origin', 'main']);
} catch {
  console.log('  пуш не удался (возможно, нет изменений или сети)');
}

console.log('› публикация на GitHub Pages');
run(process.execPath, ['scripts/publish-pages.mjs']);
console.log('\nГотово: https://real1zator.github.io/rusresurs-site/');
