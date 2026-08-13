/* 지도 프로젝트(out/index.html)의 웨이포인트를 뽑아 map-waypoints.js로 저장한다.
 *
 *   node import-map-waypoints.js
 *   node import-map-waypoints.js "D:/다른경로/out/index.html"
 *   node import-map-waypoints.js --with-death        (사망 지점도 포함)
 *   node import-map-waypoints.js --dim overworld     (특정 차원만, 기본 overworld)
 *   node import-map-waypoints.js --all-dims          (모든 차원)
 *
 * ⚠️ 이 스크립트는 지도 쪽 데이터를 "가져오기만" 한다.
 *    game-data.js의 webmap 데이터는 절대 건드리지 않는다 — 두 출처는 분리 유지.
 *    지도를 다시 빌드했으면 이걸 다시 돌리면 된다.
 */
'use strict';
var fs = require('fs');
var path = require('path');

var argv = process.argv.slice(2);
function flag(name) { return argv.indexOf(name) >= 0; }
function opt(name, def) {
  var i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}

var WITH_DEATH = flag('--with-death');
var ALL_DIMS = flag('--all-dims');
var ONLY_DIM = opt('--dim', 'overworld');

// 찾는 순서: ①인자 ②제작 폴더 안 map/ (폴더 통합본) ③옆 폴더의 지도 프로젝트
var CANDIDATES = [
  path.join(__dirname, 'map', 'index.html'),
  path.join(__dirname, '..', '제로소 지도', 'out', 'index.html')
];
var given = argv.filter(function (a) { return a.charAt(0) !== '-'; })[0];
var src = given || CANDIDATES.filter(function (p) { return fs.existsSync(p); })[0] || CANDIDATES[0];
var OUT = path.join(__dirname, 'map-waypoints.js');

if (!fs.existsSync(src)) {
  console.error('지도 파일을 찾지 못했습니다: ' + src);
  console.error('찾아본 곳:');
  CANDIDATES.forEach(function (p) { console.error('  ' + p); });
  console.error('경로를 직접 넘기세요:  node import-map-waypoints.js "D:/…/index.html"');
  process.exit(1);
}

/* ---------- MAP_DATA 추출 ---------- */
var html = fs.readFileSync(src, 'utf8');
var marker = 'window.MAP_DATA';
var mi = html.indexOf(marker);
if (mi < 0) { console.error('window.MAP_DATA를 찾지 못했습니다. 지도 뷰어 형식이 바뀐 것 같습니다.'); process.exit(1); }

var start = html.indexOf('{', mi);
var depth = 0, end = -1, inStr = false, quote = '', esc = false;
for (var i = start; i < html.length; i++) {
  var ch = html[i];
  if (inStr) {
    if (esc) esc = false;
    else if (ch === '\\') esc = true;
    else if (ch === quote) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'") { inStr = true; quote = ch; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) { console.error('MAP_DATA 파싱 실패 (괄호가 닫히지 않음)'); process.exit(1); }

var data;
try { data = JSON.parse(html.slice(start, end)); }
catch (e) { console.error('MAP_DATA JSON 파싱 실패: ' + e.message); process.exit(1); }

var world = (data.worlds || [])[0];
if (!world) { console.error('월드 데이터가 없습니다.'); process.exit(1); }

/* ---------- 웨이포인트 정리 ---------- */
var all = world.waypoints || [];
var skippedDeath = 0, skippedDim = 0, skippedBad = 0;

var skippedInjected = 0;

var list = all.filter(function (w) {
  if (!w || typeof w.x !== 'number' || typeof w.z !== 'number') { skippedBad++; return false; }
  // 우리가 주입한 [웹맵] 웨이포인트는 다시 가져오지 않는다 (출처 분리 유지)
  if (w.webmap) { skippedInjected++; return false; }
  if (w.death && !WITH_DEATH) { skippedDeath++; return false; }
  if (!ALL_DIMS && w.dim && w.dim !== ONLY_DIM) { skippedDim++; return false; }
  return true;
}).map(function (w) {
  return {
    name: String(w.name == null ? '이름 없음' : w.name),
    x: w.x, y: (typeof w.y === 'number' ? w.y : 0), z: w.z,
    set: w.set || null,
    color: w.color || null,
    dim: w.dim || null,
    death: !!w.death
  };
});

// 지도 뷰어 딥링크 정보
var dim = (world.dimensions || []).filter(function (d) { return d.key === ONLY_DIM; })[0]
       || (world.dimensions || [])[0] || {};
var wmap = (dim.maps || []).filter(function (m) { return m.key === dim.defaultMap; })[0]
        || (dim.maps || [])[0] || {};

// 지도가 제작 폴더 안에 있으면 상대경로로 (폴더째 옮겨도 링크가 안 깨짐)
var rel = path.relative(__dirname, src).replace(/\\/g, '/');
var isInside = rel && rel.indexOf('..') !== 0 && !path.isAbsolute(rel);
var href = isInside ? rel : src.replace(/\\/g, '/');

var link = {
  href: href,
  relative: isInside,
  world: world.slug || world.key,
  dim: dim.key || 'overworld',
  map: wmap.key || dim.defaultMap || 'mw$default',
  layer: wmap.defaultLayer || 'surface'
};

/* ---------- 세트 집계 ---------- */
var setCount = {};
list.forEach(function (w) {
  var k = w.set || '(없음)';
  setCount[k] = (setCount[k] || 0) + 1;
});
var sets = Object.keys(setCount).map(function (k) { return { set: k, count: setCount[k] }; })
  .sort(function (a, b) { return b.count - a.count || a.set.localeCompare(b.set); });

/* ---------- 파일 쓰기 ---------- */
function j(v) { return JSON.stringify(v); }

var lines = [];
lines.push('/* 자동 생성 파일 — 직접 고치지 마세요.');
lines.push(' * 다시 만들기:  node import-map-waypoints.js');
lines.push(' * 출처: ' + link.href);
lines.push(' * 생성 시각: ' + new Date().toISOString());
lines.push(' *');
lines.push(' * 이 데이터의 원본은 지도 프로젝트입니다. game-data.js의 webmap 데이터와');
lines.push(' * 절대 합치지 마세요 (origin: map / webmap 으로 분리 관리).');
lines.push(' */');
lines.push('(function (root, factory) {');
lines.push('  if (typeof module === \'object\' && module.exports) module.exports = factory();');
lines.push('  else root.MapWaypoints = factory();');
lines.push('})(typeof self !== \'undefined\' ? self : this, function () {');
lines.push('  \'use strict\';');
lines.push('  return {');
lines.push('    generatedAt: ' + j(new Date().toISOString()) + ',');
lines.push('    worldLabel: ' + j(world.label || world.key) + ',');
lines.push('    link: ' + j(link) + ',');
lines.push('    sets: ' + j(sets) + ',');
lines.push('    list: [');
list.forEach(function (w, i) {
  lines.push('      ' + j(w) + (i < list.length - 1 ? ',' : ''));
});
lines.push('    ]');
lines.push('  };');
lines.push('});');

fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

/* ---------- 보고 ---------- */
console.log('=== 지도 웨이포인트 가져오기 ===');
console.log('원본: ' + src);
console.log('월드: ' + (world.label || world.key) + '  차원: ' + link.dim +
            (ALL_DIMS ? ' (모든 차원)' : ''));
console.log('전체 ' + all.length + '개 중 ' + list.length + '개 저장');
if (skippedDeath) console.log('  - 사망 지점 제외: ' + skippedDeath + ' (--with-death 로 포함)');
if (skippedDim) console.log('  - 다른 차원 제외: ' + skippedDim + ' (--all-dims 로 포함)');
if (skippedBad) console.log('  - 좌표 이상 제외: ' + skippedBad);
if (skippedInjected) console.log('  - [웹맵] 주입분 제외: ' + skippedInjected);
console.log('세트 ' + sets.length + '종:');
sets.slice(0, 12).forEach(function (s) { console.log('  ' + s.set + ' — ' + s.count); });
if (sets.length > 12) console.log('  … 외 ' + (sets.length - 12) + '종');
console.log('저장: ' + OUT);
console.log('지도 링크: ' + href + (isInside
  ? '  (상대경로 — 폴더째 옮겨도 안 깨짐)'
  : '  (절대경로 — 지도를 옮기면 다시 돌려야 함)'));
if (!isInside) {
  console.log('  ↳ 폴더 하나로 합치려면 지도 결과물을 ' + path.join(__dirname, 'map') + ' 로 복사한 뒤 다시 실행하세요.');
}
console.log('\n※ game-data.js(webmap 데이터)는 건드리지 않았습니다. 두 출처는 분리 유지됩니다.');
