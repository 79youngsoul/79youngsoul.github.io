/* 높이 데이터 검증 (node test-heights.js)
 *
 * map/heights.js 는 선택 파일이라 없으면 통과 처리하고 넘어간다.
 * 있으면 뷰어와 같은 방식으로 풀어서, game-data.js의 실제 좌표들과 y를 비교한다.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var pass = 0, fail = 0, failures = [];
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; failures.push(name + (extra ? '  → ' + extra : '')); }
}

var FILE = path.join(__dirname, 'map', 'heights.js');
if (!fs.existsSync(FILE)) {
  console.log('map/heights.js 없음 — 높이 검증 건너뜀 (python build-heightmap.py 로 생성)');
  process.exit(0);
}

/* ---------- 뷰어와 같은 방식으로 읽기 ---------- */
var sandboxWindow = {};
new Function('window', fs.readFileSync(FILE, 'utf8'))(sandboxWindow);
var src = sandboxWindow.MapHeights;

ok('MapHeights 메타 로드', !!src && Array.isArray(src.regions));
ok('메타 파일은 작다(50KB 이하)', fs.statSync(FILE).size < 50000,
   (fs.statSync(FILE).size / 1000).toFixed(0) + 'KB');
var BIN = path.join(__dirname, 'map', 'heights.bin');
ok('본체 heights.bin 존재', fs.existsSync(BIN));
ok('file:// 대비 사본 존재', fs.existsSync(path.join(__dirname, 'map', 'heights-data.js')));
ok('메타 값 존재', src.step > 0 && src.per > 0 && src.regions.length > 0,
   'step=' + src.step + ' per=' + src.per + ' regions=' + src.regions.length);
ok('리전 한 변 = per × step', src.per * src.step === src.size,
   src.per + '×' + src.step + ' vs ' + src.size);

var raw = zlib.inflateSync(fs.readFileSync(BIN));
var data = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
var stride = src.per * src.per;
ok('데이터 길이 = 리전 수 × 표본 수', data.length === src.regions.length * stride,
   data.length + ' vs ' + src.regions.length * stride);

var index = new Map();
src.regions.forEach(function (key, i) { index.set(key, i * stride); });

function heightAt(x, z) {
  var size = src.per * src.step;
  var rx = Math.floor(x / size), rz = Math.floor(z / size);
  var base = index.get(rx + ',' + rz);
  if (base === undefined) return null;
  var sx = Math.floor((x - rx * size) / src.step);
  var sz = Math.floor((z - rz * size) / src.step);
  var v = data[base + sz * src.per + sx];
  return v ? v - src.yOffset : null;
}

/* ---------- 실제 좌표와 비교 ---------- */
var G = require('./game-data.js');

function compare(label, list, getXYZ, tolerance) {
  var checked = 0, missing = 0, diffs = [];
  list.forEach(function (item) {
    var p = getXYZ(item);
    if (typeof p.y !== 'number' || !p.y) return;      // y가 0이면 원본에도 없던 값
    var h = heightAt(p.x, p.z);
    if (h === null) { missing++; return; }
    checked++;
    diffs.push(Math.abs(h - p.y));
  });
  diffs.sort(function (a, b) { return a - b; });
  var median = diffs.length ? diffs[Math.floor(diffs.length / 2)] : -1;
  var within = diffs.filter(function (d) { return d <= tolerance; }).length;
  ok(label + ' 높이 조회 성공', checked > 0 && missing === 0,
     '조회 ' + checked + '건, 데이터 없음 ' + missing + '건');
  ok(label + ' 오차 중앙값 ' + tolerance + '블록 이내', median >= 0 && median <= tolerance,
     '중앙값 ' + median + ', ' + within + '/' + checked + '건이 ' + tolerance + ' 이내');
  return { checked: checked, missing: missing, median: median, within: within };
}

// 광산 입구·NPC는 지표면이라 표본(8블록 평균)과 가깝게 나와야 한다
var mineStat = compare('광산 65곳', G.MINES, function (m) { return m; }, 8);
// NPC는 실내·지하(예: 고대의제작대 y=-13)나 높은 구조물 위가 섞여 있어
// 지표면 표본과 차이가 크게 난다 — 조회가 되는지와 대략적인 범위만 본다
var npcStat = compare('제작 NPC', G.CRAFT_NPCS.filter(G.hasCoords), function (n) { return n; }, 40);
var huntStat = compare('사냥터 20곳', G.HUNTING_GROUNDS, function (h) { return h; }, 20);
var herbSpots = [];
G.HERBS.forEach(function (h) {
  h.spots.forEach(function (s) { herbSpots.push(s); });
});
var herbStat = compare('약초 자생지', herbSpots, function (s) { return s; }, 20);

// 지도 밖 좌표는 null
ok('지도 밖 좌표는 null', heightAt(9999999, 9999999) === null);

// y 범위가 메타와 맞는지
var sample = [], step = Math.max(1, Math.floor(data.length / 20000));
for (var i = 0; i < data.length; i += step) if (data[i]) sample.push(data[i] - src.yOffset);
ok('표본 y가 메타 범위 안', sample.every(function (y) { return y >= src.yMin && y <= src.yMax; }),
   'yMin=' + src.yMin + ' yMax=' + src.yMax);

/* ---------- 지도 뷰어 쪽 배선 ---------- */
var viewer = fs.readFileSync(path.join(__dirname, 'map', 'index.html'), 'utf8');
ok('뷰어가 heights.js를 읽음', /src="heights\.js"/.test(viewer));
ok('뷰어 좌표 순서가 X → Y → Z',
   /X <b>\$\{x\}<\/b>` \+[\s\S]{0,220}Z <b>\$\{z\}/.test(viewer));
ok('뷰어에 heightAt 함수', /function heightAt\(x, z\)/.test(viewer));

/* ---------- 약초 자생지 색칠(오버레이) ---------- */
var OVL = path.join(__dirname, 'map', 'overlays.js');
if (fs.existsSync(OVL)) {
  var ow = {};
  new Function('window', fs.readFileSync(OVL, 'utf8'))(ow);
  var ov = ow.MapOverlays;
  ok('오버레이 설정 로드', !!ov && Array.isArray(ov.herbs));
  ok('약초 19종 색칠 이미지', ov.herbs.length === 19, ov.herbs.length);
  ok('이미지 파일 전부 존재',
     ov.herbs.every(function (h) { return fs.existsSync(path.join(__dirname, 'map', h.file)); }),
     ov.herbs.filter(function (h) { return !fs.existsSync(path.join(__dirname, 'map', h.file)); })
       .map(function (h) { return h.file; }).join(','));
  ok('약초 이름·색이 game-data와 일치',
     ov.herbs.every(function (h) {
       var g = G.HERBS.filter(function (x) { return x.name === h.name; })[0];
       return g && g.color === h.color && g.spots.length === h.spots;
     }));
  var b = ov.bounds;
  ok('월드 범위가 지도 전체를 덮음',
     b.minX < -8000 && b.maxX > 8000 && b.minZ < -8000 && b.maxZ > 8000,
     JSON.stringify(b));
  var outside = [];
  G.HERBS.forEach(function (h) {
    h.spots.forEach(function (s) {
      if (s.x < b.minX || s.x > b.maxX || s.z < b.minZ || s.z > b.maxZ) outside.push(h.name);
    });
  });
  ok('자생지 좌표가 전부 색칠 범위 안', outside.length === 0, outside.join(','));
  ok('뷰어가 overlays.js를 읽음', /src="overlays\.js"/.test(viewer));
  ok('뷰어에 색칠 그리기', /function drawOverlays\(\)/.test(viewer) && /drawOverlays\(\);/.test(viewer));
  ok('뷰어에 약초 패널', /id="panel-overlays"/.test(viewer) && /id="btn-overlays"/.test(viewer));
  ok('켠 목록이 저장됨', /herbOverlays: Array\.from/.test(viewer));
  // 성능: 켠 자생지를 한 장으로 합쳐 프레임마다 1번만 그린다
  ok('자생지 합성 캔버스 사용', /function rebuildOverlaySheet\(\)/.test(viewer)
     && /ctx\.drawImage\(overlays\.sheet/.test(viewer));
  ok('그리기 루프에 이미지 반복 없음',
     !/for \(const herb of overlays\.list\)[\s\S]{0,200}ctx\.drawImage\(img/.test(viewer));
  ok('끄면 이미지 메모리 해제', /overlays\.images\.delete\(name\)/.test(viewer)
     && /overlays\.images\.clear\(\)/.test(viewer));
} else {
  console.log('map/overlays.js 없음 — 자생지 색칠 검증 건너뜀 (node download-overlays.js)');
}

console.log('\n=== 높이 데이터 검증 ===');
console.log('간격 ' + src.step + '블록 · 리전 ' + src.regions.length + '개 · y ' + src.yMin + '~' + src.yMax
  + ' · ' + (fs.statSync(FILE).size / 1e6).toFixed(1) + 'MB');
console.log('광산 오차 중앙값 ' + mineStat.median + ' · NPC ' + npcStat.median
  + ' · 사냥터 ' + huntStat.median + ' · 약초 ' + herbStat.median);
console.log('통과: ' + pass + '  실패: ' + fail);
if (fail) {
  console.log('실패 항목:');
  failures.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
console.log('전부 통과 ✓');
