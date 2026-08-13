/* game-data.js의 웹맵 좌표(광산·제작 NPC·스폰)를 지도 뷰어에 웨이포인트로 주입한다.
 *
 *   node inject-map-waypoints.js            주입 (이미 주입돼 있으면 새로 교체)
 *   node inject-map-waypoints.js --remove   주입한 것만 다시 빼기
 *   node inject-map-waypoints.js --map "D:/…/index.html"
 *
 * 주입된 웨이포인트는 세트 이름이 "[웹맵] …" 으로 시작하고 wp.webmap === true 다.
 * 지도 뷰어의 웨이포인트 패널(W)에서 세트를 골라 켜고 끌 수 있고,
 * 설정(O)의 "지도 위 웨이포인트"로 전체를 끌 수도 있다.
 *
 * ⚠️ 지도 쪽 파일(map/index.html)만 고친다. 사용자가 지도에서 직접 찍은 웨이포인트는
 *    건드리지 않는다 — 주입분은 wp.webmap 표시로 구분해 매번 싹 걷어내고 다시 넣는다.
 *    지도를 새로 빌드해 덮어썼으면 이 명령을 다시 돌리면 된다.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var G = require('./game-data.js');

var argv = process.argv.slice(2);
function flag(n) { return argv.indexOf(n) >= 0; }
function opt(n, d) { var i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; }

var REMOVE = flag('--remove');
var PREFIX = '[웹맵] ';
var MAP_FILE = opt('--map', path.join(__dirname, 'map', 'index.html'));

if (!fs.existsSync(MAP_FILE)) {
  console.error('지도 파일을 찾지 못했습니다: ' + MAP_FILE);
  console.error('지도 결과물을 map/ 폴더에 넣거나 --map 으로 경로를 넘기세요.');
  process.exit(1);
}

/* ---------- MAP_DATA 위치 찾기 (문자열 안 중괄호 무시) ---------- */
var html = fs.readFileSync(MAP_FILE, 'utf8');
var mi = html.indexOf('window.MAP_DATA');
if (mi < 0) { console.error('window.MAP_DATA를 찾지 못했습니다.'); process.exit(1); }
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
world.waypoints = world.waypoints || [];
world.waypointSets = world.waypointSets || [];

/* ---------- 이전 주입분 제거 (항상 먼저) ---------- */
var before = world.waypoints.length;
world.waypoints = world.waypoints.filter(function (w) { return !w.webmap; });
world.waypointSets = world.waypointSets.filter(function (s) { return s.indexOf(PREFIX) !== 0; });
var removed = before - world.waypoints.length;

/* ---------- 주입할 웨이포인트 만들기 ---------- */
var DIM = 'overworld';
var added = [];

function push(set, name, initials, x, y, z, color) {
  added.push({
    name: name, initials: String(initials).slice(0, 2),
    x: x, y: y, z: z,
    color: color, colorIndex: 0,
    disabled: false, death: false,
    set: set, visibility: '1', dim: DIM,
    webmap: true              // 주입분 표시 — 다음 실행 때 이걸로 걷어낸다
    // map 키는 일부러 넣지 않는다 (뷰어가 모든 지도에서 보여줌)
  });
}

function initialsOf(w) {
  // 광산은 번호, 나머지는 이름 앞 2글자
  var m = /^(\d+)번 광산$/.exec(w.name);
  return m ? m[1] : w.name;
}

if (!REMOVE) {
  // 광산(색깔별) · 제작 NPC · 스폰 · 사냥터 · 약초 자생지 · 단서 · 항아리 · 상자
  // 세트/색은 game-data.js의 webmapWaypoints()가 정해준 값을 그대로 쓴다
  G.webmapWaypoints().forEach(function (w) {
    push(PREFIX + (w.set || '기타'), w.name, initialsOf(w),
         w.x, w.y, w.z, w.hex || '#9ca3af');
  });

  world.waypoints = world.waypoints.concat(added);

  // 세트 목록에 등록 (뷰어의 세트 드롭다운에 나오게)
  var seen = {};
  added.forEach(function (w) { seen[w.set] = 1; });
  Object.keys(seen).sort().forEach(function (s) {
    if (world.waypointSets.indexOf(s) < 0) world.waypointSets.push(s);
  });
}

/* ---------- 파일 쓰기 ---------- */
var patched = html.slice(0, start) + JSON.stringify(data) + html.slice(end);
fs.writeFileSync(MAP_FILE, patched, 'utf8');

/* ---------- 보고 ---------- */
var mine = world.waypoints.filter(function (w) { return !w.webmap; }).length;
console.log('=== 웹맵 좌표 → 지도 웨이포인트 ===');
console.log('지도 파일: ' + MAP_FILE);
if (removed) console.log('이전 주입분 제거: ' + removed + '개');
if (REMOVE) {
  console.log('주입 해제 완료. 지도 자체 웨이포인트 ' + mine + '개는 그대로입니다.');
} else {
  var bySet = {};
  added.forEach(function (w) { bySet[w.set] = (bySet[w.set] || 0) + 1; });
  console.log('주입: ' + added.length + '개');
  Object.keys(bySet).sort().forEach(function (s) { console.log('  ' + s + ' — ' + bySet[s]); });
  console.log('지도 자체 웨이포인트: ' + mine + '개 (건드리지 않음)');
  console.log('\n지도에서 W키(웨이포인트 패널) → 세트로 골라 켜고 끌 수 있습니다.');
  console.log('전체를 끄려면 O키(설정) → "지도 위 웨이포인트".');
}
