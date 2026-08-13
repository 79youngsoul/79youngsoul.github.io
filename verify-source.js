/* 원본 메모(대장장이&화로.txt)를 직접 파싱해서 craft-core.js 데이터와 1:1 대조
 * 사용: node verify-source.js
 * 메모를 수정한 뒤 이걸 먼저 돌리면, 반영이 빠진 항목이 바로 잡힌다. */
'use strict';
var fs = require('fs');
var path = require('path');
var C = require('./craft-core.js');

var SRC = path.join(__dirname, '대장장이&화로.txt');
var text = fs.readFileSync(SRC, 'utf8').replace(/\r/g, '');
var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);

var problems = [];
var checked = 0;
function chk(what, cond, detail) { checked++; if (!cond) problems.push(what + (detail ? '  → ' + detail : '')); }

/* 숫자 붙은 재료 토큰 파싱: "강철2, 자금2, 오금철1" → {강철:2, 자금:2, 오금철:1} */
function parseMats(str) {
  var out = {};
  str.split(',').forEach(function (tok) {
    tok = tok.trim();
    if (!tok) return;
    var m = tok.match(/^([가-힣0-9]+?)\s*(\d+)$/);   // 이름에 숫자 포함 가능 ("1성곡괭이1")
    if (!m) { problems.push('재료 토큰 해석 실패: "' + tok + '"'); return; }
    out[m[1]] = (out[m[1]] || 0) + Number(m[2]);   // 같은 재료가 두 번 나오면 합산
  });
  return out;
}
function parseTime(str) {
  var m = str.match(/(\d+)\s*(초|분|시간)/);
  if (!m) { problems.push('시간 해석 실패: "' + str + '"'); return null; }
  var n = Number(m[1]);
  return m[2] === '초' ? n : m[2] === '분' ? n * 60 : n * 3600;
}
function sameMats(a, b) {
  var ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  if (ka.join('|') !== kb.join('|')) return false;
  return ka.every(function (k) { return a[k] === b[k]; });
}
function show(m) { return Object.keys(m).map(function (k) { return k + m[k]; }).join(', '); }

/* ---------- 1. 상점 ---------- */
var buyLine = lines.filter(function (l) { return /구매/.test(l); })[0];
if (buyLine) {
  var bm = buyLine.match(/^([가-힣0-9]+)\s*대장장이\s*구매\s*([\d,]+)전/);
  chk('상점 구매 항목 파싱', !!bm, buyLine);
  if (bm) {
    chk('상점 아이템 = ' + bm[1], C.PICKS[0].name === bm[1], C.PICKS[0].name);
    chk('상점 가격 = ' + bm[2], C.PICKS[0].buy === Number(bm[2].replace(/,/g, '')), String(C.PICKS[0].buy));
  }
} else problems.push('상점 구매 줄을 찾지 못함');

/* ---------- 2. 대장장이 제작 ---------- */
var pickLines = lines.filter(function (l) { return /대장장이 제작 성공 확률/.test(l); });
chk('대장장이 제작 줄 개수 = 4', pickLines.length === 4, String(pickLines.length));

pickLines.forEach(function (l) {
  var m = l.match(/^([가-힣0-9]+)\s*대장장이 제작 성공 확률\s*(\d+)%\s*필요 재료\s*(.+?),\s*([\d,]+)전\s*$/);
  if (!m) { problems.push('대장장이 줄 해석 실패: ' + l); return; }
  var name = m[1], p = Number(m[2]) / 100, mats = parseMats(m[3]), cost = Number(m[4].replace(/,/g, ''));
  var idx = C.PICK_NAMES.indexOf(name);
  chk(name + ' 존재', idx > 0, 'PICKS에 없음');
  if (idx <= 0) return;
  var d = C.PICKS[idx];
  chk(name + ' 성공 확률 ' + m[2] + '%', d.p === p, String(d.p * 100) + '%');
  chk(name + ' 제작비 ' + m[4] + '전', d.cost === cost, String(d.cost));
  chk(name + ' 재료 [' + show(mats) + ']', sameMats(mats, d.mats), '데이터: ' + show(d.mats));
});

/* ---------- 3. 화로 ---------- */
var furLines = lines.filter(function (l) { return /^[가-힣]+:\s/.test(l); });
chk('화로 줄 개수 = 15', furLines.length === 15, String(furLines.length));

var seen = {};
furLines.forEach(function (l) {
  var m = l.match(/^([가-힣]+):\s*(.+?)\s*소[용요]시간\s*(.+)$/);
  if (!m) { problems.push('화로 줄 해석 실패: ' + l); return; }
  var name = m[1], mats = parseMats(m[2]), sec = parseTime(m[3]);
  seen[name] = 1;
  var d = C.FURNACE[name];
  chk('화로 ' + name + ' 존재', !!d, 'FURNACE에 없음');
  if (!d) return;
  chk('화로 ' + name + ' 재료 [' + show(mats) + ']', sameMats(mats, d.mats), '데이터: ' + show(d.mats));
  chk('화로 ' + name + ' 시간 ' + m[3], d.sec === sec, d.sec + '초');
});
Object.keys(C.FURNACE).forEach(function (n) {
  chk('데이터의 화로 ' + n + '이 원문에 있음', !!seen[n], '원문에 없는 항목');
});

/* ---------- 4. 옵션 문구 ---------- */
chk('일반제작성공률증가 문구 존재', /일반제작성공률증가/.test(text));
chk('일반제작비용 -10% 문구 존재', /일반제작비용\s*-10%/.test(text));
chk('화로시간감소 문구 존재', /화로시간감[서소]\s*-10%/.test(text));
chk('화력 최대 50 문구 존재', /화력.*최대\s*50/.test(text));
chk('대장장이 VIP 문구 존재', /대장장이\s*VIP/i.test(text));
chk('VIP 화로 대기시간 -10% 문구 존재', /화로 대기시간\s*-10%/.test(text));
chk('성공률 옵션 구현 (70%→77%)', Math.abs(C.successRate(0.7, { successUp: true }) - 0.77) < 1e-9);
chk('비용 옵션 구현 (-10%)', C.costMultiplier({ costDown: true }) === 0.9);
chk('화로시간 옵션 구현 (-10%)', Math.abs(C.timeMultiplier({ fire: 0, furnaceTimeDown: true }) - 0.9) < 1e-9);
chk('대장장이 VIP 옵션 구현 (화로시간 -10%)',
    Math.abs(C.timeMultiplier({ fire: 0, vip: true }) - 0.9) < 1e-9);
chk('VIP는 화로시간감소와 곱연산 (0.81)',
    Math.abs(C.timeMultiplier({ fire: 0, vip: true, furnaceTimeDown: true }) - 0.81) < 1e-9);
chk('화력 곱연산 구현 (0.99^n, 최대 50)',
    Math.abs(C.timeMultiplier({ fire: 77 }) - Math.pow(0.99, 50)) < 1e-12);

/* ---------- 5. 광산 재료 목록 = 화로에 없는 재료 ---------- */
var referenced = {};
Object.keys(C.FURNACE).forEach(function (f) {
  Object.keys(C.FURNACE[f].mats).forEach(function (m) { referenced[m] = 1; });
});
C.PICKS.forEach(function (p) { if (p.mats) Object.keys(p.mats).forEach(function (m) { referenced[m] = 1; }); });
var shouldBeBase = Object.keys(referenced).filter(function (m) { return !C.FURNACE[m] && C.PICK_NAMES.indexOf(m) < 0; });
chk('광산 재료 목록이 실제 미제작 재료와 일치',
    shouldBeBase.slice().sort().join(',') === C.BASE.slice().sort().join(','),
    '차이: ' + shouldBeBase.filter(function (x) { return C.BASE.indexOf(x) < 0; }).join(',') + ' / ' +
    C.BASE.filter(function (x) { return shouldBeBase.indexOf(x) < 0; }).join(','));

/* ---------- 결과 ---------- */
console.log('=== 원문 대조 검증 ===');
console.log('원문: ' + SRC);
console.log('검사 항목: ' + checked + '  불일치: ' + problems.length);
if (problems.length) {
  console.log('\n불일치 목록:');
  problems.forEach(function (p) { console.log('  ✗ ' + p); });
  process.exitCode = 1;
} else {
  console.log('원문과 데이터가 완전히 일치 ✓');
}
