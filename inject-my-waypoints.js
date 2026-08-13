#!/usr/bin/env node
/**
 * 앱에서 내보낸 내 웨이포인트(my-waypoints.json)를 지도에 주입한다.
 *
 *   node inject-my-waypoints.js                 # 주입
 *   node inject-my-waypoints.js --remove        # 이전 주입분만 제거
 *   node inject-my-waypoints.js my.json         # 다른 파일 사용
 *
 * 세트 이름 앞에는 [내] 를 붙이고 mywp 표시를 남긴다.
 * 다시 실행하면 이전 [내] 주입분을 먼저 걷어내므로 중복되지 않는다.
 * 지도 자체 웨이포인트와 [웹맵] 주입분은 건드리지 않는다.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var PREFIX = '[내] ';
var args = process.argv.slice(2);
var REMOVE = args.indexOf('--remove') >= 0;
var jsonArg = args.filter(function (a) { return a.indexOf('--') !== 0; })[0];
var JSON_PATH = path.resolve(__dirname, jsonArg || 'my-waypoints.json');
var MAP_HTML = path.join(__dirname, 'map', 'index.html');

if (!fs.existsSync(MAP_HTML)) {
  console.error('지도 파일이 없습니다: ' + MAP_HTML);
  process.exit(1);
}

var payload = { myWps: [], wpEdit: {} };
if (!REMOVE) {
  if (!fs.existsSync(JSON_PATH)) {
    console.error('웨이포인트 파일이 없습니다: ' + JSON_PATH
      + '\n앱의 [위치·웨이포인트] 탭 → "JSON 내보내기"로 만든 뒤 이 폴더에 두세요.');
    process.exit(1);
  }
  // BOM이 붙은 파일도 읽히도록 앞의 ﻿는 떼고 파싱한다
  try { payload = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8').replace(/^﻿/, '')); }
  catch (e) { console.error('JSON 파싱 실패: ' + e.message); process.exit(1); }
}

var html = fs.readFileSync(MAP_HTML, 'utf8');

/* ---------- MAP_DATA 찾기 ---------- */
var marker = 'MAP_DATA';
var mi = html.indexOf(marker);
if (mi < 0) { console.error('MAP_DATA를 찾지 못했습니다.'); process.exit(1); }
var start = html.indexOf('{', mi);
var depth = 0, end = -1, inStr = false, quote = '', esc = false;
for (var i = start; i < html.length; i++) {
  var ch = html[i];
  if (inStr) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === quote) inStr = false;
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

/* ---------- 이전 [내] 주입분 제거 ---------- */
var before = world.waypoints.length;
world.waypoints = world.waypoints.filter(function (w) { return !w.mywp; });
world.waypointSets = world.waypointSets.filter(function (s) { return s.indexOf(PREFIX) !== 0; });
var removed = before - world.waypoints.length;

/* ---------- 주입 ---------- */
var added = [];
if (!REMOVE) {
  (payload.myWps || []).forEach(function (w) {
    if (!w || typeof w.x !== 'number' || typeof w.z !== 'number' || !w.name) return;
    added.push({
      name: String(w.name), initials: String(w.name).slice(0, 2),
      x: w.x, y: typeof w.y === 'number' ? w.y : 0, z: w.z,
      color: w.hex || '#22d3ee', colorIndex: 0,
      disabled: false, death: false,
      set: PREFIX + (w.set || '내 웨이포인트'),
      visibility: '1', dim: 'overworld',
      mywp: true
    });
  });
  world.waypoints = world.waypoints.concat(added);
  var seen = {};
  added.forEach(function (w) { seen[w.set] = 1; });
  Object.keys(seen).sort().forEach(function (s) {
    if (world.waypointSets.indexOf(s) < 0) world.waypointSets.push(s);
  });
}

fs.writeFileSync(MAP_HTML, html.slice(0, start) + JSON.stringify(data) + html.slice(end), 'utf8');

console.log('이전 [내] 주입분 제거: ' + removed + '개');
if (REMOVE) {
  console.log('제거만 하고 끝냈습니다.');
} else {
  console.log('주입: ' + added.length + '개');
  var bySet = {};
  added.forEach(function (w) { bySet[w.set] = (bySet[w.set] || 0) + 1; });
  Object.keys(bySet).sort().forEach(function (s) { console.log('  ' + s + ' — ' + bySet[s]); });
  var skipped = (payload.myWps || []).length - added.length;
  if (skipped > 0) console.log('좌표/이름이 없어 건너뜀: ' + skipped + '개');
}
console.log('지도 자체 웨이포인트와 [웹맵] 주입분은 건드리지 않았습니다.');
