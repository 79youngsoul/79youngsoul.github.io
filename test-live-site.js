/* 올라간 사이트(https://79youngsoul.github.io/)가 진짜로 도는지 실제 크롬으로 확인한다.
 *   node test-live-site.js                     기본 주소
 *   node test-live-site.js https://다른주소/    다른 주소로
 * 인터넷에서 받아 오는 것이라 느리면 타임아웃을 늘린다. */
'use strict';
const { chromium } = require('playwright');

const SITE = (process.argv[2] || 'https://79youngsoul.github.io/').replace(/\/?$/, '/');
let pass = 0, fail = 0;
function ok(n, c, x) { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (x ? ' → ' + x : '')); } }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], missing = [];
  let tileOk = 0;   // 지도 타일 요청은 처음부터 세야 한다 (아래 반복문에서 지도 탭이 먼저 열림)
  page.on('response', r => {
    if (/tiles\/.+\.(webp|png)$/.test(r.url()) && r.status() === 200) tileOk++;
  });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() === 404) missing.push(r.url()); });

  const res = await page.goto(SITE, { waitUntil: 'load', timeout: 60000 });
  ok('응답 200', res && res.status() === 200, res && res.status());
  await page.waitForTimeout(1500);

  ok('제목', (await page.title()).includes('한월'), await page.title());
  ok('탭 14개', (await page.$$('.tab')).length === 14);
  ok('버전 최신', (await page.content()).includes('2.14.2'));

  for (const t of ['sum', 'mat', 'rec', 'npc', 'gear', 'prob', 'loc', 'news', 'map']) {
    await page.$eval('.tab[data-p="' + t + '"]', el => {
      el.scrollIntoView({ block: 'center', inline: 'center' }); el.click();
    });
    await page.waitForTimeout(t === 'map' ? 4000 : 250);
    const len = await page.$eval('#p-' + t, el => el.innerHTML.length);
    ok('[' + t + '] 그려짐', len > 50, len);
  }

  const npc = await page.textContent('#p-npc').catch(() => '');
  await page.$eval('.tab[data-p="npc"]', el => el.click());
  await page.waitForTimeout(400);
  const npc2 = await page.textContent('#p-npc');
  ok('최신 데이터(사혼검결·조선장)', npc2.includes('사혼검결') && npc2.includes('조선장'));

  // 지도 타일이 실제로 내려왔는지
  await page.$eval('.tab[data-p="map"]', el => el.click());
  await page.waitForTimeout(6000);
  ok('지도 타일 내려옴', tileOk > 0, tileOk + '장');

  ok('콘솔 오류 없음', errors.length === 0, errors.slice(0, 2).join(' | '));
  ok('404 없음', missing.length === 0, missing.slice(0, 3).join(' | '));

  await page.screenshot({ path: 'shot-live.png' });
  await browser.close();

  console.log('\n=== 올라간 사이트 검사 (' + SITE + ') ===');
  console.log('통과: ' + pass + '  실패: ' + fail);
  console.log(fail === 0 ? '인터넷에서 정상 동작 ✓' : '문제 있음');
  process.exit(fail === 0 ? 0 : 1);
})();
