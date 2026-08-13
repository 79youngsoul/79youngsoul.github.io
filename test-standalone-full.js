/* 지도 포함 단일 파일 검증
 *
 * 배율을 전부 담으면 파일이 수백 MB가 된다 — 통째로 읽으면 node 가 죽는다.
 * 그래서 파일을 흘려 읽으며 검사하고, 작은 파일일 때만 jsdom 으로 실제 실행까지 본다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'dist', '한월공략소-전체.html');
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, e) => { if (c) pass++; else { fail++; fails.push(n + (e ? ' → ' + e : '')); } };

if (!fs.existsSync(FILE)) {
  console.log('dist/한월공략소-전체.html 없음 — `node build-standalone.js --full` 먼저 실행하세요.');
  process.exit(0);
}
const SIZE = fs.statSync(FILE).size;
const JSDOM_LIMIT = 120 * 1024 * 1024;   // 이보다 크면 브라우저 흉내(jsdom)를 못 돌린다

/* ---------------- 1) 흘려 읽으며 검사 ---------------- */
const found = {};                 // 찾은 문구
const MARKS = {
  '외부 스크립트 참조': /<script[^>]+src="[^"]+"/,
  '지도 조각 태그': /<script[^>]*data-embedmap="1"/,
  '타일 데이터': /window\.TILE_EMBED=\{/,
  '자생지 데이터': /window\.OVERLAY_EMBED=\{/,
  '높이 데이터': /window\.MapHeightsData="/,
  '공략 이미지 데이터': /window\.GUIDE_EMBED=\{/,
  'blob 조립 코드': /embeddedMapUrl\(\)/,
  '타일 주소 바꿔치기': /window\.TILE_EMBED && window\.TILE_EMBED\[rel\]/,
  '자생지 주소 바꿔치기': /window\.OVERLAY_EMBED && window\.OVERLAY_EMBED\[herb\.file\]/,
  '지도 메타': /MAP_DATA/,
  '웨이포인트': /\[웹맵\]/
};

const tileLevels = {};            // kind → Set(level)
let tileCount = 0, guideCount = 0, chunkCount = 0;
let mapData = '';                 // MAP_DATA 조각 모으기
let grabbing = false, depth = 0, inStr = false, q = '', esc = false, mapDataDone = false;

const fd = fs.openSync(FILE, 'r');
const BUF = Buffer.alloc(8 * 1024 * 1024);
// 한글이 조각 경계에서 반 토막 나지 않게 (바이트 → 글자 변환을 이어서 한다)
const decoder = new (require('string_decoder').StringDecoder)('utf8');
let carry = '';                   // 조각 경계에서 문구가 잘리지 않게 겹쳐 둔다
let read;
while ((read = fs.readSync(fd, BUF, 0, BUF.length, null)) > 0) {
  const text = carry + decoder.write(BUF.slice(0, read));

  Object.keys(MARKS).forEach((k) => { if (!found[k] && MARKS[k].test(text)) found[k] = true; });

  chunkCount += (text.match(/<script[^>]*data-embedmap="1"/g) || []).length;

  const tiles = text.match(/"tiles\/[^"]+"/g) || [];
  tiles.forEach((t) => {
    const parts = t.replace(/"/g, '').split('/');
    const kind = parts[parts.length - 3], lv = +parts[parts.length - 2];
    (tileLevels[kind] = tileLevels[kind] || new Set()).add(lv);
  });
  tileCount += (text.match(/"tiles\/[^"]+":"data:image\//g) || []).length;
  guideCount += (text.match(/"[^"/]+\.(png|jpg|jpeg|webp)":"data:image\//g) || []).length;

  // MAP_DATA 통째로 모아서 나중에 파싱 (지도가 "있다"고 아는 배율을 보려고)
  if (!mapDataDone) {
    let i = 0;
    if (!grabbing) {
      const at = text.indexOf('MAP_DATA');
      if (at >= 0) {
        const brace = text.indexOf('{', at);
        if (brace >= 0) { grabbing = true; i = brace; }
      }
    }
    if (grabbing) {
      for (; i < text.length; i++) {
        const c = text[i];
        mapData += c;
        if (inStr) {
          if (esc) { esc = false; continue; }
          if (c === '\\') { esc = true; continue; }
          if (c === q) inStr = false;
          continue;
        }
        if (c === '"' || c === "'") { inStr = true; q = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (!depth) { mapDataDone = true; break; } }
      }
    }
  }

  carry = text.slice(-4096);
}
fs.closeSync(fd);

// 겹쳐 읽은 만큼 중복으로 센 것 보정은 하지 않는다 — 겹침 구간(4KB)에 걸친 항목은
// 양쪽에서 한 번씩 세어질 수 있어 "이상"으로만 판정한다.
ok('외부 스크립트 참조 0개', !found['외부 스크립트 참조']);
ok('지도가 조각으로 들어있음', !!found['지도 조각 태그'], chunkCount + '조각');
ok('타일 data 주소 내장', !!found['타일 데이터']);
ok('자생지 색칠 내장', !!found['자생지 데이터']);
ok('높이 데이터 내장', !!found['높이 데이터']);
ok('공략 이미지 내장', !!found['공략 이미지 데이터']);
ok('blob 으로 지도 띄움', !!found['blob 조립 코드']);
ok('내장 지도에 웨이포인트', !!found['웨이포인트']);

/* 지도가 통째로 빈 화면이던 사고를 잡는 검사 —
 * 타일을 넣어 놓고도 주소를 안 바꾸면(또는 없는 배율을 있다고 두면) 아무것도 안 그려진다. */
ok('타일 주소를 내장본으로 바꿈', !!found['타일 주소 바꿔치기'], '못 바꾸면 지도가 빈 화면');
ok('자생지 주소를 내장본으로 바꿈', !!found['자생지 주소 바꿔치기']);
ok('내장 타일 100장 이상', tileCount > 100, tileCount + '장');
ok('공략 이미지 34장', guideCount >= 34, guideCount + '장');

let declared = 0; const missing = [];
try {
  const data = JSON.parse(mapData);
  (data.worlds || []).forEach((w) => (w.dimensions || []).forEach((dim) =>
    (dim.maps || []).forEach((m) => (m.layers || []).forEach((layer) =>
      Object.keys(layer.kinds || {}).forEach((kind) => {
        (layer.kinds[kind].levels || []).forEach((lv) => {
          declared++;
          if (!tileLevels[kind] || !tileLevels[kind].has(lv.level)) missing.push(kind + '/' + lv.level);
        });
      })))));
} catch (e) { missing.push('MAP_DATA 파싱 실패: ' + e.message); }
ok('지도 메타에 없는 배율이 없음', missing.length === 0,
   '없는 타일을 있다고 함: ' + missing.slice(0, 5).join(', '));
ok('지도 메타가 비지 않음', declared > 0, declared + '개');

const levelsText = Object.keys(tileLevels).sort().map(
  (k) => k + ' ' + Array.from(tileLevels[k]).sort((a, b) => a - b).join(',')).join(' · ');

/* ---------------- 2) 작은 파일이면 실제로 실행까지 ---------------- */
(async () => {
  if (SIZE <= JSDOM_LIMIT) {
    const { JSDOM, VirtualConsole } = require('jsdom');
    const html = fs.readFileSync(FILE, 'utf8');
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push(String(e.message).split('\n')[0]));
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true,
      virtualConsole: vc, url: 'http://localhost/f.html' });
    const w = dom.window, d = w.document;
    await new Promise((r) => setTimeout(r, 1200));
    const $ = (s) => d.querySelector(s), $$ = (s) => Array.from(d.querySelectorAll(s));
    const txt = (s) => ($(s) ? $(s).textContent : '');

    ok('스크립트 오류 없음', errors.length === 0, errors.slice(0, 2).join(' | '));
    ok('앱 로드', !!w.Craft && !!w.GameData);
    ok('계산 결과 렌더', /전/.test(txt('#p-sum')));

    const mapTab = $$('.tab').find((t) => t.dataset.p === 'map');
    mapTab.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    ok('지도 프레임 존재', !!$('#mapFrame'));
    const src = $('#mapFrame') && $('#mapFrame').getAttribute('src');
    const canBlob = typeof w.URL.createObjectURL === 'function' && typeof w.Blob === 'function';
    ok('지도가 내장본으로 열림 (blob 지원 시)',
       canBlob ? (!!src && src.indexOf('blob:') === 0) : !!src,
       (canBlob ? 'blob 지원' : 'jsdom에 blob 없음 → 대체 경로') + ' / ' + (src || '').slice(0, 30));

    const guideKeys = w.GUIDE_EMBED ? Object.keys(w.GUIDE_EMBED).length : 0;
    ok('공략 이미지가 data 주소',
       guideKeys > 0 && Object.values(w.GUIDE_EMBED).every((v) => /^data:image\//.test(v)), guideKeys);

    const locTab = $$('.tab').find((t) => t.dataset.p === 'loc');
    locTab.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const gbtn = $('#p-loc [data-guide]');
    if (gbtn) {
      gbtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      const imgs = $$('#guideBox img');
      ok('공략 모달에 이미지', imgs.length > 0, imgs.length);
      ok('모달 이미지가 내장본',
         imgs.every((im) => (im.getAttribute('src') || '').indexOf('data:image/') === 0),
         (imgs[0] && imgs[0].getAttribute('src') || '').slice(0, 24));
    }
  }

  console.log('\n=== 지도 포함 단일 파일 ===');
  console.log('파일 ' + (SIZE / 1024 / 1024).toFixed(1) + 'MB · 지도 조각 ' + chunkCount + '개');
  console.log('담긴 배율: ' + levelsText);
  if (SIZE > JSDOM_LIMIT) {
    console.log('* ' + (JSDOM_LIMIT / 1024 / 1024) + 'MB 넘는 파일이라 실행 검사(jsdom)는 건너뜀 '
      + '— 실제 브라우저 확인은 `node test-browser.js`');
  }
  console.log('통과: ' + pass + '  실패: ' + fail);
  if (fail) { fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
  console.log('지도까지 파일 하나로 동작 ✓');
})();
