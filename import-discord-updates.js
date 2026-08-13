#!/usr/bin/env node
/**
 * 한월RPG 디스코드 공지 글(텍스트) → game-updates.js 생성기.
 *
 *   1) 디스코드 공지 글을 복사해 discord-updates.txt 에 붙여넣기
 *   2) node import-discord-updates.js
 *      node import-discord-updates.js 다른파일.txt
 *
 * 인식 방식
 *   - 메시지 구분: `작성자 — 2026-05-01 5:43` 또는 `작성자 — 16:07` 줄
 *   - 글 안의 `2026 05 01 업데이트` / `2026-05-01` 같은 줄이 나오면 그 지점부터 새 항목
 *   - `+` 로 시작하는 글은 같은 날 <추가 공지>로 묶임
 *   - `업데이트 예정`, `※` 로 시작하는 안내는 예고/안내 항목으로 분리
 *
 * 날짜를 못 찾으면 date: null (앱에서 "날짜 미상"으로 표시).
 */
'use strict';

var fs = require('fs');
var path = require('path');

var SRC = path.resolve(__dirname, process.argv[2] || 'discord-updates.txt');
var OUT = path.join(__dirname, 'game-updates.js');

if (!fs.existsSync(SRC)) {
  console.error('원본 텍스트가 없습니다: ' + SRC
    + '\n디스코드 공지 글을 복사해서 이 파일에 붙여넣은 뒤 다시 실행하세요.');
  process.exit(1);
}

var raw = fs.readFileSync(SRC, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

/* ---------- 날짜 ---------- */
function pad(n) { return (n < 10 ? '0' : '') + n; }

// 2026-05-01 / 2026 05 01 / 2026.5.1 / 2026/5/1
var DATE_RE = /(20\d\d)\s*[.\-\/\s]\s*(\d{1,2})\s*[.\-\/\s]\s*(\d{1,2})/;

function parseDate(s) {
  var m = DATE_RE.exec(String(s || ''));
  if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  return null;
}

/* ---------- 줄 분류 ---------- */
var MSG_HEAD = /^(.{1,40}?)\s+—\s+(.+?)\s*$/;      // 작성자 — 날짜/시간
var TIME_ONLY = /^\d{1,2}:\d{2}$/;
// 줄 전체가 날짜(+ "업데이트" 같은 꼬리말)인 경우만 새 항목으로 본다
var DATE_HEAD = /^\s*20\d\d\s*[.\-\/\s]\s*\d{1,2}\s*[.\-\/\s]\s*\d{1,2}\s*(업데이트.*|패치.*)?\s*$/;
var PLAN_HEAD = /^\s*(업데이트\s*예정|추가\s*예정|패치\s*예정)\s*$/;

function isMsgHead(line) {
  var m = MSG_HEAD.exec(line);
  if (!m) return null;
  var tail = m[2].trim();
  if (parseDate(tail) || TIME_ONLY.test(tail) || /\d{1,2}:\d{2}$/.test(tail)) {
    return { author: m[1].replace(/[,\s]+$/, ''), date: parseDate(tail) };
  }
  return null;
}

/* ---------- 태그 ---------- */
var TAG_RULES = [
  { tag: '모드',      re: /모드 ?업데이트|런처 ?재접/ },
  { tag: '리소스팩',  re: /리소스팩/ },
  { tag: '퀘스트',    re: /퀘스트/ },
  { tag: '던전',      re: /던전|수련의탑|우물/ },
  { tag: '레이드',    re: /레이드|보스|개마무사|천수전상|흑룡/ },
  { tag: '사냥터',    re: /사냥터|몬스터|몹|엘리트|스폰|젠률|드랍/ },
  { tag: '제작',      re: /제작|대장장이|완갑|분쇄|분해/ },
  { tag: '광산',      re: /광산|광물|채광|곡괭이|활성석/ },
  { tag: '약초',      re: /약초|희귀약초|영단|단\b/ },
  { tag: '스킬',      re: /스킬|비급|검법|검결|심득|개화/ },
  { tag: '부적',      re: /부적/ },
  { tag: '펫',        re: /펫/ },
  { tag: '캐시샵',    re: /캐시샵|캐시상점|상점|판매/ },
  { tag: 'UI',        re: /ui|UI|메뉴|f12|esc|지도|화면|표시/ },
  { tag: '오류수정',  re: /오류 ?수정|문제 ?수정|버그/ }
];

function tagsOf(text) {
  var out = [];
  TAG_RULES.forEach(function (r) { if (r.re.test(text)) out.push(r.tag); });
  return out;
}

/* ---------- 파싱 ---------- */
var lines = raw.split('\n');
var items = [];        // {date, title, body[], kind}
var msgDate = null;
var cur = null;

function push(date, title, kind) {
  cur = { date: date, title: title, body: [], kind: kind || '업데이트' };
  items.push(cur);
}

lines.forEach(function (line) {
  var t = line.trim();
  var head = isMsgHead(line);

  if (head) {                       // 새 메시지 시작
    if (head.date) msgDate = head.date;
    cur = null;
    return;
  }
  if (!t) { if (cur) cur.body.push(''); return; }

  if (DATE_HEAD.test(t)) {          // 글 안의 날짜 머리말 → 새 항목
    var d = parseDate(t);
    if (d) msgDate = d;
    push(d, t.replace(/\s+/g, ' ').trim(), '업데이트');
    return;
  }
  if (PLAN_HEAD.test(t)) { push(msgDate, t.replace(/\s+/g, ' '), '예정'); return; }

  if (/^\+\s*$/.test(t)) { push(msgDate, '추가 공지', '추가'); return; }
  if (/^\+\s*.+/.test(t)) {
    var rest = t.replace(/^\+\s*/, '');
    if (!cur || cur.kind !== '추가') push(msgDate, '추가 공지', '추가');
    cur.body.push(rest);
    return;
  }
  if (/^※/.test(t)) {
    if (!cur) push(msgDate, '안내', '안내');
    cur.body.push(t);
    return;
  }

  if (!cur) push(msgDate, '', '업데이트');
  cur.body.push(t);
});

/* ---------- 다듬기 ---------- */
var updates = items.map(function (it) {
  var body = it.body.slice();
  while (body.length && !body[0].trim()) body.shift();
  while (body.length && !body[body.length - 1].trim()) body.pop();
  body = body.filter(function (s) { return s.trim(); });

  var title = it.title;
  if (!title && body.length) title = body.shift();
  if (!it.date && title) it.date = parseDate(title);

  // "2026 05 01 업데이트" → "2026-05-01 업데이트"
  if (it.date && DATE_RE.test(title)) {
    title = title.replace(DATE_RE, it.date).replace(/\s+/g, ' ').trim();
  }
  return {
    date: it.date, title: title, kind: it.kind, body: body,
    tags: tagsOf(title + '\n' + body.join('\n'))
  };
}).filter(function (u) { return u.body.length || u.title; });

// 최신순 (같은 날짜면 원래 순서 유지 = 나중 글이 아래)
updates.forEach(function (u, i) { u._i = i; });
updates.sort(function (a, b) {
  if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.date && !b.date) return -1;
  if (!a.date && b.date) return 1;
  return a._i - b._i;
});
updates.forEach(function (u) { delete u._i; });

/* ---------- 쓰기 ---------- */
function q(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

var block = updates.map(function (u) {
  return '    { date: ' + (u.date ? q(u.date) : 'null')
    + ', kind: ' + q(u.kind)
    + ', title: ' + q(u.title) + ',\n'
    + '      tags: [' + u.tags.map(q).join(', ') + '],\n'
    + '      body: [' + u.body.map(q).join(',\n             ') + '] }';
}).join(',\n');

var out = fs.readFileSync(OUT, 'utf8');
var filled = 'var UPDATES = [\n' + block + '\n  ];';
out = /var UPDATES = \[\s*\];/.test(out)
  ? out.replace(/var UPDATES = \[\s*\];/, filled)          // 비어 있던 첫 실행
  : out.replace(/var UPDATES = \[[\s\S]*?\n  \];/, filled); // 이미 채워진 경우 통째 교체
out = out.replace(/fetched: [^,\n]+/, "fetched: '" + new Date().toISOString().slice(0, 10) + "'");
fs.writeFileSync(OUT, out, 'utf8');

var noDate = updates.filter(function (u) { return !u.date; }).length;
console.log('원본: ' + SRC);
console.log('항목 ' + updates.length + '건 생성 → game-updates.js');
console.log('기간: ' + (updates[updates.length - 1] || {}).date + ' ~ ' + (updates[0] || {}).date);
if (noDate) console.log('※ 날짜 미상 ' + noDate + '건');
updates.slice(0, 3).forEach(function (u) {
  console.log('  ' + (u.date || '날짜미상') + ' · ' + u.title + ' (' + u.body.length + '줄, '
    + (u.tags.join('/') || '태그없음') + ')');
});
