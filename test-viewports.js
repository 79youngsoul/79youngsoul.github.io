/* PC / 태블릿 / 모바일 3종 화면에서 실제 크롬으로 훑어본다.
 * - 콘솔 오류 0
 * - 가로 스크롤(문서가 화면보다 넓음) 없음
 * - 탭 14개 전부 열리고, 열 때마다 내용이 그려지는지
 * - 새로 넣은 것(관련 링크 분류 5개 · NPC 묶음 3개)이 보이는지
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const FILE = 'file:///' + path
  .resolve('D:/백업/한월/제작/dist/한월공략소.html')
  .replace(/\\/g, '/')
  .split('/').map(function (seg, i) { return i === 0 ? seg : encodeURIComponent(seg); })
  .join('/');

/* isMobile:true 로 열면 window.innerWidth 가 레이아웃 폭으로 잡혀서 "넘쳤는지" 비교가
 * 무의미해진다(390 뷰포트인데 736 으로 보고됨). 그래서 폭 비교는 항상
 * documentElement.clientWidth 로 하고, 모바일도 isMobile 없이 폭만 좁혀서 본다. */
const SIZES = [
  { name: 'PC',     w: 1440, h: 900 },
  { name: '태블릿', w: 820,  h: 1180, touch: true },
  { name: '모바일', w: 390,  h: 844, touch: true }
];

/* 모바일에서는 탭 줄이 가로 스크롤이라 화면 밖 탭은 옆 탭에 가려진다.
 * 사람은 탭 줄을 밀어서 누르므로, 검사도 탭을 줄 안에서 가운데로 민 뒤 누른다. */
async function clickSel(page, sel) {
  await page.$eval(sel, function (el) {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    el.click();
  });
}

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

(async function () {
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: size.w, height: size.h },
      hasTouch: !!size.touch,
      deviceScaleFactor: 1
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(FILE, { waitUntil: 'load' });
    await page.waitForTimeout(600);

    console.log('\n--- ' + size.name + ' ' + size.w + '×' + size.h + ' ---');

    const tabs = await page.$$eval('.tab', els => els.map(e => e.dataset.p));
    ok('탭 14개', tabs.length === 14, tabs.length);

    for (const t of tabs) {
      await clickSel(page, '.tab[data-p="' + t + '"]');
      await page.waitForTimeout(t === 'map' ? 900 : 180);
      const info = await page.evaluate(function (tab) {
        const pane = document.querySelector('#p-' + tab);
        return {
          len: pane ? pane.innerHTML.length : -1,
          docW: document.documentElement.scrollWidth,
          winW: document.documentElement.clientWidth
        };
      }, t);
      ok(size.name + ' [' + t + '] 내용 그려짐', info.len > 50, info.len);
      // 문서가 화면보다 2px 넘게 넓으면 가로 스크롤이 생긴 것
      ok(size.name + ' [' + t + '] 가로 스크롤 없음', info.docW <= info.winW + 2,
         info.docW + ' > ' + info.winW);
    }

    // 새로 넣은 내용 확인
    await clickSel(page, '.tab[data-p="sum"]');
    await page.waitForTimeout(200);
    const sumTxt = await page.textContent('#p-sum');
    ok(size.name + ' 관련 링크 분류 5개',
       ['시작하기', '커뮤니티', '지도 · 자료', '계산기 · 도구', '랭킹']
         .every(c => sumTxt.includes(c)));
    ok(size.name + ' 디스코드 인증 배지', sumTxt.includes('인증 필요'));

    await clickSel(page, '.tab[data-p="npc"]');
    await page.waitForTimeout(250);
    const npcTxt = await page.textContent('#p-npc');
    ok(size.name + ' NPC 묶음 3개',
       ['대장간', '그 밖의 제작 NPC', '도감'].every(c => npcTxt.includes(c)));
    ok(size.name + ' 명인대장장이 제작에 조각 3개 포함',
       npcTxt.includes('조각 3개') && npcTxt.includes('우물영기'));
    ok(size.name + ' 서고관리인 비급 18종', npcTxt.includes('사혼검결'));

    // 계산 한 번 돌려보기 (목표 추가 → 요약)
    await clickSel(page, '.tab[data-p="sum"]');
    await page.waitForTimeout(150);
    await clickSel(page, '#quick [data-q="__clear"]');
    await clickSel(page, '#quick [data-q="5성낫"]');
    await page.waitForTimeout(250);
    const sum2 = await page.textContent('#p-sum');
    ok(size.name + ' 낫 계산 동작', sum2.includes('4성낫') && sum2.includes('정철광'));

    ok(size.name + ' 콘솔 오류 없음', errors.length === 0, errors.slice(0, 2).join(' | '));

    await page.screenshot({
      path: path.join(__dirname, 'shot-' + size.name + '.png'),
      fullPage: false
    });
    await ctx.close();
  }
  await browser.close();

  console.log('\n=== 화면 3종 검사 ===');
  console.log('통과: ' + pass + '  실패: ' + fail);
  console.log(fail === 0 ? 'PC · 태블릿 · 모바일 전부 정상 ✓' : '문제 있음');
  process.exit(fail === 0 ? 0 : 1);
})();
