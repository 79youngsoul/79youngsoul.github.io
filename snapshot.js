#!/usr/bin/env node
/**
 * 버전 스냅샷 — 지금 소스를 versions/v<버전>/ 에 통째로 복사해 둔다.
 *
 *   node snapshot.js                # index.html의 APP_VERSION으로 저장
 *   node snapshot.js --force        # 같은 버전 폴더가 있어도 덮어쓰기
 *   node snapshot.js --note "설명"   # 메모 남기기
 *   node snapshot.js --list         # 저장된 버전 목록
 *
 * 무거운 산출물(지도 타일 321MB, 공략 이미지, 자생지 색칠, 높이 데이터)은 빼고
 * 소스·데이터·문서만 담는다. 되돌릴 때 그 폴더 내용을 덮어쓰면 된다.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var OUT_ROOT = path.join(ROOT, 'versions');

var args = process.argv.slice(2);
var FORCE = args.indexOf('--force') >= 0;
var LIST = args.indexOf('--list') >= 0;
var noteIdx = args.indexOf('--note');
var NOTE = noteIdx >= 0 ? (args[noteIdx + 1] || '') : '';

/* 복사할 것 — 무거운 산출물은 뺀다 */
var FILES = [
  'index.html', 'craft-core.js', 'game-data.js', 'game-updates.js', 'map-waypoints.js',
  'import-map-waypoints.js', 'inject-map-waypoints.js', 'inject-my-waypoints.js',
  'import-discord-updates.js', 'download-guides.js', 'download-overlays.js',
  'build-heightmap.py', 'snapshot.js', 'build-standalone.js', 'build-site.js',
  'test-core.js', 'test-ui.js', 'test-heights.js', 'test-standalone.js',
  'test-integrity.js', 'test-responsive.js', 'test-standalone-full.js', 'test-browser.js',
  'verify-source.js',
  'README.md', 'CHANGELOG.md', 'DEPLOY.md',
  '대장장이&화로.txt', 'discord-updates.txt',
  'map/index.html', 'map/overlays.js', 'map/heights.js'
];

/* 안 담는 것 (용량 큼 · 다시 만들 수 있음) */
var SKIPPED = [
  ['map/tiles/', '지도 타일 321MB — 지도 프로젝트에서 다시 빌드'],
  ['map/heights.bin, heights-data.js', 'python build-heightmap.py'],
  ['guides/', 'node download-guides.js'],
  ['map/overlays/', 'node download-overlays.js'],
  ['node_modules/', 'npm i jsdom'],
  ['versions/', '스냅샷 폴더 자체'],
  ['docs/ (업로드용)', 'node build-site.js --out docs'],
  ['dist/', 'node build-standalone.js']
];

function readVersion() {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var m = /var APP_VERSION = '([^']+)'/.exec(html);
  if (!m) { console.error('index.html에서 APP_VERSION을 못 찾았습니다.'); process.exit(1); }
  return m[1];
}

function listVersions() {
  if (!fs.existsSync(OUT_ROOT)) { console.log('저장된 버전이 없습니다.'); return; }
  var dirs = fs.readdirSync(OUT_ROOT).filter(function (d) {
    return fs.statSync(path.join(OUT_ROOT, d)).isDirectory();
  }).sort();
  if (!dirs.length) { console.log('저장된 버전이 없습니다.'); return; }
  console.log('저장된 버전 ' + dirs.length + '개\n');
  dirs.forEach(function (d) {
    var info = path.join(OUT_ROOT, d, 'SNAPSHOT.md');
    var when = '';
    if (fs.existsSync(info)) {
      var mm = /저장 시각: (.+)/.exec(fs.readFileSync(info, 'utf8'));
      if (mm) when = mm[1];
    }
    var size = dirSize(path.join(OUT_ROOT, d));
    console.log('  ' + d.padEnd(12) + (when || '').padEnd(26)
      + (size / 1024).toFixed(0) + 'KB');
  });
}

function dirSize(dir) {
  var total = 0;
  fs.readdirSync(dir).forEach(function (name) {
    var full = path.join(dir, name);
    var st = fs.statSync(full);
    total += st.isDirectory() ? dirSize(full) : st.size;
  });
  return total;
}

function copyFile(rel, destRoot) {
  var src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return null;
  var dest = path.join(destRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return fs.statSync(src).size;
}

if (LIST) { listVersions(); return; }

var version = readVersion();
var destRoot = path.join(OUT_ROOT, 'v' + version);

if (fs.existsSync(destRoot) && !FORCE) {
  console.error('이미 있습니다: ' + destRoot
    + '\n같은 버전을 다시 저장하려면 --force, 아니면 index.html의 APP_VERSION을 올리세요.');
  process.exit(1);
}

fs.mkdirSync(destRoot, { recursive: true });

var copied = [], missing = [], total = 0;
FILES.forEach(function (rel) {
  var size = copyFile(rel, destRoot);
  if (size === null) missing.push(rel);
  else { copied.push({ rel: rel, size: size }); total += size; }
});

/* 스냅샷 설명 파일 */
var now = new Date();
var when = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-'
  + String(now.getDate()).padStart(2, '0') + ' '
  + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

var lines = [];
lines.push('# 한월 공략소 v' + version + ' 스냅샷');
lines.push('');
lines.push('저장 시각: ' + when);
if (NOTE) { lines.push(''); lines.push('> ' + NOTE); }
lines.push('');
lines.push('## 담긴 파일 (' + copied.length + '개 · ' + (total / 1024).toFixed(0) + 'KB)');
lines.push('');
lines.push('| 파일 | 크기 |');
lines.push('|---|---|');
copied.forEach(function (c) {
  lines.push('| `' + c.rel + '` | ' + (c.size / 1024).toFixed(1) + 'KB |');
});
lines.push('');
lines.push('## 안 담긴 것 (다시 만들 수 있음)');
lines.push('');
lines.push('| 대상 | 다시 만드는 법 |');
lines.push('|---|---|');
SKIPPED.forEach(function (s) { lines.push('| `' + s[0] + '` | ' + s[1] + ' |'); });
if (missing.length) {
  lines.push('');
  lines.push('## 이번에 없던 파일');
  lines.push('');
  missing.forEach(function (m) { lines.push('- `' + m + '`'); });
}
lines.push('');
lines.push('## 되돌리는 법');
lines.push('');
lines.push('```bash');
lines.push('# 이 폴더 내용을 제작 폴더에 덮어쓰면 그 버전으로 돌아간다');
lines.push('# (지도 타일·이미지·높이 데이터는 그대로 두면 됨)');
lines.push('```');
lines.push('');
fs.writeFileSync(path.join(destRoot, 'SNAPSHOT.md'), lines.join('\n'), 'utf8');

console.log('v' + version + ' 저장 완료 → ' + destRoot);
console.log('파일 ' + copied.length + '개 · ' + (total / 1024).toFixed(0) + 'KB'
  + (missing.length ? ' · 없던 파일 ' + missing.length + '개' : ''));
if (NOTE) console.log('메모: ' + NOTE);
