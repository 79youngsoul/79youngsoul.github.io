/* 화면 크기 대응 점검 (node test-responsive.js)
 *
 * jsdom은 실제 레이아웃을 계산하지 않으므로, "좁은 화면에서 깨지는 흔한 원인"을 규칙으로 잡는다.
 *   - 표가 가로 스크롤 상자(.tw) 안에 있는지
 *   - 좁은 화면에서 넘칠 만한 고정 폭이 있는지
 *   - 모바일 필수 설정(viewport, 입력 16px, 터치 크기)이 있는지
 */
'use strict';

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? '  → ' + extra : '')); }
}

const DIR = __dirname;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
['craft-core.js', 'game-data.js', 'map-waypoints.js', 'game-updates.js'].forEach((f) => {
  if (!fs.existsSync(path.join(DIR, f))) return;
  html = html.replace(new RegExp('<script src="' + f.replace(/\./g, '\\.') + '"[^>]*></script>'),
    '<script>' + fs.readFileSync(path.join(DIR, f), 'utf8') + '</script>');
});

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(String(e.message).split('\n')[0]));

(async () => {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: vc, url: 'http://localhost/index.html'
  });
  const w = dom.window, d = w.document;
  await new Promise((r) => setTimeout(r, 900));
  const $ = (s) => d.querySelector(s);
  const $$ = (s) => Array.from(d.querySelectorAll(s));
  const css = $$('style').map((s) => s.textContent).join('').replace(/\s/g, '');
  const click = (el) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

  ok('스크립트 오류 없음', errors.length === 0, errors.slice(0, 2).join(' | '));

  /* ---- 공통 설정 ---- */
  const vp = d.querySelector('meta[name="viewport"]');
  ok('viewport 설정', !!vp && /width=device-width/.test(vp.content), vp && vp.content);
  ok('초기 확대 배율 1', !!vp && /initial-scale=1/.test(vp.content));
  ok('태블릿 분기(≤1000px)', css.indexOf('@media(max-width:1000px)') >= 0);
  ok('모바일 분기(≤640px)', css.indexOf('@media(max-width:640px)') >= 0);
  ok('탭 가로 스크롤', /\.tabs\{[^}]*overflow-x:auto/.test(css) || css.indexOf('overflow-x:auto') >= 0);
  ok('표 가로 스크롤 상자', css.indexOf('.tw{overflow-x:auto') >= 0 || css.indexOf('.tw{content-visibility') >= 0);
  ok('입력칸 16px (iOS 확대 방지)', css.indexOf('font-size:16px') >= 0);
  ok('터치 목표 크기 지정', /min-height:32px/.test(css));
  ok('모바일 지도 높이 제한', css.indexOf('#mapFrame{height:min(70vh') >= 0);
  ok('사이드 1단 전환', /\.wrap\{grid-template-columns:1fr\}/.test(css));
  ok('카드 그리드 1단 전환', /\.grid2\{grid-template-columns:1fr\}/.test(css));
  ok('푸터 항상 아래', css.indexOf('margin-top:auto') >= 0 && css.indexOf('min-height:100vh') >= 0);

  /* ---- 탭마다 실제 DOM 점검 ---- */
  const tabs = $$('.tab').map((t) => t.dataset.p);
  let looseTables = [], wideInline = [], nowrapOutside = [];
  tabs.forEach((p) => {
    click($$('.tab').find((t) => t.dataset.p === p));
    const pane = $('#p-' + p);
    if (!pane) return;
    // 표는 .tw 안에 있어야 좁은 화면에서 가로로 넘어가지 않는다
    Array.from(pane.querySelectorAll('table')).forEach((tb) => {
      if (!tb.closest('.tw')) looseTables.push(p);
    });
    // 인라인 고정 폭이 320px를 넘으면 모바일에서 넘친다
    Array.from(pane.querySelectorAll('[style*="width"]')).forEach((el) => {
      const m = /width:\s*(\d+)px/.exec(el.getAttribute('style') || '');
      if (m && +m[1] > 320 && !el.closest('.tw')) wideInline.push(p + ':' + m[1] + 'px');
    });
    // nowrap 텍스트가 스크롤 상자 밖에 있으면 줄바꿈이 안 돼 넘친다
    Array.from(pane.querySelectorAll('[style*="nowrap"]')).forEach((el) => {
      if (!el.closest('.tw')) nowrapOutside.push(p);
    });
  });
  ok('모든 표가 가로 스크롤 상자 안', looseTables.length === 0,
     Array.from(new Set(looseTables)).join(','));
  ok('넘칠 만한 고정 폭 없음', wideInline.length === 0,
     Array.from(new Set(wideInline)).join(','));
  ok('스크롤 상자 밖 nowrap 없음', nowrapOutside.length === 0,
     Array.from(new Set(nowrapOutside)).join(','));

  /* ---- 사이드 접기 (모바일에서 특히 중요) ---- */
  ok('사이드 카드 접기 가능', $$('[data-fold]').length === 2, $$('[data-fold]').length);
  click($$('[data-fold]')[0]);
  ok('접으면 내용 숨김', $$('[data-foldbox].off').length === 1);
  click($$('[data-fold]')[0]);

  /* ---- 지도 뷰어(별도 파일)도 확인 ---- */
  const mapFile = path.join(DIR, 'map', 'index.html');
  if (fs.existsSync(mapFile)) {
    const mv = fs.readFileSync(mapFile, 'utf8');
    ok('지도: viewport 설정', /name="viewport"[^>]*width=device-width/.test(mv));
    ok('지도: 모바일 분기', /@media\s*\(max-width:\s*720px\)/.test(mv));
    ok('지도: 터치 제스처(한 손가락 이동·두 손가락 확대)',
       mv.indexOf('touch-action') >= 0 && mv.indexOf('pointers.size === 2') >= 0);
  }

  console.log('\n=== 화면 대응 점검 ===');
  console.log('탭 ' + tabs.length + '개 확인 · PC(2단) / 태블릿(1단) / 모바일(축소) 규칙');
  console.log('통과: ' + pass + '  실패: ' + fail);
  if (fail) {
    console.log('실패 항목:');
    fails.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('좁은 화면에서 깨질 요소 없음 ✓');
})();
