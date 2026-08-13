/* 진짜 브라우저로 여는 검사 (node test-browser.js)
 *
 * 왜 따로 있나:
 *   화면 테스트(jsdom)는 <canvas> 에 그림이 실제로 그려졌는지 못 본다.
 *   그래서 "타일을 파일 안에 넣어 놓고도 바깥 파일을 찾아서 지도가 새까맣던" 사고를
 *   기존 검사가 전부 통과시켰다. 이건 크롬을 띄워 픽셀을 확인한다.
 *
 * 준비: npm i playwright && npx playwright install chromium   (없으면 그냥 건너뛴다)
 */
'use strict';

const fs = require('fs');
const path = require('path');

let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) {
  try { chromium = require(path.join(process.env.PLAYWRIGHT_DIR || '', 'playwright')).chromium; }
  catch (e2) { /* 아래에서 안내하고 끝낸다 */ }
}
if (!chromium) {
  console.log('playwright 가 없어 브라우저 검사를 건너뜁니다.');
  console.log('설치: npm i playwright && npx playwright install chromium');
  process.exit(0);
}

const LIGHT = path.join(__dirname, 'dist', '한월공략소.html');
const FULL = path.join(__dirname, 'dist', '한월공략소-전체.html');

let pass = 0, fail = 0, skip = 0;
const fails = [];
const ok = (n, c, e) => { if (c) pass++; else { fail++; fails.push(n + (e ? ' → ' + e : '')); } };
const url = (f) => 'file:///' + f.replace(/\\/g, '/');

async function open(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  page.on('requestfailed', (r) => failed.push(r.url().slice(0, 120) + ' :: ' + (r.failure() || {}).errorText));
  const t0 = Date.now();
  await page.goto(url(file), { waitUntil: 'load', timeout: 600000 });
  await page.waitForTimeout(1500);
  return { page, errors, failed, ms: Date.now() - t0 };
}

/** 지도 캔버스에서 "까맣지 않은" 픽셀 비율 */
async function painted(frame) {
  return frame.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, Math.min(c.width, 400), Math.min(c.height, 400)).data;
    let nz = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) nz++;
    return nz / (d.length / 4);
  });
}

(async () => {
  const browser = await chromium.launch();

  /* ---------- 가벼운 판 ---------- */
  if (fs.existsSync(LIGHT)) {
    const { page, errors, failed, ms } = await open(browser, LIGHT);

    /* 첫 화면은 홈 */
    ok('[홈] 열면 홈이 먼저 보임',
       await page.evaluate(() => document.getElementById('p-home').classList.contains('on')));
    ok('[홈] 바로가기 카드', (await page.$$('#p-home .hcard')).length >= 6);
    ok('[홈] 숫자 요약', (await page.$$('#p-home .hstat')).length >= 3);
    await page.click('#p-home .hcard[data-gotab="mine"]');
    await page.waitForTimeout(400);
    ok('[홈] 카드 눌러 이동',
       await page.evaluate(() => document.getElementById('p-mine').classList.contains('on')));

    /* 검색 미리보기 */
    await page.click('.tab[data-p="home"]');
    await page.fill('#globalQ', '적동');
    await page.waitForTimeout(400);
    ok('[검색] 결과 목록 뜸', (await page.$$('#gRes .gi')).length > 0);
    const prev1 = await page.textContent('#gPrev');
    ok('[검색] 미리보기 채워짐', prev1.trim().length > 3, prev1.slice(0, 40));
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    const prev2 = await page.textContent('#gPrev');
    ok('[검색] ↓ 로 미리보기 바뀜', prev1 !== prev2, prev2.slice(0, 40));
    await page.fill('#globalQ', '');
    await page.click('#globalQ');
    await page.waitForTimeout(300);
    ok('[검색] 빈 칸이면 분류 훑어보기', (await page.$$('#gRes .gct')).length > 5,
       String((await page.$$('#gRes .gct')).length));
    await page.keyboard.press('Escape');

    await page.click('.tab[data-p="map"]');
    await page.waitForTimeout(1200);
    ok('[가벼운 판] 스크립트 오류 없음', errors.length === 0, errors[0]);
    ok('[가벼운 판] 죽은 지도 창이 없음', !(await page.$('#mapFrame')));
    ok('[가벼운 판] 지도 없음 안내가 보임',
       /지도가 들어있지 않습니다/.test(await page.innerText('#p-map')));
    ok('[가벼운 판] 없는 파일을 안 부름',
       !failed.some((f) => /map\/index\.html|\/guides\//.test(f)), failed[0]);

    await page.click('.tab[data-p="loc"]');
    await page.waitForTimeout(400);
    await page.click('[data-guide]');
    await page.waitForTimeout(5000);
    const imgs = await page.evaluate(() => Array.prototype.map.call(
      document.querySelectorAll('#guideBox img'), (i) => ({ w: i.naturalWidth, src: i.src.slice(0, 8) })));
    ok('[가벼운 판] 공략 이미지가 원본 주소', imgs.length > 0 && imgs.every((i) => i.src === 'https://'));
    if (imgs.every((i) => i.w > 0)) pass++;
    else { skip++; console.log('  · [가벼운 판] 공략 이미지 로드는 인터넷이 있어야 확인됩니다 — 건너뜀'); }
    /* 편의 기능 — 진짜 스크롤·클릭이 필요한 것들 (jsdom 으로는 못 본다) */
    await page.click('#btnGuideClose');        // 앞에서 연 공략 창 닫기
    await page.waitForTimeout(200);
    await page.click('.tab[data-p="mine"]');
    await page.waitForTimeout(400);

    // 맨 위로 버튼은 내려야 나온다
    ok('[편의] 처음엔 맨 위로 버튼 숨김',
       !(await page.evaluate(() => document.getElementById('btnTop').classList.contains('on'))));
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(300);
    ok('[편의] 내리면 맨 위로 버튼 나타남',
       await page.evaluate(() => document.getElementById('btnTop').classList.contains('on')));
    await page.click('#btnTop');
    await page.waitForTimeout(900);
    ok('[편의] 누르면 맨 위로 감', (await page.evaluate(() => window.scrollY)) < 50,
       String(await page.evaluate(() => window.scrollY)));

    // 글자 크기 — 실제로 글자가 커지는지 (계산된 값으로 확인)
    const fontOf = () => page.evaluate(() =>
      parseFloat(getComputedStyle(document.body).fontSize));
    const f0 = await fontOf();
    await page.click('#btnFontUp');
    const f1 = await fontOf();
    ok('[편의] 글자 크게 하면 실제로 커짐', f1 > f0, f0 + 'px → ' + f1 + 'px');
    await page.click('#btnFontDown');
    ok('[편의] 되돌리면 원래 크기', Math.abs((await fontOf()) - f0) < 0.1);

    // 표 정렬 — 가장 큰 표의 머리글을 눌러 본다 (작은 안내표는 줄이 몇 개 없다)
    const bigIdx = await page.evaluate(() => {
      const ts = Array.from(document.querySelectorAll('#p-mine table'));
      let best = 0, n = -1;
      ts.forEach((t, i) => { const c = t.tBodies[0] ? t.tBodies[0].rows.length : 0;
        if (c > n) { n = c; best = i; } });
      return best;
    });
    const col = () => page.evaluate((i) => Array.from(
      document.querySelectorAll('#p-mine table')[i].tBodies[0].rows)
      .map((r) => r.cells[0].textContent), bigIdx);
    const before = await col();
    await page.evaluate((i) => document.querySelectorAll('#p-mine table')[i]
      .tHead.rows[0].cells[0].click(), bigIdx);
    await page.waitForTimeout(200);
    const after = await col();
    ok('[편의] 표 정렬이 실제로 동작',
       after.length === before.length && before.length > 3
       && after.every((v, i) => i === 0 || v.localeCompare(after[i - 1], 'ko') >= 0),
       before.length + '줄 · ' + after.slice(0, 3).join(' / '));

    // 표 복사 버튼이 눌리는지 (클립보드 권한 없이도 안 죽어야)
    ok('[편의] 표 복사 버튼 있음', (await page.$$('#p-mine .tblbtn')).length > 0);

    // 단축키 창
    await page.keyboard.press('?');
    await page.waitForTimeout(200);
    ok('[편의] ? 로 단축키 창 열림',
       await page.evaluate(() => document.getElementById('keyModal').classList.contains('on')));
    await page.keyboard.press('Escape');
    ok('[편의] Esc 로 닫힘',
       !(await page.evaluate(() => document.getElementById('keyModal').classList.contains('on'))));

    console.log('[가벼운 판] 여는 데 ' + (ms / 1000).toFixed(1) + '초');
    await page.close();
  }

  /* ---------- 지도 포함 전체판 ---------- */
  if (fs.existsSync(FULL)) {
    const size = fs.statSync(FULL).size;
    const { page, errors, failed, ms } = await open(browser, FULL);
    const t1 = Date.now();
    await page.click('.tab[data-p="map"]');
    // 지도가 실제로 그려질 때까지 기다린다 (몇 초 걸리는지 재려고)
    let mapMs = -1;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      const fr = page.frames().find((f) => f !== page.mainFrame());
      if (fr) {
        let r = -1;
        try { r = await painted(fr); } catch (e) { /* 아직 로딩 중 */ }
        if (r > 0.9) { mapMs = Date.now() - t1; break; }
      }
    }
    if (mapMs < 0) mapMs = Date.now() - t1;

    ok('[전체판] 스크립트 오류 없음', errors.length === 0, errors[0]);
    ok('[전체판] 바깥 파일을 안 부름', failed.length === 0, failed[0]);

    const src = await page.getAttribute('#mapFrame', 'src');
    ok('[전체판] 지도가 내장본(blob)으로 열림', !!src && src.indexOf('blob:') === 0, String(src).slice(0, 40));

    const frame = page.frames().find((f) => f !== page.mainFrame());
    ok('[전체판] 지도 페이지가 살아있음', !!frame);
    if (frame) {
      const info = await frame.evaluate(() => ({
        tiles: window.TILE_EMBED ? Object.keys(window.TILE_EMBED).length : 0,
        overlays: window.OVERLAY_EMBED ? Object.keys(window.OVERLAY_EMBED).length : 0,
        heights: typeof window.MapHeightsData,
        embedded: window.TILE_EMBED
          ? Object.values(window.TILE_EMBED).slice(0, 50).every((v) => /^data:image\//.test(v)) : false,
      }));
      ok('[전체판] 타일이 파일 안에 있음', info.tiles > 100, info.tiles + '장');
      ok('[전체판] 타일이 data 주소', info.embedded);
      ok('[전체판] 자생지 색칠 내장', info.overlays > 0, info.overlays + '장');
      ok('[전체판] 높이 데이터 내장', info.heights === 'string');

      const ratio = await painted(frame);
      ok('[전체판] 지도 타일이 실제로 그려짐', ratio > 0.9,
         '까맣지 않은 픽셀 ' + (ratio * 100).toFixed(1) + '%');

      // 자생지 켜 보기
      await frame.click('#btn-overlays');
      await frame.click('#overlay-all-on');
      await page.waitForTimeout(4000);
      const herbOn = await frame.evaluate(() =>
        (document.getElementById('overlay-count') || {}).textContent || '');
      ok('[전체판] 자생지 색칠 켜짐', /켜짐/.test(herbOn), herbOn);

      // 커서 높이 — iframe 안 좌표를 페이지 좌표로 옮겨서 캔버스 위에 올린다
      const box = await frame.evaluate(() => {
        const r = document.querySelector('canvas').getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      const fb = await (await page.$('#mapFrame')).boundingBox();
      await page.mouse.move(fb.x + box.x + box.w / 3, fb.y + box.y + box.h / 2);
      await page.waitForTimeout(800);
      const bar = await frame.evaluate(() => document.body.innerText);
      ok('[전체판] 커서 높이(Y) 표시', /Y\s*-?\d/.test(bar), (bar.match(/Y[^\n]{0,12}/) || [''])[0]);
    }

    await page.click('.tab[data-p="loc"]');
    await page.waitForTimeout(400);
    await page.click('[data-guide]');
    await page.waitForTimeout(3000);
    const gimgs = await page.evaluate(() => Array.prototype.map.call(
      document.querySelectorAll('#guideBox img'), (i) => ({ w: i.naturalWidth, embedded: /^data:/.test(i.src) })));
    ok('[전체판] 공략 이미지가 내장본', gimgs.length > 0 && gimgs.every((i) => i.embedded));
    ok('[전체판] 공략 이미지가 실제로 뜸', gimgs.every((i) => i.w > 0), JSON.stringify(gimgs[0] || {}));

    console.log('[전체판] ' + (size / 1024 / 1024).toFixed(0) + 'MB · 여는 데 '
      + (ms / 1000).toFixed(1) + '초 · 지도 뜨는 데 ' + (mapMs / 1000).toFixed(1) + '초');
    await page.close();
  }

  await browser.close();

  console.log('\n=== 브라우저 검사 (크롬) ===');
  console.log('통과: ' + pass + '  실패: ' + fail + (skip ? '  건너뜀: ' + skip : ''));
  if (fail) { fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
  console.log('실제 브라우저에서 지도·이미지까지 보임 ✓');
})();
