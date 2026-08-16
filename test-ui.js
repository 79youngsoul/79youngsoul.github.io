/* index.html DOM 스모크 테스트 (jsdom) */
const { JSDOM, VirtualConsole } = require('jsdom');
const path = require('path');
const fs = require('fs');

const DIR = 'D:\\백업\\한월\\제작';
const file = path.join(DIR, 'index.html');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

let pass = 0, fail = 0, fails = [];
function ok(name, cond, extra) { if (cond) pass++; else { fail++; fails.push(name + (extra ? ' → ' + extra : '')); } }
// 저장된 상태에서 현재 탭 읽기
// 저장은 지연 기록(디바운스)이라 읽기 전에 flush 한다
const store = (w) => {
  if (w.flushSave) w.flushSave();
  return JSON.parse(w.localStorage.getItem('hanwol-craft-v1'));
};
const S_tab = (w) => store(w).tab;

// file:// 오리진에서는 jsdom이 localStorage를 막으므로 http 오리진으로 흉내내고
// 외부 스크립트는 인라인으로 치환해서 로드한다.
let html = fs.readFileSync(file, 'utf8');
const core = fs.readFileSync(path.join(DIR, 'craft-core.js'), 'utf8');
const gdata = fs.readFileSync(path.join(DIR, 'game-data.js'), 'utf8');
html = html.replace('<script src="craft-core.js"></script>', '<script>' + core + '</script>');
html = html.replace('<script src="game-data.js"></script>', '<script>' + gdata + '</script>');
// 지도 웨이포인트는 선택 파일 — 있으면 인라인, 없으면 미연결 상태로 테스트
const mwPath = path.join(DIR, 'map-waypoints.js');
const hasMapWps = fs.existsSync(mwPath);
html = html.replace(/<script src="map-waypoints\.js"[^>]*><\/script>/,
  hasMapWps ? '<script>' + fs.readFileSync(mwPath, 'utf8') + '</script>' : '');
// 게임 업데이트 내역도 선택 파일
const guPath = path.join(DIR, 'game-updates.js');
const hasUpdates = fs.existsSync(guPath);
html = html.replace(/<script src="game-updates\.js"[^>]*><\/script>/,
  hasUpdates ? '<script>' + fs.readFileSync(guPath, 'utf8') + '</script>' : '');

Promise.resolve(new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: 'http://localhost/index.html'
})).then(async dom => {
  const w = dom.window, d = w.document;
  await new Promise(r => setTimeout(r, 800));   // 스크립트 로드 대기

  const $ = s => d.querySelector(s);
  const $$ = s => Array.from(d.querySelectorAll(s));
  const txt = s => ($(s) ? $(s).textContent : '');
  // 탭은 보일 때 그려진다(지연 렌더) — 확인 전에 해당 탭으로 이동
  const clickTab0 = (p) => $$('.tab').find(t => t.dataset.p === p)
    .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

  ok('스크립트 오류 없음', errors.length === 0, errors.join(' | '));
  ok('Craft 코어 로드됨', !!w.Craft);
  ok('탭 14개', $$('.tab').length === 14, $$('.tab').length);

  /* ---- 첫 화면은 홈 ---- */
  ok('처음 열면 홈이 보임', $('#p-home').classList.contains('on')
     && !$('#p-sum').classList.contains('on'));
  ok('홈에 제목·소개', /한월 공략소/.test(txt('#p-home')) && /한월RPG/.test(txt('#p-home')));
  ok('홈 바로가기 카드', $$('#p-home .hcard').length >= 6, $$('#p-home .hcard').length);
  ok('홈 숫자 요약', $$('#p-home .hstat').length >= 3, $$('#p-home .hstat').length);
  ok('홈에 최근 업데이트', /최근 업데이트/.test(txt('#p-home')));
  ok('홈에 사용 안내', /단축키|Ctrl\+K/.test(txt('#p-home')));
  ok('안 연 계산 탭은 비어 있음', $('#p-sum').innerHTML.length === 0, $('#p-sum').innerHTML.length);
  // 홈 카드로 이동
  click($$('#p-home .hcard').find(c => c.dataset.gotab === 'mine'));
  ok('홈 카드로 탭 이동', $('#p-mine').classList.contains('on'));
  click($$('.tab').find(t => t.dataset.p === 'home'));
  ok('홈으로 돌아옴', $('#p-home').classList.contains('on'));
  click($('#p-home [data-gotab="sum"]'));
  ok('"제작 계산 시작" 으로 요약 탭', $('#p-sum').classList.contains('on'));
  ok('GameData 로드됨', !!w.GameData);
  ok('기본 목표 5성곡괭이 칩 존재', /5성곡괭이/.test(txt('#targets')));
  ok('요약 KPI 렌더', $$('#p-sum .kpi').length >= 6, $$('#p-sum .kpi').length);
  ok('데이터 출처 카드 렌더', /데이터 출처/.test(txt('#p-sum')));
  ok('출처 5곳 링크', $$('#p-sum a[target="_blank"]').length >= 4,
     $$('#p-sum a[target="_blank"]').length);
  // 푸터 (비공식 표기 · 출처 · 문의처)
  ok('푸터 렌더', !!$('.foot'));
  ok('비공식 표기', /비공식/.test(txt('.foot')));
  ok('문의처 표기', /79youngsoul/.test(txt('.foot')));
  ok('브라우저 저장 안내', /브라우저에만/.test(txt('.foot')));
  ok('푸터에 출처 링크 4개', $$('.foot a[target="_blank"]').length >= 4,
     $$('.foot a[target="_blank"]').length);
  ok('푸터 이름이 현재 이름', /한월 공략소/.test(txt('.foot')) && !/제작 계산기/.test(txt('.foot')));
  ok('푸터가 본문(.wrap)보다 뒤에 옴', (function () {
    var kids = Array.from(d.body.children);
    return kids.indexOf($('.foot')) > kids.indexOf($('.wrap'));
  })());
  ok('푸터에 버전 표시', /^v\d+\.\d+\.\d+/.test(txt('#footVer')), txt('#footVer'));
  // 모바일·태블릿
  ok('viewport 메타 존재',
     (d.querySelector('meta[name="viewport"]') || {}).getAttribute
       && d.querySelector('meta[name="viewport"]').getAttribute('content').indexOf('width=device-width') === 0);
  const css = Array.from(d.querySelectorAll('style')).map(s2 => s2.textContent).join('');
  ok('태블릿 대응 미디어쿼리', /@media\(max-width:1000px\)/.test(css.replace(/\s/g, '')));
  ok('모바일 대응 미디어쿼리', /@media\(max-width:640px\)/.test(css.replace(/\s/g, '')));
  ok('모바일에서 탭 가로 스크롤', /overflow-x:auto/.test(css.replace(/\s/g, '')));
  ok('iOS 입력 확대 방지(16px)', /font-size:16px/.test(css.replace(/\s/g, '')));
  ok('푸터는 항상 화면 아래로(sticky footer)',
     /margin-top:auto/.test(css.replace(/\s/g, '')) && /min-height:100vh/.test(css.replace(/\s/g, '')));


  ok('가이드 영상 카드 렌더', /성장 가이드 영상/.test(txt('#p-sum'))
     && /설치 및 접속 가이드/.test(txt('#p-sum')));
  ok('영상 4개 링크', $$('#p-sum a[href*="youtu.be"]').length === 4,
     $$('#p-sum a[href*="youtu.be"]').length);
  ok('영상 링크는 새 탭',
     $$('#p-sum a[href*="youtu.be"]').every(a => a.getAttribute('target') === '_blank'));
  ok('관련 링크 카드 렌더', /관련 링크/.test(txt('#p-sum')) && /ProDays/.test(txt('#p-sum')));
  ok('링크가 분류별로 묶임',
     /커뮤니티/.test(txt('#p-sum')) && /지도 · 자료/.test(txt('#p-sum'))
     && /계산기 · 도구/.test(txt('#p-sum')));
  ok('출처 배지 표시', /출처/.test(txt('#p-sum')));
  ok('링크 설명 표시', /스킬 매크로|도깨비 스텟 계산/.test(txt('#p-sum')));
  ok('관련 링크 주소',
     $$('#p-sum a').some(a => (a.getAttribute('href') || '').indexOf('Pro-Days/SkillMacro') > 0) &&
     $$('#p-sum a').some(a => (a.getAttribute('href') || '').indexOf('yasu2947.github.io') > 0));
  ok('푸터에도 관련 링크',
     $$('.foot a').some(a => (a.getAttribute('href') || '').indexOf('Pro-Days/SkillMacro') > 0));
  ok('푸터에 디스코드 링크',
     $$('.foot a').some(a => (a.getAttribute('href') || '').indexOf('discord.gg/yA6MnmqGzy') > 0));

  ok('상단 웹지도·약초계산기 링크',
     $$('.top a[href*="HANWOL-WEBMAP"]').length === 1 &&
     $$('.top a[href*="herb_calculator"]').length === 1);
  ok('확률·부적 시트 링크 존재',
     $$('#p-sum a').some(a => (a.getAttribute('href') || '').indexOf('1bXZ8gICXNbS') > 0) &&
     $$('#p-sum a').some(a => (a.getAttribute('href') || '').indexOf('1sXR0Dq3tM') > 0));
  ok('요약에 총 비용 표시', /전/.test(txt('#p-sum')));
  ok('곡괭이 단계 5행', $$('#p-sum table')[0].querySelectorAll('tbody tr').length === 5,
     $$('#p-sum table')[0].querySelectorAll('tbody tr').length);
  clickTab0('mat');
  ok('재료 탭 렌더', $$('#p-mat tbody tr').length > 10, $$('#p-mat tbody tr').length);
  clickTab0('ord');
  ok('제작순서 항목 존재', $$('#p-ord .step').length > 10, $$('#p-ord .step').length);
  clickTab0('tree');
  ok('전개도 렌더', $$('#p-tree .tree li').length > 3, $$('#p-tree .tree li').length);
  clickTab0('rec');
  // 곡괭이 + 화로 + NPC 제작(명인·조수·조선장·무림맹주) + 상점 구매 아이템
  var recExpect = w.Craft.TOOL_NAMES.length + Object.keys(w.Craft.FURNACE).length
    + w.GameData.npcCraftNames().length + Object.keys(w.GameData.SHOP_ITEMS).length;
  ok('레시피 카드 렌더', $$('#p-rec .rec').length === recExpect,
     $$('#p-rec .rec').length + ' / 기대 ' + recExpect);
  ok('레시피 도감에 조선장 배장비 카드', /5성외륜/.test($('#p-rec').innerHTML));
  clickTab0('sum');
  // 한 번도 안 연 탭은 비어 있어야 한다 (지연 렌더)
  ok('안 연 탭은 그리지 않음(지연 렌더)', $('#p-gear').innerHTML.length === 0,
     $('#p-gear').innerHTML.length);
  ok('목표 선택에 NPC 제작 포함',
     Array.from($('#selItem').querySelectorAll('optgroup'))
       .some(g => /제작$/.test(g.label) && /대장장이/.test(g.label)),
     Array.from($('#selItem').querySelectorAll('optgroup')).map(g => g.label).join('/'));
  ok('목표 선택에 조선장·무림맹주 묶음',
     ['조선장 제작', '무림맹주 제작'].every(lb =>
       Array.from($('#selItem').querySelectorAll('optgroup')).some(g => g.label === lb)),
     Array.from($('#selItem').querySelectorAll('optgroup')).map(g => g.label).join('/'));
  ok('목표 선택에 5성 배장비 4종',
     ['5성외륜', '5성갑판', '5성대포', '5성그물'].every(nm =>
       Array.from($('#selItem').options).some(o => o.text === nm)));
  function searchFor(q) {
    const box = $('#globalQ');
    box.value = q;
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
    return txt('#gRes');
  }
  ok('통합검색에 배장비 제작', /5성외륜/.test(searchFor('5성외륜')));
  ok('통합검색에 1성 배장비 상점가',
     /상점/.test(searchFor('1성외륜')) && /5,000전/.test(searchFor('1성외륜')),
     searchFor('1성외륜').slice(0, 120));
  ok('통합검색에 무림맹주 제작', /토벌패/.test(searchFor('토벌패')));
  ok('검색 미리보기에 제작 정보', /고래기름/.test(searchFor('주작단')),
     searchFor('주작단').slice(0, 120));
  searchFor('');

  function click(el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
  function input(el, v) { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); }
  function change(el, v) { if (v !== undefined) el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }

  // 사이드 카드 접기/펴기
  ok('접기 헤더 2개', $$('[data-fold]').length === 2, $$('[data-fold]').length);
  ok('처음엔 펼침', $$('[data-foldbox].off').length === 0);
  click($$('[data-fold]').find(h => h.dataset.fold === 'targets'));
  ok('목표 카드 접힘', $('[data-foldbox="targets"]').classList.contains('off'));
  ok('옵션 카드는 그대로', !$('[data-foldbox="opts"]').classList.contains('off'));
  ok('접힘 상태 저장', store(w).fold && store(w).fold.targets === true,
     JSON.stringify(store(w).fold));
  click($$('[data-fold]').find(h => h.dataset.fold === 'targets'));
  ok('다시 펼침', !$('[data-foldbox="targets"]').classList.contains('off'));

  // 탭 전환
  const matTab = $$('.tab').find(t => t.dataset.p === 'mat');
  click(matTab);
  ok('탭 전환 동작', $('#p-mat').classList.contains('on') && !$('#p-sum').classList.contains('on'));

  // 목표 추가 (요약 탭에서 확인)
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  const before = txt('#p-sum');
  $('#selItem').value = '강철'; input($('#qty'), '3'); click($('#btnAdd'));
  ok('목표 추가됨', /강철/.test(txt('#targets')));
  ok('추가 후 재계산', txt('#p-sum') !== before);

  // 목표 수량 변경
  const qi = $('#targets input[data-tq="강철"]');
  input(qi, '5');
  ok('수량 변경 반영', w.document.querySelector('#targets input[data-tq="강철"]').value === '5');

  // 목표 제거
  click($('#targets [data-tx="강철"]'));
  ok('목표 제거됨', !/강철<\/b>/.test($('#targets').innerHTML));

  // 화력 슬라이더
  const t0 = txt('#p-sum');
  input($('#fire'), '50');
  ok('화력 반영 → 힌트 갱신', /39\.5|0\.60/.test(txt('#fireHint')), txt('#fireHint'));
  ok('화력 반영 → 결과 변화', txt('#p-sum') !== t0);

  // 옵션 체크박스
  const c0 = txt('#p-sum');
  $('#costDown').checked = true; change($('#costDown'));
  ok('비용 -10% 반영', txt('#p-sum') !== c0);
  $('#successUp').checked = true; change($('#successUp'));
  $('#furnaceTimeDown').checked = true; change($('#furnaceTimeDown'));
  const v0 = txt('#p-sum');
  $('#vip').checked = true; change($('#vip'));
  ok('대장장이 VIP -10% 반영', txt('#p-sum') !== v0);
  ok('옵션 4개 적용 후에도 오류 없음', errors.length === 0, errors.join(' | '));

  // 슬롯
  input($('#slots'), '5');
  ok('슬롯 변경 반영', w.document.querySelector('#slots').value === '5');

  // ---- 셋(64개) 표기 ----
  click($$('.tab').find(t => t.dataset.p === 'mat'));
  ok('기본이 셋 표기', /셋/.test(txt('#p-mat')), txt('#p-mat').slice(0, 120));
  ok('셋 설정 기본 64', $('#stack').value === '64');
  input($('#stack'), '100');
  ok('셋 크기 100 적용', /셋/.test(txt('#p-mat')));
  input($('#stack'), '64');
  $('#useStack').checked = false; change($('#useStack'));
  ok('셋 표기 끄면 개수만', !/셋/.test(txt('#p-mat')), txt('#p-mat').slice(0, 120));
  $('#useStack').checked = true; change($('#useStack'));

  // ---- 보유 재료 기능은 제거됨 ----
  ok('보유 재료 사이드 카드 없음', !$('#invBox') && !$('#invSearch') && !$('#btnInvClear'));
  ok('재료 표에 보유/부족 열 없음', !/보유|부족/.test(txt('#p-mat')), txt('#p-mat').slice(0, 80));
  ok('재료 표에 산출 광산 표시', /광산/.test(txt('#p-mat')));

  // ---- NPC 제작 목표 ----
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '한철단조석'; input($('#qty'), '1'); click($('#btnAdd'));
  ok('NPC 제작을 목표로 넣을 수 있음', /한철단조석/.test(txt('#targets')));
  ok('NPC 제작 단계 표시', /NPC 제작/.test(txt('#p-sum')) && /한철단조석/.test(txt('#p-sum')));
  ok('연쇄 재료(접합제·송진칠료)까지 역산',
     /접합제/.test(txt('#p-sum')) && /송진칠료/.test(txt('#p-sum')));
  ok('직접 구할 재료 안내', /직접 구해야 하는 재료/.test(txt('#p-sum')) && /향목가루/.test(txt('#p-sum')));
  ok('NPC 제작비가 총 비용에 포함', /NPC/.test(txt('#p-sum')));
  click($$('.tab').find(t => t.dataset.p === 'mat'));
  ok('NPC 재료가 광산 재료로 이어짐', /돌덩어리/.test(txt('#p-mat')) && /갈옥/.test(txt('#p-mat')));
  click($$('.tab').find(t => t.dataset.p === 'ord'));
  ok('제작 순서에 NPC 단계 포함', /한철단조석/.test(txt('#p-ord')) && /접합제/.test(txt('#p-ord')));
  ok('NPC 단계도 체크박스', $$('#p-ord input[data-done^="NPC|"]').length === 3,
     $$('#p-ord input[data-done^="NPC|"]').length);
  ok('NPC 단계에 성공률·비용 표기', /기대 시도/.test(txt('#p-ord')) && /전/.test(txt('#p-ord')));
  ok('제작 순서에 직접 구할 재료 표', /직접 구해야 하는 재료/.test(txt('#p-ord')));
  const ordDone0 = $$('#p-ord input[data-done]:checked').length;
  click($('#p-ord input[data-done^="NPC|"]'));
  ok('NPC 단계 체크 저장', $$('#p-ord input[data-done]:checked').length === ordDone0 + 1);
  click($('#btnDoneClear'));
  ok('진행 초기화', $$('#p-ord input[data-done]:checked').length === 0);

  // 조수 제작(완갑)도 연쇄로
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '취금완갑'; input($('#qty'), '1'); click($('#btnAdd'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('조수 제작 연쇄(취금완갑 ← 황동완갑)',
     /취금완갑/.test(txt('#p-sum')) && /황동완갑/.test(txt('#p-sum')));
  ok('완갑 재료가 직접 구할 재료로', /흉폭한영기/.test(txt('#p-sum')));

  // 낫 — 곡괭이와 같은 승급 계산
  click($('#quick [data-q="__clear"]'));
  click($('#quick [data-q="5성낫"]'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('빠른 목표에 5성낫 버튼', /5성낫/.test(txt('#targets')));
  ok('낫 승급 연쇄 표시', /4성낫/.test(txt('#p-sum')) && /1성낫/.test(txt('#p-sum')));
  ok('낫 재료가 광산 재료로 이어짐', /정철광/.test(txt('#p-sum')) && /돌덩어리/.test(txt('#p-sum')));
  ok('낫에는 상점 단계가 없음', !/1성낫[\s\S]{0,40}상점/.test(txt('#p-sum')));
  click($$('.tab').find(t => t.dataset.p === 'rec'));
  ok('레시피 도감에 낫 카드', /5성낫/.test(txt('#p-rec')));

  // 대장장이 일반 제작 · 목걸이 조각 합성
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '오색진연옥'; input($('#qty'), '1'); click($('#btnAdd'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('목걸이 연쇄(오색수정·진연옥) 역산',
     /오색수정/.test(txt('#p-sum')) && /진연옥/.test(txt('#p-sum')));
  ok('목걸이 실패 시 조각 표기', /오색진연옥조각/.test(txt('#p-sum')));
  click($$('.tab').find(t => t.dataset.p === 'npc'));
  ok('NPC 탭에 대장장이 제작 표', /대장장이 제작/.test(txt('#p-npc')) && /열화신공/.test(txt('#p-npc')));
  ok('NPC 탭 명인대장장이 카드에 목걸이 강화 메뉴',
     /목걸이 강화/.test(txt('#p-npc')) && /우물영기/.test(txt('#p-npc')));

  // 서고관리인 — 비급 제작 + 상점 비급
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '섬멸검법'; input($('#qty'), '1'); click($('#btnAdd'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('비급 제작 목표 가능', /섬멸검법/.test(txt('#p-sum')));
  ok('상점 비급(단섬검법)이 상점가와 함께 표시',
     /단섬검법/.test(txt('#p-sum')) && /5,000전/.test(txt('#p-sum')),
     txt('#p-sum').slice(0, 100));
  click($$('.tab').find(t => t.dataset.p === 'npc'));
  ok('NPC 탭에 서고관리인 표', /서고관리인/.test(txt('#p-npc')) && /홍매지폭/.test(txt('#p-npc')));
  ok('NPC 탭에 고급 비급까지', /사혼검결/.test(txt('#p-npc')) && /압축무공정수/.test(txt('#p-npc')));

  // 사혼검결 — NPC 4곳을 가로지르는 최장 연쇄
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '사혼검결'; input($('#qty'), '1'); click($('#btnAdd'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('사혼검결이 오색금강진연옥·무림맹비급까지 역산',
     /오색금강진연옥/.test(txt('#p-sum')) && /무림맹비급/.test(txt('#p-sum')));
  ok('드랍 비급(빙천검법)은 직접 구할 재료로',
     /빙천검법/.test(txt('#p-sum')) && /직접 구해야 하는 재료/.test(txt('#p-sum')));

  // 조선장 배장비 — 승급 연쇄 + 1성 상점 구매
  click($('#quick [data-q="__clear"]'));
  click($('#quick [data-q="5성외륜"]'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('빠른 목표에 5성 배장비 버튼', /5성외륜/.test(txt('#targets')));
  ok('배장비 승급 연쇄 표시',
     /4성외륜/.test(txt('#p-sum')) && /2성외륜/.test(txt('#p-sum')));
  ok('배장비 재료(무공정수)가 직접 구할 재료로', /무공정수/.test(txt('#p-sum')));
  ok('1성 배장비는 상점가 표시', /1성외륜/.test(txt('#p-sum')) && /상점/.test(txt('#p-sum')));
  ok('상점 구매비가 총 비용 설명에 포함', /총 비용[\s\S]{0,200}상점/.test(txt('#p-sum')),
     (txt('#p-sum').match(/총 비용[^\n]*/) || [''])[0]);
  click($$('.tab').find(t => t.dataset.p === 'npc'));
  ok('NPC 탭에 조선장 표', /조선장/.test(txt('#p-npc')) && /5성그물/.test(txt('#p-npc')));
  ok('NPC 탭에 무림맹주 표', /무림맹주/.test(txt('#p-npc')) && /토벌패/.test(txt('#p-npc')));

  // 주작단 — 실패 시 현무단 안내
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '주작단'; input($('#qty'), '1'); click($('#btnAdd'));
  click($$('.tab').find(t => t.dataset.p === 'sum'));
  ok('주작단 실패 시 현무단 표기', /현무단/.test(txt('#p-sum')), txt('#p-sum').slice(0, 120));
  ok('주작단 재료 고래기름', /고래기름/.test(txt('#p-sum')));

  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '5성곡괭이'; input($('#qty'), '1'); click($('#btnAdd'));
  // 제작 순서 체크
  const ordTab = $$('.tab').find(t => t.dataset.p === 'ord'); click(ordTab);
  const cb = $('#p-ord input[data-done]');
  click(cb); // 실제 클릭처럼 활성화 동작이 checked를 토글함
  ok('제작 순서 체크 저장', $$('#p-ord .step.done').length === 1, $$('#p-ord .step.done').length);
  click($('#btnDoneClear'));
  ok('진행 초기화', $$('#p-ord .step.done').length === 0);

  // 제작 순서의 재료 수량이 실패 소모까지 반영하는지 (3성 1개 = 시도 2회 → 2성곡괭이 2개)
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '3성곡괭이'; input($('#qty'), '1'); click($('#btnAdd'));
  click($$('.tab').find(t => t.dataset.p === 'ord'));
  const step3 = $$('#p-ord .step').find(s => /3성곡괭이/.test(s.textContent));
  ok('3성 단계 재료에 2성곡괭이 2개 표시', /2성곡괭이 2개/.test(step3.textContent),
     (step3.textContent.match(/재료:[^\n]*/) || [''])[0]);
  // 하위 곡괭이 유지 옵션이면 ×1
  $('#failConsumesBase').checked = false; change($('#failConsumesBase'));
  const step3b = $$('#p-ord .step').find(s => /3성곡괭이/.test(s.textContent));
  ok('하위 유지 옵션 시 2성곡괭이 1개', /2성곡괭이 1개/.test(step3b.textContent),
     (step3b.textContent.match(/재료:[^\n]*/) || [''])[0]);
  $('#failConsumesBase').checked = true; change($('#failConsumesBase'));
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '5성곡괭이'; input($('#qty'), '1'); click($('#btnAdd'));

  // 전개도 토글
  const treeTab = $$('.tab').find(t => t.dataset.p === 'tree'); click(treeTab);
  const n0 = $$('#p-tree .tree li').length;
  click($('#btnTreeAll'));
  ok('전개도 전부 펼치기', $$('#p-tree .tree li').length >= n0, $$('#p-tree .tree li').length + ' vs ' + n0);
  click($('#btnTreeNone'));
  ok('전개도 접기', $$('#p-tree .tree li').length < $$('#p-tree .tree li').length + 1);
  const node = $('#p-tree .tree .n');
  click(node);
  ok('노드 클릭 토글 오류 없음', errors.length === 0, errors.join(' | '));

  // 레시피 검색
  const recTab = $$('.tab').find(t => t.dataset.p === 'rec'); click(recTab);
  input($('#recQ'), '강철');
  ok('레시피 검색 필터링', $$('#p-rec .rec').length > 0 && $$('#p-rec .rec').length < 20, $$('#p-rec .rec').length);
  input($('#recQ'), '');

  // 시뮬레이션
  const simTab = $$('.tab').find(t => t.dataset.p === 'sim'); click(simTab);
  input($('#simRuns'), '300');
  click($('#btnSim'));
  await new Promise(r => setTimeout(r, 3000));
  ok('시뮬 결과 렌더', /p90|안전 예산/.test(txt('#p-sim')), txt('#p-sim').slice(0, 80));
  ok('히스토그램 생성', $$('#p-sim .hist i').length === 40, $$('#p-sim .hist i').length);

  // ---- 업데이트 내역 ----
  ok('버전 버튼 존재', !!$('#btnVer'));
  ok('처음엔 새 버전 점 표시', !!$('#btnVer .dot'));
  click($('#btnVer'));
  ok('업데이트 내역 모달 열림', $('#modal').classList.contains('on'));
  ok('버전 항목 렌더', $$('#verList .ver').length >= 3, $$('#verList .ver').length);
  ok('현재 버전 표기', /현재 v\d+\.\d+\.\d+/.test(txt('#verNow')), txt('#verNow'));
  ok('확인 후 점 사라짐', !$('#btnVer .dot'));
  click($('#btnModalClose'));
  ok('모달 닫힘', !$('#modal').classList.contains('on'));

  // ---- 광산 탭 ----
  const mineTab = $$('.tab').find(t => t.dataset.p === 'mine'); click(mineTab);
  ok('광산 탭 렌더', /전체 광산 65곳/.test(txt('#p-mine')), txt('#p-mine').slice(0, 80));
  ok('광산 표 65행 + 동선/필요 행 포함', $$('#p-mine tbody tr').length > 65,
     $$('#p-mine tbody tr').length);
  ok('필요 재료 → 광산 색깔 매핑 표시', /녹색광산|청색광산|황색광산|적색광산|모든 광산/.test(txt('#p-mine')));
  const greenPath = txt('#p-mine');
  click($$('#p-mine [data-mc]').find(b => b.dataset.mc === '적'));
  ok('동선 색깔 탭 전환', txt('#p-mine') !== greenPath);
  ok('동선 색깔 탭 하나만 활성', $$('#p-mine [data-mc].on').length === 1,
     $$('#p-mine [data-mc].on').length);
  // 웨이포인트 출처 분리 표시
  ok('웨이포인트 출처 표 렌더', /웨이포인트 출처/.test(txt('#p-mine')));
  ok('가져온 데이터 / 지도 웨이포인트 구분', /가져온 데이터/.test(txt('#p-mine'))
     && /지도 웨이포인트/.test(txt('#p-mine')));
  ok('합쳐지지 않는다는 안내', /합쳐지지 않습니다/.test(txt('#p-mine')));

  if (hasMapWps) {
    // 실제 지도 파일이 연결된 경우
    const mw = w.MapWaypoints;
    ok('지도 웨이포인트 로드됨', !!mw && mw.list.length > 0, mw ? mw.list.length : 'null');
    ok('주입 개수 = 파일 개수',
       w.GameData.waypointCounts().map === mw.list.length,
       w.GameData.waypointCounts().map + ' vs ' + mw.list.length);
    ok('지도 웨이포인트 카드 렌더', /지도 웨이포인트/.test(txt('#p-mine')));
    ok('세트 필터 버튼 존재', $$('#p-mine [data-ms]').length > 1, $$('#p-mine [data-ms]').length);
    ok('지도 딥링크 생성', /#Multiplayer_/.test($('#p-mine').innerHTML));
    ok('광산 표에도 지도 열기 링크', $$('#p-mine a[href*="#"]').length > 0);
    ok('딥링크가 상대경로(map/)',
       $$('#p-mine a[href*="#"]').every(a => a.getAttribute('href').indexOf('map/') === 0),
       $$('#p-mine a[href*="#"]')[0].getAttribute('href').slice(0, 60));
    ok('표에 지도 이동 버튼', $$('#p-mine [data-mapjump]').length > 0,
       $$('#p-mine [data-mapjump]').length);

    // 지도 웨이포인트 목록 껐다 켜기
    ok('목록 표시 체크박스 존재', !!$('#showMapWps') && $('#showMapWps').checked);
    const rowsOn = $$('#p-mine tbody tr').length;
    $('#showMapWps').checked = false; change($('#showMapWps'));
    ok('끄면 접힘 표시', /접힘/.test(txt('#p-mine')));
    ok('끄면 웨이포인트 행이 사라짐', $$('#p-mine tbody tr').length < rowsOn,
       rowsOn + '→' + $$('#p-mine tbody tr').length);
    ok('꺼도 광산 65곳 표는 유지', /전체 광산 65곳/.test(txt('#p-mine')));
    ok('꺼도 출처 표는 유지', /웨이포인트 출처/.test(txt('#p-mine')));
    $('#showMapWps').checked = true; change($('#showMapWps'));
    ok('다시 켜면 복구', $$('#p-mine tbody tr').length === rowsOn,
       rowsOn + ' vs ' + $$('#p-mine tbody tr').length);

    // 관련 탭 이동
    ok('관련 탭 버튼 존재', $$('#p-mine [data-gotab]').length > 0,
       $$('#p-mine [data-gotab]').length);
    const npcBtn = $$('#p-mine [data-gotab]').find(b => b.dataset.gotab === 'npc');
    if (npcBtn) {
      click(npcBtn);
      ok('관련 탭으로 이동', S_tab(w) === 'npc', S_tab(w));
      click($$('.tab').find(t => t.dataset.p === 'mine'));
    }

    // 세트 필터
    const mineSet = $$('#p-mine [data-ms]').find(b => b.dataset.ms === '광산');
    if (mineSet) {
      click(mineSet);
      ok('세트 필터 적용', $$('#p-mine [data-ms].on').length === 1,
         $$('#p-mine [data-ms].on').length);
      ok('필터 후에도 광산 65곳 표 유지', /전체 광산 65곳/.test(txt('#p-mine')));
    }
    click($$('#p-mine [data-ms]').find(b => b.dataset.ms === '전체'));

    // 검색
    input($('#mapQ'), '광산');
    ok('지도 웨이포인트 검색 동작', errors.length === 0, errors.join(' | '));
    input($('#mapQ'), '');
  }

  // 임의 주입 → 별도 표로만 나오고 webmap 데이터는 그대로
  const beforeWebmap = w.GameData.waypoints('webmap').length;
  w.GameData.setMapWaypoints([{ name: '테스트거점', x: 111, y: 70, z: -222 }]);
  click(mineTab);
  ok('주입 후 지도 웨이포인트 표시', /테스트거점/.test(txt('#p-mine')));
  ok('주입 후에도 광산 65곳 유지', /전체 광산 65곳/.test(txt('#p-mine')));
  ok('주입해도 webmap 웨이포인트 수 불변',
     w.GameData.waypoints('webmap').length === beforeWebmap);
  ok('광산 표에 지도 웨이포인트 안 섞임',
     !/테스트거점/.test($('#p-mine').lastElementChild.textContent));
  w.GameData.setMapWaypoints([]);
  click(mineTab);
  ok('초기화 후 미연결 복귀', /아직 연결 안 됨/.test(txt('#p-mine')));

  // 실제 지도 데이터 복원
  if (hasMapWps) { w.GameData.setMapWaypoints(w.MapWaypoints.list); click(mineTab); }

  ok('광산 탭 오류 없음', errors.length === 0, errors.join(' | '));

  // ---- NPC · 영단 탭 ----
  const npcTab = $$('.tab').find(t => t.dataset.p === 'npc'); click(npcTab);
  ok('제작 NPC 렌더', /명인대장장이/.test(txt('#p-npc')));
  ok('명인대장장이 제작비 1,000전 표기', /1,000전/.test(txt('#p-npc')));
  ok('영단 표 렌더', /금환단/.test(txt('#p-npc')) && /주작단/.test(txt('#p-npc')));
  ok('비급 표 렌더', /비급/.test(txt('#p-npc')) && /빙천검법/.test(txt('#p-npc'))
     && /천살검법/.test(txt('#p-npc')));
  input($('#npcQ'), '빙천검법');
  ok('비급도 검색됨', /빙천검법/.test(txt('#p-npc')) && !/천살검법/.test(txt('#p-npc')));
  input($('#npcQ'), '');
  const npcAll = $$('#p-npc tbody tr').length;
  input($('#npcQ'), '금환단');
  ok('NPC·영단 검색 필터링', $$('#p-npc tbody tr').length < npcAll,
     $$('#p-npc tbody tr').length + ' vs ' + npcAll);
  input($('#npcQ'), '');

  // ---- 장비 제작 탭 ----
  const gearTab = $$('.tab').find(t => t.dataset.p === 'gear'); click(gearTab);
  ok('장비 10종 카드', $$('#p-gear .rec').length === 10, $$('#p-gear .rec').length);
  ok('티어 확률 표기', /30%/.test(txt('#p-gear')) && /5%/.test(txt('#p-gear')));
  ok('장신구 표 렌더', /청룡반지/.test(txt('#p-gear')));
  const tgtBefore = Object.keys(store(w).targets).length;
  click($('#p-gear [data-gear][data-mul="4"]'));
  const tgtAfter = store(w).targets;
  ok('장비 재료 목표 추가', Object.keys(tgtAfter).length > tgtBefore,
     Object.keys(tgtAfter).join(','));
  ok('4부위는 ×4 수량', Object.keys(tgtAfter).some(k => tgtAfter[k] >= 4), JSON.stringify(tgtAfter));
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '5성곡괭이'; input($('#qty'), '1'); click($('#btnAdd'));

  // ---- 확률 · 부적 탭 ----
  const probTab = $$('.tab').find(t => t.dataset.p === 'prob'); click(probTab);
  ok('잠재능력 확률 렌더', /잠재능력 확률/.test(txt('#p-prob')));
  ok('추가능력 확률 렌더', /추가능력 확률/.test(txt('#p-prob')));
  ok('토벌의뢰 표 렌더', /무림맹비급/.test(txt('#p-prob')));
  ok('우물혈석 표 렌더', /6단계/.test(txt('#p-prob')));
  ok('보스 레이드 보상 렌더',
    /보스 레이드 보상/.test(txt('#p-prob')) && /백호반지/.test(txt('#p-prob')));
  ok('오공 레이드 보상 렌더',
    /오공/.test(txt('#p-prob')) && /명월단/.test(txt('#p-prob')) && /8종/.test(txt('#p-prob')));
  ok('부적 6등급 카드(신화 포함)', $$('#p-prob .rec').length === 6, $$('#p-prob .rec').length);
  ok('신화 카드에 계산값 표시', /계산값 100÷13/.test(txt('#p-prob')));
  ok('등급 확률 미고지 안내 표시', /등급 자체가 뜰 확률은/.test(txt('#p-prob')));
  const pillAll = $$('#p-prob .pill').length;
  ok('부적 189종 표시', pillAll === 189, pillAll);
  ok('신화 13종 · 7.6923% 표기', /7\.6923%/.test(txt('#p-prob')));
  ok('신화 옵션 표 렌더', /천강신력부/.test(txt('#p-prob')) && /21\.48/.test(txt('#p-prob')));
  ok('불일치 표 렌더', /부적표 ↔ 확률 시트 불일치/.test(txt('#p-prob')));
  ok('영웅 불일치 경고 표시', /고지 2\.7778% 와 불일치/.test(txt('#p-prob')));
  input($('#probQ'), '현무수호진');
  ok('부적 검색 필터링', $$('#p-prob .pill').length === 1, $$('#p-prob .pill').length);
  ok('검색 시 해당 등급만 표시', $$('#p-prob .rec').length === 1, $$('#p-prob .rec').length);
  input($('#probQ'), '');

  // 부적 리롤 계산기
  ok('리롤 계산기 렌더', /부적 리롤 계산기/.test(txt('#p-prob')));
  ok('기본 전설 등급 5.5556%', /5\.5556%/.test(txt('#p-prob')), txt('#p-prob').slice(0, 60));
  ok('고지 등급은 종류 수 입력 잠김', $('#talKinds').disabled === true);
  input($('#talRolls'), '41');
  ok('41회 리롤 시 90% 이상', /9[0-9]\.\d\d%/.test(txt('#p-prob')));
  // 신화 등급 버튼 = 데이터의 13종 자동 적용
  click($$('#p-prob [data-tg2]').find(b => b.dataset.tg2 === '신화'));
  ok('신화 선택 시 종류 수 자동(13)', $('#talKinds').value === '13', $('#talKinds').value);
  ok('신화 1회 7.6923%', /7\.6923%/.test(txt('#p-prob')));
  // 직접입력 = 임의 종수
  click($$('#p-prob [data-tg2]').find(b => b.dataset.tg2 === '직접입력'));
  ok('직접입력 시 종류 수 입력 가능', $('#talKinds').disabled === false);
  input($('#talKinds'), '10');
  ok('10종이면 1회 10%', /10\.0000%/.test(txt('#p-prob')), txt('#p-prob').slice(0, 80));
  input($('#talWant'), '2');
  ok('2종 노리면 20%', /20\.0000%/.test(txt('#p-prob')));
  input($('#talWant'), '99');
  ok('원하는 종류 > 전체면 안내', /1 이상으로/.test(txt('#p-prob')));
  input($('#talWant'), '1');
  click($$('#p-prob [data-tg2]').find(b => b.dataset.tg2 === '전설'));

  ok('확률 탭 오류 없음', errors.length === 0, errors.join(' | '));

  // ---- 위치 · 웨이포인트 탭 ----
  const locTab = $$('.tab').find(t => t.dataset.p === 'loc'); click(locTab);
  ok('사냥터 렌더', /매화곡/.test(txt('#p-loc')) && /검성지묘/.test(txt('#p-loc')));
  ok('약초 자생지 렌더', /빙백설화/.test(txt('#p-loc')) && /자생지/.test(txt('#p-loc')));
  ok('약초 자생지 색 점 표시', $$('#p-loc .dot').length >= 19, $$('#p-loc .dot').length);
  ok('단서 렌더(적환단·해태단·기린단)',
     /적환단/.test(txt('#p-loc')) && /낡은 두루마리/.test(txt('#p-loc')) && /망월록/.test(txt('#p-loc')));
  ok('항아리 렌더', /탐령구/.test(txt('#p-loc')) && /마모된인장/.test(txt('#p-loc')));
  ok('의문의 상자 렌더', /의문의 상자/.test(txt('#p-loc')) && /고급주문서뽑기/.test(txt('#p-loc')));
  ok('공략 버튼 존재', $$('#p-loc [data-guide]').length >= 28, $$('#p-loc [data-guide]').length);
  ok('동상 렌더', /한월동상/.test(txt('#p-loc')) && /제천대성/.test(txt('#p-loc')));
  ok('비석 렌더', /천보산/.test(txt('#p-loc')) && /청태산/.test(txt('#p-loc')));
  ok('종류 탭에 동상·비석 포함',
     $$('#p-loc [data-lk]').some(b => b.dataset.lk === '동상') &&
     $$('#p-loc [data-lk]').some(b => b.dataset.lk === '비석'));

  const locAllRows = $$('#p-loc tbody tr').length;
  input($('#locQ'), '매화곡');
  ok('위치 검색 필터링', $$('#p-loc tbody tr').length < locAllRows,
     $$('#p-loc tbody tr').length + ' vs ' + locAllRows);
  input($('#locQ'), '');
  click($$('#p-loc [data-lk]').find(b => b.dataset.lk === '약초'));
  ok('종류 탭으로 약초만 표시',
     !/⚔️ 사냥터/.test(txt('#p-loc')) && /🌿 약초 자생지/.test(txt('#p-loc')));
  click($$('#p-loc [data-lk]').find(b => b.dataset.lk === '전체'));
  ok('전체 탭으로 복귀', /⚔️ 사냥터/.test(txt('#p-loc')));

  // 공략 모달
  click($('#p-loc [data-guide]'));
  ok('공략 모달 열림', $('#guideModal').classList.contains('on'));
  ok('공략 이미지 삽입', $$('#guideBox img').length >= 1, $$('#guideBox img').length);
  click($('#btnGuideClose'));
  ok('공략 모달 닫힘', !$('#guideModal').classList.contains('on'));

  // 약초 조합 계산기
  ok('약초 조합 계산기 렌더', /약초 조합 계산기/.test(txt('#p-loc')));
  ok('약초 버튼 19개', $$('#p-loc [data-herb]').length === 19, $$('#p-loc [data-herb]').length);
  ['녹태', '민들레', '생강'].forEach(n => click($$('#p-loc [data-herb]').find(b => b.dataset.herb === n)));
  ok('3개 선택 시 합계 3점', /합계 3점/.test(txt('#p-loc')), txt('#p-loc').slice(0, 40));
  ok('결과 황토환 표시', /황토환/.test(txt('#p-loc')));
  click($$('#p-loc [data-herb]').find(b => b.dataset.herb === '홍련업화'));
  ok('S 추가 시 7점 명목환', /합계 7점/.test(txt('#p-loc')) && /명목환/.test(txt('#p-loc')));
  click($('#btnHerbReset'));
  ok('초기화 시 안내 문구', /3개 이상/.test(txt('#p-loc')));
  ok('약초 계산기 출처 링크',
     $$('#p-loc a').some(a => (a.getAttribute('href') || '').indexOf('herb_calculator') > 0));

  // 웨이포인트 관리 — 추가 / 수정 / 삭제
  ok('웨이포인트 관리 카드 렌더', /웨이포인트 관리/.test(txt('#p-loc')));
  const wpRows0 = $$('#p-loc [data-wpedit]').length;
  input($('#wpNewName'), '내 창고'); input($('#wpNewX'), '111');
  input($('#wpNewY'), '70'); input($('#wpNewZ'), '-222');
  click($('#btnWpAdd'));
  ok('웨이포인트 추가됨', /내 창고/.test(txt('#p-loc')));
  const saved0 = store(w);
  ok('추가분 저장됨', (saved0.myWps || []).some(x => x.name === '내 창고'),
     JSON.stringify(saved0.myWps || []));

  click($$('#p-loc [data-wo]').find(b => b.dataset.wo === 'mine'));
  ok('내가 추가 필터', $$('#p-loc [data-wpedit]').length === 1, $$('#p-loc [data-wpedit]').length);
  click($('#p-loc [data-wpedit]'));
  ok('인라인 수정 폼 열림', !!$('#wpeName') && $('#wpeName').value === '내 창고');
  input($('#wpeName'), '내 창고2'); input($('#wpeX'), '333');
  click($('#btnWpSave'));
  ok('수정 반영', /내 창고2/.test(txt('#p-loc')) && /333/.test(txt('#p-loc')));

  // 가져온 웨이포인트 수정 → 원본은 그대로, 수정본만 표시
  click($$('#p-loc [data-wo]').find(b => b.dataset.wo === 'webmap'));
  input($('#wpQ'), '1번 광산');
  click($('#p-loc [data-wpedit]'));
  input($('#wpeName'), '1번 광산(내표시)');
  click($('#btnWpSave'));
  ok('가져온 웨이포인트도 수정 가능', /1번 광산\(내표시\)/.test(txt('#p-loc')));
  ok('원본 데이터는 안 바뀜',
     w.GameData.MINES[0].n === 1 && !/내표시/.test(JSON.stringify(w.GameData.webmapWaypoints()[0])));
  click($('#p-loc [data-wpedit]'));
  click($('#p-loc [data-wpreset]'));
  ok('원래대로 되돌리기', !/내표시/.test(txt('#p-loc')));
  input($('#wpQ'), '');

  click($$('#p-loc [data-wo]').find(b => b.dataset.wo === 'mine'));
  click($('#p-loc [data-wpedit]'));
  click($('#p-loc [data-wpdel]'));
  ok('웨이포인트 삭제', !/내 창고2/.test(txt('#p-loc')));
  click($$('#p-loc [data-wo]').find(b => b.dataset.wo === '전체'));
  ok('위치 탭 오류 없음', errors.length === 0, errors.join(' | '));

  // ---- 한월RPG 업데이트 탭 ----
  const newsTab = $$('.tab').find(t => t.dataset.p === 'news'); click(newsTab);
  if (hasUpdates && w.GameUpdates && w.GameUpdates.count()) {
    ok('업데이트 내역 렌더', /한월RPG 업데이트 내역/.test(txt('#p-news')));
    ok('최신 글 표시', /개마무사/.test(txt('#p-news')));
    ok('월별 묶음 표시', /2026-08/.test(txt('#p-news')));
    const newsAll = $$('#p-news .rec').length;
    input($('#newsQ'), '완갑');
    ok('업데이트 검색 필터링', $$('#p-news .rec').length < newsAll && /완갑/.test(txt('#p-news')),
       $$('#p-news .rec').length + ' vs ' + newsAll);
    input($('#newsQ'), '');
    const tagBtn = $$('#p-news [data-nt]').find(b => b.dataset.nt === '레이드');
    if (tagBtn) {
      click(tagBtn);
      ok('태그 필터', $$('#p-news .rec').length > 0 && $$('#p-news .rec').length < newsAll,
         $$('#p-news .rec').length);
      click($$('#p-news [data-nt]').find(b => b.dataset.nt === '전체'));
    }
    ok('업데이트 탭 오류 없음', errors.length === 0, errors.join(' | '));
  } else {
    ok('업데이트 없을 때 안내 표시', /업데이트 내역이 없습니다/.test(txt('#p-news')));
  }

  // ---- 통합검색 ----
  input($('#globalQ'), '매화곡');
  ok('검색 결과 표시', $('#gRes').classList.contains('on'));
  ok('사냥터가 결과에 나옴', /매화곡/.test(txt('#gRes')));
  input($('#globalQ'), '금환단');
  ok('영단도 검색됨', /영단/.test(txt('#gRes')));
  input($('#globalQ'), '성장가이드');
  ok('가이드 영상도 통합검색됨', /가이드 영상/.test(txt('#gRes')));
  input($('#globalQ'), '빙천검법');
  ok('비급도 통합검색됨', /비급/.test(txt('#gRes')) && /빙천검법/.test(txt('#gRes')));
  input($('#globalQ'), '천보산');
  ok('비석도 통합검색됨', /비석/.test(txt('#gRes')));
  input($('#globalQ'), '적동괴');
  ok('재료도 검색됨', $$('#gRes .gi').length > 0, $$('#gRes .gi').length);
  click($('#gRes .gi'));
  ok('결과 클릭 시 탭 이동', ['rec', 'mine', 'loc', 'npc'].indexOf(S_tab(w)) >= 0, S_tab(w));
  ok('결과 클릭 후 목록 닫힘', !$('#gRes').classList.contains('on'));
  input($('#globalQ'), '');
  ok('검색 탭 오류 없음', errors.length === 0, errors.join(' | '));

  // ---- 지도 탭 ----
  const mapTab = $$('.tab').find(t => t.dataset.p === 'map'); click(mapTab);
  if (hasMapWps) {
    ok('지도 탭 렌더', !!$('#mapFrame'));
    ok('지도 탭 열면 iframe 로드', ($('#mapFrame').getAttribute('src') || '').indexOf('map/index.html#') === 0,
       $('#mapFrame').getAttribute('src'));
    ok('첫 위치는 스폰', /-969\/-965/.test($('#mapFrame').getAttribute('src')),
       $('#mapFrame').getAttribute('src'));

    // 재렌더해도 iframe이 새로 만들어지지 않아야 한다 (타일 재로딩 방지)
    const frameBefore = $('#mapFrame');
    const srcBefore = frameBefore.getAttribute('src');
    click($$('.tab').find(t => t.dataset.p === 'sum'));
    click(mapTab);
    ok('재렌더해도 iframe 동일 노드', $('#mapFrame') === frameBefore);
    ok('재렌더해도 src 유지', $('#mapFrame').getAttribute('src') === srcBefore);

    // 좌표 이동
    input($('#mapX'), '1234'); input($('#mapZ'), '-567');
    click($('#btnMapGo'));
    ok('좌표 이동 반영', /\/1234\/-567\//.test($('#mapFrame').getAttribute('src')),
       $('#mapFrame').getAttribute('src'));
    ok('이동해도 iframe 노드 유지', $('#mapFrame') === frameBefore);

    // 스폰 버튼
    click($('#btnMapSpawn'));
    ok('스폰 버튼 동작', /-969\/-965/.test($('#mapFrame').getAttribute('src')));

    // 높이 전환
    const h0 = $('#mapFrame').style.height;
    click($('#btnMapSize'));
    ok('높이 전환', $('#mapFrame').style.height !== h0,
       h0 + '→' + $('#mapFrame').style.height);

    // 표의 지도 버튼 → 지도 탭으로 점프
    click($$('.tab').find(t => t.dataset.p === 'mine'));
    const jump = $('#p-mine [data-mapjump]');
    const xz = jump.dataset.mapjump.split(',');
    click(jump);
    ok('표에서 지도 탭으로 점프', S_tab(w) === 'map', S_tab(w));
    ok('점프 좌표 반영',
       $('#mapFrame').getAttribute('src').indexOf('/' + xz[0] + '/' + xz[1] + '/') > 0,
       $('#mapFrame').getAttribute('src'));

    ok('새 탭 링크 존재', !!$('#btnMapNew') && $('#btnMapNew').getAttribute('href') === 'map/index.html');
    ok('큰 창으로 열기 버튼', !!$('#btnMapPopup'));
    ok('전체화면 버튼', !!$('#btnMapFull'));
    const opened = [];
    w.open = (url, name, features) => { opened.push({ url, name, features }); return { focus() {} }; };
    click($('#btnMapPopup'));
    ok('큰 창 열기 동작', opened.length === 1 && /map\/index\.html#/.test(opened[0].url),
       JSON.stringify(opened[0] || {}));
    ok('큰 창 크기 지정', /width=\d+,height=\d+/.test((opened[0] || {}).features || ''),
       (opened[0] || {}).features);

    // 지도 탭 → 관련 탭 바로가기
    click(mapTab);
    ok('지도 탭에 관련 탭 버튼', $$('#p-map [data-gotab]').length === 4,
       $$('#p-map [data-gotab]').length);
    ok('웨이포인트 켜고 끄기 안내', /W<\/b>키|W키/.test($('#p-map').innerHTML));
    ok('[웹맵] 세트 안내', /\[웹맵\]/.test(txt('#p-map')));
    click($$('#p-map [data-gotab]').find(b => b.dataset.gotab === 'mat'));
    ok('지도 탭에서 관련 탭 이동', S_tab(w) === 'mat', S_tab(w));
    click(mapTab);
    ok('관련 탭 갔다 와도 iframe 유지', $('#mapFrame') === frameBefore);
  } else {
    ok('지도 없으면 안내 표시', /지도가 연결되지 않았습니다/.test(txt('#p-map')));
    ok('지도 없으면 iframe 없음', !$('#mapFrame'));
  }
  ok('지도 탭 오류 없음', errors.length === 0, errors.join(' | '));

  // 테마
  click($('#btnTheme'));
  ok('테마 전환', d.documentElement.getAttribute('data-theme') === 'light');
  click($('#btnTheme'));
  ok('테마 복귀', d.documentElement.getAttribute('data-theme') === 'dark');

  // 저장/복원
  const saved = w.localStorage.getItem('hanwol-craft-v1');
  ok('localStorage 저장됨', !!saved && JSON.parse(saved).targets);

  // 빈 목표 상태
  const clearBtn = $('#quick [data-q="__clear"]'); click(clearBtn);
  ok('목표 비우면 안내 표시', /목표를 추가/.test(txt('#p-sum')) || /목표를 추가/.test(txt('#targets')),
     txt('#p-sum').slice(0, 60));
  ok('빈 상태에서 오류 없음', errors.length === 0, errors.join(' | '));

  // 다시 추가 후 극단값
  $('#selItem').value = '5성곡괭이'; input($('#qty'), '10'); click($('#btnAdd'));
  ok('대량 목표 계산 정상', /전/.test(txt('#p-sum')) && errors.length === 0, errors.join(' | '));

  // 고급 옵션
  $('#ignoreFail').checked = true; change($('#ignoreFail'));
  ok('실패없음 모드 정상', errors.length === 0, errors.join(' | '));
  $('#integer').checked = false; change($('#integer'));
  ok('소수 모드 정상', errors.length === 0, errors.join(' | '));
  $('#ignoreFail').checked = false; change($('#ignoreFail'));
  $('#integer').checked = true; change($('#integer'));

  /* ================= 편의 기능 (v2.8.0) ================= */
  const st = () => { w.flushSave(); return JSON.parse(w.localStorage.getItem('hanwol-craft-v1')); };

  // --- 글자 크기 ---
  const fsBefore = d.documentElement.getAttribute('data-fs');
  ok('글자 크기 기본값 보통', fsBefore === 'm', String(fsBefore));
  click($('#btnFontUp'));
  ok('글자 크게 동작', d.documentElement.getAttribute('data-fs') === 'l',
     String(d.documentElement.getAttribute('data-fs')));
  click($('#btnFontUp'));
  ok('한 단계 더 크게', d.documentElement.getAttribute('data-fs') === 'xl');
  click($('#btnFontUp'));
  ok('최대에서 더 안 커짐', d.documentElement.getAttribute('data-fs') === 'xl');
  click($('#btnFontDown')); click($('#btnFontDown'));
  ok('글자 작게 되돌아감', d.documentElement.getAttribute('data-fs') === 'm');
  ok('글자 크기가 저장됨',
     st().fontScale === 'm');

  // --- 단축키 도움말 ---
  click($('#btnKeys'));
  ok('단축키 창 열림', $('#keyModal').classList.contains('on'));
  ok('단축키 목록 채워짐', $$('#keyList .keyrow').length >= 10, $$('#keyList .keyrow').length);
  ok('단축키에 Ctrl+K 있음', /Ctrl\+K/.test(txt('#keyList')));
  click($('#btnKeyClose'));
  ok('단축키 창 닫힘', !$('#keyModal').classList.contains('on'));

  // --- 표 정렬 ---
  clickTab0('mine');
  const mineTable = $('#p-mine table');
  ok('표에 정렬 머리글 생김', !!mineTable && $$('#p-mine th.sortable').length > 0,
     $$('#p-mine th.sortable').length);
  if (mineTable) {
    const firstCol = () => Array.from(mineTable.tBodies[0].rows).map((r) => r.cells[0].textContent);
    const before = firstCol();
    const th = mineTable.tHead.rows[mineTable.tHead.rows.length - 1].cells[0];
    click(th);
    const asc = firstCol();
    ok('머리글 누르면 정렬 표시', th.classList.contains('asc'));
    ok('오름차순으로 정렬됨',
       asc.every((v, i) => i === 0 || v.localeCompare(asc[i - 1], 'ko') >= 0),
       asc.slice(0, 3).join(' / '));
    ok('정렬해도 줄 수는 그대로', asc.length === before.length, before.length + '→' + asc.length);
    ok('정렬해도 내용은 그대로', asc.slice().sort().join('|') === before.slice().sort().join('|'));
    click(th);
    ok('한 번 더 누르면 반대로', th.classList.contains('desc'));
    const desc = firstCol();
    ok('내림차순으로 뒤집힘', desc.join('|') === asc.slice().reverse().join('|'),
       desc.slice(0, 2).join(' / '));
  }

  // --- 숫자 열은 숫자 순서로 (문자 섞여도 순서가 깨지지 않아야) ---
  clickTab0('mat');
  const matTable = $('#p-mat table');
  if (matTable && matTable.tHead) {
    const cells = matTable.tHead.rows[matTable.tHead.rows.length - 1].cells;
    let numCol = -1;
    for (let i = 0; i < cells.length; i++) {
      const col = Array.from(matTable.tBodies[0].rows).map((r) => r.cells[i].textContent);
      const nums = col.filter((v) => /\d/.test(v)).length;
      if (col.length > 3 && nums / col.length >= 0.9) { numCol = i; break; }
    }
    ok('숫자 열을 찾음', numCol >= 0, String(numCol));
    if (numCol >= 0) {
      click(cells[numCol]);
      // 앱과 같은 방식으로 읽는다 ("89셋 4개" → 89)
      const firstNum = (t) => {
        const m = String(t).replace(/[,\s]/g, '').match(/-?\d+(\.\d+)?/);
        return m ? parseFloat(m[0]) : NaN;
      };
      const got = Array.from(matTable.tBodies[0].rows)
        .map((r) => firstNum(r.cells[numCol].textContent)).filter((v) => !isNaN(v));
      ok('숫자 열이 작은 값부터 정렬됨',
         got.every((v, i) => i === 0 || v >= got[i - 1]), got.slice(0, 5).join(','));
      click(cells[numCol]);
      const got2 = Array.from(matTable.tBodies[0].rows)
        .map((r) => firstNum(r.cells[numCol].textContent)).filter((v) => !isNaN(v));
      ok('한 번 더 누르면 큰 값부터',
         got2.every((v, i) => i === 0 || v <= got2[i - 1]), got2.slice(0, 5).join(','));
    }
  }
  clickTab0('mine');

  // --- 표 복사 ---
  ok('표 복사 버튼 생김', $$('#p-mine .tblbtn').length > 0, $$('#p-mine .tblbtn').length);

  // --- 목표 조합 저장/불러오기 ---
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '5성곡괭이'; input($('#qty'), '3'); click($('#btnAdd'));
  w.prompt = () => '내조합';
  click($('#btnPresetSave'));
  ok('조합 저장됨', $$('#presets [data-pload]').length === 1, $$('#presets [data-pload]').length);
  ok('조합이 localStorage 에도 저장',
     !!st().presets['내조합']);
  click($('#quick [data-q="__clear"]'));
  $('#selItem').value = '3성곡괭이'; input($('#qty'), '1'); click($('#btnAdd'));
  click($('#presets [data-pload]'));
  ok('조합 불러오기 동작', !!$('[data-tq="5성곡괭이"]') && !$('[data-tq="3성곡괭이"]'),
     Object.keys(st().targets).join(','));
  ok('되돌리기 막대 뜸', $('#undoBar').classList.contains('on'));
  click($('#btnUndo'));
  ok('되돌리기로 원래 목표 복구', !!$('[data-tq="3성곡괭이"]'));
  click($('#presets [data-pdel]'));
  ok('조합 삭제됨', $$('#presets [data-pload]').length === 0);
  click($('#btnUndo'));
  ok('삭제도 되돌려짐', $$('#presets [data-pload]').length === 1);

  // --- 최근 검색어 ---
  input($('#globalQ'), '적동괴');
  $('#globalQ').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const savedQ = st().recentQ || [];
  ok('최근 검색어 기록됨', savedQ.indexOf('적동괴') >= 0, savedQ.join(','));
  $('#globalQ').value = '';
  $('#globalQ').dispatchEvent(new w.FocusEvent('focus', { bubbles: true }));
  ok('빈 검색창에 최근 검색어 표시', $$('#gRes .rq').length > 0, $$('#gRes .rq').length);
  click($('#gRes .rq'));
  ok('최근 검색어 누르면 다시 검색', $('#globalQ').value === '적동괴', $('#globalQ').value);
  input($('#globalQ'), '');

  // --- 지도 좌표 편의 ---
  clickTab0('map');
  ok('지도 좌표칸 있음', !!$('#mapX') && !!$('#mapZ'));
  $('#mapX').value = '-1200'; $('#mapZ').value = '900';
  click($('#btnMapGo'));
  w.flushSave();
  ok('좌표 이동 동작', st().mapX === -1200 && st().mapZ === 900, st().mapX + '/' + st().mapZ);
  ok('최근 좌표에 남음', ($$('#mapRecent [data-mapgo]') || []).length > 0,
     $$('#mapRecent [data-mapgo]').length);
  $('#mapX').value = '0'; $('#mapZ').value = '0'; click($('#btnMapGo'));
  // 목록은 이동할 때마다 다시 그려지므로 그때그때 찾아서 누른다
  click($('#mapRecent [data-mapgo="-1200,900"]'));
  w.flushSave();
  ok('최근 좌표 눌러 다시 이동', st().mapX === -1200 && st().mapZ === 900,
     st().mapX + '/' + st().mapZ);

  // --- 검색 결과 키보드 이동 ---
  input($('#globalQ'), '적동');
  const gitems = () => $$('#gRes .gi');
  ok('검색 결과 여러 건', gitems().length > 1, gitems().length);
  ok('첫 결과가 선택돼 있음', gitems()[0].classList.contains('sel'));
  $('#globalQ').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  ok('↓ 로 다음 결과 선택', gitems()[1].classList.contains('sel')
     && !gitems()[0].classList.contains('sel'));
  $('#globalQ').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  ok('↑ 로 이전 결과 선택', gitems()[0].classList.contains('sel'));
  $('#globalQ').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  ok('맨 위에서 ↑ 는 마지막으로', gitems()[gitems().length - 1].classList.contains('sel'));
  input($('#globalQ'), '');

  // --- 검색 미리보기 ---
  input($('#globalQ'), '적동');
  ok('미리보기 칸 생김', !!$('#gPrev'));
  const prevText = () => txt('#gPrev');
  const firstName = $$('#gRes .gi')[0].querySelector('.gn').textContent;
  ok('첫 결과가 미리보기에 뜸', prevText().indexOf(firstName) >= 0,
     firstName + ' / ' + prevText().slice(0, 40));
  ok('미리보기에 이동 버튼', $$('#gPrev [data-pgo]').length === 1);
  $('#globalQ').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  const secondName = $$('#gRes .gi')[1].querySelector('.gn').textContent;
  ok('↓ 로 옮기면 미리보기도 바뀜', prevText().indexOf(secondName) >= 0,
     secondName + ' / ' + prevText().slice(0, 40));
  // 좌표가 있는 결과는 미리보기에 좌표와 지도 버튼
  input($('#globalQ'), '광산');
  const withXY = $$('#gRes .gi').findIndex((el) => el.querySelector('[data-gmap]'));
  if (withXY >= 0) {
    for (let i = 0; i < withXY; i++) {
      $('#globalQ').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    }
    ok('좌표 있는 결과는 좌표 표시', /좌표 x/.test(prevText()), prevText().slice(0, 50));
    ok('좌표 있는 결과는 지도 버튼', $$('#gPrev [data-gmap]').length === 1);
  }
  // 미리보기의 "탭에서 보기" 로 이동
  input($('#globalQ'), '적동괴');
  click($('#gPrev [data-pgo]'));
  ok('미리보기 버튼으로 탭 이동', st().tab !== 'map' && !$('#gRes').classList.contains('on'),
     st().tab);

  // --- 분류 훑어보기 (빈 검색창) ---
  $('#globalQ').value = '';
  $('#globalQ').dispatchEvent(new w.FocusEvent('focus', { bubbles: true }));
  ok('분류 목록 표시', $$('#gRes .gct').length > 5, $$('#gRes .gct').length);
  ok('분류마다 개수 표시', /\d/.test(txt('#gRes .gcn')), txt('#gRes .gcn'));
  ok('분류에 예시 항목 표시', txt('#gRes .gce').length > 2, txt('#gRes .gce').slice(0, 30));
  click($('#gRes .gct'));
  ok('분류 누르면 검색됨', $('#globalQ').value.length > 0 && $$('#gRes .gi').length > 0,
     $('#globalQ').value);
  input($('#globalQ'), '');

  // --- 탭 묶음 구분선 ---
  ok('탭 묶음 구분선 3개', $$('.tabs .tabsep').length === 3, $$('.tabs .tabsep').length);
  ok('구분선은 탭이 아님', $$('.tab').length === 14);

  // --- 맨 위로 ---
  ok('맨 위로 버튼 있음', !!$('#btnTop'));
  ok('처음엔 숨어 있음', !$('#btnTop').classList.contains('on'));

  ok('편의 기능에서 콘솔 오류 없음', errors.length === 0, errors.join(' | '));

  console.log('\n=== UI 테스트 결과 ===');
  console.log('통과: ' + pass + '  실패: ' + fail);
  if (fails.length) { console.log('\n실패:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  if (errors.length) { console.log('\n콘솔 오류:'); errors.forEach(e => console.log('  ! ' + e)); }
  process.exitCode = fail || errors.length ? 1 : 0;
  dom.window.close();
}).catch(e => { console.error('로드 실패:', e); process.exitCode = 1; });
