#!/usr/bin/env node
/**
 * 약초 자생지 색칠(오버레이) 이미지 내려받기 + 지도용 설정 파일 생성.
 *
 *   node download-overlays.js
 *   node download-overlays.js --force      # 이미 받은 것도 다시 받기
 *
 * 웹맵은 약초마다 자생지를 칠한 7300x7300 투명 PNG를 지도 위에 얹는다.
 * 그 이미지를 map/overlays/ 로 받아오고, 우리 지도 뷰어가 쓸
 * map/overlays.js (이미지 목록 + 월드 좌표 범위)를 만든다.
 *
 * 좌표 변환은 웹맵 map-logic.js의 값을 그대로 쓴다:
 *   픽셀 = 월드좌표 * scale + offset
 */
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');

var G = require('./game-data.js');

var BASE = 'https://forky-g.github.io/HANWOL-WEBMAP/images/';
var FORCE = process.argv.indexOf('--force') >= 0;
var DIR = path.join(__dirname, 'map', 'overlays');
var OUT = path.join(__dirname, 'map', 'overlays.js');

// 웹맵 map-logic.js 상수 (원본 이미지 7300x7300 기준)
var IMG = 7300;
var SCALE_X = 0.445733, OFFSET_X = 3650.73;
var SCALE_Z = 0.445873, OFFSET_Z = 3647.71;

// 픽셀 0..7300 이 덮는 월드 좌표 범위
var BOUNDS = {
  minX: (0 - OFFSET_X) / SCALE_X,
  maxX: (IMG - OFFSET_X) / SCALE_X,
  minZ: (0 - OFFSET_Z) / SCALE_Z,
  maxZ: (IMG - OFFSET_Z) / SCALE_Z
};

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

var list = G.HERBS.filter(function (h) { return h.overlay; });
if (!list.length) {
  console.error('game-data.js의 HERBS에 overlay 파일명이 없습니다.');
  process.exit(1);
}

function get(url, dest, cb) {
  https.get(url, function (res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      return get(res.headers.location, dest, cb);
    }
    if (res.statusCode !== 200) { res.resume(); return cb(new Error('HTTP ' + res.statusCode)); }
    var out = fs.createWriteStream(dest);
    res.pipe(out);
    out.on('finish', function () { out.close(function () { cb(null); }); });
    out.on('error', cb);
  }).on('error', cb);
}

var done = 0, skipped = 0, failed = [];

function writeConfig() {
  var payload = {
    bounds: {
      minX: Math.round(BOUNDS.minX), maxX: Math.round(BOUNDS.maxX),
      minZ: Math.round(BOUNDS.minZ), maxZ: Math.round(BOUNDS.maxZ)
    },
    opacity: 0.6,
    herbs: list.map(function (h) {
      return { name: h.name, color: h.color, file: 'overlays/' + h.overlay, spots: h.spots.length };
    })
  };
  fs.writeFileSync(OUT,
    '/* 자동 생성 파일 — 직접 고치지 마세요.\n'
    + ' * 다시 만들기: node download-overlays.js\n'
    + ' * 약초 자생지 색칠 이미지 (출처: HANWOL-WEBMAP)\n'
    + ' */\n'
    + 'window.MapOverlays = ' + JSON.stringify(payload, null, 1) + ';\n', 'utf8');
  console.log('생성: ' + OUT);
  console.log('월드 범위 x ' + payload.bounds.minX + '~' + payload.bounds.maxX
    + ' · z ' + payload.bounds.minZ + '~' + payload.bounds.maxZ);
}

function next(i) {
  if (i >= list.length) {
    console.log('\n받음 ' + done + ' · 건너뜀 ' + skipped + ' · 실패 ' + failed.length);
    if (failed.length) console.log('실패: ' + failed.join(', '));
    writeConfig();
    return;
  }
  var h = list[i];
  var dest = path.join(DIR, h.overlay);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    skipped++;
    return next(i + 1);
  }
  process.stdout.write('내려받는 중 (' + (i + 1) + '/' + list.length + ') '
    + h.name + ' ' + h.overlay + ' … ');
  get(BASE + h.overlay, dest, function (err) {
    if (err) {
      failed.push(h.overlay);
      try { fs.unlinkSync(dest); } catch (e) {}
      console.log('실패 (' + err.message + ')');
    } else { done++; console.log('완료'); }
    next(i + 1);
  });
}

console.log('약초 자생지 이미지 ' + list.length + '종');
next(0);
