#!/usr/bin/env node
/**
 * 파일 하나로 합치기 — 스크립트를 전부 index.html 안에 넣는다.
 *
 *   node build-standalone.js
 *   node build-standalone.js --out 다른이름.html
 *
 * 왜:
 *   IPFS(Pinata)·메신저 첨부·USB처럼 "파일 하나만" 올릴 수 있는 곳에서도 그대로 돌게.
 *   index.html만 올리면 craft-core.js 같은 걸 못 찾아서 백지가 된다.
 *
 * 결과 1: dist/한월공략소.html (약 0.3MB, 외부 파일 0개)
 *   - 계산기·NPC 제작·위치·확률·부적·업데이트·검색 전부 동작
 *   - 지도 탭은 안내와 웹 지도 링크만 뜬다 (타일이 안 들어있으므로)
 *   - 공략 이미지는 웹맵 원본 주소에서 불러온다 (인터넷 필요)
 *
 * 결과 2: dist/한월공략소-전체.html (--full, 약 490MB)
 *   - 지도 타일을 배율 0~6 전부 담아 확대해도 원본 화질
 *   - 가볍게 하려면 --levels 3,4,5,6 (약 70MB) 처럼 담을 배율을 줄인다
 *   - 파일이 수백 MB라 통짜 문자열로는 못 만든다 → 조각으로 흘려 쓰고,
 *     브라우저에서도 조각 Blob 을 이어 붙여 지도를 띄운다
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = __dirname;
var args = process.argv.slice(2);
var outIdx = args.indexOf('--out');
var OUT = path.resolve(ROOT, outIdx >= 0 ? args[outIdx + 1]
  : path.join('dist', '한월공략소.html'));


/* ---------- 지도까지 한 파일에 넣기 (--full) ----------
 * 지도는 원래 map/index.html + 타일 수천 장이라 파일이 따로 필요했다.
 * --full 을 주면 타일·자생지 색칠·높이 데이터를 data: 주소로 바꿔 지도 페이지에 박고,
 * 그 지도 페이지 자체를 앱 안에 문자열로 넣는다. 그러면 파일 하나로 지도까지 돈다.
 */
var patchFails = [];

/** 문자열 한 곳을 바꾼다. 못 찾으면 기록해 뒀다가 마지막에 크게 알린다.
 *  (원본 줄바꿈이 CRLF↔LF 로 바뀌면 조용히 안 걸리던 사고가 있었다) */
function patch(text, label, re, to) {
  if (!re.test(text)) { patchFails.push(label); return text; }
  return text.replace(re, to);
}

function dataUrl(file) {
  var ext = path.extname(file).slice(1).toLowerCase();
  var mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
  return 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
}

function walkFiles(dir) {
  var out = [];
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).forEach(function (n) {
    var full = path.join(dir, n);
    if (fs.statSync(full).isDirectory()) out = out.concat(walkFiles(full));
    else out.push(full);
  });
  return out;
}

/** 공략 이미지 목록 (내용은 파일에 쓸 때 한 장씩 읽는다) */
function listGuides() {
  var dir = path.join(ROOT, 'guides');
  if (!fs.existsSync(dir)) return null;
  var map = [], n = 0, bytes = 0;
  walkFiles(dir).forEach(function (f) {
    map.push({ name: path.basename(f), file: f });
    bytes += fs.statSync(f).size;
    n++;
  });
  return n ? { map: map, count: n, bytes: bytes } : null;
}
/* ---------- 박아 넣은 배율에 맞춰 지도 메타 고치기 ----------
 * 타일을 일부 배율만 넣으면, 지도는 "모든 배율이 있다"고 알고 있어서
 * 없는 배율을 요청하다 화면이 빈다. 실제로 넣은 배율만 남긴다.
 * (build-site.js 의 fixMapMeta 와 같은 처리 — 이쪽은 파일이 아니라 문자열을 고친다) */
function fixMapMetaText(html, levelsByKind) {
  var i = html.indexOf('MAP_DATA');
  if (i < 0) return null;
  var start = html.indexOf('{', i);
  var depth = 0, end = -1, quote = '', inStr = false, esc = false;
  for (var k = start; k < html.length; k++) {
    var c = html[k];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) { end = k + 1; break; } }
  }
  if (end < 0) return null;

  var data = JSON.parse(html.slice(start, end));
  var kept = {}, dropped = 0;
  (data.worlds || []).forEach(function (w) {
    (w.dimensions || []).forEach(function (dim) {
      (dim.maps || []).forEach(function (m) {
        (m.layers || []).forEach(function (layer) {
          Object.keys(layer.kinds || {}).forEach(function (kind) {
            var allow = levelsByKind[kind];
            var info = layer.kinds[kind];
            if (!allow || !allow.length) { delete layer.kinds[kind]; dropped++; return; }
            var before = info.levels.length;
            info.levels = info.levels.filter(function (lv) { return allow.indexOf(lv.level) >= 0; });
            dropped += before - info.levels.length;
            kept[kind] = info.levels.map(function (lv) { return lv.level; }).sort(function (a, b) { return a - b; });
            if (!info.levels.length) delete layer.kinds[kind];
          });
        });
      });
    });
  });

  return { html: html.slice(0, start) + JSON.stringify(data) + html.slice(end),
           kept: kept, dropped: dropped };
}

/** 지도 페이지를 준비한다 — 타일은 목록만 잡고, 실제 내용은 파일에 쓸 때 한 장씩 읽는다.
 *  (배율을 전부 담으면 400MB가 넘어 통째로 문자열에 들고 있을 수 없다) */
function prepareMap(levels) {
  var MAP = path.join(ROOT, 'map');
  if (!fs.existsSync(path.join(MAP, 'index.html'))) return null;
  var mv = fs.readFileSync(path.join(MAP, 'index.html'), 'utf8');

  /* 1) 담을 타일 목록 (levels 에 든 배율만) */
  var TILES = path.join(MAP, 'tiles');
  var tileList = [], tileBytes = 0;
  var levelsByKind = {};      // map/slope/depth → 실제로 넣은 배율
  walkFiles(TILES).forEach(function (f) {
    var rel = path.relative(MAP, f).split(path.sep).join('/');
    var parts = rel.split('/');
    var level = +parts[parts.length - 2];
    var kind = parts[parts.length - 3];
    if (levels !== 'all' && levels.indexOf(level) < 0) return;
    tileList.push({ rel: rel, file: f });
    tileBytes += fs.statSync(f).size;
    if (!levelsByKind[kind]) levelsByKind[kind] = [];
    if (levelsByKind[kind].indexOf(level) < 0) levelsByKind[kind].push(level);
  });
  var tileCount = tileList.length;

  /* 1-1) 넣은 배율만 있다고 메타를 다시 쓴다 (안 하면 빈 화면) */
  var meta = fixMapMetaText(mv, levelsByKind);
  if (!meta) {
    console.error('! 지도 메타(MAP_DATA)를 못 고쳤습니다 — 타일이 안 보일 수 있습니다');
  } else {
    mv = meta.html;
  }

  /* 2) 자생지 색칠 목록 */
  var ovlList = walkFiles(path.join(MAP, 'overlays')).map(function (f) {
    return { rel: path.relative(MAP, f).split(path.sep).join('/'), file: f };
  });

  /* 3) 높이 데이터 (뷰어가 fetch 실패 시 window.MapHeightsData 로 대체한다) */
  var binPath = path.join(MAP, 'heights.bin');
  if (!fs.existsSync(binPath)) binPath = null;

  /* 4) 곁다리 스크립트 인라인 */
  ['heights.js', 'overlays.js'].forEach(function (f) {
    var full = path.join(MAP, f);
    var re = new RegExp('<script src="' + f.replace(/\./g, '\\.') + '"[^>]*></script>');
    if (fs.existsSync(full)) {
      mv = mv.replace(re, '<script>' + fs.readFileSync(full, 'utf8').replace(/<\/script>/gi, '<\\/script>') + '</script>');
    } else {
      mv = mv.replace(re, '');
    }
  });
  mv = mv.replace(/<script src="heights-data\.js"[^>]*><\/script>/, '');

  /* 5) 타일·이미지 주소를 박아둔 것으로 바꾸도록 패치
   * 줄바꿈(CRLF/LF)이나 들여쓰기가 바뀌어도 걸리도록 정규식으로 찾는다.
   * 못 찾으면 조용히 넘어가면 안 된다 — 지도가 통째로 빈 화면이 되기 때문. */
  mv = patch(mv, '타일 주소',
    /return `tiles\/\$\{state\.world\.slug\}\/\$\{state\.dim\.slug\}\/\$\{state\.map\.slug\}\/`\s*\+\s*`\$\{state\.layer\.slug\}\/\$\{kind\}\/\$\{level\}\/\$\{tx\}_\$\{tz\}\.\$\{ext\}`;/,
    'const rel = `tiles/${state.world.slug}/${state.dim.slug}/${state.map.slug}/`'
    + ' + `${state.layer.slug}/${kind}/${level}/${tx}_${tz}.${ext}`;'
    + ' return (window.TILE_EMBED && window.TILE_EMBED[rel]) || rel;');

  mv = patch(mv, '자생지 이미지 주소', /img\.src = herb\.file;/,
    'img.src = (window.OVERLAY_EMBED && window.OVERLAY_EMBED[herb.file]) || herb.file;');

  /* 6) 데이터를 넣을 자리에서 앞뒤로 자른다 — 가운데는 파일에 쓸 때 흘려보낸다 */
  var cut = mv.indexOf('</head>');
  if (cut < 0) { patchFails.push('지도 페이지 </head>'); cut = mv.length; }

  return { head: mv.slice(0, cut), tail: mv.slice(cut),
           tileList: tileList, ovlList: ovlList, heightsPath: binPath,
           tiles: tileCount, tileBytes: tileBytes, overlays: ovlList.length,
           levelsByKind: levelsByKind, metaDropped: meta ? meta.dropped : -1 };
}

/* ---------- 파일 쓰기 ----------
 * 통짜 문자열로 만들면 node 가 문자열 길이 한계(약 512MB)에 걸린다.
 * 그래서 조각을 만드는 즉시 파일로 흘려보낸다. 브라우저 쪽도 같은 이유로
 * 지도를 여러 개의 <script data-embedmap> 로 나눠 담고, Blob 을 조각으로 이어 붙인다. */

/** 바깥 문서 안에 들어가는 조각이라 닫는 태그만 가려 준다 */
function escClose(s) { return s.replace(/<\/script>/gi, '<\\/script>'); }

function fileToDataUrl(file) { return dataUrl(file); }

/** 파일에 순서대로 흘려 쓰는 작은 도우미 */
function makeWriter(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  var fd = fs.openSync(file, 'w');
  var bytes = 0;
  return {
    w: function (s) { bytes += fs.writeSync(fd, s); },
    end: function () { fs.closeSync(fd); return bytes; }
  };
}

/** 지도를 16MB 단위 <script data-embedmap> 여러 개로 나눠 쓴다 */
function makeMapChunker(out, limit) {
  var open = false, size = 0, count = 0;
  return {
    put: function (s) {
      if (!open) {
        out.w('<script ' + (count ? '' : 'id="embeddedMap" ')
          + 'data-embedmap="1" type="text/plain">');
        open = true; size = 0; count++;
      }
      out.w(s);
      size += s.length;
      if (size >= limit) { out.w('</scr' + 'ipt>\n'); open = false; }
    },
    close: function () { if (open) { out.w('</scr' + 'ipt>\n'); open = false; } return count; },
    count: function () { return count; }
  };
}

var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* 인라인할 스크립트 — 없으면 그냥 건너뛴다(선택 파일) */
var SCRIPTS = [
  'craft-core.js', 'game-data.js',
  'map-waypoints.js', 'game-updates.js'
];

var FULL = args.indexOf('--full') >= 0;
/* 전체판은 기본이 "전부" — 배율을 하나도 안 빼고 담는다.
 * 가볍게 하려면 --levels 3,4,5,6 처럼 담을 배율을 직접 준다. */
var LEVELS = (function () {
  var i = args.indexOf('--levels');
  if (i < 0) return 'all';
  var v = String(args[i + 1] || '').trim();
  return (v === 'all' || v === '전부') ? 'all' : v.split(',').map(Number);
})();
if (FULL && outIdx < 0) OUT = path.resolve(ROOT, path.join('dist', '한월공략소-전체.html'));

var inlined = [], skipped = [];

SCRIPTS.forEach(function (file) {
  var re = new RegExp('<script src="' + file.replace(/\./g, '\\.') + '"[^>]*></script>');
  if (!re.test(html)) { skipped.push(file + ' (참조 없음)'); return; }
  var full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    html = html.replace(re, '<!-- ' + file + ' 없음 -->');
    skipped.push(file + ' (파일 없음)');
    return;
  }
  var code = fs.readFileSync(full, 'utf8')
    // 인라인 스크립트 안에서 </script> 문자열이 나오면 파서가 끊긴다
    .replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(re, '<script>\n/* ===== ' + file + ' ===== */\n' + code + '\n</script>');
  inlined.push({ file: file, size: code.length });
});

/* 공략 이미지도 파일 안에 (원하면 --no-guides 로 뺀다) */
var guideInfo = null;
if (FULL && args.indexOf('--no-guides') < 0) {
  guideInfo = listGuides();
  if (guideInfo) {
    var oldImg = "return '<img src=\"'+esc(im.local)+'\" data-remote=\"'+esc(im.remote)+'\"";
    var newImg = "return '<img src=\"'+esc((window.GUIDE_EMBED&&window.GUIDE_EMBED[im.file])||im.local)"
      + "+'\" data-remote=\"'+esc(im.remote)+'\"";
    if (html.indexOf(oldImg) < 0) {
      patchFails.push('공략 이미지 연결 지점');
      guideInfo = null;
    } else {
      html = html.replace(oldImg, newImg);
      html = html.replace("<body", "<!--EMBED_GUIDES-->\n<body");
    }
  }
}

/* 공략 이미지를 안 넣은 판: 옆에 guides/ 폴더가 없으니 처음부터 원본 주소로 띄운다.
 * (예전엔 없는 guides/xxx.png 를 먼저 불러 보고 실패한 뒤에야 원본으로 갔다) */
if (!guideInfo) {
  html = patch(html, '공략 이미지 주소',
    /return '<img src="'\+esc\(im\.local\)\+'"/,
    'return \'<img src="\'+esc(im.remote)+\'"');
  html = patch(html, '공략 이미지 안내문',
    /이미지가 안 보이면 <code>node download-guides\.js<\/code>를 실행하세요\./,
    '이 파일에는 공략 이미지가 안 들어있어 인터넷에서 불러옵니다 '
    + '(전부 담으려면 <code>node build-standalone.js --full</code>).');
}
/** ensureMapLoaded 함수를 통째로 갈아끼운다 (문자열 비교 대신 시작~끝을 찾는다) */
function replaceEnsureMapLoaded(src, lines) {
  var at = src.indexOf('function ensureMapLoaded(){');
  if (at < 0) { patchFails.push('ensureMapLoaded (지도 연결)'); return src; }
  var tail = src.indexOf(String.fromCharCode(10) + '}', at) + 2;
  return src.slice(0, at) + lines.join(String.fromCharCode(10)) + src.slice(tail);
}

/* --full: 지도 페이지를 통째로 박아 넣고, 앱이 그걸 띄우게 바꾼다 */
var mapInfo = null;
if (FULL) {
  mapInfo = prepareMap(LEVELS);
  if (mapInfo) {
    html = html.replace("<body", "<!--EMBED_MAP-->\n<body");

    {
      var newFn = [
        '/* 지도 페이지가 이 파일 안에 조각으로 들어있다 → 이어 붙여 blob 주소로 띄운다.',
        ' * 조각마다 Blob 을 만들어 이어 붙인다 — 통짜 문자열로 합치면',
        ' * 400MB 짜리에서 메모리가 몇 배로 튄다. */',
        'var _embedMapUrl = null;',
        'function embeddedMapUrl(){',
        '  if(_embedMapUrl) return _embedMapUrl;',
        "  var tags = document.querySelectorAll('script[data-embedmap]');",
        '  if(!tags.length || !window.URL || !window.URL.createObjectURL || !window.Blob) return null;',
        "  var hidden = String.fromCharCode(60,92,47)+'script>';",
        "  var real = String.fromCharCode(60,47)+'script>';",
        '  var parts = [];',
        '  for(var i=0;i<tags.length;i++){',
        '    parts.push(new Blob([tags[i].textContent.split(hidden).join(real)]));',
        '  }',
        "  _embedMapUrl = URL.createObjectURL(new Blob(parts, { type:'text/html' }));",
        '  return _embedMapUrl;',
        '}',
        'function ensureMapLoaded(){',
        "  var f = $('#mapFrame');",
        '  if(!f) return;',
        '  var base = embeddedMapUrl();',
        '  if(base){',
        "    var full = (G && G.mapUrl(S.mapX|0, S.mapZ|0, S.mapScale||1)) || '';",
        "    var hash = full.indexOf('#') >= 0 ? full.slice(full.indexOf('#')) : '';",
        '    var url = base + hash;',
        "    if(f.getAttribute('src') !== url) f.setAttribute('src', url);",
        '    return;',
        '  }',
        '  if(!G || !G.MAP_LINK.href) return;',
        '  var u = G.mapUrl(S.mapX|0, S.mapZ|0, S.mapScale||1);',
        "  if(u && f.getAttribute('src') !== u) f.setAttribute('src', u);",
        '}'
      ];
      html = replaceEnsureMapLoaded(html, newFn);
    }
  }
}

/* 지도를 안 넣은 가벼운 판: 죽은 iframe 대신 안내를 띄운다.
 * (예전엔 map/index.html 을 가리켜 놔서 파일 하나만 옮기면 흰 칸만 보였다) */
if (!mapInfo) {
  var WEBMAP = 'https://forky-g.github.io/HANWOL-WEBMAP/';
  html = replaceEnsureMapLoaded(html, [
    '/* 이 파일에는 지도가 안 들어있다 → 안내를 보여 준다 */',
    'function ensureMapLoaded(){',
    "  var f = $('#mapFrame');",
    '  if(!f || f._replaced) return;',
    '  f._replaced = true;',
    "  var box = document.createElement('div');",
    "  box.style.cssText = 'padding:28px 20px;text-align:center;line-height:1.9';",
    "  box.innerHTML = '<div style=\"font-size:34px\">🗺️</div>'",
    "    + '<div style=\"margin-top:6px;font-weight:700\">이 파일에는 지도가 들어있지 않습니다</div>'",
    "    + '<div class=\"hint\" style=\"margin-top:8px\">지도까지 한 파일에 담으려면 '",
    "    + '<code>node build-standalone.js --full</code> 로 만든 '",
    "    + '<b>한월공략소-전체.html</b> 을 쓰세요. (원본 화질 전부 담아 약 490MB, '",
    "    + '<code>--levels 3,4,5,6</code> 을 붙이면 70MB)</div>'",
    "    + '<div style=\"margin-top:14px\"><a class=\"mini\" target=\"_blank\" rel=\"noopener\" href=\"" + WEBMAP + "\">웹 지도 열기 ↗</a></div>'",
    "    + '<div class=\"hint\" style=\"margin-top:10px\">광산·웨이포인트 좌표와 목록은 이 파일 안에 그대로 있습니다.</div>';",
    '  f.parentNode.replaceChild(box, f);',
    '}'
  ]);

  /* 표·버튼의 "새 탭으로 열기"도 죽은 map/index.html 대신 웹 지도로 */
  html = patch(html, '지도 링크 주소',
    /if\(MW\.link\) G\.setMapLink\(MW\.link\);/,
    'if(MW.link){ var _lk = {}; for(var _k in MW.link) _lk[_k] = MW.link[_k];'
    + " _lk.href = '" + WEBMAP + "'; _lk.relative = false; G.setMapLink(_lk); }");
}


/* 단일 파일임을 표시 — 지도 안내 문구에서 헷갈리지 않게 */
html = html.replace('<body>',
  '<body data-standalone="1">\n<!-- 단일 파일 빌드: node build-standalone.js -->');

/* ---------- 여기서부터 실제로 파일에 쓴다 ----------
 * 앱 HTML 은 자리표시 주석(<!--EMBED_GUIDES--> · <!--EMBED_MAP-->)만 갖고 있고,
 * 무거운 데이터는 이 자리에서 한 장씩 읽어 바로 파일로 흘려보낸다. */
var out = makeWriter(OUT);
var CHUNK = 16 * 1024 * 1024;
var chunker = makeMapChunker(out, CHUNK);
var t0 = Date.now();
var progress = 0;

html.split(/(<!--EMBED_GUIDES-->|<!--EMBED_MAP-->)/).forEach(function (seg) {
  if (seg === '<!--EMBED_GUIDES-->') {
    if (!guideInfo) return;
    out.w('<script>window.GUIDE_EMBED={');
    guideInfo.map.forEach(function (g, i) {
      out.w((i ? ',' : '') + JSON.stringify(g.name) + ':"' + fileToDataUrl(g.file) + '"');
    });
    out.w('};</scr' + 'ipt>\n');
    return;
  }
  if (seg === '<!--EMBED_MAP-->') {
    if (!mapInfo) return;
    chunker.put(escClose(mapInfo.head));
    chunker.put('<script>window.TILE_EMBED={');
    mapInfo.tileList.forEach(function (t, i) {
      chunker.put((i ? ',' : '') + JSON.stringify(t.rel) + ':"' + fileToDataUrl(t.file) + '"');
      if (++progress % 2000 === 0) {
        console.log('  … 타일 ' + progress + '/' + mapInfo.tileList.length
          + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + '초)');
      }
    });
    chunker.put('};window.OVERLAY_EMBED={');
    mapInfo.ovlList.forEach(function (o, i) {
      chunker.put((i ? ',' : '') + JSON.stringify(o.rel) + ':"' + fileToDataUrl(o.file) + '"');
    });
    chunker.put('};');
    if (mapInfo.heightsPath) {
      chunker.put('window.MapHeightsData="'
        + fs.readFileSync(mapInfo.heightsPath).toString('base64') + '";');
    }
    chunker.put('<\\/script>');
    chunker.put(escClose(mapInfo.tail));
    chunker.close();
    return;
  }
  out.w(seg);
});
out.end();

var size = fs.statSync(OUT).size;
console.log('만든 파일: ' + OUT + '  ('
  + (size > 1024 * 1024 * 1024 ? (size / 1024 / 1024 / 1024).toFixed(2) + 'GB'
     : size > 10 * 1024 * 1024 ? (size / 1024 / 1024).toFixed(0) + 'MB'
     : (size / 1024).toFixed(0) + 'KB') + ')');
console.log('합친 스크립트 ' + inlined.length + '개');
inlined.forEach(function (i) {
  console.log('  ' + i.file.padEnd(20) + (i.size / 1024).toFixed(0) + 'KB');
});
if (skipped.length) console.log('건너뜀: ' + skipped.join(', '));
if (mapInfo) {
  console.log('\n지도까지 넣음: 타일 ' + mapInfo.tiles + '장 (배율 '
    + (LEVELS === 'all' ? '전부' : LEVELS.join(',')) + ' · 원본 '
    + (mapInfo.tileBytes / 1024 / 1024).toFixed(0) + 'MB)'
    + ' · 자생지 색칠 ' + mapInfo.overlays + '장'
    + (mapInfo.heightsPath ? ' · 높이 데이터 포함' : ''));
  var sharpest = 99;
  Object.keys(mapInfo.levelsByKind).sort().forEach(function (k) {
    var lv = mapInfo.levelsByKind[k].sort(function (a, b) { return a - b; });
    sharpest = Math.min(sharpest, lv[0]);
    console.log('  ' + k.padEnd(8) + '배율 ' + lv.join(','));
  });
  if (mapInfo.metaDropped > 0) console.log('  없는 배율 ' + mapInfo.metaDropped + '개를 지도 메타에서 지움');
  console.log('  지도 조각 ' + chunker.count() + '개로 나눠 담음');
  if (sharpest === 0) {
    console.log('  * 배율 0 까지 담아서 확대해도 원본 화질 그대로입니다.');
  } else if (sharpest < 99) {
    console.log('  * 담은 것 중 가장 자세한 배율이 ' + sharpest + ' 이라 확대하면 흐릿합니다'
      + ' (배율 1당 2배). 전부 담으려면 --levels 를 빼세요.');
  }
}
if (guideInfo) console.log('공략 이미지 ' + guideInfo.count + '장도 넣음');

if (patchFails.length) {
  console.error('\n!!! 못 고친 곳 ' + patchFails.length + '개 — 이대로 두면 화면이 빈다:');
  patchFails.forEach(function (f) { console.error('  · ' + f); });
  console.error('원본(index.html / map/index.html)이 바뀌어 찾는 문구가 어긋났습니다.');
  process.exitCode = 1;
} else {
  console.log('\n외부 파일 없이 이 파일 하나만 열면 됩니다.');
  if (!FULL) console.log('지도까지 넣으려면: node build-standalone.js --full');
}
