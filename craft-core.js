/* =====================================================================
 * 한월 공략소 - 코어 데이터 & 계산 로직
 * 브라우저(window.Craft) / Node(require) 양쪽에서 동작
 * 원본: 대장장이&화로.txt
 * ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Craft = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 1. 데이터
   * ------------------------------------------------------------------ */

  // 화로 제작 아이템: mats = 필요 재료, sec = 기본 소요 시간(초)
  var FURNACE = {
    '적동괴':   { mats: { '적동석': 3 }, sec: 60 },
    '철':       { mats: { '철광석': 2, '돌덩어리': 1 }, sec: 60 },
    '강철':     { mats: { '철': 1, '정철광': 1, '갈옥': 2 }, sec: 300 },
    '자금':     { mats: { '적동괴': 2, '청연광': 2, '신선옥': 1 }, sec: 300 },
    '백련강':   { mats: { '강철': 1, '청연광': 2, '신선옥': 1 }, sec: 600 },
    '오금철':   { mats: { '철': 2, '오철': 2, '적동괴': 2 }, sec: 600 },
    '무괴철':   { mats: { '강철': 2, '묵철': 2, '흑옥': 2 }, sec: 1800 },
    '강오금':   { mats: { '오금철': 1, '강철': 1, '청연광': 2, '매화옥': 1 }, sec: 1800 },
    '백현철':   { mats: { '백련강': 1, '현철': 3, '자금': 1, '매화옥': 2 }, sec: 2400 },
    '백련정강': { mats: { '백련강': 2, '청강석': 3, '흑옥': 1, '묵철': 2 }, sec: 2400 },
    '설화강철': { mats: { '백련정강': 1, '무괴철': 2, '자금': 2, '빙옥': 3 }, sec: 3600 },
    '설화오금': { mats: { '백련정강': 1, '강오금': 2, '백현철': 1, '빙옥': 3 }, sec: 3600 },
    '오금한철': { mats: { '오금철': 5, '한철': 3, '강철': 3, '금강석': 1, '강오금': 1 }, sec: 3600 },
    '금강한철': { mats: { '오금한철': 2, '백현철': 2, '강오금': 2, '백련정강': 1, '금강석': 5, '만년한철': 2 }, sec: 7200 },
    '일광용린': { mats: { '용린광': 2, '자금': 5, '설화오금': 2, '금강석': 2, '일옥': 5, '무괴철': 3 }, sec: 7200 }
  };

  // 광산 재료 (화로에서 만들 수 없는 것)
  var BASE = ['적동석', '철광석', '돌덩어리', '정철광', '갈옥', '청연광', '신선옥', '오철',
              '묵철', '흑옥', '매화옥', '현철', '청강석', '빙옥', '한철', '금강석',
              '만년한철', '용린광', '일옥'];

  // 곡괭이: index 0 = 1성(상점 구매), 이후는 대장장이 제작
  var PICKS = [
    { name: '1성곡괭이', buy: 1000 },
    { name: '2성곡괭이', p: 1.00, cost: 5000,
      mats: { '1성곡괭이': 1, '돌덩어리': 5, '적동괴': 1, '철': 1 } },
    { name: '3성곡괭이', p: 0.70, cost: 30000,
      mats: { '2성곡괭이': 1, '강철': 2, '자금': 2, '오금철': 1 } },
    { name: '4성곡괭이', p: 0.30, cost: 100000,
      mats: { '3성곡괭이': 1, '무괴철': 2, '백현철': 2, '백련정강': 1, '백련강': 2 } },
    { name: '5성곡괭이', p: 0.05, cost: 300000,
      mats: { '4성곡괭이': 1, '설화강철': 2, '설화오금': 2, '오금한철': 2, '백현철': 2 } }
  ];

  // 낫: 1성부터 대장장이 제작(상점 구매 없음). 단계마다 재료 수량이 10씩 늘어난다.
  var SICKLES = [1, 2, 3, 4, 5].map(function (star) {
    var n = star * 10;
    var mats = { '돌덩어리': n, '철': n, '정철광': n };
    if (star > 1) mats[(star - 1) + '성낫'] = 1;
    return {
      name: star + '성낫',
      p: [1.00, 0.80, 0.60, 0.40, 0.20][star - 1],
      cost: star * 10000,
      mats: mats
    };
  });

  // 대장장이 승급 도구 — 곡괭이·낫. 같은 규칙(실패 시 하위 소모 옵션 등)으로 계산한다.
  var CHAINS = { '곡괭이': PICKS, '낫': SICKLES };
  var CHAIN_NAMES = Object.keys(CHAINS);

  var PICK_NAMES = PICKS.map(function (x) { return x.name; });

  // 도구 이름 → { chain, idx, item }
  var TOOL_ITEM = {};
  CHAIN_NAMES.forEach(function (c) {
    CHAINS[c].forEach(function (item, i) { TOOL_ITEM[item.name] = { chain: c, idx: i, item: item }; });
  });
  var TOOL_NAMES = Object.keys(TOOL_ITEM);

  // 원문 표기 이슈 (UI에 그대로 노출해서 사용자가 판단하게 함)
  var NOTES = [
    '2026-08-09 수정된 원문 기준. 오금한철 재료는 오금철5 + 강오금1 (이전 표기 오류 반영 완료).',
    '선택 부가효과 "일반제작성공률증가"는 원래 확률의 10%만큼 상승(곱연산). 예: 70% → 77%, 5% → 5.5%.',
    '"화력"은 1당 화로 제작시간 1% 곱연산 감소(0.99^화력), 최대 50 → 약 -39.5%.',
    '"일반제작비용 -10%"은 대장장이 제작비에만 적용(1성곡괭이 상점 구매가는 제외).',
    '낫은 1성부터 대장장이 제작(상점 구매 없음). 단계마다 돌덩어리·철·정철광이 10씩 늘고 확률은 100/80/60/40/20%.',
    '대장장이 VIP는 화로 대기시간 -10%(곱연산). 화력·화로시간감소와 중첩되어 모두 곱해짐.'
  ];

  /* ------------------------------------------------------------------
   * 2. 유틸
   * ------------------------------------------------------------------ */

  function num(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
  function isFurnace(name) { return Object.prototype.hasOwnProperty.call(FURNACE, name); }
  function isPick(name) { return PICK_NAMES.indexOf(name) >= 0; }
  /** 대장장이 승급 도구(곡괭이·낫) 인지 */
  function isTool(name) { return Object.prototype.hasOwnProperty.call(TOOL_ITEM, name); }
  /** 도구 레시피 (아니면 null) */
  function toolItem(name) { return isTool(name) ? TOOL_ITEM[name].item : null; }
  /** 도구가 속한 계열 이름 ('곡괭이' · '낫') */
  function toolChain(name) { return isTool(name) ? TOOL_ITEM[name].chain : null; }
  function isBase(name) { return !isFurnace(name) && !isTool(name); }

  function add(map, key, v) { if (v) map[key] = (map[key] || 0) + v; }

  // 화로 위상정렬: 상위(소비자)가 먼저 오는 순서
  function furnaceOrder() {
    var names = Object.keys(FURNACE);
    var indeg = {};
    names.forEach(function (n) { indeg[n] = 0; });
    names.forEach(function (a) {
      Object.keys(FURNACE[a].mats).forEach(function (m) { if (isFurnace(m)) indeg[m]++; });
    });
    var q = names.filter(function (n) { return indeg[n] === 0; });
    var out = [];
    while (q.length) {
      var n = q.shift();
      out.push(n);
      Object.keys(FURNACE[n].mats).forEach(function (m) {
        if (isFurnace(m) && --indeg[m] === 0) q.push(m);
      });
    }
    if (out.length !== names.length) throw new Error('화로 레시피에 순환 참조가 있음');
    return out;
  }
  var ORDER = furnaceOrder();

  // 화로 아이템 깊이 (광산 재료=0)
  var DEPTH = (function () {
    var d = {};
    function depth(n) {
      if (!isFurnace(n)) return 0;
      if (d[n] != null) return d[n];
      d[n] = 0; // 순환 방지
      var mx = 0;
      Object.keys(FURNACE[n].mats).forEach(function (m) { mx = Math.max(mx, depth(m)); });
      return (d[n] = mx + 1);
    }
    Object.keys(FURNACE).forEach(depth);
    return d;
  })();

  function timeMultiplier(o) {
    var fire = Math.min(50, Math.max(0, num(o.fire)));
    var m = Math.pow(0.99, fire);
    if (o.furnaceTimeDown) m *= 0.9;
    if (o.vip) m *= 0.9;
    return m;
  }

  function successRate(p, o) {
    if (o.ignoreFail) return 1;
    var r = o.successUp ? p * 1.1 : p;
    return Math.min(1, r);
  }

  function costMultiplier(o) { return o.costDown ? 0.9 : 1; }

  function defaults(opts) {
    var o = {
      targets: {}, inventory: {},
      fire: 0, slots: 1,
      successUp: false, costDown: false, furnaceTimeDown: false, vip: false,
      failConsumesMats: true, failConsumesBase: true,
      ignoreFail: false,      // true = 실패 없다고 가정(최소 소요량)
      integer: true           // true = 각 단계 개수를 올림 처리
    };
    for (var k in (opts || {})) o[k] = opts[k];
    return o;
  }

  /* ------------------------------------------------------------------
   * 3. 메인 계산
   * ------------------------------------------------------------------ */

  function compute(opts) {
    var o = defaults(opts);
    var round = o.integer ? Math.ceil : function (x) { return x; };

    // 보유 재고 사본
    var inv = {};
    Object.keys(o.inventory || {}).forEach(function (k) {
      var v = num(o.inventory[k]); if (v > 0) inv[k] = v;
    });
    function take(item, need) {
      var have = inv[item] || 0;
      var used = Math.min(have, need);
      inv[item] = have - used;
      return { need: need - used, used: used };
    }

    var demand = {};
    Object.keys(o.targets || {}).forEach(function (k) { add(demand, k, num(o.targets[k])); });

    var steps = [];          // 도구(곡괭이·낫) 단계 정보
    var furnaceCount = {};   // 화로 제작 개수
    var baseNeed = {};       // 광산 재료 총 필요량
    var invUsed = {};        // 재고에서 사용한 양
    var totalCost = 0;
    var buyCount = 0;

    // --- 3-1. 도구 계열: 계열마다 상위 → 하위 ---
    CHAIN_NAMES.forEach(function (chainName) {
      var chain = CHAINS[chainName];
      var chainSteps = [];
      for (var i = chain.length - 1; i >= 0; i--) {
        var pk = chain[i];
        var want = demand[pk.name] || 0;
        if (want <= 0) continue;
        var t = take(pk.name, want);
        if (t.used) add(invUsed, pk.name, t.used);
        if (t.need <= 0) continue;
        var q = round(t.need);

        // 상점 구매 단계 (1성곡괭이)
        if (pk.buy != null && !pk.mats) {
          buyCount += q;
          totalCost += q * pk.buy;
          chainSteps.push({
            name: pk.name, chain: chainName, made: q, rate: 1, attempts: q,
            buy: true, costEach: pk.buy, cost: q * pk.buy
          });
          continue;
        }

        var p = successRate(pk.p, o);
        var attempts = q / p;
        if (o.integer) attempts = Math.ceil(attempts);

        var matUnits = o.failConsumesMats ? attempts : q;   // 일반 재료 소모 횟수
        var baseUnits = o.failConsumesBase ? attempts : q;  // 하위 도구 소모 횟수

        totalCost += attempts * pk.cost * costMultiplier(o);

        Object.keys(pk.mats).forEach(function (m) {
          var n = pk.mats[m];
          var units = isTool(m) ? baseUnits : matUnits;
          add(demand, m, units * n);
        });

        chainSteps.push({
          name: pk.name, chain: chainName, made: q, rate: p, attempts: attempts,
          costEach: pk.cost * costMultiplier(o),
          cost: attempts * pk.cost * costMultiplier(o)
        });
      }
      chainSteps.reverse();                 // 1성 → 5성 순서로
      steps = steps.concat(chainSteps);
    });

    // --- 3-3. 화로 (위상 순서) ---
    ORDER.forEach(function (name) {
      var want = demand[name] || 0;
      if (want <= 0) return;
      var t = take(name, want);
      if (t.used) add(invUsed, name, t.used);
      var q = round(t.need);
      if (q <= 0) return;
      furnaceCount[name] = (furnaceCount[name] || 0) + q;
      var mats = FURNACE[name].mats;
      Object.keys(mats).forEach(function (m) { add(demand, m, q * mats[m]); });
    });

    // --- 3-4. 광산 재료 ---
    Object.keys(demand).forEach(function (k) {
      if (!isBase(k)) return;
      var want = demand[k];
      if (want <= 0) return;
      var q = round(want);
      var t = take(k, q);
      if (t.used) add(invUsed, k, t.used);
      baseNeed[k] = { total: q, have: t.used, short: t.need };
    });

    // --- 3-5. 시간 ---
    var mult = timeMultiplier(o);
    var totalSec = 0;
    var furnaceList = Object.keys(furnaceCount).map(function (n) {
      var each = FURNACE[n].sec * mult;
      var sum = each * furnaceCount[n];
      totalSec += sum;
      return { name: n, count: furnaceCount[n], eachSec: each, sec: sum, depth: DEPTH[n] };
    }).sort(function (a, b) { return b.depth - a.depth || a.name.localeCompare(b.name); });

    // 임계 경로(무한 병렬 가정 최소 시간)
    var cpMemo = {};
    function cp(n) {
      if (!isFurnace(n)) return 0;
      if (cpMemo[n] != null) return cpMemo[n];
      var mx = 0;
      Object.keys(FURNACE[n].mats).forEach(function (m) { mx = Math.max(mx, cp(m)); });
      return (cpMemo[n] = FURNACE[n].sec * mult + mx);
    }
    var criticalSec = 0;
    Object.keys(furnaceCount).forEach(function (n) { criticalSec = Math.max(criticalSec, cp(n)); });

    var slots = Math.max(1, Math.floor(num(o.slots) || 1));
    var parallelSec = Math.max(criticalSec, totalSec / slots);

    // --- 3-6. 제작 순서 (하위 → 상위) ---
    var plan = furnaceList.slice().sort(function (a, b) {
      return a.depth - b.depth || a.name.localeCompare(b.name);
    }).map(function (f) {
      return { type: '화로', name: f.name, count: f.count, sec: f.sec, mats: FURNACE[f.name].mats };
    });
    steps.forEach(function (s) {
      plan.push({
        type: s.buy ? '상점' : '대장장이', name: s.name, count: s.made,
        attempts: s.attempts, rate: s.rate, cost: s.cost,
        mats: s.buy ? null : toolItem(s.name).mats
      });
    });

    var shortageCount = 0;
    Object.keys(baseNeed).forEach(function (k) { if (baseNeed[k].short > 0) shortageCount++; });

    return {
      opts: o,
      steps: steps,
      furnace: furnaceList,
      furnaceCount: furnaceCount,
      base: baseNeed,
      invUsed: invUsed,
      totalCost: totalCost,
      totalSec: totalSec,
      criticalSec: criticalSec,
      parallelSec: parallelSec,
      timeMult: mult,
      plan: plan,
      shortageCount: shortageCount
    };
  }

  /* ------------------------------------------------------------------
   * 4. 몬테카를로 시뮬레이션 (곡괭이 확률 구간 추정)
   * ------------------------------------------------------------------ */

  function simulateOnce(o) {
    var demand = {};
    Object.keys(o.targets || {}).forEach(function (k) { add(demand, k, num(o.targets[k])); });
    var cost = 0;
    var attempts = {};

    CHAIN_NAMES.forEach(function (chainName) {
      var chain = CHAINS[chainName];
      for (var i = chain.length - 1; i >= 0; i--) {
        var pk = chain[i];
        var q = Math.ceil(demand[pk.name] || 0);
        if (q <= 0) continue;
        if (pk.buy != null && !pk.mats) {          // 상점 구매 단계
          cost += q * pk.buy;
          attempts[pk.name] = q;
          continue;
        }
        var p = successRate(pk.p, o);
        var tries = 0, ok = 0;
        // 음이항 표본: q번 성공까지의 시도 횟수
        while (ok < q) { tries++; if (Math.random() < p) ok++; if (tries > 2e6) break; }
        attempts[pk.name] = tries;
        cost += tries * pk.cost * costMultiplier(o);
        var matUnits = o.failConsumesMats ? tries : q;
        var baseUnits = o.failConsumesBase ? tries : q;
        Object.keys(pk.mats).forEach(function (m) {
          add(demand, m, (isTool(m) ? baseUnits : matUnits) * pk.mats[m]);
        });
      }
    });

    // 화로/광산은 결정적 → 이번 표본의 수요를 그대로 전개
    var sub = compute({
      targets: pickNonPick(demand),
      inventory: o.inventory, fire: o.fire, slots: o.slots,
      furnaceTimeDown: o.furnaceTimeDown, vip: o.vip, costDown: o.costDown,
      integer: true, ignoreFail: true
    });

    return { cost: cost + 0, sec: sub.totalSec, parallelSec: sub.parallelSec, base: sub.base, attempts: attempts };
  }

  function pickNonPick(demand) {
    var out = {};
    Object.keys(demand).forEach(function (k) { if (!isTool(k) && demand[k] > 0) out[k] = demand[k]; });
    return out;
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    var idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
    return sorted[idx];
  }

  function simulate(opts, runs) {
    var o = defaults(opts);
    runs = Math.max(1, runs || 2000);
    if (o.ignoreFail) runs = 1;

    var costs = [], secs = [], baseSamples = {}, attemptSamples = {};
    for (var i = 0; i < runs; i++) {
      var r = simulateOnce(o);
      costs.push(r.cost);
      secs.push(r.parallelSec);
      Object.keys(r.base).forEach(function (k) {
        (baseSamples[k] = baseSamples[k] || []).push(r.base[k].total);
      });
      Object.keys(r.attempts).forEach(function (k) {
        (attemptSamples[k] = attemptSamples[k] || []).push(r.attempts[k]);
      });
    }
    costs.sort(function (a, b) { return a - b; });
    secs.sort(function (a, b) { return a - b; });

    var base = {};
    Object.keys(baseSamples).forEach(function (k) {
      var s = baseSamples[k].sort(function (a, b) { return a - b; });
      base[k] = { p50: percentile(s, 0.5), p90: percentile(s, 0.9), max: s[s.length - 1] };
    });
    var att = {};
    Object.keys(attemptSamples).forEach(function (k) {
      var s = attemptSamples[k].sort(function (a, b) { return a - b; });
      att[k] = {
        avg: s.reduce(function (a, b) { return a + b; }, 0) / s.length,
        p50: percentile(s, 0.5), p90: percentile(s, 0.9), max: s[s.length - 1]
      };
    });

    return {
      runs: runs,
      cost: { p10: percentile(costs, 0.1), p50: percentile(costs, 0.5), p90: percentile(costs, 0.9), max: costs[costs.length - 1],
              avg: costs.reduce(function (a, b) { return a + b; }, 0) / costs.length },
      sec: { p50: percentile(secs, 0.5), p90: percentile(secs, 0.9) },
      base: base,
      attempts: att,
      costSamples: costs
    };
  }

  /* ------------------------------------------------------------------
   * 5. 포맷 헬퍼
   * ------------------------------------------------------------------ */

  function fmtNum(n, digits) {
    if (!isFinite(n)) return '-';
    var d = digits == null ? (Math.abs(n - Math.round(n)) < 1e-9 ? 0 : 2) : digits;
    return n.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // 64개 = 1셋 같은 묶음 단위 표기: 5700 → "89셋 4개"
  var STACK = 64;
  function fmtStack(n, stack) {
    stack = stack > 0 ? Math.floor(stack) : STACK;
    if (!isFinite(n)) return '-';
    var neg = n < 0; n = Math.abs(n);
    var whole = Math.floor(n), frac = n - whole;
    var s = Math.floor(whole / stack), r = whole - s * stack + frac;
    var txt;
    if (s <= 0) txt = fmtNum(n) + '개';
    else if (r === 0) txt = fmtNum(s) + '셋';
    else txt = fmtNum(s) + '셋 ' + fmtNum(r) + '개';
    return (neg ? '-' : '') + txt;
  }

  function fmtTime(sec) {
    sec = Math.round(sec || 0);
    if (sec <= 0) return '0초';
    var d = Math.floor(sec / 86400); sec -= d * 86400;
    var h = Math.floor(sec / 3600); sec -= h * 3600;
    var m = Math.floor(sec / 60); var s = sec - m * 60;
    var out = [];
    if (d) out.push(d + '일');
    if (h) out.push(h + '시간');
    if (m) out.push(m + '분');
    if (s && !d) out.push(s + '초');
    return out.join(' ') || '0초';
  }

  /* ------------------------------------------------------------------ */

  return {
    FURNACE: FURNACE, PICKS: PICKS, PICK_NAMES: PICK_NAMES, BASE: BASE,
    SICKLES: SICKLES, CHAINS: CHAINS, CHAIN_NAMES: CHAIN_NAMES, TOOL_NAMES: TOOL_NAMES,
    NOTES: NOTES, ORDER: ORDER, DEPTH: DEPTH,
    isFurnace: isFurnace, isPick: isPick, isBase: isBase,
    isTool: isTool, toolItem: toolItem, toolChain: toolChain,
    compute: compute, simulate: simulate,
    timeMultiplier: timeMultiplier, successRate: successRate, costMultiplier: costMultiplier,
    fmtNum: fmtNum, fmtTime: fmtTime, fmtStack: fmtStack, STACK: STACK
  };
});
