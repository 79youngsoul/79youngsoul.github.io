/* 앱 무결성 점검 (node test-integrity.js)
 *
 * 기능을 넣고 빼다 보면 "탭은 있는데 패널이 없다", "핸들러가 사라진 버튼",
 * "정의 안 된 함수 호출" 같은 게 남는다. 그런 어긋남을 잡는다.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var pass = 0, fail = 0, fails = [];
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? '  → ' + extra : '')); }
}

var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
var script = (html.match(/<script>[\s\S]*?<\/script>/g) || []).join('\n');
var flatScript = script.replace(/\s+/g, ' ');     // 줄바꿈·들여쓰기 차이를 없앤 사본

/* ---------- 1. 탭 ↔ 패널 ↔ 렌더 함수 ---------- */
var tabs = (html.match(/data-p="([a-z]+)"/g) || []).map(function (m) {
  return /data-p="([a-z]+)"/.exec(m)[1];
});
var panes = (html.match(/id="p-([a-z]+)"/g) || []).map(function (m) {
  return /id="p-([a-z]+)"/.exec(m)[1];
});
ok('탭이 하나 이상', tabs.length > 0, tabs.length);
ok('탭 ↔ 패널 개수 일치', tabs.length === panes.length, tabs.length + ' vs ' + panes.length);
var missingPane = tabs.filter(function (t) { return panes.indexOf(t) < 0; });
ok('모든 탭에 패널 있음', missingPane.length === 0, missingPane.join(','));
var orphanPane = panes.filter(function (p) { return tabs.indexOf(p) < 0; });
ok('짝 없는 패널 없음', orphanPane.length === 0, orphanPane.join(','));

// PANES 매핑
var panesMap = /var PANES = \{([\s\S]*?)\};/.exec(script);
ok('PANES 매핑 존재', !!panesMap);
if (panesMap) {
  var mapped = (panesMap[1].match(/(\w+):\s*pane\w+/g) || []).map(function (m) {
    return m.split(':')[0].trim();
  });
  var notMapped = tabs.filter(function (t) { return mapped.indexOf(t) < 0; });
  ok('모든 탭이 렌더 함수와 연결', notMapped.length === 0, notMapped.join(','));
  var ghost = mapped.filter(function (t) { return tabs.indexOf(t) < 0; });
  ok('없는 탭을 가리키는 매핑 없음', ghost.length === 0, ghost.join(','));
}

// 단축키 배열
var tabsArr = /var TABS = \[([^\]]+)\]/.exec(script);
ok('단축키 탭 배열 존재', !!tabsArr);
if (tabsArr) {
  var arr = tabsArr[1].split(',').map(function (s) { return s.trim().replace(/'/g, ''); });
  ok('단축키 배열이 실제 탭 순서와 같음', arr.join() === tabs.join(),
     arr.join() + ' vs ' + tabs.join());
}

/* ---------- 2. 함수 정의 ↔ 호출 ---------- */
var defined = {};
(script.match(/function (\w+)\s*\(/g) || []).forEach(function (m) {
  defined[/function (\w+)/.exec(m)[1]] = 1;
});
['paneHome', 'paneSum', 'paneMat', 'paneOrd', 'paneTree', 'paneSim', 'paneRec', 'paneMine', 'paneNpc',
 'paneGear', 'paneProb', 'paneLoc', 'paneNews', 'paneMapView', 'render', 'calc',
 'renderChangelog', 'markVersionSeen', 'refreshVerBtn', 'buildSelect', 'renderTargets',
 'syncControls', 'save', 'saveNow', 'toast', 'npcStepsCard', 'extraNeedCard',
 'sourcesHtml', 'linksHtml', 'videosHtml', 'wpManagerHtml', 'herbCalcHtml',
 // 편의 기능 (v2.8.0)
 'enhanceTables', 'sortTable', 'sortVal', 'tableToText', 'bumpFont', 'undoBar',
 'pushRecentQ', 'renderRecentQ', 'parseCoords', 'pushMapRecent',
 'savePreset', 'loadPreset', 'renderPresets', 'renderKeys', 'renderMapRecent'].forEach(function (fn) {
  ok('함수 정의됨: ' + fn, !!defined[fn]);
});

/* 첫 화면(홈) */
ok('홈 탭이 맨 앞', tabs[0] === 'home', tabs.slice(0, 3).join(','));
ok('처음 열면 홈', /tab: *'home'/.test(script));
ok('홈 카드 목록 있음', /function homeCards\(/.test(script));

/* 단축키 안내 ↔ 실제로 붙어 있는 키 */
var keymap = /var KEYMAP = \[([\s\S]*?)\n\];/.exec(script);
ok('단축키 목록(KEYMAP) 존재', !!keymap);
if (keymap) {
  var listed = (keymap[1].match(/\['([^']+)'/g) || []).map(function (m) { return m.slice(2, -1); });
  ok('단축키 10개 이상 안내', listed.length >= 10, listed.length);
  [['?', "e.key==='?'"], ['t', "e.key==='t'"], ['Home', "e.key==='Home'"],
   ['Ctrl+K', "e.key === 'k'"], [']', "e.key===']'"]].forEach(function (p) {
    ok('안내한 단축키가 실제로 동작: ' + p[0],
       listed.indexOf(p[0]) >= 0 && flatScript.indexOf(p[1]) >= 0);
  });
}

// 지워진 기능의 잔재
['paneLog', 'addLog', 'logCost', 'logCSV', 'renderInv', 'fmtWhen', 'bindCloud', 'cloudReady', 'syncCloudButtons'].forEach(function (fn) {
  ok('지워진 함수 잔재 없음: ' + fn, !defined[fn]);
});
['S.log', 'S.inventory', 'S.autoLog', 'data-inv', 'data-fill', 'btnFillAll',
 'btnInvClear', 'invBox', 'p-log'].forEach(function (token) {
  ok('지워진 참조 없음: ' + token, script.indexOf(token) < 0 && html.indexOf(token) < 0);
});

/* ---------- 3. 버튼 ↔ 핸들러 ---------- */
// <a> 로 만든 링크 버튼은 눌렀을 때 브라우저가 처리하므로 제외
var LINK_ONLY = ['btnMapNew'];
var flat = script.replace(/\s+/g, ' ');           // 줄바꿈·공백 차이를 없애고 찾는다
function hasHandler(id) {
  return flat.indexOf("'#" + id + "'") >= 0
    || flat.indexOf("id === '" + id + "'") >= 0
    || flat.indexOf("id==='" + id + "'") >= 0
    || flat.indexOf("closest('#" + id + "')") >= 0;
}
var allIds = {};
(html.match(/id="(btn[A-Za-z]+)"/g) || []).forEach(function (m) {
  allIds[/id="(btn[A-Za-z]+)"/.exec(m)[1]] = 1;
});
var noHandler = Object.keys(allIds).filter(function (id) {
  return LINK_ONLY.indexOf(id) < 0 && !hasHandler(id);
});
ok('모든 버튼에 동작 연결', noHandler.length === 0, noHandler.join(','));

/* ---------- 4. 상태 필드 ---------- */
var stateBlock = /var S = \{([\s\S]*?)\n\};/.exec(script);
ok('상태(S) 정의 존재', !!stateBlock);
if (stateBlock) {
  var keys = (stateBlock[1].match(/(\w+):/g) || []).map(function (k) { return k.replace(':', ''); });
  var unused = keys.filter(function (k) {
    // 상태 정의는 "키:" 형태라 S.키 로는 안 잡힌다 → 한 번도 안 쓰이면 죽은 필드
    return script.split('S.' + k).length - 1 === 0
      && script.indexOf("S['" + k + "']") < 0;
  });
  ok('안 쓰는 상태 필드 없음', unused.length === 0, unused.join(','));
}

/* ---------- 5. 데이터 모듈 연결 ---------- */
var G = require('./game-data.js');
var used = (script.match(/G\.([A-Za-z_]+)/g) || []).map(function (m) { return m.slice(2); });
var uniq = used.filter(function (v, i, a) { return a.indexOf(v) === i; });
var missingApi = uniq.filter(function (k) { return G[k] === undefined; });
ok('앱이 쓰는 game-data API가 전부 존재', missingApi.length === 0, missingApi.join(','));

var C = require('./craft-core.js');
var usedC = (script.match(/\bC\.([A-Za-z_]+)/g) || []).map(function (m) { return m.slice(2); });
var missingC = usedC.filter(function (v, i, a) { return a.indexOf(v) === i; })
  .filter(function (k) { return C[k] === undefined; });
ok('앱이 쓰는 craft-core API가 전부 존재', missingC.length === 0, missingC.join(','));

/* ---------- 6. 선택 파일 ---------- */
['craft-core.js', 'game-data.js'].forEach(function (f) {
  ok('스크립트 참조 파일 존재: ' + f, fs.existsSync(path.join(__dirname, f)));
});

/* ---------- 7. 문서 ---------- */
var readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
ok('README에 지워진 기능 설명 없음',
   readme.indexOf('제작 기록(로그)') < 0 && readme.indexOf('보유 재료 차감') < 0);
var ver = /var APP_VERSION = '([^']+)'/.exec(script)[1];
ok('CHANGELOG.md에 현재 버전 있음',
   fs.readFileSync(path.join(__dirname, 'CHANGELOG.md'), 'utf8').indexOf('## v' + ver) >= 0, ver);

console.log('\n=== 무결성 점검 ===');
console.log('탭 ' + tabs.length + '개 · 함수 ' + Object.keys(defined).length + '개');
console.log('통과: ' + pass + '  실패: ' + fail);
if (fail) {
  console.log('실패 항목:');
  fails.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
console.log('어긋난 곳 없음 ✓');
