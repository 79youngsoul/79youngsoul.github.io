/* 한월 공략소 - 코어 로직 검증 (node test-core.js) */
'use strict';
var C = require('./craft-core.js');

var pass = 0, fail = 0, failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (extra ? '  → ' + extra : '')); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-6 : eps); }
function eq(name, a, b, eps) { ok(name, near(a, b, eps), 'got ' + a + ', want ' + b); }

/* ---------- 1. 데이터 무결성 ---------- */
(function () {
  var known = {};
  Object.keys(C.FURNACE).forEach(function (k) { known[k] = 1; });
  C.BASE.forEach(function (k) { known[k] = 1; });
  C.PICK_NAMES.forEach(function (k) { known[k] = 1; });

  var unknown = [];
  Object.keys(C.FURNACE).forEach(function (f) {
    Object.keys(C.FURNACE[f].mats).forEach(function (m) { if (!known[m]) unknown.push(f + '→' + m); });
  });
  C.PICKS.forEach(function (p) {
    if (!p.mats) return;
    Object.keys(p.mats).forEach(function (m) { if (!known[m]) unknown.push(p.name + '→' + m); });
  });
  ok('모든 재료가 정의됨', unknown.length === 0, unknown.join(', '));

  // BASE 목록에 실제로 안 쓰이는 항목이 있는지
  var used = {};
  Object.keys(C.FURNACE).forEach(function (f) {
    Object.keys(C.FURNACE[f].mats).forEach(function (m) { used[m] = 1; });
  });
  C.PICKS.forEach(function (p) { if (p.mats) Object.keys(p.mats).forEach(function (m) { used[m] = 1; }); });
  var unused = C.BASE.filter(function (b) { return !used[b]; });
  ok('광산 재료 목록에 미사용 항목 없음', unused.length === 0, unused.join(', '));

  ok('화로 위상정렬 완전', C.ORDER.length === Object.keys(C.FURNACE).length);

  // 위상 순서: 소비자가 재료보다 먼저
  var pos = {}; C.ORDER.forEach(function (n, i) { pos[n] = i; });
  var bad = [];
  Object.keys(C.FURNACE).forEach(function (a) {
    Object.keys(C.FURNACE[a].mats).forEach(function (m) {
      if (C.isFurnace(m) && pos[a] > pos[m]) bad.push(a + '>' + m);
    });
  });
  ok('위상 순서 정합', bad.length === 0, bad.join(','));

  ok('모든 화로 시간 > 0', Object.keys(C.FURNACE).every(function (k) { return C.FURNACE[k].sec > 0; }));
  ok('곡괭이 확률 0~1', C.PICKS.slice(1).every(function (p) { return p.p > 0 && p.p <= 1; }));

  /* 도구 계열 (곡괭이 · 낫) */
  ok('도구 계열 2종', C.CHAIN_NAMES.join() === '곡괭이,낫', C.CHAIN_NAMES.join());
  ok('도구 이름 10개', C.TOOL_NAMES.length === 10, C.TOOL_NAMES.length);
  ok('낫 5단계', C.SICKLES.length === 5);
  ok('낫 확률 100/80/60/40/20%',
     C.SICKLES.map(function (s) { return s.p; }).join() === [1, 0.8, 0.6, 0.4, 0.2].join(),
     C.SICKLES.map(function (s) { return s.p; }).join());
  ok('낫 비용 1~5만전',
     C.SICKLES.map(function (s) { return s.cost; }).join() === [10000, 20000, 30000, 40000, 50000].join());
  ok('낫은 상점 구매 없음', C.SICKLES.every(function (s) { return s.buy === undefined; }));
  ok('낫 재료는 단계 ×10 (돌덩어리·철·정철광)', C.SICKLES.every(function (s, i) {
    var n = (i + 1) * 10;
    return s.mats['돌덩어리'] === n && s.mats['철'] === n && s.mats['정철광'] === n;
  }));
  ok('2~5성낫은 하위 낫 1개', C.SICKLES.slice(1).every(function (s, i) {
    return s.mats[(i + 1) + '성낫'] === 1;
  }));
  ok('isTool은 곡괭이·낫 전부', C.isTool('5성곡괭이') && C.isTool('3성낫') && !C.isTool('강철'));
  ok('toolChain 계열 구분', C.toolChain('3성낫') === '낫' && C.toolChain('3성곡괭이') === '곡괭이');
  ok('낫은 광산 재료로 취급 안 됨', !C.isBase('1성낫'));
})();

/* ---------- 1-2. 낫 체인 ---------- */
(function () {
  var r = C.compute({ targets: { '1성낫': 1 } });
  eq('1성낫 제작비 10,000전', r.totalCost, 10000);
  eq('1성낫 → 돌덩어리 10 + 철10의 돌덩어리 10 = 20', r.base['돌덩어리'].total, 20);
  eq('1성낫 → 철광석 20', r.base['철광석'].total, 20);
  eq('1성낫 → 정철광 10', r.base['정철광'].total, 10);

  var r2 = C.compute({ targets: { '2성낫': 1 }, integer: false });
  eq('2성낫 기대 시도 = 1/0.8', r2.steps[r2.steps.length - 1].attempts, 1 / 0.8);
  var s1 = r2.steps.filter(function (s) { return s.name === '1성낫'; })[0];
  eq('2성낫 실패 시 1성낫 소실 → 1.25개', s1.made, 1 / 0.8, 1e-9);

  var r3 = C.compute({ targets: { '2성낫': 1 }, integer: false, failConsumesBase: false });
  var s1b = r3.steps.filter(function (s) { return s.name === '1성낫'; })[0];
  eq('하위 유지 옵션이면 1성낫 1개', s1b.made, 1, 1e-9);

  var mix = C.compute({ targets: { '5성낫': 1, '5성곡괭이': 1 } });
  ok('곡괭이·낫 같이 계산', mix.steps.some(function (s) { return s.name === '5성낫'; })
     && mix.steps.some(function (s) { return s.name === '5성곡괭이'; }));
  ok('낫만 계산해도 곡괭이 단계 안 생김',
     C.compute({ targets: { '5성낫': 1 } }).steps.every(function (s) { return s.chain === '낫'; }));

  var sim = C.simulate({ targets: { '3성낫': 1 } }, 200);
  ok('낫 시뮬레이션 동작', sim.attempts['3성낫'].p50 >= 1 && sim.cost.p50 > 0,
     JSON.stringify(sim.attempts['3성낫']));
})();

/* ---------- 2. 배율 계산 ---------- */
eq('화력 0 → 배율 1', C.timeMultiplier({ fire: 0 }), 1);
eq('화력 50 → 0.99^50', C.timeMultiplier({ fire: 50 }), Math.pow(0.99, 50));
eq('화력 99 → 50으로 캡', C.timeMultiplier({ fire: 99 }), Math.pow(0.99, 50));
eq('화력 50 + 화로시간감소', C.timeMultiplier({ fire: 50, furnaceTimeDown: true }), Math.pow(0.99, 50) * 0.9);
eq('VIP 단독 → 0.9', C.timeMultiplier({ fire: 0, vip: true }), 0.9);
eq('VIP + 화로시간감소 → 0.81', C.timeMultiplier({ fire: 0, vip: true, furnaceTimeDown: true }), 0.81);
eq('화력 50 + 화로시간감소 + VIP',
   C.timeMultiplier({ fire: 50, furnaceTimeDown: true, vip: true }), Math.pow(0.99, 50) * 0.9 * 0.9);
eq('성공률 70% + 부가효과 → 77%', C.successRate(0.7, { successUp: true }), 0.77);
eq('성공률 5% + 부가효과 → 5.5%', C.successRate(0.05, { successUp: true }), 0.055);
eq('성공률 100% 상한', C.successRate(1.0, { successUp: true }), 1);
eq('비용 -10%', C.costMultiplier({ costDown: true }), 0.9);

/* ---------- 3. 단순 화로 전개 ---------- */
(function () {
  var r = C.compute({ targets: { '철': 1 } });
  eq('철1 → 철광석 2', r.base['철광석'].total, 2);
  eq('철1 → 돌덩어리 1', r.base['돌덩어리'].total, 1);
  eq('철1 → 시간 60초', r.totalSec, 60);
  eq('철1 → 비용 0', r.totalCost, 0);
  ok('철1 → 화로 제작 1건', r.furnace.length === 1 && r.furnace[0].count === 1);
})();

(function () {
  var r = C.compute({ targets: { '강철': 1 } });
  eq('강철1 → 철광석 2', r.base['철광석'].total, 2);
  eq('강철1 → 돌덩어리 1', r.base['돌덩어리'].total, 1);
  eq('강철1 → 정철광 1', r.base['정철광'].total, 1);
  eq('강철1 → 갈옥 2', r.base['갈옥'].total, 2);
  eq('강철1 → 총 시간 360초', r.totalSec, 360);
  eq('강철1 → 임계경로 360초', r.criticalSec, 360);
})();

(function () {
  // 강철 2개: 철 2 → 철광석 4, 돌덩어리 2, 정철광 2, 갈옥 4
  var r = C.compute({ targets: { '강철': 2 } });
  eq('강철2 → 철광석 4', r.base['철광석'].total, 4);
  eq('강철2 → 총 시간 720초', r.totalSec, 720);
  eq('강철2 → 임계경로는 여전히 360초', r.criticalSec, 360);
  eq('강철2 → 화로 2슬롯 시간 360초', C.compute({ targets: { '강철': 2 }, slots: 2 }).parallelSec, 360);
})();

/* ---------- 4. 공유 재료 합산 ---------- */
(function () {
  // 백현철: 백련강1(강철1,청연광2,신선옥1) + 현철3 + 자금1(적동괴2,청연광2,신선옥1) + 매화옥2
  var r = C.compute({ targets: { '백현철': 1 } });
  eq('백현철1 → 청연광 4 (백련강+자금 합산)', r.base['청연광'].total, 4);
  eq('백현철1 → 신선옥 2', r.base['신선옥'].total, 2);
  eq('백현철1 → 현철 3', r.base['현철'].total, 3);
  eq('백현철1 → 매화옥 2', r.base['매화옥'].total, 2);
  eq('백현철1 → 적동석 6 (적동괴2)', r.base['적동석'].total, 6);
  eq('백현철1 → 철광석 2', r.base['철광석'].total, 2);
  eq('백현철1 → 시간 2400+600+300+300+60+60(적동괴2=120)', r.totalSec,
     2400 /*백현철*/ + 600 /*백련강*/ + 300 /*강철*/ + 60 /*철*/ + 300 /*자금*/ + 120 /*적동괴2*/);
  // 임계경로: 백현철(2400)+백련강(600)+강철(300)+철(60) = 3360
  eq('백현철1 → 임계경로 3360초', r.criticalSec, 3360);
})();

/* ---------- 5. 보유 재고 반영 ---------- */
(function () {
  var r = C.compute({ targets: { '강철': 1 }, inventory: { '철': 1 } });
  ok('철 보유 시 철광석 불필요', !r.base['철광석'], JSON.stringify(r.base));
  eq('철 보유 시 시간 300초', r.totalSec, 300);
  eq('철 보유 사용량 1', r.invUsed['철'], 1);

  var r2 = C.compute({ targets: { '강철': 3 }, inventory: { '강철': 1 } });
  eq('강철 3개 중 1개 보유 → 2개만 제작', r2.furnaceCount['강철'], 2);

  var r3 = C.compute({ targets: { '강철': 1 }, inventory: { '갈옥': 1 } });
  eq('갈옥 1 보유 → 부족 1', r3.base['갈옥'].short, 1);
  eq('갈옥 총 필요 2', r3.base['갈옥'].total, 2);
  eq('부족 항목 수 집계', r3.shortageCount, Object.keys(r3.base).filter(function (k) { return r3.base[k].short > 0; }).length);
})();

/* ---------- 6. 곡괭이 체인 ---------- */
(function () {
  var r = C.compute({ targets: { '2성곡괭이': 1 } });
  // 1성 구매 1000 + 2성 제작 5000
  eq('2성곡괭이 총 비용 6000', r.totalCost, 6000);
  eq('2성곡괭이 시도 1회', r.steps[r.steps.length - 1].attempts, 1);
  eq('2성곡괭이 → 돌덩어리 5 + 철(1)의 돌덩어리 1 = 6', r.base['돌덩어리'].total, 6);
  eq('2성곡괭이 → 적동석 3', r.base['적동석'].total, 3);
  ok('제작 순서 첫 항목이 화로', r.plan[0].type === '화로');
  ok('제작 순서 마지막이 2성곡괭이', r.plan[r.plan.length - 1].name === '2성곡괭이');
})();

(function () {
  var r = C.compute({ targets: { '3성곡괭이': 1 }, integer: false });
  eq('3성 기대 시도 = 1/0.7', r.steps[r.steps.length - 1].attempts, 1 / 0.7);
  // 재료 소모도 1.4286배
  var expect2 = 1 / 0.7;
  var s2 = r.steps.filter(function (s) { return s.name === '2성곡괭이'; })[0];
  eq('3성 실패 시 2성 소실 → 2성 필요 1.4286', s2.made, expect2, 1e-9);

  var r2 = C.compute({ targets: { '3성곡괭이': 1 }, integer: false, failConsumesBase: false });
  var s2b = r2.steps.filter(function (s) { return s.name === '2성곡괭이'; })[0];
  eq('실패해도 하위 곡괭이 유지 → 2성 필요 1', s2b.made, 1);

  var r3 = C.compute({ targets: { '3성곡괭이': 1 }, integer: false, successUp: true });
  eq('성공률 증가 시 기대 시도 = 1/0.77', r3.steps[r3.steps.length - 1].attempts, 1 / 0.77);
})();

(function () {
  var r = C.compute({ targets: { '3성곡괭이': 1 }, integer: false, costDown: true });
  var r0 = C.compute({ targets: { '3성곡괭이': 1 }, integer: false });
  // 1성 구매가는 할인 제외 → 총액이 정확히 0.9배는 아님
  ok('비용 -10%는 제작비에만 적용', r.totalCost < r0.totalCost && r.totalCost > r0.totalCost * 0.9 - 1e-6,
     r.totalCost + ' vs ' + r0.totalCost);
})();

(function () {
  var r = C.compute({ targets: { '5성곡괭이': 1 } });
  ok('5성 계산 정상 동작', r.totalCost > 0 && isFinite(r.totalCost));
  ok('5성 → 광산 재료 다수 필요', Object.keys(r.base).length > 10);
  ok('5성 정수 모드에서 모든 수량이 정수',
     Object.keys(r.base).every(function (k) { return Number.isInteger(r.base[k].total); }));
  ok('5성 총 시간 > 0', r.totalSec > 0);
  ok('5성 임계경로 <= 총시간', r.criticalSec <= r.totalSec + 1e-6);
  ok('5성 병렬(1슬롯) == 총시간', near(C.compute({ targets: { '5성곡괭이': 1 }, slots: 1 }).parallelSec, r.totalSec, 1e-6));
})();

(function () {
  // 실패 무시 모드 = 최소 소요량, 항상 실패 반영보다 작거나 같아야 함
  var a = C.compute({ targets: { '4성곡괭이': 1 }, ignoreFail: true });
  var b = C.compute({ targets: { '4성곡괭이': 1 } });
  ok('실패무시 비용 <= 기대 비용', a.totalCost <= b.totalCost, a.totalCost + ' vs ' + b.totalCost);
  ok('실패무시 재료 <= 기대 재료',
     Object.keys(a.base).every(function (k) { return a.base[k].total <= b.base[k].total; }));
  eq('실패무시 4성 시도 1회', a.steps[a.steps.length - 1].attempts, 1);
})();

/* ---------- 7. 시간 옵션 ---------- */
(function () {
  var a = C.compute({ targets: { '백현철': 1 } });
  var b = C.compute({ targets: { '백현철': 1 }, fire: 50, furnaceTimeDown: true });
  eq('화력50+감소옵션 시간 배율 적용', b.totalSec, a.totalSec * Math.pow(0.99, 50) * 0.9, 1e-6);
  ok('시간 감소가 실제로 줄어듦', b.totalSec < a.totalSec);
})();

/* ---------- 8. 다중 목표 ---------- */
(function () {
  var r = C.compute({ targets: { '강철': 1, '자금': 1 } });
  var a = C.compute({ targets: { '강철': 1 } });
  var b = C.compute({ targets: { '자금': 1 } });
  eq('다중 목표 청연광 합산', r.base['청연광'].total, (a.base['청연광'] ? a.base['청연광'].total : 0) + b.base['청연광'].total);
  eq('다중 목표 시간 합산', r.totalSec, a.totalSec + b.totalSec);
})();

/* ---------- 9. 엣지 케이스 ---------- */
(function () {
  var r = C.compute({});
  eq('빈 목표 → 비용 0', r.totalCost, 0);
  eq('빈 목표 → 시간 0', r.totalSec, 0);
  ok('빈 목표 → 계획 없음', r.plan.length === 0);

  var r2 = C.compute({ targets: { '강철': 0, '철': -5 } });
  ok('0/음수 수량 무시', r2.plan.length === 0);

  var r3 = C.compute({ targets: { '철': 1 }, inventory: { '철': 99 } });
  ok('재고가 충분하면 제작 없음', r3.plan.length === 0 && r3.totalSec === 0);

  var r4 = C.compute({ targets: { '1성곡괭이': 3 } });
  eq('1성 3개 구매 3000전', r4.totalCost, 3000);

  var r5 = C.compute({ targets: { '5성곡괭이': 1 }, slots: 10 });
  ok('슬롯 증가 → 병렬 시간 감소', r5.parallelSec < C.compute({ targets: { '5성곡괭이': 1 } }).parallelSec);

  // NaN/무한대 없음
  var r6 = C.compute({ targets: { '5성곡괭이': 2 }, fire: 30, successUp: true, costDown: true, furnaceTimeDown: true, slots: 4 });
  ok('복합 옵션에서 NaN 없음', isFinite(r6.totalCost) && isFinite(r6.totalSec) && isFinite(r6.parallelSec));
  ok('복합 옵션 광산 수량 유한',
     Object.keys(r6.base).every(function (k) { return isFinite(r6.base[k].total) && r6.base[k].total > 0; }));
})();

/* ---------- 10. 시뮬레이션 ---------- */
(function () {
  var s = C.simulate({ targets: { '3성곡괭이': 1 } }, 4000);
  var avg = s.attempts['3성곡괭이'].avg;
  ok('3성 평균 시도 ≈ 1/0.7 (1.43)', Math.abs(avg - 1 / 0.7) < 0.12, 'avg=' + avg.toFixed(3));
  ok('p50 <= p90', s.attempts['3성곡괭이'].p50 <= s.attempts['3성곡괭이'].p90);
  ok('시뮬 비용 유한', isFinite(s.cost.p50) && s.cost.p50 > 0);
  ok('시뮬 p10 <= p50 <= p90', s.cost.p10 <= s.cost.p50 && s.cost.p50 <= s.cost.p90);

  var s2 = C.simulate({ targets: { '4성곡괭이': 1 } }, 3000);
  var avg4 = s2.attempts['4성곡괭이'].avg;
  ok('4성 평균 시도 ≈ 1/0.3 (3.33)', Math.abs(avg4 - 1 / 0.3) < 0.35, 'avg=' + avg4.toFixed(3));

  var s3 = C.simulate({ targets: { '4성곡괭이': 1 }, successUp: true }, 3000);
  ok('성공률 옵션 → 평균 시도 감소', s3.attempts['4성곡괭이'].avg < avg4,
     s3.attempts['4성곡괭이'].avg.toFixed(2) + ' vs ' + avg4.toFixed(2));

  // 기대값 계산과 시뮬 평균이 대략 일치하는지 (2성: 확률 100%)
  var det = C.compute({ targets: { '2성곡괭이': 1 } });
  var s4 = C.simulate({ targets: { '2성곡괭이': 1 } }, 200);
  eq('확률 100% 구간은 시뮬=결정론', s4.cost.p50, det.totalCost, 1e-6);
})();

/* ---------- 11. 포맷 ---------- */
eq('fmtTime 60초', C.fmtTime(60) === '1분' ? 1 : 0, 1);
eq('fmtTime 3600초', C.fmtTime(3600) === '1시간' ? 1 : 0, 1);
eq('fmtTime 90000초', C.fmtTime(90000) === '1일 1시간' ? 1 : 0, 1, 0);
ok('fmtTime 0', C.fmtTime(0) === '0초');
ok('fmtNum 천단위', C.fmtNum(1234567) === '1,234,567', C.fmtNum(1234567));

/* ---------- 12. 셋(스택) 표기 ---------- */
ok('기본 스택 64', C.STACK === 64);
ok('5700 → 89셋 4개', C.fmtStack(5700) === '89셋 4개', C.fmtStack(5700));
ok('64 → 1셋', C.fmtStack(64) === '1셋', C.fmtStack(64));
ok('128 → 2셋', C.fmtStack(128) === '2셋', C.fmtStack(128));
ok('63 → 63개', C.fmtStack(63) === '63개', C.fmtStack(63));
ok('0 → 0개', C.fmtStack(0) === '0개', C.fmtStack(0));
ok('65 → 1셋 1개', C.fmtStack(65) === '1셋 1개', C.fmtStack(65));
ok('스택 크기 변경 가능(100)', C.fmtStack(250, 100) === '2셋 50개', C.fmtStack(250, 100));
ok('큰 수 천단위 유지', C.fmtStack(1000000) === '15,625셋', C.fmtStack(1000000));
ok('소수 처리', C.fmtStack(64.5) === '1셋 0.50개', C.fmtStack(64.5));
ok('셋 환산 총합 일치', (function(){
  for (var i = 0; i < 500; i++) {
    var n = Math.floor(Math.random() * 100000);
    var s = Math.floor(n / 64), r = n - s * 64;
    if (s * 64 + r !== n) return false;
  }
  return true;
})());

/* ---------- 13. 부가 게임 데이터 (game-data.js) ---------- */
var G = require('./game-data.js');

/* 지도 뷰어 HTML에서 window.MAP_DATA만 뽑아 읽는다 (문자열 안 중괄호 무시) */
function readMapData(file) {
  var h = require('fs').readFileSync(file, 'utf8');
  var mi = h.indexOf('window.MAP_DATA');
  if (mi < 0) return null;
  var s = h.indexOf('{', mi), d = 0, e = -1, inStr = false, q = '', esc = false;
  for (var i = s; i < h.length; i++) {
    var c = h[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === q) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) { e = i + 1; break; } }
  }
  if (e < 0) return null;
  try { return JSON.parse(h.slice(s, e)); } catch (err) { return null; }
}

(function () {
  /* 광산 */
  ok('광산 65곳', G.MINES.length === 65, G.MINES.length);
  var nums = G.MINES.map(function (m) { return m.n; }).sort(function (a, b) { return a - b; });
  ok('광산 번호 1~65 중복 없음', nums.every(function (n, i) { return n === i + 1; }));
  ok('모든 광산 색깔이 정의됨',
     G.MINES.every(function (m) { return !!G.MINE_COLORS[m.c] && m.c !== '공통'; }));
  ok('모든 광산 좌표가 숫자',
     G.MINES.every(function (m) { return [m.x, m.y, m.z].every(function (v) { return typeof v === 'number'; }); }));

  // 계산기가 쓰는 광산 재료 전부가 어느 광산에서 나오는지 매핑돼 있어야 함
  var unmapped = C.BASE.filter(function (b) { return !G.MATERIAL_MINES[b]; });
  ok('C.BASE 광산 재료 전부 매핑됨', unmapped.length === 0, unmapped.join(', '));

  // 매핑 역방향: MINE_RESOURCES에 있는데 계산기에 없는 재료는 광산초뿐
  var extra = [];
  Object.keys(G.MINE_RESOURCES).forEach(function (c) {
    G.MINE_RESOURCES[c].forEach(function (m) { if (C.BASE.indexOf(m) < 0) extra.push(m); });
  });
  ok('계산기에 없는 광산 산출물은 광산초뿐',
     extra.every(function (m) { return m === '광산초'; }), extra.join(', '));

  ok('whereToMine("현철") → 청색광산',
     G.whereToMine('현철').colors.join() === '청', JSON.stringify(G.whereToMine('현철').colors));
  ok('whereToMine("청연광") → 녹+적',
     G.whereToMine('청연광').colors.sort().join() === ['녹', '적'].sort().join(),
     G.whereToMine('청연광').colors.join());
  ok('공통 재료는 전체 광산 반환', G.whereToMine('돌덩어리').mines.length === 65);
  ok('없는 재료는 null', G.whereToMine('없는재료') === null);

  /* 웨이포인트 출처 분리 */
  ok('기본 지도 웨이포인트 비어 있음', G.MAP_WAYPOINTS.length === 0, G.MAP_WAYPOINTS.length);

  var COORD_NPCS = G.CRAFT_NPCS.filter(G.hasCoords);
  var wm = G.waypoints(G.ORIGIN.WEBMAP);
  eq('가져온 웨이포인트 = 광산65 + 좌표있는NPC + 스폰1 + 지도위치',
     wm.length, G.MINES.length + COORD_NPCS.length + 1 + G.extraWaypoints().length, 0);
  ok('좌표 없는 NPC는 웨이포인트에서 제외',
     wm.every(function (w) { return w.name !== '대장장이 조수'; }));
  ok('가져온 웨이포인트 전부 origin=webmap',
     wm.every(function (w) { return w.origin === 'webmap'; }));
  ok('가져온 웨이포인트 좌표 전부 숫자',
     wm.every(function (w) { return [w.x, w.y, w.z].every(function (v) { return typeof v === 'number'; }); }));
  ok('가져온 웨이포인트에 종류 태그', wm.every(function (w) { return !!w.kind; }));

  // 지도 웨이포인트 주입 → 두 출처가 섞이지 않는지
  var added = G.setMapWaypoints([
    { name: '내 집', x: 100, y: 70, z: -200 },
    { name: '창고', x: -50, z: 30, kind: '보관' },
    { name: '잘못된 좌표', x: 'abc', z: 1 }        // 무시돼야 함
  ]);
  ok('유효한 웨이포인트만 주입 (2건)', added === 2, added);
  ok('y 없으면 0으로 채움', G.MAP_WAYPOINTS[1].y === 0);
  ok('kind 기본값 부여', G.MAP_WAYPOINTS[0].kind === '웨이포인트');

  var mp = G.waypoints(G.ORIGIN.MAP);
  ok('지도 웨이포인트 전부 origin=map', mp.every(function (w) { return w.origin === 'map'; }));
  eq('지도 웨이포인트 2건', mp.length, 2, 0);

  // 핵심: 주입해도 가져온 데이터는 그대로여야 한다
  eq('주입 후에도 광산 65곳 유지', G.MINES.length, 65, 0);
  eq('주입 후에도 가져온 웨이포인트 수 불변',
     G.waypoints(G.ORIGIN.WEBMAP).length, wm.length, 0);
  ok('가져온 목록에 지도 웨이포인트가 섞이지 않음',
     G.waypoints(G.ORIGIN.WEBMAP).every(function (w) { return w.origin === 'webmap'; }));
  ok('지도 목록에 가져온 웨이포인트가 섞이지 않음',
     G.waypoints(G.ORIGIN.MAP).every(function (w) { return w.origin === 'map'; }));

  var all = G.waypoints();
  eq('전체 = 두 출처 합', all.length, wm.length + 2, 0);
  ok('전체 목록도 origin으로 구분 가능',
     all.filter(function (w) { return w.origin === 'map'; }).length === 2);

  var cnt = G.waypointCounts();
  ok('출처별 개수 집계', cnt.webmap === wm.length && cnt.map === 2, JSON.stringify(cnt));

  // 반환 객체를 고쳐도 원본이 오염되지 않아야 함
  wm[0].name = '오염';
  ok('waypoints()는 사본을 반환', G.waypoints(G.ORIGIN.WEBMAP)[0].name !== '오염');

  // 재주입은 누적이 아니라 교체
  G.setMapWaypoints([{ name: '하나만', x: 1, y: 2, z: 3 }]);
  eq('재주입은 교체(누적 아님)', G.MAP_WAYPOINTS.length, 1, 0);
  G.setMapWaypoints([]);
  eq('빈 배열 주입 시 초기화', G.waypointCounts().map, 0, 0);

  /* 지도 딥링크 */
  ok('연결 정보 없으면 링크 null', G.mapUrl(100, 200) === null);
  G.setMapLink({ href: 'D:/지도/out/index.html', world: 'W', dim: 'overworld',
                 map: 'mw$default', layer: 'surface' });
  var url = G.mapUrl(-1093, -701);
  ok('딥링크 해시 형식',
     url === 'D:/지도/out/index.html#W/overworld/mw%24default/surface/-1093/-701/1', url);
  ok('좌표 반올림', G.mapUrl(1.7, -2.2).indexOf('/2/-2/') > 0, G.mapUrl(1.7, -2.2));
  ok('배율 지정 가능', G.mapUrl(0, 0, 4).slice(-2) === '/4', G.mapUrl(0, 0, 4));
  G.setMapLink(null);
  ok('연결 해제되면 다시 null', G.mapUrl(0, 0) === null);

  /* 세트 집계 */
  G.setMapWaypoints([
    { name: 'a', x: 1, y: 1, z: 1, set: '광산' },
    { name: 'b', x: 2, y: 2, z: 2, set: '광산' },
    { name: 'c', x: 3, y: 3, z: 3, set: '보물' },
    { name: 'd', x: 4, y: 4, z: 4 }
  ]);
  var sets = G.mapWaypointSets();
  eq('세트 3종', sets.length, 3, 0);
  ok('많은 순 정렬', sets[0].set === '광산' && sets[0].count === 2, JSON.stringify(sets));
  ok('세트 없으면 (없음)', sets.some(function (s) { return s.set === '(없음)'; }));
  ok('set 필드 보존', G.MAP_WAYPOINTS[0].set === '광산');
  ok('set 없으면 kind가 기본값', G.MAP_WAYPOINTS[3].kind === '웨이포인트');
  ok('set 있으면 kind로도 씀', G.MAP_WAYPOINTS[2].kind === '보물');
  G.setMapWaypoints([]);

  /* 실제 지도 파일이 있으면 함께 검증 */
  var fsMod = require('fs'), pathMod = require('path');
  var mwFile = pathMod.join(__dirname, 'map-waypoints.js');
  if (fsMod.existsSync(mwFile)) {
    var MWD = require('./map-waypoints.js');
    ok('지도 웨이포인트 파일 로드', Array.isArray(MWD.list) && MWD.list.length > 0, MWD.list.length);
    ok('전부 좌표가 숫자',
       MWD.list.every(function (x) { return [x.x, x.y, x.z].every(function (v) { return typeof v === 'number'; }); }));
    ok('사망 지점 제외됨', MWD.list.every(function (x) { return !x.death; }));
    ok('딥링크 정보 포함', !!(MWD.link && MWD.link.world && MWD.link.href));
    // 폴더 통합본이면 상대경로여야 한다 (폴더째 옮겨도 안 깨지도록)
    if (fsMod.existsSync(pathMod.join(__dirname, 'map', 'index.html'))) {
      ok('지도가 프로젝트 안에 있으면 상대경로', MWD.link.relative === true, MWD.link.href);
      ok('상대경로가 map/으로 시작', /^map\//.test(MWD.link.href), MWD.link.href);
      ok('절대경로 흔적 없음', !/^[A-Za-z]:/.test(MWD.link.href), MWD.link.href);
      G.setMapLink(MWD.link);
      ok('링크도 상대경로로 생성', G.mapUrl(0, 0).indexOf('map/index.html#') === 0, G.mapUrl(0, 0));
      G.setMapLink(null);
    }
    ok('세트 집계 합 = 전체',
       MWD.sets.reduce(function (a, s) { return a + s.count; }, 0) === MWD.list.length);
    // 주입 후에도 webmap 데이터 불변
    var beforeN = G.waypoints(G.ORIGIN.WEBMAP).length;
    G.setMapWaypoints(MWD.list);
    eq('실제 지도 주입 개수', G.waypointCounts().map, MWD.list.length, 0);
    eq('실제 주입 후 webmap 불변', G.waypoints(G.ORIGIN.WEBMAP).length, beforeN, 0);
    ok('실제 주입 후에도 광산 65곳', G.MINES.length === 65);
    ok('지도 광산 세트는 webmap 광산과 별개',
       (MWD.sets.filter(function (s) { return s.set === '광산'; })[0] || {}).count !== undefined);
    G.setMapWaypoints([]);
  }

  /* 지도 뷰어에 주입한 웹맵 웨이포인트 검증 */
  var mapHtml = pathMod.join(__dirname, 'map', 'index.html');
  if (fsMod.existsSync(mapHtml)) {
    var mdata = readMapData(mapHtml);
    ok('지도 MAP_DATA 파싱 가능', !!mdata);
    var mworld = mdata.worlds[0];
    var injected = mworld.waypoints.filter(function (w) { return w.webmap; });
    var mine = mworld.waypoints.filter(function (w) { return w.mywp; });
    var own = mworld.waypoints.filter(function (w) { return !w.webmap && !w.mywp; });

    ok('내 웨이포인트 주입분은 [내] 세트',
       mine.every(function (w) { return w.set.indexOf('[내] ') === 0; }), mine.length);

    if (injected.length) {
      eq('주입 개수 = webmap 웨이포인트 전체',
         injected.length, G.webmapWaypoints().length, 0);
      ok('지도 자체 웨이포인트 368개 보존', own.length === 368, own.length);
      ok('주입분 세트는 전부 [웹맵] 접두사',
         injected.every(function (w) { return w.set.indexOf('[웹맵] ') === 0; }));
      ok('지도 자체 웨이포인트에는 접두사 없음',
         own.every(function (w) { return !w.set || w.set.indexOf('[웹맵] ') !== 0; }));
      ok('주입분 세트가 세트 목록에 등록됨',
         injected.every(function (w) { return mworld.waypointSets.indexOf(w.set) >= 0; }));
      ok('주입분 전부 overworld', injected.every(function (w) { return w.dim === 'overworld'; }));
      ok('주입분 전부 색 지정', injected.every(function (w) { return /^#[0-9a-fA-F]{6}$/.test(w.color); }));
      ok('주입분 전부 활성', injected.every(function (w) { return w.disabled === false; }));
      ok('주입분에 map 키 없음 (모든 지도에 표시)',
         injected.every(function (w) { return w.map === undefined; }));
      ok('initials는 2자 이하',
         injected.every(function (w) { return w.initials.length <= 2; }));

      // 좌표가 game-data와 정확히 일치하는지
      var mineWp = {};
      injected.forEach(function (w) {
        var m = /^(\d+)번 광산$/.exec(w.name);
        if (m) mineWp[+m[1]] = w;
      });
      eq('주입된 광산 65곳', Object.keys(mineWp).length, 65, 0);
      var coordOk = G.MINES.every(function (m) {
        var w = mineWp[m.n];
        return w && w.x === m.x && w.y === m.y && w.z === m.z;
      });
      ok('광산 좌표가 game-data와 동일', coordOk);
      var colorOk = G.MINES.every(function (m) {
        return mineWp[m.n].color === G.MINE_COLORS[m.c].hex;
      });
      ok('광산 색이 색깔별로 지정됨', colorOk);
      var setOk = G.MINES.every(function (m) {
        return mineWp[m.n].set === '[웹맵] ' + G.MINE_COLORS[m.c].label;
      });
      ok('광산 세트가 색깔별로 분리됨', setOk);

      var npcNames = injected.filter(function (w) { return w.set === '[웹맵] 제작 NPC'; })
        .map(function (w) { return w.name; }).sort();
      ok('좌표 있는 제작 NPC 전부 주입',
         npcNames.join() === G.CRAFT_NPCS.filter(G.hasCoords)
           .map(function (n) { return n.name; }).sort().join(),
         npcNames.join());
    } else {
      ok('주입 안 된 상태에서도 지도 데이터 정상', own.length > 0, own.length);
    }

    // 관련 탭 매핑이 실제 세트 이름을 얼마나 덮는지 (index.html과 같은 규칙)
    var RELATED = [
      /광산|광물/, /사냥터|약초|항아리|상자|보물|탐색/, /적환단|기린단|해태단/,
      /영단|환단/, /NPC|대장장이|상단주|퀘스트|제작/,
      /화로|용광로/, /부적/, /장비|무기|방어구|곡괭이/
    ];
    function related(s) { return RELATED.some(function (r) { return r.test(s); }); }
    ok('광산 세트가 관련 탭에 매핑됨', related('광산'));
    ok('NPC 세트가 관련 탭에 매핑됨', related('NPC'));
    ok('기린단 하위 세트도 매핑됨', related('기린단 망월록'));
    ok('해태단 하위 세트도 매핑됨', related('해태단 낡은 두루마리'));
    ok('약초 세트도 이제 매핑됨(위치 탭)', related('약초'));
    ok('보물 세트도 이제 매핑됨(위치 탭)', related('보물'));
    ok('사냥터 세트가 매핑됨', related('[웹맵] 사냥터'));
    ok('항아리 세트가 매핑됨', related('항아리'));
    ok('무관한 세트는 매핑 없음', !related('엔티티') && !related('오류블럭'));
  }

  /* 동선 */
  Object.keys(G.MINE_PATHS).forEach(function (c) {
    var path = G.MINE_PATHS[c];
    var uniq = {}; var dup = false;
    path.forEach(function (n) { if (uniq[n]) dup = true; uniq[n] = 1; });
    ok(c + '색 동선 중복 없음', !dup, path.join(','));
    var owned = G.minesOf(c).map(function (m) { return m.n; }).sort(function (a, b) { return a - b; });
    var sorted = path.slice().sort(function (a, b) { return a - b; });
    ok(c + '색 동선이 해당 색 광산 전부 포함',
       sorted.join() === owned.join(), sorted.length + '/' + owned.length);
  });

  /* 명인대장장이 */
  ok('명인대장장이 15종', G.MASTER_SMITH_CRAFTS.length === 15, G.MASTER_SMITH_CRAFTS.length);
  ok('명인대장장이 제작비 전부 1,000전',
     G.MASTER_SMITH_CRAFTS.every(function (c2) { return c2.cost === 1000; }));
  ok('명인대장장이 확률 0<p<=1',
     G.MASTER_SMITH_CRAFTS.every(function (c2) { return c2.p > 0 && c2.p <= 1; }));

  /* NPC / 영단 */
  ok('좌표가 적힌 NPC는 x/y/z 전부 숫자',
     G.CRAFT_NPCS.filter(G.hasCoords)
       .every(function (n) { return typeof n.y === 'number'; }));
  var NO_COORD_NPCS = ['대장장이', '대장장이 조수', '무림맹주', '서고관리인'];
  ok('좌표 없는 NPC는 대장장이·조수·무림맹주·서고관리인뿐',
     G.CRAFT_NPCS.filter(function (n) { return !G.hasCoords(n); })
       .every(function (n) { return NO_COORD_NPCS.indexOf(n.name) >= 0; }),
     G.CRAFT_NPCS.filter(function (n) { return !G.hasCoords(n); })
       .map(function (n) { return n.name; }).join(','));

  /* 대장장이 조수 */
  var ASST = G.CRAFT_NPCS.filter(function (n) { return n.name === '대장장이 조수'; })[0];
  ok('대장장이 조수 NPC 존재', !!ASST);
  ok('장비강화 4종', ASST && ASST.enhance.length === 4, ASST && ASST.enhance.join('/'));
  ok('장비강화 항목 = 재련/잠재능력/추가능력/주문서강화',
     ASST && ASST.enhance.join() === ['재련', '잠재능력', '추가능력', '주문서강화'].join());
  function svc(nm) {
    return G.ASSISTANT_SERVICES.filter(function (s) { return s.name === nm; })[0];
  }
  ok('잠재능력 이전 5금화', svc('잠재능력 이전').cost === 5 && svc('잠재능력 이전').unit === '금화');
  ok('추가능력 이전 500,000전', svc('추가능력 이전').cost === 500000 && svc('추가능력 이전').unit === '전');
  ok('귀속해제 2금화', svc('귀속해제').cost === 2 && svc('귀속해제').unit === '금화');
  ok('조수 서비스 비용 전부 숫자·단위 존재',
     G.ASSISTANT_SERVICES.every(function (s) { return typeof s.cost === 'number' && !!s.unit; }));
  ok('조수 제작 항목 재료·확률 존재',
     G.ASSISTANT_CRAFTS.every(function (c) {
       return !!c.mats && c.p > 0 && c.p <= 1 && typeof c.cost === 'number';
     }));
  ok('영단 19종', G.DAN.length === 19, G.DAN.length);
  var danNames = {}, danDup = false;
  G.DAN.forEach(function (d) { if (danNames[d.name]) danDup = true; danNames[d.name] = 1; });
  ok('영단 이름 중복 없음', !danDup);
  ok('영단 전부 획득처 있음', G.DAN.every(function (d) { return !!d.source; }));

  /* 한월RPG 업데이트 내역 (디스코드 공지 → game-updates.js) */
  var U = null;
  try { U = require('./game-updates.js'); } catch (e) { U = null; }
  ok('game-updates.js 로드', !!U);
  if (U) {
    ok('업데이트 1건 이상', U.count() > 0, U.count());
    ok('전부 제목 있음', U.UPDATES.every(function (u) { return !!u.title; }));
    ok('전부 본문 있음', U.UPDATES.every(function (u) { return u.body.length > 0; }),
       U.UPDATES.filter(function (u) { return !u.body.length; }).map(function (u) { return u.title; }).join('|'));
    ok('날짜 형식 YYYY-MM-DD',
       U.UPDATES.every(function (u) { return u.date === null || /^20\d\d-\d\d-\d\d$/.test(u.date); }),
       U.UPDATES.filter(function (u) { return u.date && !/^20\d\d-\d\d-\d\d$/.test(u.date); })
         .map(function (u) { return u.date; }).join(','));
    var dated = U.UPDATES.filter(function (u) { return u.date; });
    ok('최신순 정렬', dated.every(function (u, i) {
      return i === 0 || dated[i - 1].date >= u.date;
    }), dated.slice(0, 3).map(function (u) { return u.date; }).join(' > '));
    ok('kind는 업데이트/추가/예정/안내 중 하나',
       U.UPDATES.every(function (u) {
         return ['업데이트', '추가', '예정', '안내'].indexOf(u.kind) >= 0;
       }),
       U.UPDATES.map(function (u) { return u.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).join(','));
    ok('검색 동작', U.search('완갑').length > 0 && U.search('완갑').every(function (u) {
      return (u.title + u.body.join('')).indexOf('완갑') >= 0;
    }));
    ok('빈 검색어는 전체 반환', U.search('').length === U.count());
    ok('태그 집계', U.tagCounts().length > 0 &&
       U.tagCounts().every(function (t) { return t.count > 0; }));
    ok('대장장이 조수 완갑 공지 포함',
       U.search('대장장이 조수').length > 0, U.search('대장장이 조수').length);
    ok('신화 부적 공지 포함(부적 데이터와 대조)',
       U.search('신화 등급 부적').length > 0);
  }

  /* 지도 위치 (사냥터 · 약초 · 단서 · 항아리 · 상자) */
  ok('사냥터 20곳', G.HUNTING_GROUNDS.length === 20, G.HUNTING_GROUNDS.length);
  ok('사냥터 전부 좌표·레벨·몬스터 있음',
     G.HUNTING_GROUNDS.every(function (h) {
       return G.hasCoords(h) && !!h.lv && !!h.monsters;
     }));
  ok('약초 19종', G.HERBS.length === 19, G.HERBS.length);
  var herbSpots = G.HERBS.reduce(function (s, h) { return s + h.spots.length; }, 0);
  ok('약초 자생지 38곳', herbSpots === 38, herbSpots);
  ok('약초마다 색 지정(자생지 색칠용)',
     G.HERBS.every(function (h) { return /^#[0-9a-f]{6}$/i.test(h.color); }));
  var herbColors = {};
  G.HERBS.forEach(function (h) { herbColors[h.color] = 1; });
  ok('약초 색 19종 전부 다름', Object.keys(herbColors).length === G.HERBS.length,
     Object.keys(herbColors).length);
  ok('약초 자생지 좌표 전부 숫자',
     G.HERBS.every(function (h) { return h.spots.every(G.hasCoords); }));

  ok('적환단 10개', G.RED_ITEMS.length === 10, G.RED_ITEMS.length);
  ok('해태단 9개', G.HAE_ITEMS.length === 9, G.HAE_ITEMS.length);
  ok('기린단 9개', G.QILIN_ITEMS.length === 9, G.QILIN_ITEMS.length);
  ok('단서 좌표 전부 숫자',
     [].concat(G.RED_ITEMS, G.HAE_ITEMS, G.QILIN_ITEMS).every(function (q) {
       return G.hasCoords(q) && (q.records || []).every(G.hasCoords);
     }));
  ok('항아리 12곳', G.POT_ITEMS.length === 12, G.POT_ITEMS.length);
  ok('항아리 전부 아이템·도구 표기',
     G.POT_ITEMS.every(function (p) { return !!p.item && !!p.tool; }));
  ok('의문의 상자 41곳', G.MYSTERY_BOXES.length === 41, G.MYSTERY_BOXES.length);
  ok('의문의 상자 좌표 전부 숫자', G.MYSTERY_BOXES.every(G.hasCoords));

  /* 약초 조합 계산기 */
  ok('약초 등급 4그룹', Object.keys(G.HERB_GROUPS).length === 4);
  var gradedHerbs = [];
  Object.keys(G.HERB_GROUPS).forEach(function (g) {
    G.HERB_GROUPS[g].forEach(function (n) { gradedHerbs.push(n); });
  });
  ok('조합 약초 19종', gradedHerbs.length === 19, gradedHerbs.length);
  ok('조합 약초 이름이 약초 자생지 목록과 일치',
     gradedHerbs.every(function (n) {
       return G.HERBS.some(function (h) { return h.name === n; });
     }),
     gradedHerbs.filter(function (n) {
       return !G.HERBS.some(function (h) { return h.name === n; });
     }).join(','));
  ok('점수표 A1 B2 C3 S4',
     G.HERB_SCORE.A === 1 && G.HERB_SCORE.B === 2 && G.HERB_SCORE.C === 3 && G.HERB_SCORE.S === 4);
  ok('조합 결과 18줄(3~20점)', G.HERB_RESULTS.length === 18, G.HERB_RESULTS.length);
  ok('결과 점수는 3~20 연속',
     G.HERB_RESULTS.every(function (r, i) { return r.score === i + 3; }));
  ok('herbGrade 조회', G.herbGrade('홍련업화') === 'S' && G.herbGrade('녹태') === 'A'
     && G.herbGrade('없는약초') === null);

  var c3 = G.herbCombo(['녹태', '민들레', '생강']);          // 1+1+1 = 3
  ok('A×3 = 3점 황토환', c3.total === 3 && c3.result.name === '황토환', JSON.stringify(c3.result));
  var c20 = G.herbCombo(['금향과', '빙백설화', '월계엽', '철목영지', '홍련업화']); // 4×5 = 20
  ok('S×5 = 20점 활생환', c20.total === 20 && c20.result.name === '활생환', c20.total);
  ok('2개면 결과 없음 + 안내', G.herbCombo(['녹태', '민들레']).result === null
     && /3개 이상/.test(G.herbCombo(['녹태', '민들레']).error));
  ok('6개면 최대 초과 안내',
     /최대 5개/.test(G.herbCombo(['녹태', '민들레', '생강', '영군버섯', '옥취엽', '백향초']).error));
  ok('같은 환이 나오는 점수 목록',
     G.herbCombo(['녹태', '민들레', '생강']).need.join() === '3,10',
     G.herbCombo(['녹태', '민들레', '생강']).need.join());
  ok('모르는 약초는 무시', G.herbCombo(['녹태', '민들레', '생강', '없는약초']).total === 3);

  /* 출처 */
  ok('출처 6곳', G.SOURCES.length === 6, G.SOURCES.length);
  ok('출처마다 이름·항목·확인일',
     G.SOURCES.every(function (s) { return !!s.name && !!s.items && !!s.fetched; }));
  ok('외부 출처는 https 링크',
     G.SOURCES.filter(function (s) { return s.url; })
       .every(function (s) { return s.url.indexOf('https://') === 0; }));
  ok('웹맵·확률시트·부적표·약초계산기·디스코드 링크 포함',
     ['webmap', 'prob', 'talisman', 'herbcalc', 'discord'].every(function (k) {
       return G.SOURCES.some(function (s) { return s.key === k && s.url; });
     }));

  /* 성장 가이드 영상 */
  ok('가이드 영상 4편', G.GUIDE_VIDEOS.length === 4, G.GUIDE_VIDEOS.length);
  ok('영상 전부 제목·설명·유튜브 주소',
     G.GUIDE_VIDEOS.every(function (v) {
       return !!v.title && !!v.tip && /^https:\/\/youtu\.be\//.test(v.url);
     }),
     G.GUIDE_VIDEOS.map(function (v) { return v.url; }).join(' '));
  var vidDup = {}, vidDupFound = [];
  G.GUIDE_VIDEOS.forEach(function (v) {
    if (vidDup[v.url]) vidDupFound.push(v.url);
    vidDup[v.url] = 1;
  });
  ok('영상 주소 중복 없음', vidDupFound.length === 0, vidDupFound.join(','));
  ok('레벨 구간 가이드 포함',
     G.GUIDE_VIDEOS.some(function (v) { return /11~60/.test(v.title); }) &&
     G.GUIDE_VIDEOS.some(function (v) { return /60~120/.test(v.title); }));

  /* 관련 링크 */
  ok('관련 링크 목록 존재', Array.isArray(G.EXTERNAL_LINKS) && G.EXTERNAL_LINKS.length > 0);
  ok('관련 링크 전부 이름·https 주소',
     G.EXTERNAL_LINKS.every(function (l) { return !!l.name && /^https:\/\//.test(l.url); }));
  ok('관련 링크 13개', G.EXTERNAL_LINKS.length === 13, G.EXTERNAL_LINKS.length);
  ok('디스코드 채널 링크는 discord 표시', G.EXTERNAL_LINKS.filter(function (l) {
    return /discord\.com\/channels/.test(l.url);
  }).every(function (l) { return l.discord === true; }));
  ok('분류 순서 = 시작하기 → 커뮤니티 → 지도·자료 → 계산기·도구 → 랭킹',
     G.linksByCategory().map(function (g) { return g.cat; }).join('>')
       === ['시작하기', '커뮤니티', '지도 · 자료', '계산기 · 도구', '랭킹'].join('>'),
     G.linksByCategory().map(function (g) { return g.cat; }).join('>'));
  ok('링크 전부 분류·설명 있음',
     G.EXTERNAL_LINKS.every(function (l) { return !!l.cat && !!l.desc; }));
  ok('분류 3가지 (커뮤니티 · 지도 자료 · 계산기 도구)',
     G.linksByCategory().length === 5,
     G.linksByCategory().map(function (g) { return g.cat + ':' + g.links.length; }).join(' '));
  ok('분류 묶음 합계 = 전체', G.linksByCategory().reduce(function (n, g) {
    return n + g.links.length;
  }, 0) === G.EXTERNAL_LINKS.length);
  ok('출처 표시가 SOURCES와 맞음',
     G.EXTERNAL_LINKS.filter(function (l) { return l.source; }).every(function (l) {
       return G.SOURCES.some(function (s2) { return s2.url === l.url; });
     }),
     G.EXTERNAL_LINKS.filter(function (l) {
       return l.source && !G.SOURCES.some(function (s2) { return s2.url === l.url; });
     }).map(function (l) { return l.name; }).join(','));
  ok('링크 주소 중복 없음', (function () {
    var seen = {}, dup = 0;
    G.EXTERNAL_LINKS.forEach(function (l) { if (seen[l.url]) dup++; seen[l.url] = 1; });
    return dup === 0;
  })());
  ok('_Ya_Su 도깨비 스텟 계산기 포함',
     G.EXTERNAL_LINKS.some(function (l) {
       return l.url.indexOf('yasu2947.github.io') > 0 && /도깨비/.test(l.name);
     }));
  ok('ProDays 매크로 계산기 포함',
     G.EXTERNAL_LINKS.some(function (l) {
       return l.url.indexOf('Pro-Days/SkillMacro') > 0 && /매크로/.test(l.name);
     }));

  /* 공략 */
  var guideCount = Object.keys(G.GUIDES).reduce(function (s, k) { return s + G.GUIDES[k].length; }, 0);
  ok('공략 28건(해태9 + 기린9 + 적환10)', guideCount === 28, guideCount);
  ok('공략 이미지 경로 2종(로컬/원격)', (function () {
    var g = G.guideOf('기린단', '망월록');
    return g && g.imgs[0].local.indexOf('guides/') === 0
        && g.imgs[0].remote.indexOf(G.GUIDE_BASE) === 0;
  })());
  ok('없는 공략은 null', G.guideOf('기린단', '없는퀘스트') === null);

  /* NPC 제작 목표 역산 */
  ok('NPC 제작 70종(명인 15+목걸이 3 · 조수 5 · 조선장 17 · 무림맹주 3 · 대장장이 9 · 서고관리인 18)',
     G.npcCraftNames().length === 70, G.npcCraftNames().length);
  ok('주문서상자 연쇄 (일류 ← 이류 ← 삼류)', (function () {
    var pl = G.npcPlan({ '일류주문서상자': 1 });
    return pl.steps.map(function (x) { return x.name; }).join('>') === '일류주문서상자>이류주문서상자'
      && pl.external['삼류주문서상자'] === 100 && pl.external['무공정수'] === 60;
  })(), JSON.stringify(G.npcPlan({ '일류주문서상자': 1 }).external));
  ok('레시피 재료 파싱',
     JSON.stringify(G.parseMats('송진덩어리1 + 적동괴1 + 갈옥1 + 돌덩어리2'))
       === JSON.stringify({ '송진덩어리': 1, '적동괴': 1, '갈옥': 1, '돌덩어리': 2 }));
  ok('수량 없는 재료는 1개로', G.parseMats('무공정수').무공정수 === 1);

  var plan1 = G.npcPlan({ '송진칠료': 1 });
  ok('100% 레시피는 시도 1회', plan1.steps[0].attempts === 1, plan1.steps[0].attempts);
  eq('100% 레시피 비용 1,000전', plan1.cost, 1000, 0);
  ok('재료가 external로 빠짐',
     plan1.external['송진덩어리'] === 1 && plan1.external['돌덩어리'] === 2,
     JSON.stringify(plan1.external));

  var plan2 = G.npcPlan({ '한철단조석': 1 });          // 40% · 접합제2(60%) · 송진칠료1
  ok('연쇄 레시피가 전부 단계로', plan2.steps.length === 3, plan2.steps.map(function (s) { return s.name; }).join('>'));
  ok('소비자가 먼저 (한철단조석 → 접합제 → 송진칠료)',
     plan2.steps[0].name === '한철단조석' && plan2.steps[2].name === '송진칠료',
     plan2.steps.map(function (s) { return s.name; }).join('>'));
  eq('한철단조석 1개 = 시도 3회(올림)', plan2.steps[0].attempts, 3, 0);
  eq('접합제 필요 6개 → 시도 10회', plan2.steps[1].attempts, 10, 0);
  eq('송진칠료 10개 → 시도 10회', plan2.steps[2].attempts, 10, 0);
  eq('총 제작비 = 23회 × 1,000전', plan2.cost, 23000, 0);
  ok('external에 화로 재료(강철)와 항아리 재료(향목가루) 둘 다',
     plan2.external['강철'] === 20 && plan2.external['향목가루'] === 10,
     JSON.stringify(plan2.external));

  var planNoFail = G.npcPlan({ '한철단조석': 1 }, { ignoreFail: true });
  ok('실패 없음 가정이면 시도 = 필요 개수',
     planNoFail.steps.every(function (s) { return s.attempts === s.made; }),
     planNoFail.steps.map(function (s) { return s.name + ':' + s.attempts; }).join(','));
  ok('실패 없음이면 비용도 줄어듦', planNoFail.cost < plan2.cost,
     planNoFail.cost + ' vs ' + plan2.cost);

  var planFrac = G.npcPlan({ '한철단조석': 1 }, { integer: false });
  ok('올림 끄면 소수 시도', planFrac.steps[0].attempts === 2.5, planFrac.steps[0].attempts);

  var planMix = G.npcPlan({ '5성곡괭이': 1, '송진칠료': 2 });
  ok('NPC 제작이 아닌 목표는 그대로 통과',
     planMix.passthrough['5성곡괭이'] === 1 && !planMix.steps.some(function (s) { return s.name === '5성곡괭이'; }));
  ok('조수 제작 연쇄 (취금완갑 ← 황동완갑)',
     G.npcPlan({ '취금완갑': 1 }).steps.map(function (s) { return s.name; }).join('>') === '취금완갑>황동완갑');

  /* 조선장 — 배장비 */
  ok('배장비 제작 16종 + 주작단', G.SHIPWRIGHT_CRAFTS.length === 17, G.SHIPWRIGHT_CRAFTS.length);
  ok('배장비 4부위 × 2~5성', ['외륜', '갑판', '대포', '그물'].every(function (part) {
    return [2, 3, 4, 5].every(function (s) { return !!G.NPC_RECIPES[s + '성' + part]; });
  }));
  ok('1성 배장비는 상점 5,000전',
     G.SHIP_SHOP.length === 4 && G.SHIP_SHOP.every(function (s) { return s.cost === 5000; }));
  ok('상점 구매가 조회', G.shopPrice('1성외륜') === 5000 && G.shopPrice('없는아이템') === 0);
  ok('승급 재료는 바로 아래 성급', ['외륜', '갑판', '대포', '그물'].every(function (part) {
    return [2, 3, 4, 5].every(function (s) {
      return G.NPC_RECIPES[s + '성' + part].mats[(s - 1) + '성' + part] === 1;
    });
  }));
  ok('배장비 단계별 확률 70/60/50/40%', ['외륜', '갑판', '대포', '그물'].every(function (part) {
    return G.NPC_RECIPES['2성' + part].p === 0.70 && G.NPC_RECIPES['3성' + part].p === 0.60
        && G.NPC_RECIPES['4성' + part].p === 0.50 && G.NPC_RECIPES['5성' + part].p === 0.40;
  }));
  ok('배장비 단계별 무공정수 10/20/30/40', ['외륜', '갑판', '대포', '그물'].every(function (part) {
    return [10, 20, 30, 40].every(function (n, i) {
      return G.NPC_RECIPES[(i + 2) + '성' + part].mats['무공정수'] === n;
    });
  }));
  ok('배장비 단계별 비용 1/3/5/10만전', ['외륜', '갑판', '대포', '그물'].every(function (part) {
    return [10000, 30000, 50000, 100000].every(function (c, i) {
      return G.NPC_RECIPES[(i + 2) + '성' + part].cost === c;
    });
  }));
  ok('5성 배장비는 오금한철 1개', ['외륜', '갑판', '대포', '그물'].every(function (part) {
    return G.NPC_RECIPES['5성' + part].mats['오금한철'] === 1;
  }));

  var ship5 = G.npcPlan({ '5성외륜': 1 });
  eq('5성외륜 1개 = 시도 3회(40%, 올림)', ship5.steps[0].attempts, 3, 0);
  ok('배장비 역산이 1성(상점)에서 멈춤', ship5.external['1성외륜'] > 0 && !ship5.steps.some(function (s) {
    return s.name === '1성외륜';
  }), JSON.stringify(ship5.external['1성외륜']));
  ok('배장비 역산에 명인대장장이 재료도 포함',
     ship5.steps.some(function (s) { return s.name === '기문부적'; })
     && ship5.steps.some(function (s) { return s.name === '송진칠료'; }),
     ship5.steps.map(function (s) { return s.name; }).join('>'));

  var juak = G.npcPlan({ '주작단': 1 }).steps[0];
  ok('주작단 95% · 고래기름1 · 실패 시 현무단',
     juak.p === 0.95 && juak.mats[0].name === '고래기름' && juak.fail === '현무단');

  /* 서고관리인 */
  ok('서고관리인 제작 18종 전부 100%',
     G.LIBRARIAN_CRAFTS.length === 18
     && G.LIBRARIAN_CRAFTS.every(function (c) { return c.p === 1; }), G.LIBRARIAN_CRAFTS.length);
  ok('비급 제작비 0~300만전 (빙설검법·압축무공정수 0전, 사혼검결 300만전)',
     G.NPC_RECIPES['빙설검법'].cost === 0 && G.NPC_RECIPES['압축무공정수'].cost === 0
     && G.NPC_RECIPES['사혼검결'].cost === 3000000 && G.NPC_RECIPES['폭마공'].cost === 2000000
     && G.NPC_RECIPES['마혼검결'].cost === 1000000);
  ok('파천검법 = 토끼내단20 (도끼내단 오타 정정)',
     G.NPC_RECIPES['파천검법'].mats['토끼내단'] === 20);
  ok('천살검법 = 섬멸검법 + 혈사검법 (섬멸 오타 정정 · 혈사는 드랍 비급)', (function () {
    var m = G.NPC_RECIPES['천살검법'].mats;
    return m['섬멸검법'] === 1 && m['혈사검법'] === 1 && !m['설멸검법'];
  })());
  ok('마혼검결 재료는 무림맹비급 (무랭맹 오타 정정)',
     G.NPC_RECIPES['마혼검결'].mats['무림맹비급'] === 1);
  var sahon = G.npcPlan({ '사혼검결': 1 });
  ok('사혼검결이 NPC 4곳을 거쳐 역산',
     ['서고관리인', '대장장이', '명인대장장이', '무림맹주'].every(function (npc) {
       return sahon.steps.some(function (s) { return s.npc === npc; });
     }),
     sahon.steps.map(function (s) { return s.npc; }).join());
  ok('드랍 비급(빙천검법)은 external로',
     sahon.external['빙천검법'] === 1 && !sahon.steps.some(function (s) { return s.name === '빙천검법'; }));
  ok('상점 비급 2종 각 5,000전',
     G.LIBRARIAN_SHOP.length === 2
     && G.LIBRARIAN_SHOP.every(function (s) { return s.cost === 5000; })
     && G.shopPrice('단섬검법') === 5000);
  ok('섬멸검법 = 단섬검법1 + 강철1 + 자금1 + 무공정수20', (function () {
    var r = G.NPC_RECIPES['섬멸검법'];
    return r.mats['단섬검법'] === 1 && r.mats['강철'] === 1
        && r.mats['자금'] === 1 && r.mats['무공정수'] === 20;
  })());
  var lib = G.npcPlan({ '홍매지폭': 1 });
  ok('홍매지폭 ← 부화검결 연쇄',
     lib.steps.map(function (s) { return s.name; }).join('>').indexOf('홍매지폭>부화검결') === 0,
     lib.steps.map(function (s) { return s.name; }).join('>'));
  ok('부화검결 재료가 명인대장장이 옥장식편까지 이어짐',
     lib.steps.some(function (s) { return s.name === '옥장식편'; }));
  ok('상점 비급은 external로 빠짐',
     G.npcPlan({ '섬멸검법': 1 }).external['단섬검법'] === 1);

  /* 무림맹주 */
  ok('무림맹주 제작 3종 전부 100%',
     G.LEADER_CRAFTS.length === 3 && G.LEADER_CRAFTS.every(function (c) { return c.p === 1; }));
  ok('토벌패 = 토벌석1 + 무공정수20 + 정철광3 · 10,000전', (function () {
    var r = G.NPC_RECIPES['토벌패'];
    return r.cost === 10000 && r.mats['토벌석'] === 1
        && r.mats['무공정수'] === 20 && r.mats['정철광'] === 3;
  })());
  ok('시공단·무림맹비급은 흉폭한영기 10/40 · 제작비 0',
     G.NPC_RECIPES['시공단'].mats['흉폭한영기'] === 10 && G.NPC_RECIPES['시공단'].cost === 0
     && G.NPC_RECIPES['무림맹비급'].mats['흉폭한영기'] === 40 && G.NPC_RECIPES['무림맹비급'].cost === 0);

  /* 대장장이 일반 제작 · 목걸이 계열 */
  ok('대장장이 제작 9종', G.SMITH_CRAFTS.length === 9, G.SMITH_CRAFTS.length);
  ok('탐령구 = 철1 + 적동괴2 · 0전 · 100%', (function () {
    var r = G.NPC_RECIPES['탐령구'];
    return r.mats['철'] === 1 && r.mats['적동괴'] === 2 && r.cost === 0 && r.p === 1;
  })());
  ok('청환단·열화신공 = 대장장이의불100 · 5만전',
     ['청환단', '열화신공'].every(function (n) {
       return G.NPC_RECIPES[n].mats['대장장이의불'] === 100 && G.NPC_RECIPES[n].cost === 50000;
     }));
  ok('강화주머니(소) = 대장장이의불2 · 1,000전',
     G.NPC_RECIPES['강화주머니(소)'].mats['대장장이의불'] === 2
     && G.NPC_RECIPES['강화주머니(소)'].cost === 1000);
  ok('목걸이 3단계 전부 30% · 실패 시 조각',
     ['오색진연옥', '오색금강진연옥', '찬란한오색금강진연옥'].every(function (n) {
       return G.NPC_RECIPES[n].p === 0.30 && G.NPC_RECIPES[n].fail === n + '조각';
     }));
  ok('찬란한 단계 제작비 50만전', G.NPC_RECIPES['찬란한오색금강진연옥'].cost === 500000);

  var neck = G.npcPlan({ '찬란한오색금강진연옥': 1 });
  ok('목걸이 연쇄가 오색수정·진연옥까지 역산',
     ['오색금강진연옥', '오색진연옥', '오색수정', '진연옥'].every(function (n) {
       return neck.steps.some(function (s) { return s.name === n; });
     }),
     neck.steps.map(function (s) { return s.name; }).join('>'));
  ok('목걸이 재료가 명인대장장이 재료까지 이어짐',
     neck.steps.some(function (s) { return s.name === '금강각인편'; }));

  ok('조각 합성 3종은 이름이 겹치지 않게 등록',
     G.MASTER_SMITH_NECKLACE.every(function (c) {
       return G.NPC_RECIPES[c.name] && G.NPC_RECIPES[c.name].makes === c.makes
           && G.NPC_RECIPES[c.name].name !== c.makes;
     }));
  ok('조각 합성은 100% · 조각 3개 소모',
     G.MASTER_SMITH_NECKLACE.every(function (c) {
       var r = G.NPC_RECIPES[c.name];
       return r.p === 1 && r.mats[c.makes + '조각'] === 3 && r.cost === 1000000;
     }));
  ok('대장장이 제작이 조각 합성에 덮이지 않음',
     G.NPC_RECIPES['오색진연옥'].npc === '대장장이' && G.NPC_RECIPES['오색진연옥'].p === 0.30);

  /* 부가 옵션이 NPC 제작에도 먹히는지 */
  var optOff = G.npcPlan({ '5성외륜': 1 });
  var optOn = G.npcPlan({ '5성외륜': 1 }, { successUp: true, costDown: true });
  ok('성공률증가 → 40% → 44%', Math.abs(optOn.steps[0].p - 0.44) < 1e-9, optOn.steps[0].p);
  ok('제작비용감소 → 총 제작비 감소', optOn.cost < optOff.cost, optOn.cost + ' vs ' + optOff.cost);
  ok('성공률증가는 100%를 넘지 않음',
     G.npcPlan({ '송진칠료': 1 }, { successUp: true }).steps[0].p === 1);

  // 레시피 재료가 실제로 존재하는 이름인지 (오타 방지)
  var known = {};
  Object.keys(C.FURNACE).forEach(function (k) { known[k] = 1; });
  C.BASE.forEach(function (k) { known[k] = 1; });
  C.PICK_NAMES.forEach(function (k) { known[k] = 1; });
  G.npcCraftNames().forEach(function (k) { known[k] = 1; });
  G.POT_ITEMS.forEach(function (p) { known[p.item] = 1; });
  Object.keys(G.SHOP_ITEMS).forEach(function (k) { known[k] = 1; });   // 1성 배장비 등 상점 구매
  // 화로·광산·NPC제작·상점 어디에도 없는 재료 = 사냥/퀘스트로만 구하는 것들.
  // 새 오타가 끼면 이 목록 밖의 이름이 튀어나온다.
  var OUTSIDE_MATS = ['삼류주문서상자', '무공정수', '정포완갑', '흉폭한영기', '빙백설화',
                      '고래기름', '토벌석', '대장장이의불', '우물영기', '토끼내단',
                      '홍련업화', '철목영지', '월계엽', '금향과',
                      '청수정', '황수정', '적수정', '녹수정',
                      '오색진연옥조각', '오색금강진연옥조각', '찬란한오색금강진연옥조각',
                      '정적주', '송진덩어리', '녹슨철패', '파력검법', '혈사검법', '빙천검법'];
  var unknownMats = {};
  Object.keys(G.NPC_RECIPES).forEach(function (n) {
    Object.keys(G.NPC_RECIPES[n].mats).forEach(function (m) {
      if (!known[m]) (unknownMats[m] = unknownMats[m] || []).push(n);
    });
  });
  var stray = Object.keys(unknownMats).filter(function (m) { return OUTSIDE_MATS.indexOf(m) < 0; });
  ok('레시피 재료 이름이 전부 알려진 것 (사냥·퀘스트 재료만 예외)',
     stray.length === 0,
     stray.map(function (m) { return m + '(' + unknownMats[m].join('/') + ')'; }).join(', '));

  /* 비급 · 동상 · 비석 */
  ok('비급 27종', G.SKILLS.length === 27, G.SKILLS.length);
  ok('비급 전부 이름·설명 있음',
     G.SKILLS.every(function (k) { return !!k.name && !!k.info; }));
  var skillDup = {}, skillDupFound = [];
  G.SKILLS.forEach(function (k) {
    if (skillDup[k.name]) skillDupFound.push(k.name);
    skillDup[k.name] = 1;
  });
  ok('비급 이름 중복 없음', skillDupFound.length === 0, skillDupFound.join(','));
  ok('비급 설명에 <br> 태그 안 남음',
     G.SKILLS.every(function (k) { return k.info.indexOf('<') < 0; }));
  ok('동상 3곳', G.STATUES.length === 3, G.STATUES.length);
  ok('비석 17곳(중복 합침)', G.MOUNTAINS.length === 17, G.MOUNTAINS.length);
  ok('동상·비석 좌표 전부 숫자',
     [].concat(G.STATUES, G.MOUNTAINS).every(G.hasCoords));
  var mtDup = [];
  G.MOUNTAINS.forEach(function (a, i) {
    G.MOUNTAINS.slice(i + 1).forEach(function (b) {
      if (a.name === b.name && Math.abs(a.x - b.x) < 10 && Math.abs(a.z - b.z) < 10) mtDup.push(a.name);
    });
  });
  ok('겹치는 비석 없음', mtDup.length === 0, mtDup.join(','));

  var ex = G.extraWaypoints();
  var exc = G.extraCounts();
  eq('지도 위치 웨이포인트 합계', ex.length,
     Object.keys(exc).reduce(function (s, k) { return s + exc[k]; }, 0), 0);
  ok('지도 위치 종류 9가지', Object.keys(exc).length === 9, Object.keys(exc).join(','));
  ok('지도 위치 전부 세트·색 있음',
     ex.every(function (w) { return !!w.set && /^#[0-9a-f]{6}$/i.test(w.hex); }));
  ok('지도 위치 좌표 전부 숫자',
     ex.every(function (w) { return [w.x, w.y, w.z].every(function (v) { return typeof v === 'number'; }); }));
  ok('약초 웨이포인트는 자생지 색을 씀',
     ex.filter(function (w) { return w.kind === '약초'; })
       .every(function (w) { return w.hex === w.ref.color; }));
  ok('약초 세트는 약초 이름별로 분리',
     ex.filter(function (w) { return w.kind === '약초'; })
       .every(function (w) { return w.set === '약초 ' + w.ref.name; }));
  ok('사냥터 웨이포인트 20개',
     ex.filter(function (w) { return w.kind === '사냥터'; }).length === 20);
  ok('동상·비석도 웨이포인트로',
     ex.filter(function (w) { return w.kind === '동상'; }).length === G.STATUES.length &&
     ex.filter(function (w) { return w.kind === '비석'; }).length === G.MOUNTAINS.length);
  ok('동상·비석 세트 이름',
     ex.filter(function (w) { return w.kind === '동상'; }).every(function (w) { return w.set === '동상'; }) &&
     ex.filter(function (w) { return w.kind === '비석'; }).every(function (w) { return w.set === '비석'; }));
  ok('webmap 웨이포인트에 광산·NPC·스폰·지도위치 전부 포함',
     G.webmapWaypoints().length === G.MINES.length + COORD_NPCS.length + 1 + ex.length);

  /* 장비 제작 */
  ok('장비 10종(5레벨대 × 방어구/무기)', G.SMITH_GEAR.length === 10, G.SMITH_GEAR.length);
  var badMat = [];
  G.SMITH_GEAR.forEach(function (g) {
    Object.keys(g.mats).forEach(function (m) {
      if (!C.isFurnace(m) && C.BASE.indexOf(m) < 0) badMat.push(g.tier + g.kind + '→' + m);
    });
  });
  ok('장비 재료가 전부 계산기에 존재(화로 또는 광산)', badMat.length === 0, badMat.join(', '));
  ok('장비 등급별 아이템 5종씩',
     G.SMITH_GEAR.every(function (g) { return g.items.length === 5; }));
  ok('제작서 수량 1 이상',
     G.SMITH_GEAR.every(function (g) { return g.scroll >= 1; }));
  ok('방어구 부위 4종', G.ARMOR_PARTS.length === 4);

  /* 확률 */
  function sum(arr, key) { return arr.reduce(function (a, r) { return a + r[key || 'p']; }, 0); }
  eq('티어 확률 합계 100%', sum(G.GEAR_TIER_PROB), 100, 1e-9);
  eq('잠재능력 등장 확률 합계 ≈100%', sum(G.POTENTIAL.stats, 'appear'), 100, 0.01);
  eq('추가능력 등장 확률 합계 100%', sum(G.EXTRA_ABILITY.stats, 'appear'), 100, 1e-9);
  eq('최초 확인 줄 수 합계 ≈100%', sum(G.LINE_COUNT_PROB.first), 100, 0.01);
  eq('재확인 줄 수 합계 ≈100%', sum(G.LINE_COUNT_PROB.reroll), 100, 0.01);
  G.DROP_TABLES.forEach(function (t) {
    eq(t.title + ' 합계 ≈100%', sum(t.rows), 100, 0.02);
  });
  ok('우물혈석 단계 6개', G.WELL_STONE.rows.length === 6);

  /* 부적 */
  var total = 0, allNames = {};
  G.TALISMAN.forEach(function (t) {
    total += t.list.length;
    eq(t.grade + ' 종류당 확률 = 100/' + t.list.length, t.p, 100 / t.list.length, 1e-12);
    eq(t.grade + ' 확률 합계 100%', t.list.length * t.p, 100, 1e-9);
    var seen = {}, dup2 = false;
    t.list.forEach(function (n) {
      if (seen[n]) dup2 = true;
      seen[n] = 1;
      if (allNames[n]) dup2 = true;   // 등급을 넘나드는 중복도 잡는다
      allNames[n] = t.grade;
    });
    ok(t.grade + ' 부적 중복 없음', !dup2);
  });
  ok('부적 6등급', G.TALISMAN.length === 6, G.TALISMAN.length);
  ok('부적 전체 189종', total === 189, total);
  ok('부적패키지 = 고급 등급 확률과 동일',
     Math.abs(G.TALISMAN_PACKAGE.p - G.TALISMAN.filter(function (t) { return t.grade === '고급'; })[0].p) < 0.01);

  function grade(g) { return G.TALISMAN.filter(function (t) { return t.grade === g; })[0]; }

  // 고지값 대조: 영웅만 종류 수가 달라 불일치, 나머지는 일치
  ['일반', '고급', '희귀', '전설'].forEach(function (g) {
    ok(g + ' 고지값과 일치', grade(g).matchesOfficial === true,
       grade(g).p.toFixed(4) + ' vs ' + grade(g).official);
  });
  ok('영웅은 고지값과 불일치(38종 vs 시트 36종)', grade('영웅').matchesOfficial === false);
  eq('영웅 38종 → 2.6316%', grade('영웅').p, 100 / 38, 1e-12);

  /* 신화 */
  var myth = grade('신화');
  ok('신화 등급 존재', !!myth);
  ok('신화 13종', myth.list.length === 13, myth.list.length);
  ok('신화는 고지값 없음', myth.official === null && myth.calculated === true);
  ok('신화 고지 일치 여부는 판정 불가', myth.matchesOfficial === null);
  eq('신화 종류당 7.6923%', myth.p, 100 / 13, 1e-12);
  eq('신화 확률 합계 100%', myth.p * 13, 100, 1e-9);
  ok('신화 이름은 전부 "부"로 끝남', myth.list.every(function (n) { return /부$/.test(n); }));

  ok('신화 옵션 13종', G.TALISMAN_MYTHIC_OPTIONS.length === 13);
  ok('신화 옵션 이름이 목록과 일치',
     G.TALISMAN_MYTHIC_OPTIONS.map(function (m) { return m.name; }).sort().join() ===
     myth.list.slice().sort().join());
  ok('신화 옵션 min < max',
     G.TALISMAN_MYTHIC_OPTIONS.every(function (m) { return m.min < m.max; }));
  ok('신화 옵션 15단계', G.TALISMAN_MYTHIC_STEPS === 15);

  /* 부적표 ↔ 확률 시트 불일치 기록 */
  ok('불일치 기록 존재', G.TALISMAN_DIFF.length > 0);
  ok('신화 누락 기록됨',
     G.TALISMAN_DIFF.some(function (d) { return d.grade === '신화' && /누락/.test(d.kind); }));
  ok('영웅 종류 수 불일치 기록됨',
     G.TALISMAN_DIFF.some(function (d) { return d.grade === '영웅' && /종류 수/.test(d.kind); }));
  ok('불일치 항목 전부 설명 있음',
     G.TALISMAN_DIFF.every(function (d) { return d.grade && d.kind && d.detail; }));

  /* 부적 리롤 계산기 */
  // 고지된 5등급 전부 "종류별 확률 = 100 / 종류 수" 균등 분포인지
  G.TALISMAN.forEach(function (t) {
    eq(t.grade + ' 종류별 확률 = 100/' + t.list.length,
       G.talismanOdds(t.list.length, 1, 1).each, t.p, 0.0001);
  });

  var o = G.talismanOdds(18, 1, 1);
  eq('전설 1회 확률 5.5556%', o.each, 5.5556, 0.0001);
  eq('1회 시 atLeast = each', o.atLeast, o.each, 1e-9);
  eq('평균 소요 = 종류 수', o.expected, 18, 1e-9);

  var o10 = G.talismanOdds(18, 1, 10);
  eq('전설 10회 중 1번 이상 ≈ 43.7%', o10.atLeast, (1 - Math.pow(17 / 18, 10)) * 100, 1e-9);
  ok('리롤 늘면 확률 증가', o10.atLeast > o.atLeast);
  eq('전설 90% 도달 41회', o.need90, 41, 0);
  eq('전설 99% 도달 81회', o.need99, 81, 0);

  var oMulti = G.talismanOdds(57, 3, 1);
  eq('희귀 3종 노림 = 3/57', oMulti.each, 3 / 57 * 100, 1e-9);
  eq('희귀 3종 평균 소요 19회', oMulti.expected, 19, 1e-9);

  var oAll = G.talismanOdds(5, 5, 1);
  eq('전부 노리면 100%', oAll.each, 100, 1e-9);
  ok('100%면 90% 도달 1회', oAll.need90 === 1 && oAll.need99 === 1);

  ok('종류 수 0 → null', G.talismanOdds(0, 1, 1) === null);
  ok('원하는 종류 > 전체 → null', G.talismanOdds(5, 6, 1) === null);
  ok('리롤 0 → null', G.talismanOdds(5, 1, 0) === null);
  ok('기본값(want=1, rolls=1) 적용', G.talismanOdds(4).each === 25);
  // 계산기가 신화 13종에 대해 목록 기반 확률과 같은 값을 내는지
  eq('계산기 신화 13종 = 7.6923%', G.talismanOdds(13, 1, 1).each, 100 / 13, 1e-12);
  eq('계산기 값 = 데이터 p', G.talismanOdds(myth.list.length, 1, 1).each, myth.p, 1e-12);
})();

/* ---------- 결과 ---------- */
console.log('\n=== 테스트 결과 ===');
console.log('통과: ' + pass + '  실패: ' + fail);
if (fail) { console.log('\n실패 항목:'); failures.forEach(function (f) { console.log('  ✗ ' + f); }); process.exitCode = 1; }
else console.log('전부 통과 ✓');

/* ---------- 참고 출력 ---------- */
var demo = C.compute({ targets: { '5성곡괭이': 1 } });
console.log('\n--- 참고: 5성곡괭이 1개 (기본 옵션, 실패 반영, 정수 올림) ---');
console.log('총 비용: ' + C.fmtNum(demo.totalCost) + '전');
console.log('총 화로 시간(직렬): ' + C.fmtTime(demo.totalSec));
console.log('화로 제작 건수: ' + demo.furnace.reduce(function (a, b) { return a + b.count; }, 0));
console.log('광산 재료:');
Object.keys(demo.base).sort(function (a, b) { return demo.base[b].total - demo.base[a].total; })
  .forEach(function (k) { console.log('  ' + k + ': ' + C.fmtNum(demo.base[k].total)); });
console.log('곡괭이 단계:');
demo.steps.forEach(function (s) {
  console.log('  ' + s.name + ' 확보 ' + C.fmtNum(s.made) + '개 / 시도 ' + C.fmtNum(s.attempts) + '회');
});

/* ---------- 버전 스냅샷 안내 (실패시키지 않음) ---------- */
(function () {
  var fsMod2 = require('fs'), pathMod2 = require('path');
  try {
    var html = fsMod2.readFileSync(pathMod2.join(__dirname, 'index.html'), 'utf8');
    var m = /var APP_VERSION = '([^']+)'/.exec(html);
    if (!m) return;
    var dir = pathMod2.join(__dirname, 'versions', 'v' + m[1]);
    if (!fsMod2.existsSync(dir)) {
      console.log('\n※ v' + m[1] + ' 스냅샷이 아직 없습니다 — `node snapshot.js` 로 남겨두세요.');
    }
  } catch (e) { /* 안내일 뿐이라 조용히 넘어감 */ }
})();
