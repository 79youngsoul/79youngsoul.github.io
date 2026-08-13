/* docs/ (깃허브 Pages 업로드용 폴더)가 그대로 열리는지 실제 크롬으로 확인한다.
 * 로컬 파일로 열어도 되지만, Pages 와 같은 조건(정적 서버)으로 보려고 http 로 띄운다. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, 'docs');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.json':'application/json',
  '.svg':'image/svg+xml', '.md':'text/markdown' };

let pass = 0, fail = 0;
function ok(n, c, x){ if(c) pass++; else { fail++; console.log('  ✗ ' + n + (x ? ' → ' + x : '')); } }

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('no'); return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], missing = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() === 404) missing.push(r.url()); });

  await page.goto('http://localhost:' + port + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  ok('제목', (await page.title()).includes('한월'), await page.title());
  ok('탭 14개', (await page.$$('.tab')).length === 14);

  for (const t of ['sum','mat','ord','tree','sim','rec','mine','npc','gear','prob','loc','news','map']) {
    await page.$eval('.tab[data-p="' + t + '"]', el => { el.scrollIntoView({block:'center',inline:'center'}); el.click(); });
    await page.waitForTimeout(t === 'map' ? 2500 : 200);
    const len = await page.$eval('#p-' + t, el => el.innerHTML.length);
    ok('[' + t + '] 그려짐', len > 50, len);
  }
  // 지도 타일이 실제로 그려졌는지
  const tiles = await page.evaluate(() => {
    const f = document.querySelector('#p-map iframe');
    return f ? 1 : 0;
  });
  ok('지도 프레임 존재', tiles === 1);

  await page.$eval('.tab[data-p="npc"]', el => el.click());
  await page.waitForTimeout(300);
  const npc = await page.textContent('#p-npc');
  ok('NPC 데이터 최신(사혼검결)', npc.includes('사혼검결'));

  ok('콘솔 오류 없음', errors.length === 0, errors.slice(0,2).join(' | '));
  ok('404 없음', missing.length === 0, missing.slice(0,3).join(' | '));

  await page.screenshot({ path: 'shot-docs.png' });
  await browser.close();
  server.close();

  console.log('\n=== docs 폴더(깃허브 Pages) 검사 ===');
  console.log('통과: ' + pass + '  실패: ' + fail);
  console.log(fail === 0 ? '그대로 올리면 동작 ✓' : '문제 있음');
  process.exit(fail === 0 ? 0 : 1);
})();
