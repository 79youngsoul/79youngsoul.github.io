#!/usr/bin/env node
/**
 * 공략 이미지 내려받기 (오프라인용).
 *
 *   node download-guides.js
 *
 * game-data.js의 GUIDES에 적힌 이미지를 guides/ 폴더로 받는다.
 * 앱은 guides/ 파일이 있으면 그걸 쓰고, 없으면 웹맵 원본 주소로 대체한다.
 * 이미 받은 파일은 건너뛴다(--force 로 다시 받기).
 */
'use strict';

var fs = require('fs');
var path = require('path');
var https = require('https');

var G = require('./game-data.js');
var FORCE = process.argv.indexOf('--force') >= 0;
var DIR = path.join(__dirname, 'guides');

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR);

var files = [];
Object.keys(G.GUIDES).forEach(function (kind) {
  G.GUIDES[kind].forEach(function (g) {
    g.imgs.forEach(function (f) { if (files.indexOf(f) < 0) files.push(f); });
  });
});

var done = 0, skipped = 0, failed = [];

function get(url, dest, cb) {
  https.get(url, function (res) {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      return get(res.headers.location, dest, cb);
    }
    if (res.statusCode !== 200) {
      res.resume();
      return cb(new Error('HTTP ' + res.statusCode));
    }
    var out = fs.createWriteStream(dest);
    res.pipe(out);
    out.on('finish', function () { out.close(function () { cb(null); }); });
    out.on('error', cb);
  }).on('error', cb);
}

function next(i) {
  if (i >= files.length) {
    console.log('\n받음 ' + done + ' · 건너뜀 ' + skipped + ' · 실패 ' + failed.length);
    if (failed.length) console.log('실패 목록: ' + failed.join(', '));
    console.log('저장 위치: ' + DIR);
    return;
  }
  var f = files[i];
  var dest = path.join(DIR, f);
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    skipped++;
    return next(i + 1);
  }
  process.stdout.write('내려받는 중 (' + (i + 1) + '/' + files.length + ') ' + f + ' … ');
  get(G.GUIDE_BASE + f, dest, function (err) {
    if (err) {
      failed.push(f);
      try { fs.unlinkSync(dest); } catch (e) {}
      console.log('실패 (' + err.message + ')');
    } else {
      done++;
      console.log('완료');
    }
    next(i + 1);
  });
}

console.log('공략 이미지 ' + files.length + '개 확인');
next(0);
