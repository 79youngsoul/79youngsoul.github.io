/* 데이터끼리 어긋난 곳 찾기 — 파일 하나만 고치고 다른 쪽을 안 고쳤을 때 잡으려는 검사.
 *   node test-consistency.js
 * 실패가 아니라 "확인 필요"로 보는 항목은 경고(⚠)로만 남긴다. */
'use strict';
var C = require('./craft-core.js');
var G = require('./game-data.js');
var fs = require('fs');

var pass = 0, fail = 0, warn = 0;
function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + name + (detail ? '  → ' + detail : '')); }
}
function note(name, cond, detail) {
  if (!cond) { warn++; console.log('  ⚠ ' + name + (detail ? '  → ' + detail : '')); }
}

/* ---------- 1. 이름 중복 ---------- */
(function () {
  var seen = {}, dup = [];
  C.TOOL_NAMES.concat(Object.keys(C.FURNACE)).concat(Object.keys(G.NPC_RECIPES))
    .forEach(function (n) { if (seen[n]) dup.push(n); seen[n] = 1; });
  ok('도구·화로·NPC 제작 이름이 서로 겹치지 않음', dup.length === 0, dup.join(','));

  var npcSeen = {}, npcDup = [];
  G.CRAFT_NPCS.forEach(function (n) { if (npcSeen[n.name]) npcDup.push(n.name); npcSeen[n.name] = 1; });
  ok('NPC 이름 중복 없음', npcDup.length === 0, npcDup.join(','));

  var linkSeen = {}, linkDup = [];
  G.EXTERNAL_LINKS.forEach(function (l) { if (linkSeen[l.url]) linkDup.push(l.url); linkSeen[l.url] = 1; });
  ok('관련 링크 주소 중복 없음', linkDup.length === 0, linkDup.join(','));
})();

/* ---------- 2. 레시피가 자기 자신을 재료로 쓰지 않는지 ---------- */
(function () {
  var self = [];
  Object.keys(G.NPC_RECIPES).forEach(function (n) {
    var r = G.NPC_RECIPES[n];
    if (r.mats[r.makes] || r.mats[n]) self.push(n);
  });
  ok('NPC 제작에 자기 자신 재료 없음', self.length === 0, self.join(','));

  // 순환 참조 (A→B→A)
  var cyc = [];
  Object.keys(G.NPC_RECIPES).forEach(function (start) {
    var stack = [start], seen = {};
    while (stack.length) {
      var cur = stack.pop();
      var r = G.NPC_RECIPES[cur];
      if (!r) continue;
      Object.keys(r.mats).forEach(function (m) {
        if (m === start) { cyc.push(start); return; }
        if (!seen[m]) { seen[m] = 1; stack.push(m); }
      });
    }
  });
  ok('NPC 제작에 순환 참조 없음', cyc.length === 0, cyc.join(','));
})();

/* ---------- 3. 확률·비용 값이 말이 되는지 ---------- */
(function () {
  var badP = Object.keys(G.NPC_RECIPES).filter(function (n) {
    var p = G.NPC_RECIPES[n].p; return !(p > 0 && p <= 1);
  });
  ok('NPC 제작 확률이 전부 0~1', badP.length === 0, badP.join(','));

  var badCost = Object.keys(G.NPC_RECIPES).filter(function (n) {
    var c = G.NPC_RECIPES[n].cost; return typeof c !== 'number' || c < 0;
  });
  ok('NPC 제작 비용이 전부 0 이상', badCost.length === 0, badCost.join(','));

  var badTool = C.TOOL_NAMES.filter(function (n) {
    var t = C.toolItem(n);
    if (t.buy != null) return !(t.buy > 0);
    return !(t.p > 0 && t.p <= 1) || !(t.cost >= 0);
  });
  ok('도구 확률·비용 정상', badTool.length === 0, badTool.join(','));
})();

/* ---------- 4. 비급 도감 ↔ 서고관리인 제작 ---------- */
(function () {
  // 서고관리인이 만드는 것 중 kind:'재료' 인 것(압축무공정수)은 비급이 아니다
  var craftable = {};
  G.LIBRARIAN_CRAFTS.forEach(function (c) { if (c.kind !== '재료') craftable[c.name] = 1; });

  var missing = Object.keys(craftable).filter(function (n) {
    return !G.SKILLS.some(function (s) { return s.name === n; });
  });
  ok('서고관리인이 만드는 비급이 도감에도 있음', missing.length === 0, missing.join(','));

  // 도감 설명에 "서고관리인 제작" 이라 적혔는데 레시피가 없는 것
  var claimed = G.SKILLS.filter(function (s) {
    return /서고관리인 제작/.test(s.info) && !craftable[s.name];
  }).map(function (s) { return s.name; });
  note('도감이 "서고관리인 제작"이라 적었는데 레시피가 없음', claimed.length === 0, claimed.join(','));

  // 상점 비급도 도감에 있는지
  var shopSkills = Object.keys(G.SHOP_ITEMS).filter(function (n) { return /검법|공$/.test(n); });
  var noDoc = shopSkills.filter(function (n) {
    return !G.SKILLS.some(function (s) { return s.name === n; });
  });
  ok('상점 비급이 도감에도 있음', noDoc.length === 0, noDoc.join(','));
})();

/* ---------- 5. 영단 획득처 ↔ 실제 제작 ---------- */
(function () {
  var danCraft = G.DAN.filter(function (d) { return /제작/.test(d.source); });
  var missing = danCraft.filter(function (d) {
    // "조합법 미공개" 처럼 재료를 모르는 것은 제외
    return !G.NPC_RECIPES[d.name] && !/실패|미공개|미확인/.test(d.source);
  }).map(function (d) { return d.name + '(' + d.source + ')'; });
  note('영단 획득처가 "제작"인데 레시피가 없음', missing.length === 0, missing.join(' · '));
})();

/* ---------- 6. NPC 카드 ↔ 레시피 연결 ---------- */
(function () {
  var npcWithCrafts = {};
  G.CRAFT_NPCS.forEach(function (n) { if (n.crafts) npcWithCrafts[n.name] = 1; });
  var recipeNpcs = {};
  Object.keys(G.NPC_RECIPES).forEach(function (n) { recipeNpcs[G.NPC_RECIPES[n].npc] = 1; });

  var noCard = Object.keys(recipeNpcs).filter(function (n) { return !npcWithCrafts[n]; });
  ok('레시피를 가진 NPC가 전부 NPC 목록에도 있음', noCard.length === 0, noCard.join(','));

  var coordBad = G.CRAFT_NPCS.filter(G.hasCoords).filter(function (n) {
    return !(Math.abs(n.x) < 20000 && Math.abs(n.z) < 20000 && n.y > -100 && n.y < 400);
  }).map(function (n) { return n.name; });
  ok('NPC 좌표가 지도 범위 안', coordBad.length === 0, coordBad.join(','));
})();

/* ---------- 7. 문서 숫자 ↔ 실제 데이터 ---------- */
(function () {
  var readme = fs.readFileSync('README.md', 'utf8');
  var n = G.npcCraftNames().length;
  ok('README의 NPC 제작 개수(' + n + ')가 맞음',
     new RegExp('NPC 제작 ' + n + '종').test(readme),
     (readme.match(/NPC 제작 \d+종/) || ['없음'])[0]);
  ok('README의 비급 개수(' + G.SKILLS.length + ')가 맞음',
     new RegExp('비급 ' + G.SKILLS.length + '종').test(readme),
     (readme.match(/비급 \d+종/) || ['없음'])[0]);

  var html = fs.readFileSync('index.html', 'utf8');
  var ver = (html.match(/var APP_VERSION = '([\d.]+)'/) || [])[1];
  var changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  ok('index.html 버전(' + ver + ')이 CHANGELOG.md에 있음',
     changelog.indexOf('## v' + ver + ' ') >= 0, ver);
  ok('index.html 안 CHANGELOG 첫 항목도 같은 버전',
     new RegExp("\\{ v:'" + ver.replace(/\./g, '\\.') + "'").test(html), ver);
})();

/* ---------- 8. 사이트 폴더 ↔ 소스 ---------- */
(function () {
  if (!fs.existsSync('docs/index.html')) { note('docs/ 폴더 없음 (build-site.js 실행 필요)', false); return; }
  var src = fs.readFileSync('index.html', 'utf8');
  var site = fs.readFileSync('docs/index.html', 'utf8');
  ok('docs/index.html 이 최신 소스와 같음', src === site,
     '다름 — node build-site.js --out docs --limit 900 을 다시 돌릴 것');
  ['craft-core.js', 'game-data.js', 'game-updates.js', 'map-waypoints.js'].forEach(function (f) {
    if (!fs.existsSync('docs/' + f)) { ok('docs/' + f
      + ' 있음', false); return; }
    ok('docs/' + f + ' 가 최신',
       fs.readFileSync(f, 'utf8') === fs.readFileSync('docs/' + f, 'utf8'),
       '다름 — 사이트 폴더 다시 만들 것');
  });
  ok('docs/.nojekyll 있음', fs.existsSync('docs/.nojekyll'));
})();

/* ---------- 9. 단일 파일 배포본 ↔ 소스 ---------- */
(function () {
  if (!fs.existsSync('dist/한월공략소.html')) { note('dist/한월공략소.html 없음', false); return; }
  var dist = fs.readFileSync('dist/한월공략소.html', 'utf8');
  var ver = (fs.readFileSync('index.html', 'utf8').match(/var APP_VERSION = '([\d.]+)'/) || [])[1];
  ok('dist 단일 파일이 최신 버전(' + ver + ')', dist.indexOf("APP_VERSION = '" + ver + "'") >= 0,
     '다름 — node build-standalone.js 다시 돌릴 것');
})();

/* ---------- 결과 ---------- */
console.log('\n=== 데이터 정합성 검사 ===');
console.log('통과: ' + pass + '  실패: ' + fail + '  경고: ' + warn);
console.log(fail === 0 ? '어긋난 곳 없음 ✓' : '고칠 곳 있음');
process.exit(fail === 0 ? 0 : 1);
