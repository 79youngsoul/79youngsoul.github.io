/* 단일 파일 빌드 검증 (node test-standalone.js)
 *
 * dist/한월공략소.html 을 "외부 파일 없는 폴더"에서 연 것처럼 띄워서
 * 계산·데이터·검색이 전부 도는지 본다. IPFS·USB 배포용 파일이 깨지지 않게 하는 안전장치.
 */
'use strict';

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'dist', '한월공략소.html');
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? ' → ' + extra : '')); }
}

if (!fs.existsSync(FILE)) {
  console.log('dist/한월공략소.html 없음 — `node build-standalone.js` 먼저 실행하세요.');
  process.exit(0);
}

const html = fs.readFileSync(FILE, 'utf8');

// 외부 파일을 하나도 안 부르는지 (지도 iframe은 예외 — 없으면 안내만 뜬다)
const externalScripts = html.match(/<script[^>]+src="[^"]+"/g) || [];
ok('외부 스크립트 참조 0개', externalScripts.length === 0, externalScripts.join(' | '));
const externalCss = html.match(/<link[^>]+rel="stylesheet"/g) || [];
ok('외부 CSS 참조 0개', externalCss.length === 0, externalCss.join(' | '));
ok('파일 크기 1MB 이하', fs.statSync(FILE).size < 1024 * 1024,
   (fs.statSync(FILE).size / 1024).toFixed(0) + 'KB');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

// resources 를 켜지 않아 외부 요청은 아예 못 한다 = 진짜 단독 실행 확인
new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: 'http://localhost/한월공략소.html'
}).window.document.addEventListener('DOMContentLoaded', () => {});

(async () => {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    url: 'http://localhost/한월공략소.html'
  });
  const w = dom.window, d = w.document;
  await new Promise((r) => setTimeout(r, 900));

  const $ = (s) => d.querySelector(s);
  const $$ = (s) => Array.from(d.querySelectorAll(s));
  const txt = (s) => ($(s) ? $(s).textContent : '');
  const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const tab = (p) => click($$('.tab').find((t) => t.dataset.p === p));

  ok('스크립트 오류 없음', errors.length === 0, errors.slice(0, 2).join(' | '));
  ok('코어 로드', !!w.Craft);
  ok('게임 데이터 로드', !!w.GameData);
  ok('업데이트 내역 로드', !!w.GameUpdates && w.GameUpdates.count() > 0);
  ok('지도 웨이포인트 로드', !!w.MapWaypoints);

  // 첫 화면은 홈 — 계산 결과는 요약 탭으로 옮긴 뒤에 본다
  ok('첫 화면이 홈', $('#p-home').classList.contains('on'));
  ok('홈 바로가기 카드', $$('#p-home .hcard').length >= 6, $$('#p-home .hcard').length);
  ok('홈 숫자 요약', $$('#p-home .hstat').length >= 3, $$('#p-home .hstat').length);
  tab('sum');
  ok('기본 계산 결과 렌더', /전/.test(txt('#p-sum')) && $$('#p-sum .kpi').length >= 6);
  tab('mat');
  ok('재료 탭 동작', $$('#p-mat tbody tr').length > 10, $$('#p-mat tbody tr').length);

  // NPC 제작 목표
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '한철단조석'; input($('#qty'), '1'); click($('#btnAdd'));
  tab('sum');
  ok('NPC 제작 역산 동작', /한철단조석/.test(txt('#p-sum')) && /접합제/.test(txt('#p-sum')));
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '5성곡괭이'; input($('#qty'), '1'); click($('#btnAdd'));

  tab('loc');
  ok('위치 데이터 동작', /매화곡/.test(txt('#p-loc')) && /빙백설화/.test(txt('#p-loc')));
  tab('news');
  ok('업데이트 탭 동작', /개마무사/.test(txt('#p-news')));
  tab('npc');
  ok('비급 표 동작', /빙천검법/.test(txt('#p-npc')));

  input($('#globalQ'), '적동괴');
  ok('통합검색 동작', $$('#gRes .gi').length > 0, $$('#gRes .gi').length);
  input($('#globalQ'), '');

  ok('푸터 · 문의처', /79youngsoul/.test(txt('.foot')));
  ok('디스코드 출처 링크', $$('a[href*="discord.gg/yA6MnmqGzy"]').length > 0);

  // 지도는 이 파일에 없다 — 죽은 iframe 대신 안내가 떠야 한다
  tab('map');
  ok('지도 탭에서 죽지 않음', errors.length === 0, errors.slice(0, 2).join(' | '));
  ok('없는 지도 파일을 안 부름', !$('#mapFrame'),
     $('#mapFrame') ? String($('#mapFrame').getAttribute('src')) : '');
  ok('지도 없음 안내가 뜸', /지도가 들어있지 않습니다/.test(txt('#p-map')));
  ok('안내에 웹 지도 링크', $$('#p-map a[href*="HANWOL-WEBMAP"]').length > 0);

  // 공략 이미지: 옆에 guides/ 폴더가 없으니 처음부터 원본 주소여야 한다
  tab('loc');
  const gbtn = $('#p-loc [data-guide]');
  if (gbtn) {
    click(gbtn);
    const imgs = $$('#guideBox img');
    ok('공략 모달에 이미지', imgs.length > 0, imgs.length);
    ok('공략 이미지가 원본 주소',
       imgs.every((im) => /^https:\/\//.test(im.getAttribute('src') || '')),
       (imgs[0] && imgs[0].getAttribute('src') || '').slice(0, 40));
    ok('없는 guides/ 를 안 부름',
       imgs.every((im) => (im.getAttribute('src') || '').indexOf('guides/') !== 0));
  }

  console.log('\n=== 단일 파일 검증 ===');
  console.log('파일: ' + FILE + ' (' + (fs.statSync(FILE).size / 1024).toFixed(0) + 'KB)');
  console.log('통과: ' + pass + '  실패: ' + fail);
  if (fail) {
    console.log('실패 항목:');
    fails.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('외부 파일 없이 그대로 동작 ✓');
})();
