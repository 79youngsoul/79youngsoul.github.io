#!/usr/bin/env node
/**
 * 사이트 업로드용 폴더 만들기 — 용량 한도에 맞춰 알아서 골라 담는다.
 *
 *   node build-site.js                # 20MB 한도로 "사이트 업로드용/" 생성
 *   node build-site.js --limit 50     # 한도를 50MB로
 *   node build-site.js --out 폴더이름
 *
 * 지도 타일 원본이 321MB라 전부는 못 올린다. 그래서 우선순위대로 담는다.
 *   1) 앱 파일 (필수)
 *   2) 지도 타일 — 멀리서 본 레벨(6)부터 가까운 레벨(3)까지
 *   3) 약초 자생지 색칠
 *   4) 커서 높이(y) 데이터
 *   5) 음영(slope) · 깊이(depth) 레이어
 *   6) 남으면 더 자세한 타일 레벨
 *
 * 안 담긴 것은 폴더 안 README-업로드.md 에 적어 둔다.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var args = process.argv.slice(2);
function opt(name, def) {
  var i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
}
var LIMIT = Number(opt('limit', 20)) * 1024 * 1024;
var OUT = path.join(ROOT, opt('out', '사이트 업로드용'));

/* ---------- 유틸 ---------- */
function walk(dir) {
  var out = [];
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).forEach(function (name) {
    var full = path.join(dir, name);
    var st = fs.statSync(full);
    if (st.isDirectory()) out = out.concat(walk(full));
    else out.push({ full: full, size: st.size });
  });
  return out;
}
function copy(rel) {
  var src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return 0;
  var dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return fs.statSync(src).size;
}
function copyGroup(files) {                 // [{full,size}] → 통째로 복사
  var total = 0;
  files.forEach(function (f) {
    var rel = path.relative(ROOT, f.full);
    var dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f.full, dest);
    total += f.size;
  });
  return total;
}
function mb(n) { return (n / 1024 / 1024).toFixed(1) + 'MB'; }

/* ---------- 담을 것 정리 ---------- */
var APP_FILES = [
  'index.html', 'craft-core.js', 'game-data.js', 'game-updates.js', 'map-waypoints.js',
  'map/index.html', 'map/overlays.js', 'map/heights.js'
];

// 타일: map/tiles/<world>/<dim>/<mw>/<layer>/<kind>/<level>/*.webp
var TILE_ROOT = path.join(ROOT, 'map', 'tiles');
function tileGroups() {
  var groups = [];                          // { kind, level, files, size }
  walk(TILE_ROOT).forEach(function (f) {
    var parts = path.relative(TILE_ROOT, f.full).split(path.sep);
    if (parts.length < 3) return;
    var level = parts[parts.length - 2];
    var kind = parts[parts.length - 3];
    var key = kind + '/' + level;
    var g = groups.filter(function (x) { return x.key === key; })[0];
    if (!g) { g = { key: key, kind: kind, level: +level, files: [], size: 0 }; groups.push(g); }
    g.files.push(f);
    g.size += f.size;
  });
  return groups;
}


/* ---------- 복사한 지도에 맞춰 메타 고치기 ----------
 * 타일 일부만 담으면, 지도가 "있다"고 알고 있는 레벨을 요청하다 빈 화면이 된다.
 * 그래서 실제로 담긴 레벨만 남기고 지운다. 남은 레벨로 확대하면 조금 흐릿할 뿐 비지는 않는다. */
function fixMapMeta(levelsByKind) {
  var file = path.join(OUT, 'map', 'index.html');
  if (!fs.existsSync(file)) return null;
  var html = fs.readFileSync(file, 'utf8');
  var i = html.indexOf('MAP_DATA');
  var start = html.indexOf('{', i);
  var depth = 0, end = -1, quote = '', inStr = false, esc = false;
  for (var k = start; k < html.length; k++) {
    var c = html[k];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) { end = k + 1; break; } }
  }
  if (end < 0) return null;

  var data = JSON.parse(html.slice(start, end));
  var kept = {}, dropped = 0;
  (data.worlds || []).forEach(function (w) {
    (w.dimensions || []).forEach(function (dim) {
      (dim.maps || []).forEach(function (m) {
        (m.layers || []).forEach(function (layer) {
          Object.keys(layer.kinds || {}).forEach(function (kind) {
            var allow = levelsByKind[kind];
            var info = layer.kinds[kind];
            if (!allow || !allow.length) { delete layer.kinds[kind]; dropped++; return; }
            var before = info.levels.length;
            info.levels = info.levels.filter(function (lv) { return allow.indexOf(lv.level) >= 0; });
            dropped += before - info.levels.length;
            kept[kind] = info.levels.map(function (lv) { return lv.level; }).sort();
            if (!info.levels.length) delete layer.kinds[kind];
          });
        });
      });
    });
  });

  fs.writeFileSync(file, html.slice(0, start) + JSON.stringify(data) + html.slice(end), 'utf8');
  return { kept: kept, dropped: dropped };
}

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

var used = 0, report = [], skipped = [];
var copiedLevels = {};      // kind → [담은 레벨]

/* 1) 앱 파일 (한도와 상관없이 필수) */
var appSize = 0;
APP_FILES.forEach(function (rel) { appSize += copy(rel); });
used += appSize;
report.push({ what: '앱 파일 ' + APP_FILES.length + '개', size: appSize });

/* 2~6) 나머지는 우선순위대로, 한도 안에서 */
var groups = tileGroups();
function tiles(kind, level) {
  return groups.filter(function (g) { return g.kind === kind && g.level === level; })[0];
}

var plan = [];
[6, 5, 4, 3].forEach(function (lv) { plan.push({ label: '지도 타일 레벨 ' + lv, group: tiles('map', lv) }); });
plan.push({ label: '약초 자생지 색칠', files: walk(path.join(ROOT, 'map', 'overlays')) });
plan.push({ label: '커서 높이 데이터', files: walk(path.join(ROOT, 'map')).filter(function (f) {
  return /heights\.bin$/.test(f.full);
}) });
[6, 5, 4, 3].forEach(function (lv) { plan.push({ label: '음영 레이어 레벨 ' + lv, group: tiles('slope', lv) }); });
[6, 5, 4, 3].forEach(function (lv) { plan.push({ label: '깊이 레이어 레벨 ' + lv, group: tiles('depth', lv) }); });
[2, 1, 0].forEach(function (lv) { plan.push({ label: '지도 타일 레벨 ' + lv + ' (더 자세히)', group: tiles('map', lv) }); });
[2, 1, 0].forEach(function (lv) { plan.push({ label: '음영 레이어 레벨 ' + lv + ' (더 자세히)', group: tiles('slope', lv) }); });
[2, 1, 0].forEach(function (lv) { plan.push({ label: '깊이 레이어 레벨 ' + lv + ' (더 자세히)', group: tiles('depth', lv) }); });
plan.push({ label: '공략 이미지', files: walk(path.join(ROOT, 'guides')) });

plan.forEach(function (item) {
  var files = item.files || (item.group ? item.group.files : []);
  if (!files || !files.length) return;
  var size = files.reduce(function (n, f) { return n + f.size; }, 0);
  if (used + size > LIMIT) { skipped.push({ what: item.label, size: size }); return; }
  copyGroup(files);
  used += size;
  report.push({ what: item.label, size: size });
  if (item.group) {
    (copiedLevels[item.group.kind] = copiedLevels[item.group.kind] || []).push(item.group.level);
  }
});

/* 담긴 타일만 있다고 알리게 메타 정리 (안 하면 확대할 때 빈 화면) */
var metaFix = fixMapMeta(copiedLevels);

/* ---------- 설명 파일 ---------- */
var lines = [];
lines.push('# 사이트 업로드용 (한월 공략소)');
lines.push('');
lines.push('이 폴더를 **통째로** 웹 호스팅에 올리면 됩니다. 서버 코드·설치 필요 없음.');
lines.push('');
lines.push('- 총 용량: **' + mb(used) + '** (한도 ' + mb(LIMIT) + ')');
lines.push('- 만든 날: ' + new Date().toLocaleString('ko-KR'));
lines.push('');
lines.push('## 담긴 것');
lines.push('');
lines.push('| 내용 | 용량 |');
lines.push('|---|---|');
report.forEach(function (r) { lines.push('| ' + r.what + ' | ' + mb(r.size) + ' |'); });
lines.push('');
if (skipped.length) {
  lines.push('## 용량 때문에 뺀 것');
  lines.push('');
  lines.push('| 내용 | 용량 | 없으면 |');
  lines.push('|---|---|---|');
  skipped.forEach(function (s) {
    var effect = /공략/.test(s.what) ? '공략 이미지를 웹맵 원본 주소에서 불러옴 (인터넷 필요)'
      : /자세히/.test(s.what) ? '많이 확대하면 타일이 비어 보임 (그 전 배율까지는 정상)'
      : /음영|깊이/.test(s.what) ? '지형 음영이 빠져 조금 밋밋하게 보임 (설정에서 끈 것과 같음)'
      : /높이/.test(s.what) ? '지도 커서 Y 표시가 안 뜸 (웨이포인트 y는 그대로 나옴)'
      : /자생지/.test(s.what) ? '약초 자생지 색칠이 안 뜸 (자생지 웨이포인트는 그대로)'
      : '해당 기능만 빠짐';
    lines.push('| ' + s.what + ' | ' + mb(s.size) + ' | ' + effect + ' |');
  });
  lines.push('');
  lines.push('더 담고 싶으면 한도를 올려서 다시 만드세요:');
  lines.push('');
  lines.push('```bash');
  lines.push('node build-site.js --limit 50');
  lines.push('```');
  lines.push('');
}
lines.push('## 올리는 법');
lines.push('');
lines.push('- **Cloudflare Pages / Netlify**: 이 폴더를 드래그해서 업로드');
lines.push('- **GitHub Pages**: 이 폴더 내용을 저장소에 넣고 Pages 켜기 (`.nojekyll` 파일 추가)');
lines.push('- 열 때는 `index.html` 이 시작 페이지입니다');
lines.push('');
lines.push('## 참고');
lines.push('');
lines.push('- 지도 타일은 **멀리서 본 배율부터** 담기고, 지도에는 담긴 배율만 있다고 알려 둡니다');
lines.push('  → 더 확대하면 담긴 배율을 늘려 보여 주므로 **비지 않고 조금 흐릿해집니다**');
if (metaFix) {
  lines.push('- 담긴 타일 배율: ' + Object.keys(metaFix.kept).map(function (k) {
    return k + ' ' + metaFix.kept[k].join('·');
  }).join(' / '));
}
lines.push('- 파일 하나만 올려야 하는 곳(IPFS 등)은 `dist/한월공략소.html` 을 쓰세요');
lines.push('- 설정은 방문자 브라우저에만 저장되고 서버로 가지 않습니다');
fs.writeFileSync(path.join(OUT, 'README-업로드.md'), lines.join('\n'), 'utf8');

/* GitHub Pages 대비 */
fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');

console.log('폴더: ' + OUT);
console.log('총 ' + mb(used) + ' / 한도 ' + mb(LIMIT));
console.log('\n담김');
report.forEach(function (r) { console.log('  ' + r.what.padEnd(28) + mb(r.size)); });
if (skipped.length) {
  console.log('\n뺌 (한도 초과)');
  skipped.forEach(function (s) { console.log('  ' + s.what.padEnd(28) + mb(s.size)); });
}
if (metaFix) {
  console.log('\n지도 메타 정리: 안 담긴 배율 ' + metaFix.dropped + '개 항목 제거 → 확대해도 빈 화면 없음');
}
console.log('\n설명은 폴더 안 README-업로드.md 참고');
