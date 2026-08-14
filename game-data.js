/* =====================================================================
 * 한월 공략소 - 부가 게임 데이터 (광산 / 제작 NPC / 영단 / 대장장이 장비)
 * 출처: HANWOL-WEBMAP (https://forky-g.github.io/HANWOL-WEBMAP/)
 *       js/data.js — mines, mineResources, minePaths, npcData, danData, blacksmithData
 * 좌표는 마인크래프트 x / y / z 기준.
 * ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GameData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SOURCE = {
    name: 'HANWOL-WEBMAP',
    url: 'https://forky-g.github.io/HANWOL-WEBMAP/',
    fetched: '2026-08-11'
  };

  /**
   * 데이터를 가져온 곳 전부. (앱 어디서든 출처 링크를 걸 수 있게 한 곳에 모음)
   * items = 이 출처에서 가져온 항목.
   */
  var SOURCES = [
    { key: 'webmap', name: 'HANWOL-WEBMAP (웹 지도)',
      url: 'https://forky-g.github.io/HANWOL-WEBMAP/', fetched: '2026-08-11',
      items: '광산 65곳 · 제작 NPC · 사냥터 · 약초 자생지 · 적환단/해태단/기린단 단서 · '
        + '탐색 항아리 · 의문의 상자 · 공략 이미지' },
    { key: 'prob', name: '확률 공개 시트',
      url: 'https://docs.google.com/spreadsheets/d/1bXZ8gICXNbS6Wn0z-YfMnqHLxjpEbSnrWbf854Lj9xY/edit?gid=0#gid=0',
      fetched: '2026-08-11',
      items: '잠재능력·추가능력 확률 · 장비 티어 확률 · 토벌의뢰/우물던전 드랍 · 우물혈석' },
    { key: 'talisman', name: '부적표 시트',
      url: 'https://docs.google.com/spreadsheets/d/1sXR0Dq3tM-S_O94Qu1vA_uXdDxM8cln7AR77iM0WsPw/edit?gid=1075389289#gid=1075389289',
      fetched: '2026-08-11',
      items: '부적 등급별 목록(신화 포함) · 등급 내 확률 · 신화 옵션 범위' },
    { key: 'herbcalc', name: '약초 조합 계산기',
      url: 'https://jeongsh214.github.io/herb_calculator/index.html', fetched: '2026-08-12',
      items: '약초 등급(A/B/C/S) · 점수 합계별 조합 결과 환' },
    { key: 'discord', name: '한월RPG 디스코드',
      url: 'https://discord.gg/yA6MnmqGzy', fetched: '2026-08-12',
      items: '게임 업데이트 공지 67건 (2026-05-01 ~ 08-12)' },
    { key: 'ingame', name: '인게임 확인 (직접 입력)',
      url: null, fetched: '2026-08-12',
      items: '대장장이 상점·제작 · 화로 레시피/시간 · 대장장이 조수(강화·능력이전·귀속해제·제작)' }
  ];

  /**
   * 웹맵의 "한월서버 성장 가이드" 영상 목록.
   * 요약 탭 카드와 통합검색에서 바로 열 수 있다.
   */
  var GUIDE_VIDEOS = [
    { title: '설치 및 접속 가이드', tip: '디스코드, 전용 런처, 주의사항, 로비',
      url: 'https://youtu.be/J4xmEY5SDO8' },
    { title: '채널입장부터 튜토리얼까지', tip: '접속방법, 초반 튜토리얼, 게임 조작법',
      url: 'https://youtu.be/JzN9Zq7s7z0' },
    { title: '성장가이드 [Lv.11~60]', tip: '사냥터, 레벨업, 일류승급, 꿀팁',
      url: 'https://youtu.be/GVqtT_f6bFY' },
    { title: '성장가이드 [Lv.60~120]', tip: '사냥터, 스텟, 재화, 퀘스트정보, 꿀팁',
      url: 'https://youtu.be/lMZ-dwesMME' }
  ];

  /**
   * 데이터를 가져오진 않았지만 같이 쓰면 좋은 바깥 도구들.
   * 요약 탭 "관련 링크" 카드와 푸터에 뜬다.
   */
  /* 관련 링크 — 분류 순서가 곧 화면 표시 순서 (linksByCategory).
   * 시작하기 → 커뮤니티 → 지도·자료 → 계산기·도구 → 랭킹 순으로 처음 접하는 순서에 맞춰 둔다.
   * discord: true 인 것은 디스코드 채널이라 로그인·서버 가입·인증이 있어야 열린다. */
  var EXTERNAL_LINKS = [
    // 시작하기 — 설치·접속·규칙
    { cat: '시작하기', name: '전용 런처 다운로드',
      url: 'https://canary.discord.com/channels/587152246433775640/1467822875968016466',
      desc: '게임 실행에 쓰는 전용 런처 배포 채널', discord: true },
    { cat: '시작하기', name: '이용약관',
      url: 'https://canary.discord.com/channels/587152246433775640/1476000449638170727',
      desc: '서버 이용약관 · 규칙 공지', discord: true },
    { cat: '시작하기', name: '마인리스트 (서버 목록)',
      url: 'https://minelist.kr/servers/16703-hanwol.skhidc.kr',
      desc: '서버 정보·추천, 접속 주소 hanwol.skhidc.kr' },
    // 커뮤니티
    { cat: '커뮤니티', name: '한월RPG 디스코드', url: 'https://discord.gg/yA6MnmqGzy',
      desc: '공지·업데이트 내역이 올라오는 곳', source: true },
    { cat: '커뮤니티', name: '유저 공략',
      url: 'https://discord.com/channels/587152246433775640/1485166398841028749',
      desc: '유저들이 올린 공략 모음', discord: true },
    // 지도·자료
    { cat: '지도 · 자료', name: 'HANWOL-WEBMAP (웹 지도)',
      url: 'https://forky-g.github.io/HANWOL-WEBMAP/',
      desc: '광산·NPC·사냥터·약초·단서·상자 좌표와 공략 이미지', source: true },
    { cat: '지도 · 자료', name: '한월 위키 (노션)',
      url: 'https://sulky-titanium-5df.notion.site/2df34cfb6e8d80c881adcced4bcc73ed?v=2df34cfb6e8d8189b10f000c8300abc6',
      desc: '유저 정리 위키 — 아이템·시스템 정보' },
    { cat: '지도 · 자료', name: '확률 공개 시트',
      url: 'https://docs.google.com/spreadsheets/d/1bXZ8gICXNbS6Wn0z-YfMnqHLxjpEbSnrWbf854Lj9xY/edit?gid=0#gid=0',
      desc: '잠재·추가능력, 장비 티어, 드랍 확률 고지', source: true },
    { cat: '지도 · 자료', name: '부적표 시트',
      url: 'https://docs.google.com/spreadsheets/d/1sXR0Dq3tM-S_O94Qu1vA_uXdDxM8cln7AR77iM0WsPw/edit?gid=1075389289#gid=1075389289',
      desc: '부적 189종 등급별 목록과 신화 옵션', source: true },
    // 계산기·도구
    { cat: '계산기 · 도구', name: '약초 조합 계산기 (jeongsh214)',
      url: 'https://jeongsh214.github.io/herb_calculator/index.html',
      desc: '약초 등급·조합 결과 — 이 앱에도 같은 계산이 들어 있음', source: true },
    { cat: '계산기 · 도구', name: '[ProDays] 매크로 및 최적화 계산기',
      url: 'https://github.com/Pro-Days/SkillMacro/releases',
      desc: '스킬 매크로·딜 최적화 프로그램' },
    { cat: '계산기 · 도구', name: '[_Ya_Su] 도깨비 스텟 계산기',
      url: 'https://yasu2947.github.io/',
      desc: '도깨비 스텟 계산' },
    // 랭킹
    { cat: '랭킹', name: '한월 랭킹',
      url: 'https://hanwol-rank.skhidc.kr/',
      desc: '서버 랭킹 조회' }
  ];


  /** 분류별로 묶은 관련 링크 (표시 순서 유지) */
  function linksByCategory() {
    var order = [], map = {};
    EXTERNAL_LINKS.forEach(function (l) {
      if (!map[l.cat]) { map[l.cat] = []; order.push(l.cat); }
      map[l.cat].push(l);
    });
    return order.map(function (c) { return { cat: c, links: map[c] }; });
  }

  /* ------------------------------------------------------------------
   * 1. 광산
   * ------------------------------------------------------------------ */

  // 광산 색깔별 산출 재료
  var MINE_RESOURCES = {
    '녹': ['갈옥', '신선옥', '정철광', '청연광'],
    '청': ['청강석', '현철', '한철', '빙옥', '만년한철'],
    '황': ['오철', '금강석', '정철광', '일옥'],
    '적': ['매화옥', '묵철', '흑옥', '청연광', '용린광'],
    '공통': ['돌덩어리', '철광석', '적동석', '광산초']
  };

  var MINE_COLORS = {
    '녹': { label: '녹색광산', hex: '#4ade80' },
    '청': { label: '청색광산', hex: '#60a5fa' },
    '황': { label: '황색광산', hex: '#facc15' },
    '적': { label: '적색광산', hex: '#f87171' },
    '공통': { label: '모든 광산', hex: '#9ca3af' }
  };

  // n = 광산 번호, c = 색깔
  var MINES = [
    { n: 1, x: -1093, y: 89, z: -701, c: '녹' },   { n: 2, x: -1038, y: 68, z: -14, c: '녹' },
    { n: 3, x: -1837, y: 64, z: -944, c: '녹' },   { n: 4, x: -2599, y: 71, z: -2691, c: '녹' },
    { n: 5, x: -4001, y: 84, z: -1579, c: '녹' },  { n: 6, x: 1085, y: 227, z: 199, c: '녹' },
    { n: 7, x: -775, y: 92, z: -1986, c: '녹' },   { n: 8, x: 2605, y: 81, z: -1142, c: '녹' },
    { n: 9, x: 752, y: 147, z: -1272, c: '녹' },   { n: 10, x: -4322, y: 88, z: -2810, c: '청' },
    { n: 11, x: 815, y: 25, z: 2558, c: '황' },    { n: 12, x: -1913, y: 104, z: 3153, c: '황' },
    { n: 13, x: -3094, y: 24, z: 855, c: '황' },   { n: 14, x: 7137, y: 63, z: -1668, c: '청' },
    { n: 15, x: 6123, y: 95, z: 486, c: '청' },    { n: 16, x: 5709, y: 65, z: -3342, c: '청' },
    { n: 17, x: 3806, y: 75, z: 5436, c: '적' },   { n: 18, x: 3542, y: 74, z: 6378, c: '적' },
    { n: 19, x: -6250, y: 85, z: 2367, c: '적' },  { n: 20, x: -7547, y: 86, z: 623, c: '적' },
    { n: 21, x: -2854, y: 103, z: -5529, c: '청' },{ n: 22, x: -5186, y: 71, z: 1256, c: '청' },
    { n: 23, x: 4301, y: 110, z: -3381, c: '녹' }, { n: 24, x: 5584, y: 78, z: 3322, c: '청' },
    { n: 25, x: 1998, y: 205, z: 4657, c: '적' },  { n: 26, x: 2201, y: 99, z: -2740, c: '녹' },
    { n: 27, x: -6540, y: 79, z: 516, c: '적' },   { n: 28, x: 3701, y: 79, z: 2080, c: '황' },
    { n: 29, x: -4084, y: 70, z: 3035, c: '황' },  { n: 30, x: 6217, y: 89, z: 4562, c: '적' },
    { n: 31, x: -563, y: 74, z: -6176, c: '녹' },  { n: 32, x: 1472, y: 82, z: -6472, c: '녹' },
    { n: 33, x: 4214, y: 74, z: -4596, c: '녹' },  { n: 34, x: 1941, y: 72, z: -5632, c: '녹' },
    { n: 35, x: -4657, y: 71, z: -4523, c: '청' }, { n: 36, x: -4830, y: 74, z: -4303, c: '청' },
    { n: 37, x: -5480, y: 100, z: -1720, c: '청' },{ n: 38, x: -6696, y: 88, z: -1145, c: '적' },
    { n: 39, x: -559, y: 73, z: -4593, c: '녹' },  { n: 40, x: 1487, y: 70, z: 5300, c: '적' },
    { n: 41, x: 1601, y: 78, z: 5485, c: '적' },   { n: 42, x: 2129, y: 74, z: 6598, c: '적' },
    { n: 43, x: -960, y: 82, z: 2033, c: '황' },   { n: 44, x: -2468, y: 195, z: 4433, c: '황' },
    { n: 45, x: -5443, y: 73, z: 4139, c: '적' },  { n: 46, x: 4024, y: 209, z: 3356, c: '적' },
    { n: 47, x: 658, y: 74, z: 3900, c: '황' },    { n: 48, x: -2121, y: 83, z: -3837, c: '녹' },
    { n: 49, x: 4886, y: 89, z: 954, c: '청' },    { n: 50, x: 4942, y: 76, z: -1189, c: '청' },
    { n: 51, x: 677, y: 235, z: 1433, c: '황' },   { n: 52, x: -762, y: 213, z: -6601, c: '녹' },
    { n: 53, x: 2657, y: 75, z: -5891, c: '녹' },  { n: 54, x: 2036, y: 72, z: -3624, c: '녹' },
    { n: 55, x: -4098, y: 75, z: -55, c: '청' },   { n: 56, x: -2006, y: 77, z: 127, c: '녹' },
    { n: 57, x: -2264, y: 81, z: -1571, c: '녹' }, { n: 58, x: 3885, y: 104, z: -1415, c: '녹' },
    { n: 59, x: -5054, y: 80, z: -2598, c: '청' }, { n: 60, x: 3323, y: 67, z: 3939, c: '적' },
    { n: 61, x: 5258, y: 79, z: 5723, c: '적' },   { n: 62, x: 1014, y: 84, z: -2648, c: '녹' },
    { n: 63, x: 2705, y: 80, z: 2461, c: '황' },   { n: 64, x: -4029, y: 134, z: 2321, c: '황' },
    { n: 65, x: -790, y: 109, z: 4284, c: '황' }
  ];

  // 색깔별 추천 순회 동선 (원본 minePaths)
  var MINE_PATHS = {
    '녹': [33, 23, 58, 8, 26, 54, 62, 9, 6, 2, 1, 3, 57, 4, 48, 39, 31, 52, 32, 34, 53, 7, 56, 5],
    '청': [22, 55, 59, 37, 10, 36, 35, 21, 16, 14, 15, 49, 50, 24],
    '황': [29, 64, 13, 43, 12, 44, 65, 47, 11, 51, 63, 28],
    '적': [41, 40, 25, 60, 46, 17, 18, 42, 61, 30, 45, 19, 27, 20, 38]
  };

  var SPAWN = { name: '스폰 지점', x: -969, z: -965 };

  // 재료 → 획득 가능한 광산 색깔 목록
  var MATERIAL_MINES = (function () {
    var m = {};
    Object.keys(MINE_RESOURCES).forEach(function (c) {
      MINE_RESOURCES[c].forEach(function (item) { (m[item] = m[item] || []).push(c); });
    });
    return m;
  })();

  function minesOf(color) {
    return MINES.filter(function (mine) { return mine.c === color; });
  }

  // 재료 이름 → { colors: [...], mines: [...] }
  function whereToMine(material) {
    var colors = MATERIAL_MINES[material];
    if (!colors) return null;
    if (colors.indexOf('공통') >= 0) return { colors: ['공통'], mines: MINES.slice() };
    var list = [];
    colors.forEach(function (c) { list = list.concat(minesOf(c)); });
    list.sort(function (a, b) { return a.n - b.n; });
    return { colors: colors, mines: list };
  }

  /* ------------------------------------------------------------------
   * 1-B. 웨이포인트 출처 분리
   *
   * ⚠️ 여기서 "가져온 웨이포인트"(webmap)와 "지도 프로젝트 웨이포인트"(map)는
   *    절대 한 배열에 섞지 않는다. 각자 별도 배열로 두고, 필요할 때만
   *    waypoints()로 origin 태그를 붙여 합쳐서 본다.
   *    - webmap: HANWOL-WEBMAP에서 가져온 것. 이 파일이 원본이므로 여기서 수정.
   *    - map:    사용자의 인게임 지도 웹뷰어가 들고 있는 것. 이 파일에서 만들지 않는다.
   *              지도 연동 시 setMapWaypoints()로 주입만 하고, 저장은 지도 쪽 책임.
   * ------------------------------------------------------------------ */

  var ORIGIN = {
    WEBMAP: 'webmap',   // 가져온 데이터 (이 파일에 하드코딩)
    MAP: 'map'          // 지도 프로젝트가 가진 웨이포인트 (외부 주입)
  };

  var ORIGIN_LABEL = {
    webmap: '가져온 데이터',
    map: '지도 웨이포인트'
  };

  // 지도 프로젝트에서 주입받는 웨이포인트. 기본은 비어 있음.
  // 형태: { name, x, y, z, kind?, set?, color?, dim?, note? }
  var MAP_WAYPOINTS = [];

  // 지도 뷰어 연결 정보 (map-waypoints.js가 있으면 주입됨)
  var MAP_LINK = { href: null, world: null, dim: null, map: null, layer: null };

  /** 지도 뷰어 위치/딥링크 정보 설정 */
  function setMapLink(info) {
    ['href', 'world', 'dim', 'map', 'layer'].forEach(function (k) {
      MAP_LINK[k] = (info && info[k]) || null;
    });
    return MAP_LINK;
  }

  /**
   * 좌표를 지도 뷰어에서 여는 URL.
   * 해시 형식: #<world>/<dim>/<map>/<layer>/<x>/<z>/<scale>
   * @returns {string|null} 연결 정보가 없으면 null
   */
  function mapUrl(x, z, scale) {
    if (!MAP_LINK.href || !MAP_LINK.world) return null;
    var parts = [MAP_LINK.world, MAP_LINK.dim || 'overworld',
                 MAP_LINK.map || 'mw$default', MAP_LINK.layer || 'surface',
                 Math.round(x), Math.round(z), scale == null ? 1 : scale];
    return MAP_LINK.href + '#' + parts.map(encodeURIComponent).join('/');
  }

  /** 지도 프로젝트 웨이포인트 주입. 기존 배열을 통째로 갈아끼운다(누적 아님). */
  function setMapWaypoints(list) {
    MAP_WAYPOINTS.length = 0;
    (list || []).forEach(function (w) {
      if (!w || typeof w.x !== 'number' || typeof w.z !== 'number') return;
      MAP_WAYPOINTS.push({
        name: String(w.name == null ? '이름 없음' : w.name),
        x: w.x, y: (typeof w.y === 'number' ? w.y : 0), z: w.z,
        kind: w.kind || w.set || '웨이포인트',
        set: w.set || null,
        color: w.color || null,
        dim: w.dim || null,
        death: !!w.death,
        note: w.note || ''
      });
    });
    return MAP_WAYPOINTS.length;
  }

  /** 지도 웨이포인트의 세트 목록 + 개수 (많은 순) */
  function mapWaypointSets() {
    var m = {};
    MAP_WAYPOINTS.forEach(function (w) {
      var k = w.set || '(없음)';
      m[k] = (m[k] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { set: k, count: m[k] }; })
      .sort(function (a, b) { return b.count - a.count || a.set.localeCompare(b.set); });
  }

  /** 좌표(x/z)가 숫자로 채워진 대상인지 */
  function hasCoords(o) {
    return !!o && typeof o.x === 'number' && typeof o.z === 'number';
  }

  /**
   * 가져온 데이터 쪽 웨이포인트.
   * 광산 + 좌표 있는 제작 NPC + 스폰 + 지도 위치(사냥터·약초·단서·항아리·상자).
   * set/hex는 지도 주입 시 세트 이름·색으로 그대로 쓰인다.
   */
  function webmapWaypoints() {
    var out = [];
    MINES.forEach(function (m) {
      var info = MINE_COLORS[m.c] || { label: m.c, hex: '#9ca3af' };
      out.push({ name: m.n + '번 광산', x: m.x, y: m.y, z: m.z,
                 kind: '광산', color: m.c, hex: info.hex, set: info.label, ref: m });
    });
    // 좌표를 모르는 NPC(예: 대장장이 조수)는 웨이포인트로 만들지 않는다
    CRAFT_NPCS.filter(hasCoords).forEach(function (n) {
      out.push({ name: n.name, x: n.x, y: n.y, z: n.z, kind: 'NPC',
                 hex: '#f0a020', set: '제작 NPC', note: n.role, ref: n });
    });
    out.push({ name: SPAWN.name, x: SPAWN.x, y: 0, z: SPAWN.z, kind: '스폰',
               hex: '#ffffff', set: '스폰' });
    return out.concat(extraWaypoints());
  }

  /**
   * origin 태그를 붙인 웨이포인트 목록.
   * @param {string} [origin] 'webmap' | 'map' — 생략하면 둘 다 (태그로 구분됨)
   */
  function waypoints(origin) {
    function tag(list, o) {
      return list.map(function (w) {
        var c = {}; for (var k in w) c[k] = w[k];
        c.origin = o;
        c.originLabel = ORIGIN_LABEL[o];
        return c;
      });
    }
    if (origin === ORIGIN.WEBMAP) return tag(webmapWaypoints(), ORIGIN.WEBMAP);
    if (origin === ORIGIN.MAP) return tag(MAP_WAYPOINTS, ORIGIN.MAP);
    return tag(webmapWaypoints(), ORIGIN.WEBMAP).concat(tag(MAP_WAYPOINTS, ORIGIN.MAP));
  }

  /** 출처별 개수 */
  function waypointCounts() {
    return { webmap: webmapWaypoints().length, map: MAP_WAYPOINTS.length };
  }

  /* ------------------------------------------------------------------
   * 2. 제작 관련 NPC
   * ------------------------------------------------------------------ */

  // 명인대장장이 제작 아이템 (보검 복원 계열)
  // cost = 제작 1회당 소모 금액(전). 모든 항목 동일하게 1,000전.
  var MASTER_SMITH_COST = 1000;
  var MASTER_SMITH_CRAFTS = [
    { name: '송진칠료',   mats: '송진덩어리1 + 적동괴1 + 갈옥1 + 돌덩어리2', p: 1.00 },
    { name: '와편분말',   mats: '깨진기와1 + 돌덩어리5 + 철1 + 적동석1', p: 1.00 },
    { name: '목심재',     mats: '고목조각1 + 철1 + 갈옥1 + 돌덩어리2', p: 1.00 },
    { name: '목판',       mats: '낡은목간2 + 강철1 + 송진덩어리2 + 돌덩어리2', p: 0.80 },
    { name: '옥장식편',   mats: '깨진옥장식2 + 자금1 + 청연광3 + 돌덩어리2', p: 0.80 },
    { name: '기와문양판', mats: '깨진기와2 + 강철1 + 적동괴1 + 송진덩어리1 + 돌덩어리2', p: 0.80 },
    { name: '접합제',     mats: '송진칠료1 + 강철2 + 돌덩어리3 + 갈옥1 + 향목가루1', p: 0.60 },
    { name: '청동각인판', mats: '와편분말1 + 오금철1 + 청동파편2 + 매화옥1 + 청연광2', p: 0.60 },
    { name: '강화목',     mats: '목심재1 + 백련강1 + 신선옥2 + 마모된인장2 + 돌덩어리2', p: 0.60 },
    { name: '기문부적',   mats: '목판1 + 백련정강1 + 청강석2 + 잔존영석3', p: 0.50 },
    { name: '정련실',     mats: '기와문양판1 + 강오금1 + 현철2 + 연마사3', p: 0.50 },
    { name: '옥문장식판', mats: '옥장식편1 + 백현철1 + 무괴철1 + 매화옥2 + 봉인된철편3', p: 0.50 },
    { name: '한철단조석', mats: '접합제2 + 한철2 + 금강석1 + 연마사2 + 봉인된철편4', p: 0.40 },
    { name: '설화정련석', mats: '청동각인판2 + 빙옥5 + 청강석2 + 흑옥4 + 잔존영석4', p: 0.40 },
    { name: '금강각인편', mats: '강화목2 + 금강석3 + 깨진옥장식2 + 자금1 + 연마사4', p: 0.40 }
  ];
  MASTER_SMITH_CRAFTS.forEach(function (c) { c.cost = MASTER_SMITH_COST; });

  /* ---- 대장장이 — 도구 승급 외 일반 제작 ----
   * 곡괭이·낫 승급 자체는 craft-core.js 의 CHAINS 에서 계산한다(실패 소모 옵션 때문).
   * 여기 있는 건 단발 제작(영단·비급·목걸이 재료 등).
   * 목걸이 계열은 실패해도 "조각"이 남고, 조각 3개를 명인대장장이가 다시 붙여 준다.
   */
  var SMITH_CRAFTS = [
    { name: '탐령구', mats: '철1 + 적동괴2', cost: 0, p: 1.00 },
    { name: '강화주머니(소)', mats: '대장장이의불2', cost: 1000, p: 1.00 },
    { name: '청환단', mats: '대장장이의불100', cost: 50000, p: 1.00 },
    { name: '열화신공', mats: '대장장이의불100', cost: 50000, p: 1.00 },
    { name: '오색수정',
      mats: '녹수정20 + 황수정20 + 적수정20 + 청수정20 + 대장장이의불15 + 설화강철2',
      cost: 5000, p: 0.30 },
    { name: '진연옥',
      mats: '홍련업화1 + 철목영지1 + 매화옥30 + 흑옥30 + 빙옥20 + 일옥10',
      cost: 5000, p: 0.30 },
    { name: '오색진연옥',
      mats: '오색수정2 + 진연옥2 + 기문부적5 + 정련실5 + 옥문장식판5 + 토끼내단15',
      cost: 50000, p: 0.30, fail: '오색진연옥조각' },
    { name: '오색금강진연옥',
      mats: '오색진연옥2 + 금강한철2 + 일광용린2 + 한철단조석5 + 설화정련석5 + 금강각인편10',
      cost: 50000, p: 0.30, fail: '오색금강진연옥조각' },
    { name: '찬란한오색금강진연옥',
      mats: '오색금강진연옥2 + 금강한철5 + 홍련업화5 + 철목영지5 + 월계엽5 + 금향과5',
      cost: 500000, p: 0.30, fail: '찬란한오색금강진연옥조각' }
  ];

  /* 명인대장장이 목걸이 강화 — 실패로 나온 조각 3개를 다시 완성품으로.
   * 이름이 대장장이 제작과 겹쳐서 레시피 키에는 "(조각3)"을 붙이고,
   * makes 에 실제로 나오는 아이템 이름을 남긴다. */
  var MASTER_SMITH_NECKLACE = [
    { name: '오색진연옥(조각3)', makes: '오색진연옥',
      mats: '오색진연옥조각3 + 기문부적3 + 흉폭한영기2 + 우물영기10 + 황수정100',
      cost: 1000000, p: 1.00 },
    { name: '오색금강진연옥(조각3)', makes: '오색금강진연옥',
      mats: '오색금강진연옥조각3 + 한철단조석3 + 흉폭한영기4 + 우물영기20 + 청수정100',
      cost: 1000000, p: 1.00 },
    { name: '찬란한오색금강진연옥(조각3)', makes: '찬란한오색금강진연옥',
      mats: '찬란한오색금강진연옥조각3 + 금강각인편3 + 흉폭한영기6 + 우물영기30 + 적수정100',
      cost: 1000000, p: 1.00 }
  ];

  // 대장장이 조수 — 장비강화 / 능력이전 / 귀속해제 / 상자 제작
  var ASSISTANT_ENHANCE = ['재련', '잠재능력', '추가능력', '주문서강화'];

  // cost = 금액, unit = 화폐 단위
  var ASSISTANT_SERVICES = [
    { name: '잠재능력 이전', cost: 5, unit: '금화', note: '장비 능력이전' },
    { name: '추가능력 이전', cost: 500000, unit: '전', note: '장비 능력이전' },
    { name: '귀속해제', cost: 2, unit: '금화', note: '' }
  ];

  var ASSISTANT_CRAFTS = [
    { name: '이류주문서상자', mats: '삼류주문서상자10 + 무공정수5', cost: 0, p: 1.00 },
    { name: '일류주문서상자', mats: '이류주문서상자10 + 무공정수10', cost: 0, p: 1.00 },
    { name: '황동완갑', mats: '정포완갑1 + 흉폭한영기4 + 빙백설화3', cost: 50000, p: 1.00 },
    { name: '취금완갑', mats: '황동완갑1 + 강철3 + 흉폭한영기6 + 무공정수150', cost: 100000, p: 1.00 }
  ];

  /* ---- 조선장 — 배장비(동력·대포·갑판·그물) 승급 제작 ----
   * 1성은 상점 구매(각 5,000전), 2~5성은 조선장이 승급 제작.
   * 4부위 모두 단계별 확률·비용·공통 재료가 같고 "특수 재료"만 다르다.
   * 원문 오타 정정: 2성갑판 재료의 "1성외륜" → 1성갑판, 2성그물의 "1성그룸" → 1성그물.
   */
  var SHIP_SHOP_COST = 5000;

  // star = 성급, mat = 화로 재료, essence = 무공정수 개수
  var SHIP_TIERS = [
    { star: 2, p: 0.70, cost: 10000,  mat: '철',       essence: 10 },
    { star: 3, p: 0.60, cost: 30000,  mat: '자금',     essence: 20 },
    { star: 4, p: 0.50, cost: 50000,  mat: '무괴철',   essence: 30 },
    { star: 5, p: 0.40, cost: 100000, mat: '오금한철', essence: 40 }
  ];

  // special[i] = SHIP_TIERS[i] 단계에서 추가로 드는 명인대장장이 제작 재료
  var SHIP_PARTS = [
    { name: '외륜', slot: '동력', special: ['송진칠료', '목판',     '접합제',     '기문부적'] },
    { name: '갑판', slot: '갑판', special: ['와편분말', '옥장식편', '강화목',     '옥문장식판'] },
    { name: '대포', slot: '대포', special: ['목심재',   '기와문양판', '청동각인판', '정련실'] },
    { name: '그물', slot: '그물', special: ['송진칠료', '강화목',   '정련실',     '금강각인편'] }
  ];

  // 상점에서 사는 1성 배장비 (제작 역산의 종착점)
  var SHIP_SHOP = SHIP_PARTS.map(function (part) {
    return { name: '1성' + part.name, slot: part.slot, cost: SHIP_SHOP_COST, npc: '조선장' };
  });

  var SHIPWRIGHT_CRAFTS = [];
  SHIP_PARTS.forEach(function (part) {
    SHIP_TIERS.forEach(function (t, i) {
      SHIPWRIGHT_CRAFTS.push({
        name: t.star + '성' + part.name,
        slot: part.slot,
        mats: (t.star - 1) + '성' + part.name + '1 + ' + t.mat + '1 + '
            + part.special[i] + '1 + 무공정수' + t.essence,
        cost: t.cost, p: t.p
      });
    });
  });
  SHIPWRIGHT_CRAFTS.push({
    name: '주작단', mats: '고래기름1', cost: 100000, p: 0.95,
    fail: '현무단', note: '실패 시 현무단 1개 획득 (5%)'
  });

  // 서고관리인 — 비급 상점(각 5,000전) + 비급 제작 (전부 100% · 30,000전)
  var LIBRARIAN_SHOP = ['월섬검법', '단섬검법'].map(function (n) {
    return { name: n, cost: 5000, npc: '서고관리인' };
  });
  /* 서고관리인 제작 18종 — 전부 성공률 100%.
   * 원문 오타 정정: 도끼내단→토끼내단(파천검법), 설멸검법→섬멸검법(천살검법),
   * 무랭맹비급→무림맹비급(마혼검결).
   * 천살검법의 "혈사검법"은 오타가 아니다 — 필드보스(검성) 드랍 비급.
   */
  var LIBRARIAN_CRAFTS = [
    { name: '빙설검법', mats: '강철1 + 무공정수10', cost: 0, p: 1.00 },
    // 비급이 아니라 상위 비급에 쓰는 재료
    { name: '압축무공정수', mats: '무공정수100 + 토끼내단5 + 대장장이의불5', cost: 0, p: 1.00,
      kind: '재료' },
    { name: '벽력공', mats: '토끼내단10', cost: 10000, p: 1.00 },
    { name: '파천검법', mats: '토끼내단20', cost: 10000, p: 1.00 },
    { name: '섬멸검법', mats: '단섬검법1 + 강철1 + 자금1 + 무공정수20', cost: 30000, p: 1.00 },
    { name: '매화초검', mats: '목심재1 + 옥장식편1 + 매화옥20 + 무공정수10', cost: 30000, p: 1.00 },
    { name: '초살선풍', mats: '기와문양판1 + 무괴철1 + 갈옥15 + 무공정수30', cost: 30000, p: 1.00 },
    { name: '창천검법', mats: '강오금1 + 백현철1 + 청동각인판1 + 청연광20 + 무공정수30',
      cost: 30000, p: 1.00 },
    { name: '부화검결',
      mats: '송진덩어리2 + 신선옥15 + 매화옥15 + 옥장식편1 + 백련강1 + 무공정수20',
      cost: 30000, p: 1.00 },
    { name: '홍매지폭', mats: '부화검결1 + 홍련업화1 + 철목영지1 + 정적주10 + 무공정수50',
      cost: 30000, p: 1.00 },
    { name: '매화쾌검',
      mats: '매화초검1 + 백현철2 + 백련정강1 + 기문부적2 + 강화목1 + 무공정수30',
      cost: 30000, p: 1.00 },
    { name: '혈마검법',
      mats: '파력검법1 + 정련실2 + 옥문장식판2 + 설화강철1 + 무공정수50',
      cost: 30000, p: 1.00 },
    { name: '매화중검',
      mats: '매화쾌검1 + 초살선풍1 + 설화오금1 + 금향과2 + 녹슨철패5 + 무공정수60',
      cost: 100000, p: 1.00 },
    { name: '천뢰공',
      mats: '무림맹비급1 + 벽력공1 + 대장장이의불50 + 금향과1 + 철목영지1 + 무공정수60',
      cost: 100000, p: 1.00 },
    { name: '천살검법',
      mats: '섬멸검법1 + 혈사검법1 + 월계엽1 + 한철단조석1 + 기문부적1 + 금강한철1',
      cost: 100000, p: 1.00 },
    { name: '마혼검결',
      mats: '녹수정300 + 무림맹비급1 + 압축무공정수10 + 녹슨철패25 + 혈마검법1 + 금강한철3',
      cost: 1000000, p: 1.00 },
    { name: '폭마공',
      mats: '오색진연옥1 + 무림맹비급1 + 압축무공정수20 + 열화신공1 + 천살검법1 + 황수정200',
      cost: 2000000, p: 1.00 },
    { name: '사혼검결',
      mats: '오색금강진연옥1 + 무림맹비급1 + 압축무공정수30 + 고래기름1 + 빙천검법1 + 청수정200',
      cost: 3000000, p: 1.00, note: '화경 승급 후 제작 가능' }
  ];

  // 무림맹주 — 토벌패 / 영단·비급 교환 제작 (전부 100%)
  var LEADER_CRAFTS = [
    { name: '토벌패',     mats: '토벌석1 + 무공정수20 + 정철광3', cost: 10000, p: 1.00 },
    { name: '시공단',     mats: '흉폭한영기10', cost: 0, p: 1.00 },
    { name: '무림맹비급', mats: '흉폭한영기40', cost: 0, p: 1.00 }
  ];

  /** 상점 구매가 (없으면 0) */
  var SHOP_ITEMS = {};
  SHIP_SHOP.concat(LIBRARIAN_SHOP).forEach(function (s) { SHOP_ITEMS[s.name] = s; });
  function shopPrice(name) {
    return SHOP_ITEMS[name] ? SHOP_ITEMS[name].cost : 0;
  }

  var CRAFT_NPCS = [
    {
      // 좌표 미확인 — webmapWaypoints()/지도 주입에서는 제외된다
      name: '대장장이',
      role: '곡괭이·낫 승급 · 영단/비급/목걸이 재료 제작',
      note: '1성곡괭이 상점 구매 1,000전 · 곡괭이 2~5성과 낫 1~5성 승급'
        + ' · 목걸이 계열(오색수정~찬란한오색금강진연옥)은 실패 시 조각이 남는다',
      crafts: SMITH_CRAFTS
    },
    {
      // 좌표 미확인 — webmapWaypoints()/지도 주입에서는 제외된다
      name: '대장장이 조수',
      role: '장비강화 · 능력이전',
      note: '장비강화: ' + ASSISTANT_ENHANCE.join(' / ')
        + ' · 능력이전: 잠재능력 5금화, 추가능력 500,000전 · 귀속해제 2금화',
      enhance: ASSISTANT_ENHANCE,
      services: ASSISTANT_SERVICES,
      crafts: ASSISTANT_CRAFTS
    },
    {
      name: '조선장', x: -1023, y: 71, z: -1077,
      role: '배장비 제작 (동력·대포·갑판·그물) · 주작단',
      note: '1성 배장비는 상점 구매 각 5,000전 · 2~5성은 승급 제작(무공정수 필요)'
        + ' · 주작단: 고래기름 1개, 95% (실패 시 현무단 1개)',
      shop: SHIP_SHOP,
      crafts: SHIPWRIGHT_CRAFTS
    },
    {
      // 좌표 미확인 — webmapWaypoints()/지도 주입에서는 제외된다
      name: '서고관리인',
      role: '비급 상점 · 비급 제작',
      note: '월섬검법·단섬검법 상점 각 5,000전 · 비급 제작 18종 전부 성공률 100%'
        + ' · 제작 목록에 안 보이면 조건(레벨·선행 퀘스트·승급 등)이 충족되지 않은 것',
      shop: LIBRARIAN_SHOP,
      crafts: LIBRARIAN_CRAFTS
    },
    {
      // 좌표 미확인 — webmapWaypoints()/지도 주입에서는 제외된다
      name: '무림맹주',
      role: '토벌패 · 시공단 · 무림맹비급 제작',
      note: '전부 성공률 100% · 토벌패만 10,000전(토벌석1, 무공정수20, 정철광3)'
        + ' · 시공단 흉폭한영기10 · 무림맹비급 흉폭한영기40 (제작비 없음)',
      crafts: LEADER_CRAFTS
    },
    {
      name: '명인대장장이', x: -7047, y: 74, z: -727,
      role: '보검 복원 재료 제작 · 목걸이 강화',
      note: '퀘스트 "부러진보검"(몰락한소가주). 요구: 백련정강 3개'
        + ' · 제작 18종(보검 복원 재료 15종 회당 1,000전 + 조각 3개 되돌리기 3종 회당 100만전)'
        + ' · 목걸이 강화 가능(수치·비용 미확인)',
      crafts: MASTER_SMITH_CRAFTS,
      necklace: MASTER_SMITH_NECKLACE
    },
    {
      name: '망한대장장이', x: 5365, y: 73, z: -3467,
      role: '망한 대장간 살리기 (Lv.122~125) / [히든]심마니',
      note: '[히든]심마니: 은괴 3개, 무괴철 3개 · [Lv.122]: 목판10, 대장장이불20, 무괴철10, 은괴3',
      reward: '[심마니] 화검문열쇠 · [대장간살리기] 180만전, 용린사 5개'
    },
    {
      name: '탐령구 제작대', x: -2076, y: 221, z: 401,
      role: '탐령구 제작',
      note: '재료: 철 1개, 적동괴 2개'
    },
    {
      name: '고대의제작대(정적주)', x: 2035, y: -13, z: 3264,
      role: '정적주 제작 (사도연 퀘스트)',
      note: '재료: 1만전, 철 1개, 적동괴 2개, 송진덩어리'
    },
    {
      name: '도공', x: -4778, y: 67, z: 1454,
      role: '[히든]호리병을 찾아서',
      note: '요구: 무괴철 1개, 자금 3개'
    },
    {
      name: '몰락한소가주', x: 3139, y: 78, z: -2583,
      role: '망가진보검 / 흑운회-가문재건(Lv.88)',
      note: '망가진보검 경로: 소가주 → 대장장이 → 명인대장장이 → 소가주 → 부적상점',
      reward: '금환단, 10만전'
    },
    {
      name: '절벽감시자', x: -4272, y: 203, z: -1502,
      role: '녹림퀘스트 (Lv.100)',
      note: '요구: 백현철 2개, 연마사 15개, 청동각인판 2개, 봉인된 철편 10개, 설화강철 1개',
      reward: '보석 120개, 180만전, 일반부적뽑기 24개'
    },
    {
      name: '감시관', x: 5176, y: 76, z: 4582,
      role: '[메인]퀘스트 (Lv.67)',
      note: '요구: 사보도 1개, 철 3개, 무공정수 10개'
    },
    {
      name: '다친광부', x: -787, y: 100, z: -1994,
      role: '광부 퀘스트',
      note: '요구: 녹태'
    },
    {
      name: '심마니', x: -3485, y: 80, z: -1950,
      role: '[Lv.128]광산초연구 등 채광 연계 퀘스트',
      note: 'Lv.126 토끼내단5 · Lv.127 민들레20 · Lv.128 광산초30',
      reward: '15만전, 신목환 3개'
    }
  ];

  /* ---- NPC 제작 레시피 (목표 아이템으로 넣고 역산할 수 있게 정리) ----
   * 명인대장장이 15종 + 대장장이 조수 3종.
   * mats 문자열("송진덩어리1 + 적동괴1")을 { 이름: 개수 } 로 바꿔 둔다.
   */
  function parseMats(text) {
    var out = {};
    String(text || '').split('+').forEach(function (token) {
      var t = token.replace(/\s+/g, '');
      if (!t) return;
      var m = /^(.+?)(\d+)$/.exec(t);
      if (m) out[m[1]] = (out[m[1]] || 0) + Number(m[2]);
      else out[t] = (out[t] || 0) + 1;
    });
    return out;
  }

  var NPC_RECIPES = {};
  function addRecipe(npc, c) {
    NPC_RECIPES[c.name] = {
      name: c.name, npc: npc, mats: parseMats(c.mats),
      matsText: c.mats, p: c.p, cost: c.cost || 0,
      slot: c.slot || null, fail: c.fail || null, note: c.note || null,
      kind: c.kind || null, makes: c.makes || c.name
    };
  }
  MASTER_SMITH_CRAFTS.forEach(function (c) { addRecipe('명인대장장이', c); });
  MASTER_SMITH_NECKLACE.forEach(function (c) { addRecipe('명인대장장이', c); });
  SMITH_CRAFTS.forEach(function (c) { addRecipe('대장장이', c); });
  ASSISTANT_CRAFTS.forEach(function (c) { addRecipe('대장장이 조수', c); });
  SHIPWRIGHT_CRAFTS.forEach(function (c) { addRecipe('조선장', c); });
  LEADER_CRAFTS.forEach(function (c) { addRecipe('무림맹주', c); });
  LIBRARIAN_CRAFTS.forEach(function (c) { addRecipe('서고관리인', c); });

  /** NPC 제작으로 만들 수 있는 아이템 이름 (제작 순서상 하위 재료부터) */
  function npcCraftNames() {
    return npcOrder().slice().reverse();
  }

  /** 소비하는 쪽이 먼저 오도록 정렬 (접합제 → 송진칠료 순) */
  function npcOrder() {
    var names = Object.keys(NPC_RECIPES);
    var out = [], mark = {};
    function visit(n) {
      if (mark[n] === 2 || !NPC_RECIPES[n]) return;
      if (mark[n] === 1) return;                 // 순환은 무시 (데이터상 없음)
      mark[n] = 1;
      Object.keys(NPC_RECIPES).forEach(function (other) {
        if (other !== n && NPC_RECIPES[other].mats[n]) visit(other);
      });
      mark[n] = 2;
      out.push(n);
    }
    names.forEach(visit);
    return out;                                   // 소비자 → 생산자 순
  }

  /**
   * NPC 제작 목표를 재료까지 역산한다.
   * @param {object} targets  { 아이템: 개수 } — NPC 제작이 아닌 것은 그대로 통과
   * @param {object} [opt]    integer=단계마다 개수 올림(기본 true),
   *                          ignoreFail=실패 없다고 가정(확률 무시),
   *                          successUp=일반제작성공률증가(원래 확률 ×1.1),
   *                          costDown=제작비용감소(-10%)
   * @returns {{steps:object[], external:object, passthrough:object, cost:number}}
   *          steps=제작 단계(소비자 먼저), external=NPC 제작이 아닌 필요 재료,
   *          passthrough=NPC 제작이 아니라 그대로 둔 목표, cost=NPC 제작비 합계
   */
  function npcPlan(targets, opt) {
    opt = opt || {};
    var integer = opt.integer !== false;
    var ignoreFail = !!opt.ignoreFail;
    var successUp = !!opt.successUp;
    var costMul = opt.costDown ? 0.9 : 1;
    var need = {}, passthrough = {}, external = {}, cost = 0;

    Object.keys(targets || {}).forEach(function (k) {
      var q = Number(targets[k]) || 0;
      if (q <= 0) return;
      if (NPC_RECIPES[k]) need[k] = (need[k] || 0) + q;
      else passthrough[k] = (passthrough[k] || 0) + q;
    });

    var steps = [];
    npcOrder().forEach(function (name) {
      var want = need[name];
      if (!want) return;
      var r = NPC_RECIPES[name];
      var p = ignoreFail ? 1 : (successUp ? Math.min(1, r.p * 1.1) : r.p);
      var attempts = want / p;
      if (integer) attempts = Math.ceil(attempts);
      var unitCost = r.cost * costMul;
      cost += attempts * unitCost;
      steps.push({
        name: name, npc: r.npc, made: want, attempts: attempts,
        p: p, baseP: r.p, unitCost: unitCost, cost: attempts * unitCost,
        fail: r.fail, note: r.note, slot: r.slot,
        matsText: r.matsText,
        mats: Object.keys(r.mats).map(function (m) {
          return { name: m, each: r.mats[m], total: r.mats[m] * attempts };
        })
      });
      Object.keys(r.mats).forEach(function (m) {
        var q = r.mats[m] * attempts;
        if (NPC_RECIPES[m]) need[m] = (need[m] || 0) + q;
        else external[m] = (external[m] || 0) + q;
      });
    });

    return { steps: steps, external: external, passthrough: passthrough, cost: cost };
  }

  /* ------------------------------------------------------------------
   * 3. 영단
   * ------------------------------------------------------------------ */

  var DAN = [
    { name: '시공단', effect: '물약회복량(%) +3, 경험치획득량(%) +1', source: '무림 맹주 제작' },
    { name: '녹환단', effect: '힘(%) +1, 생명력(%) +1', source: '우물영단상자' },
    { name: '황환단', effect: '힘 +2, 민첩 +2, 생명력 +2, 행운 +2', source: '우물영단상자' },
    { name: '태극단', effect: '보스공격력(%) +1, 힘 +3', source: '검성 레이드 보상' },
    { name: '천경단', effect: '행운(%) +1, 공격력 +3', source: '사냥 시 확률 드랍' },
    { name: '자환단', effect: '민첩(%) +1, 행운(%) +1', source: '출석체크 7일차' },
    { name: '청환단', effect: '공격력 +3, 보스공격력(%) +1', source: '대장장이 제작' },
    { name: '명월단', effect: '보스공격력(%) +1, 행운 +3', source: '오공 레이드 보상' },
    { name: '적환단', effect: '체력 +15, 체력(%) +1', source: '탐험 획득 (현재 1개 남음)' },
    { name: '용혈단', effect: '체력(%) +3, 생명력 +5', source: '우물영기 100개, 우물혈석 1개, 토끼내단, 대장장이불 10개' },
    { name: '매화단', effect: '치명타공격력(%) +3, 체력 +5', source: '수련의 탑 퀘스트' },
    { name: '흑환단', effect: '저항(%) +3, 물약회복량(%) +3', source: '약초 제작 (조합법 미공개)' },
    { name: '백환단', effect: '경험치획득량(%) +1, 드랍율(%) +1', source: '항아리 확률 드랍' },
    { name: '은환단', effect: '최종공격력(%) +1', source: '장로쥐 레이드 보상' },
    { name: '금환단', effect: '스킬피해량(%) +1', source: '레벨 보상 및 히든 퀘스트' },
    { name: '옥환단', effect: '공격력(%) +1', source: '해상포인트' },
    { name: '청룡단', effect: '경험치획득량(%) +1, 힘 +4', source: '희귀 약초 드랍 (낫으로 캐면 2개 획득 확률 상승)' },
    { name: '주작단', effect: '경험치획득량(%) +1, 생명력 +4', source: '조선장 NPC 제작 (고래기름 1개, 10만전)' },
    { name: '현무단', effect: '경험치획득량(%) +1, 행운 +4', source: '주작단 제작 실패 시 획득 (5% 확률)' }
  ];

  /* ------------------------------------------------------------------
   * 4. 대장장이 장비 제작 (레벨대별 재료 / 제작서)
   * ------------------------------------------------------------------ */

  // mats = 화로 재료 1세트, scroll = 필요 제작서 수, items = 등급 높은 순
  var SMITH_GEAR = [
    { tier: '50제',  kind: '방어구', mats: { '적동괴': 1, '자금': 1, '오금철': 1 }, scroll: 3,
      items: ['광설', '백비', '광전', '투해', '동군'] },
    { tier: '50제',  kind: '무기',   mats: { '철': 1, '백련강': 1, '오금철': 1, '강철': 1 }, scroll: 4,
      items: ['흑귀도', '사월검', '녹태도', '사보도', '연화도'] },
    { tier: '80제',  kind: '방어구', mats: { '오금철': 1, '자금': 1, '강오금': 1 }, scroll: 4,
      items: ['금군', '장현', '청군', '백현', '호군'] },
    { tier: '80제',  kind: '무기',   mats: { '백련강': 1, '무괴철': 1, '적동괴': 1, '현철': 3 }, scroll: 5,
      items: ['홍련검', '청월검', '흑월검', '화연도', '화염사검'] },
    { tier: '110제', kind: '방어구', mats: { '강오금': 1, '백현철': 1, '무괴철': 1 }, scroll: 5,
      items: ['염화', '금청', '금투', '녹귀', '진무'] },
    { tier: '110제', kind: '무기',   mats: { '강오금': 1, '백현철': 1, '백련정강': 1, '강철': 1 }, scroll: 6,
      items: ['황금도', '은룡사검', '무네치카', '무라마사', '백혈도'] },
    { tier: '150제', kind: '방어구', mats: { '설화오금': 1, '무괴철': 1, '강오금': 1, '백현철': 1 }, scroll: 6,
      items: ['산령', '진군', '투령', '적령', '괴록'] },
    { tier: '150제', kind: '무기',   mats: { '설화강철': 1, '오금한철': 1, '강오금': 1, '백현철': 1, '백련정강': 1 }, scroll: 7,
      items: ['이매귀도', '빙각룡', '백룡검', '창룡검', '귀매도'] },
    { tier: '180제', kind: '방어구', mats: { '일광용린': 1, '설화강철': 1, '설화오금': 1, '오금한철': 1 }, scroll: 7,
      items: ['금성', '괴황', '청귀', '천군', '광룡'] },
    { tier: '180제', kind: '무기',   mats: { '금강한철': 1, '설화강철': 1, '설화오금': 1, '오금한철': 1 }, scroll: 8,
      items: ['화염마검', '청산소천도', '흑왕대검', '황룡대도', '절영귀도'] }
  ];

  // 방어구는 투구/갑옷/허리띠/신발 4부위 각각 1세트씩 필요
  var ARMOR_PARTS = ['투구', '갑옷', '허리띠', '신발'];

  var SMITH_ACCESSORY = [
    { kind: '반지',   tier: '30제',  items: [{ name: '금제반지', stat: '체력 50' }] },
    { kind: '반지',   tier: '70제',  items: [
      { name: '황금반지', stat: '민첩 3%, 체력 2%' },
      { name: '화심반지', stat: '힘 3%, 체력 2%' },
      { name: '금신반지', stat: '생명력 5, 생명력 3%, 스킬피해량 1%, 체력 2%, 회피 1%' },
      { name: '마군반지', stat: '행운 5, 행운 3%, 스킬피해량 1%, 체력 2%, 회피 1%' }] },
    { kind: '반지',   tier: '100제', items: [{ name: '금성반지', stat: '저항 10%, 경험치획득량 3%, 드랍률 3%, 물약회복량 10%' }] },
    { kind: '반지',   tier: '105제', items: [{ name: '흑무반지', stat: '공격력 10, 공격력 3%, 보스공격력 7%, 스킬속도 1%' }] },
    { kind: '반지',   tier: '120제', items: [{ name: '청룡반지', stat: '힘 5%, 체력 4%' }] },
    { kind: '귀걸이', tier: '50제',  items: [
      { name: '취옥귀걸이', stat: '보스공격력 1~12%, 체력 1~50, 체력 1~15%, 저항 1~10%, 스킬속도 1~3%' },
      { name: '연화귀걸이', stat: '공격력 1~20, 스킬피해량 1~5%, 체력 1~50, 스킬속도 1~3%' },
      { name: '조복귀걸이', stat: '체력 1~50, 경험치획득량 1~8%, 드랍률 1~8%, 스킬속도 1~3%, 물약회복량 1~10%' }] },
    { kind: '귀걸이', tier: '110제', items: [{ name: '금귀걸이', stat: '보스공격력%, 체력, 힘%, 체력%, 저항%, 스킬속도%, 치명타확률%' }] },
    { kind: '목걸이', tier: '100제', items: [
      { name: '적옥목걸이', stat: '생명력 +2' },
      { name: '청옥목걸이', stat: '힘 +2' },
      { name: '녹옥목걸이', stat: '행운 +2' }] }
  ];

  /* ------------------------------------------------------------------
   * 5. 확률 공개 (공식 확률 고지 시트)
   * ------------------------------------------------------------------ */

  var PROB_SOURCE = {
    name: '확률 공개 시트',
    url: 'https://docs.google.com/spreadsheets/d/1bXZ8gICXNbS6Wn0z-YfMnqHLxjpEbSnrWbf854Lj9xY/edit',
    fetched: '2026-08-11'
  };

  // 잠재능력 / 추가능력 공통: 확인 줄 수 확률
  var LINE_COUNT_PROB = {
    first: [{ k: '1줄', p: 61.1111 }, { k: '2줄', p: 27.7778 }, { k: '3줄', p: 11.1111 }],
    reroll: [{ k: '1줄', p: 33.3333 }, { k: '2줄', p: 33.3333 }, { k: '3줄', p: 33.3333 }]
  };

  var POTENTIAL = {
    title: '잠재능력',
    stats: [
      { name: '힘(%)',           appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '민첩(%)',         appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '생명력(%)',       appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '행운(%)',         appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '스킬속도(%)',     appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '저항(%)',         appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '치명타공격력(%)', appear: 11.1111, range: '1.00% ~ 4.00%',  step: '0.01%', each: 0.3322 },
      { name: '체력(%)',         appear: 11.1111, range: '1.00% ~ 10.00%', step: '0.01%', each: 0.1110 },
      { name: '보스공격력(%)',   appear: 11.1111, range: '1.00% ~ 5.00%',  step: '0.01%', each: 0.2494 }
    ]
  };

  var EXTRA_ABILITY = {
    title: '추가능력',
    stats: [
      { name: '힘',            appear: 12.50, range: '1.00 ~ 10.00',   step: '0.01', each: 0.1110 },
      { name: '민첩',          appear: 12.50, range: '1.00 ~ 10.00',   step: '0.01', each: 0.1110 },
      { name: '생명력',        appear: 12.50, range: '1.00 ~ 10.00',   step: '0.01', each: 0.1110 },
      { name: '행운',          appear: 12.50, range: '1.00 ~ 10.00',   step: '0.01', each: 0.1110 },
      { name: '체력',          appear: 12.50, range: '10 ~ 50',        step: '1',    each: 2.4390 },
      { name: '치명타확률(%)', appear: 12.50, range: '0.10% ~ 2.00%',  step: '0.01%', each: 0.5236 },
      { name: '드랍률(%)',     appear: 12.50, range: '1.00% ~ 5.00%',  step: '0.01%', each: 0.2494 },
      { name: '물약회복량(%)', appear: 12.50, range: '1.00% ~ 10.00%', step: '0.01%', each: 0.1110 }
    ]
  };

  // 대장간 제작대 장비제작 티어 확률
  // 제작창 왼쪽 상단부터 오른쪽으로 5 → 4 → 3 → 2 → 1티어 순서
  var GEAR_TIER_PROB = [
    { tier: '5티어', p: 30 }, { tier: '4티어', p: 30 }, { tier: '3티어', p: 25 },
    { tier: '2티어', p: 10 }, { tier: '1티어', p: 5 }
  ];
  var GEAR_TIER_NOTE = '50레벨 장비 제작부터 티어 존재. 제작창 왼쪽 상단 → 오른쪽 순서로 5·4·3·2·1티어 '
    + '(예: 2번째 줄 2번째 장비 = 1티어). 아래 장비 목록도 같은 순서로 정렬되어 있음.';

  // 단순 "아이템 → 확률(%)" 표들
  var DROP_TABLES = [
    {
      title: '토벌의뢰 아이템 획득 확률', rows: [
        { n: '무림맹비급', p: 0.05 }, { n: '금전', p: 52.90 }, { n: '은괴', p: 2.00 },
        { n: '이류주문서상자', p: 20.05 }, { n: '일류주문서상자', p: 5.00 },
        { n: '반지주문서상자', p: 5.00 }, { n: '일반부적뽑기', p: 5.00 },
        { n: '강화주머니 +5', p: 10.00 }
      ]
    },
    {
      title: '우물던전 아이템 최종 획득 확률', rows: [
        { n: '삼류주문서상자', p: 19.12 }, { n: '이류주문서상자', p: 5.74 },
        { n: '일류주문서상자', p: 1.91 }, { n: '미귀속일반부적뽑기', p: 3.82 },
        { n: '무공정수', p: 15.30 }, { n: '용린사', p: 1.91 }, { n: '5강화주머니', p: 5.74 },
        { n: '2보석주머니', p: 7.65 }, { n: '일반광물상자', p: 19.12 },
        { n: '중급광물상자', p: 3.82 }, { n: '우물영단상자', p: 0.10 },
        { n: '은전', p: 9.56 }, { n: '금전', p: 2.87 }, { n: '은괴', p: 1.43 }, { n: '반지', p: 1.91 }
      ]
    },
    {
      title: '무기외형상자1 뽑기 확률', rows: [
        { n: '황금죽창', p: 15 }, { n: '초열지창', p: 14 }, { n: '은룡도', p: 14 },
        { n: '자룡대도', p: 13 }, { n: '자룡도', p: 13 }, { n: '파리채', p: 8 },
        { n: '단앵궁', p: 8 }, { n: '흑영겸', p: 8 }, { n: '염왕부', p: 4 },
        { n: '어깨위참새', p: 3 }
      ]
    }
  ];

  // 우물던전 우물혈석 드랍 확률 (마리당)
  var WELL_STONE = {
    title: '우물던전 우물혈석 드랍확률 (마리당)',
    note: '보스는 미드랍',
    rows: [
      { n: '1단계', p: 0.0001 }, { n: '2단계', p: 0.00011 }, { n: '3단계', p: 0.00012 },
      { n: '4단계', p: 0.00013 }, { n: '5단계', p: 0.00014 }, { n: '6단계', p: 0.00015 }
    ]
  };

  // 보스 레이드 보상. 확률은 고지된 적이 없어 목록만 있다 (표에 % 를 넣지 않는 이유).
  // 원문 메모의 "이루주문서상자"는 게임 내 표기 "이류주문서상자"와 같은 물건이라 통일했다.
  var BOSS_RAIDS = [
    {
      boss: '검성',
      note: '아래 7종 중 1개 랜덤 · 개별 확률 미고지',
      rewards: ['태극단', '백호반지', '은괴', '일반부적뽑기', '이류주문서상자', '반지주문서상자', '금전']
    }
  ];

  /* ------------------------------------------------------------------
   * 6. 부적
   * ------------------------------------------------------------------ */

  var TALISMAN_NOTE = '부적 리롤은 동일 등급 내에서만 확률이 적용됩니다. '
    + '(예: 고급의 "구호"를 리롤하면 고급 등급 안에서만 다시 뽑힘)';

  // 부적 목록의 출처는 "부적표" 시트(신화 포함, 최신).
  // official = 확률 고지 시트에 적힌 종류당 확률. 신화는 고지 시트에 아예 없어 null.
  //
  // ⚠️ 시트의 "확률"은 등급 '안에서' 어떤 부적이 나오는지(리롤용)다.
  //    등급 자체가 뜰 확률은 어느 등급도 고지되어 있지 않다 (각 등급 표가 독립적으로 100%).
  var TALISMAN_LIST_SOURCE = {
    name: '부적표 시트',
    url: 'https://docs.google.com/spreadsheets/d/1sXR0Dq3tM-S_O94Qu1vA_uXdDxM8cln7AR77iM0WsPw/edit?gid=1075389289',
    fetched: '2026-08-11'
  };

  var TALISMAN = [
    { grade: '일반', official: 4.1667, list: [
      '극왕','산폭','음강','천신','음마','용후','극난','뇌해','단마','해신','풍조','화수',
      '산달','양전','신전','뇌비','폭용','구인','영천','강무','양음','왕극','난호','폭선'] },
    { grade: '고급', official: 2.5641, list: [
      '구호','독호','대지','풍영','비봉','청류','황공','담비','산월','비야','흑왕','소하',
      '옥공','해봉','남촌','해공','풍호','동림','청검','비주','백운','백웅','비진','송죽',
      '구군','풍주','향도','금마','산암','초가','독존','선상','은수','적영','선주','평산',
      '황웅','혈령','무호'] },
    { grade: '희귀', official: 1.7544, list: [
      '천파운','대토학','철혈루','송죽헌','주석해','호금일','무영성','유수곡','선무익','목하인',
      '흑풍채','취화선','유룡산','호심조','백호단','묵향주','무산설','상인금','청운검','청죽재',
      '신룡검','금성조','천룡교','월하주','주무선','화조화','마혈곡','낙화원','설룡월','해산호',
      '패왕도','취운대','해무암','월일국','지옥문','비연정','암운주','패천문','백영루','청초헌',
      '운주무','혈영곡','철갑성','적벽루','삼호파','천마궁','무혼곡','연화지','신광무','용화산',
      '흑화단','설뇌선','풍운각','풍뢰문','무신류','암흑림','백운재'] },
    { grade: '영웅', official: 2.7778, list: [
      '문문인일','칠흑검광','청목귀살','수월중화','파천격류','암영살수','금하산상','적야풍림',
      '파천멸공','화풍성설','파멸낙성','적운낙일','산토월해','창천광야','천음패도','월해상룡',
      '금강섬뢰','풍화혈영','대대하우','패도혈무','철심무정','화심조호','암야쇄월','혈화잔월',
      '수중풍대','백호참진','적안마도','천해월설','혈운파도','패천괴력','천중금일','암서혼무',
      '상월인화','백영참월','천지무극','뇌화검신','빙하신수','무영쇄혼'] },
    { grade: '전설', official: 5.5556, list: [
      '현무수호진','혈운천마성','백호진풍참','흑월패천영','금강불괴격','청룡출해격','백야멸심화',
      '주작화염풍','암영천패성','무형무상참','천상낙화비','용황심해풍','빙설연화검','해일포말격',
      '천뢰동연참','신선무도령','황금강산검','천지분열격'] },
    // 신화: 부적표에는 있으나 확률 고지 시트에 없음 → 다른 5등급과 같은 규칙으로 산출
    { grade: '신화', official: null, list: [
      '천강신력부','유운비영부','청목생령부','자미천운부','무극패력부','풍신축영부','불사생맥부',
      '천기개운부','멸왕파천부','파군천격부','투신강림부','만법멸진부','금강불괴부'] }
  ];

  // 종류당 확률 = 100 ÷ 종류 수. 고지값이 있으면 일치 여부까지 기록해 둔다.
  TALISMAN.forEach(function (t) {
    t.p = 100 / t.list.length;
    t.calculated = (t.official == null);
    t.matchesOfficial = (t.official == null) ? null : Math.abs(t.p - t.official) < 0.01;
  });

  // 부적표(최신) ↔ 확률 고지 시트 사이의 불일치. 확률 시트가 구버전으로 보인다.
  var TALISMAN_DIFF = [
    { grade: '신화', kind: '누락',
      detail: '확률 고지 시트에 신화 등급 자체가 없음. 부적표 기준 13종 → 종류당 ' +
              (100 / 13).toFixed(4) + '%로 산출' },
    { grade: '영웅', kind: '종류 수 불일치',
      detail: '부적표 38종 vs 확률 시트 36종. 부적표에만 있는 것: 산토월해, 월해상룡. ' +
              '38종 기준이면 종류당 2.6316% (시트 고지값 2.7778%)' },
    { grade: '전설', kind: '이름 교체',
      detail: '부적표의 "금강불괴격" 자리에 확률 시트는 "풍뢰혈광음". 18종으로 개수는 같아 확률 동일' },
    { grade: '희귀', kind: '표기 차이',
      detail: '부적표 "혈영곡" vs 확률 시트 "혈영고". 57종으로 개수는 같아 확률 동일' },
    { grade: '영웅', kind: '표기 차이',
      detail: '부적표 "무영쇄혼" vs 확률 시트 "무영쇄흔"' }
  ];

  // 신화 부적 옵션 (15단계, 최소 ~ 최대)
  var TALISMAN_MYTHIC_OPTIONS = [
    { name: '천강신력부', stat: '힘',             min: 41,    max: 55 },
    { name: '유운비영부', stat: '민첩',           min: 41,    max: 55 },
    { name: '청목생령부', stat: '생명력',         min: 41,    max: 55 },
    { name: '자미천운부', stat: '행운',           min: 41,    max: 55 },
    { name: '무극패력부', stat: '힘(%)',          min: 9.2,   max: 12.0 },
    { name: '풍신축영부', stat: '민첩(%)',        min: 9.2,   max: 12.0 },
    { name: '불사생맥부', stat: '생명력(%)',      min: 9.2,   max: 12.0 },
    { name: '천기개운부', stat: '행운(%)',        min: 9.2,   max: 12.0 },
    { name: '멸왕파천부', stat: '보스공격력(%)',  min: 21.48, max: 28.00 },
    { name: '파군천격부', stat: '공격력',         min: 52.32, max: 70.00 },
    { name: '투신강림부', stat: '공격력(%)',      min: 13.24, max: 17.00 },
    { name: '만법멸진부', stat: '스킬피해량(%)',  min: 11.27, max: 15.00 },
    { name: '금강불괴부', stat: '체력(%)',        min: 21.48, max: 28.00 }
  ];
  var TALISMAN_MYTHIC_STEPS = 15;

  // 부적패키지: 고급 등급 부적 39종을 각 2.5641%로 균등 획득
  var TALISMAN_PACKAGE = { grade: '고급', p: 2.5641 };

  /* ------------------------------------------------------------------
   * 7. 지도 위치 (웹맵에서 가져온 사냥터 · 약초 · 단서 · 항아리 · 상자)
   * ------------------------------------------------------------------ */

  var HUNTING_GROUNDS = [
    { name: '해적섬', lv: '제한없음', x: 5870, y: 87, z: -5100, monsters: '해적선' },
    { name: '녹림', lv: '100~117', x: -4696, y: 143, z: -1436, monsters: '녹림매복꾼-실종자의패(lv.105), 녹림검객(lv.110), 녹림도(lv.115), 녹림정예병(lv.117)' },
    { name: '혈교도', lv: '100', x: -3980, y: 80, z: 2496, monsters: '혈교도(lv.100)' },
    { name: '화검문', lv: '90', x: -3297, y: 116, z: -1696, monsters: '봉원숭이(lv.90), 곤봉원숭이(lv.90)', memo: '*화검문포탈(화검문열쇠) / [히든] 심마니(원숭이 각50마리 사냥)' },
    { name: '흑운회', lv: '90', x: 2461, y: 88, z: -1879, monsters: '흑운회무인(lv.90)', memo: '몰락한소가주-가문재건' },
    { name: '경작지', lv: '0~5', x: -960, y: 67, z: -670, monsters: '참새(lv.0), 허수아비(lv.5)' },
    { name: '화수원', lv: '10~20', x: -586, y: 90, z: 443, monsters: '다람쥐(lv.10), 흙토끼(lv.15), 백토끼(lv.20)' },
    { name: '괴암곡', lv: '25~35', x: 1310, y: 176, z: -1592, monsters: '하급쥐(lv.25), 중급쥐(lv30), 상급쥐(lv.35)', memo: '*괴암곡제단 : 장로쥐 소환' },
    { name: '멸문', lv: '40~50', x: 3858, y: 131, z: -2642, monsters: '뱀(lv.40), 청사(lv.45), 적사(lv.50)', memo: '*구렁이 출현(파력검법), [히든]호리병을 찾아서(수상한포탈)' },
    { name: '신선원', lv: '55~65', x: -3616, y: 244, z: -3096, monsters: '새싹삼(lv.55), 진삼(lv.60), 대장삼(lv.65)', memo: '*거대삼 출현, *농장주인 소환 포탈' },
    { name: '천웅성', lv: '70~80', x: 5706, y: 160, z: 5178, monsters: '비웅(lv70), 겸웅(lv.75), 꼬마유령(lv.80)' },
    { name: '매화곡', lv: '85~95', x: 4288, y: 141, z: 408, monsters: '천도원숭이(lv.85), 황도원숭이(lv.90), 매화호(lv.95)', memo: '*거대 매화호 출현, [히든]심마니 오공 잡기' },
    { name: '이매궁', lv: '100~110', x: 1634, y: 72, z: 331, monsters: '도깨비(lv.100), 청깨비(lv.105), 진깨비(lv.110)' },
    { name: '검성지묘', lv: '115~125', x: -5428, y: 121, z: -808, monsters: '강암수호(Lv.115), 새끼암갑수(Lv.120), 암갑수(Lv.125)' },
    { name: '빙설곡', lv: '130~140', x: 6796, y: 87, z: -2515, monsters: '백랑(Lv.130), 적호(Lv.135), 백호(Lv.140)' },
    { name: '빙궁', lv: '145~155', x: 6566, y: 83, z: 952, monsters: '빙궁조(Lv.145), 빙궁병(Lv.150), 북해신녀(Lv.155)' },
    { name: '협사곡', lv: '160~170', x: -242, y: 107, z: 4305, monsters: '산적(Lv.160), 산적궁수(Lv.165), 멧돼지산적(Lv.170)' },
    { name: '황야성', lv: '175~185', x: -1985, y: 22, z: 2001, monsters: '토석병(Lv.175), 토석군(Lv.180), 토석궁사(Lv.185)' },
    { name: '마교주둔지', lv: '120~140', x: 5036, y: 217, z: 3274, monsters: '마교도(Lv.120), 마단주(LV,140)' },
    { name: '마교궁', lv: '160~180', x: 7240, y: 73, z: 5754, monsters: '마군(Lv.160), 호법(LV,180)' }
  ];

  // 약초 자생지 — 자생지(spots)마다 약초별 고유 색으로 표시
  var HERBS = [
    { name: '홍련업화', color: '#e11d48', overlay: 'hub19.png', spots: [{ x: -6842, y: 84, z: 1888 }] },
    { name: '민들레', color: '#f97316', overlay: 'hub4.png', spots: [{ x: -3006, y: 92, z: -5033 }, { x: 1332, y: 86, z: -6112 }] },
    // 옥향초 2번 자생지는 웹맵 원본에 y가 없어서 지도 높이 데이터(map/heights.js)에서 채움
    { name: '옥향초', color: '#f59e0b', overlay: 'hub9.png', spots: [{ x: 4800, y: 116, z: 3752 }, { x: 6408, y: 65, z: 4024 }] },
    { name: '빙백설화', color: '#eab308', overlay: 'hub16.png', spots: [{ x: 6424, y: 174, z: 136 }] },
    { name: '흑성과', color: '#84cc16', overlay: 'hub14.png', spots: [{ x: -1671, y: 133, z: -3534 }, { x: 1968, y: 124, z: -280 }] },
    { name: '권엽', color: '#22c55e', overlay: 'hub1.png', spots: [{ x: -4496, y: 78, z: -184 }] },
    { name: '생강', color: '#10b981', overlay: 'hub6.png', spots: [{ x: 1485, y: 68, z: 3133 }, { x: 1248, y: 108, z: 5784 }, { x: -4656, y: 72, z: 2024 }] },
    { name: '인삼', color: '#14b8a6', overlay: 'hub10.png', spots: [{ x: -4705, y: 141, z: 765 }, { x: 1500, y: 211, z: 4200 }] },
    { name: '옥취엽', color: '#06b6d4', overlay: 'hub8.png', spots: [{ x: -1323, y: 245, z: -588 }, { x: -3702, y: 118, z: -2388 }, { x: 882, y: 124, z: -2274 }] },
    { name: '황초', color: '#0ea5e9', overlay: 'hub13.png', spots: [{ x: 3348, y: 109, z: -4641 }, { x: -3612, y: 92, z: -5616 }, { x: -1444, y: 130, z: -298 }] },
    { name: '녹태', color: '#3b82f6', overlay: 'hub3.png', spots: [{ x: 1110, y: 102, z: -2830 }, { x: -2176, y: 102, z: -187 }, { x: -285, y: 80, z: -1059 }] },
    { name: '철목영지', color: '#6366f1', overlay: 'hub18.png', spots: [{ x: -2304, y: 170, z: 4228 }, { x: -3326, y: 128, z: 3190 }] },
    { name: '적주과', color: '#8b5cf6', overlay: 'hub12.png', spots: [{ x: -344, y: 184, z: 2056 }, { x: -3944, y: 241, z: 1272 }, { x: -975, y: 244, z: 766 }] },
    { name: '자운초', color: '#a855f7', overlay: 'hub11.png', spots: [{ x: 2744, y: 224, z: 4672 }, { x: 4034, y: 210, z: 4340 }] },
    { name: '월계엽', color: '#d946ef', overlay: 'hub17.png', spots: [{ x: -96, y: 183, z: -6504 }] },
    { name: '영군버섯', color: '#ec4899', overlay: 'hub7.png', spots: [{ x: 768, y: 101, z: 5056 }, { x: -1712, y: 113, z: -6379 }, { x: -4605, y: 86, z: -3983 }] },
    { name: '백향초', color: '#f43f5e', overlay: 'hub5.png', spots: [{ x: -5488, y: 66, z: 4162 }] },
    { name: '금향과', color: '#78716c', overlay: 'hub15.png', spots: [{ x: 560, y: 229, z: 1416 }] },
    { name: '금양광초', color: '#0891b2', overlay: 'hub2.png', spots: [{ x: 3236, y: 124, z: 2560 }, { x: 3796, y: 116, z: 1044 }] }
  ];

  var RED_ITEMS = [
    { n: 1, name: '적환단 1', x: -3656, y: 78, z: 4060 },
    { n: 2, name: '적환단 2', x: -1458, y: 94, z: 2875 },
    { n: 3, name: '적환단 3', x: 2358, y: 100, z: 2177 },
    { n: 4, name: '적환단 4', x: 2661, y: 72, z: -4790 },
    { n: 5, name: '적환단 5', x: 1961, y: 150, z: -6200 },
    { n: 6, name: '적환단 6', x: -2579, y: 87, z: -5970 },
    { n: 7, name: '적환단 7', x: -3375, y: 100, z: 3449 },
    { n: 8, name: '적환단 8', x: 7227, y: 30, z: 764 },
    { n: 9, name: '적환단 9', x: 15, y: 48, z: 2488 },
    { n: 10, name: '적환단 10', x: -2154, y: 61, z: -4924,
      records: [{ n: '1번 발판', x: -2102, y: 3, z: -4965 }, { n: '2번 발판', x: -2076, y: -10, z: -4949 }, { n: '3번 발판', x: -2043, y: -35, z: -4896 }, { n: '4번 발판', x: -2049, y: -34, z: -4861 }, { n: '5번 발판', x: -2057, y: -33, z: -4858 }, { n: '6번 발판', x: -2054, y: -43, z: -4827 }, { n: '7번 발판', x: -2002, y: -53, z: -4861 }, { n: '8번 발판', x: -1976, y: -54, z: -4894 }, { n: '상자', x: -1949, y: -53, z: -4931 }] }
  ];

  var HAE_ITEMS = [
    { n: 1, name: '낡은 비문', x: -4182, y: 156, z: -2096 },
    { n: 2, name: '제자의 수기', x: 5036, y: 23, z: 4952 },
    { n: 3, name: '누군가의 일지', x: 124, y: -14, z: 2504 },
    { n: 4, name: '풍화된 기록', x: -953, y: 109, z: 2895,
      records: [{ n: '항아리1', x: -924, y: -28, z: 2932 }, { n: '항아리2', x: -655, y: -20, z: 2979 }, { n: '항아리3', x: -860, y: -19, z: 3330 }, { n: '제출', x: -816, y: 31, z: 3043 }] },
    { n: 5, name: '낡은 두루마리', x: 2643, y: 188, z: 1236,
      records: [{ n: '꽃1', x: 2750, y: 154, z: 782 }, { n: '꽃2', x: 2760, y: 155, z: 780 }, { n: '꽃3', x: 2760, y: 156, z: 812 }, { n: '꽃4', x: 2714, y: 170, z: 784 }, { n: '꽃5', x: 2722, y: 173, z: 763 }] },
    { n: 6, name: '무의 길', x: 4904, y: 92, z: 3852 },
    { n: 7, name: '장인의 일지', x: 2490, y: 77, z: 3282,
      records: [{ n: '천외철괴', x: 2504, y: -25, z: 3838 }, { n: '천잠금사', x: 2442, y: -23, z: 3845 }, { n: '황룡금자', x: 2439, y: -36, z: 3798 }, { n: '제작대', x: 2522, y: -23, z: 3720 }, { n: '열쇠', x: 2626, y: -40, z: 3740 }] },
    { n: 8, name: '오인의 진법', x: 6874, y: 118, z: 177,
      records: [{ n: '온기1', x: 6754, y: -47, z: -1542 }, { n: '온기2', x: 6739, y: 10, z: -1544 }, { n: '온기3', x: 6651, y: -2, z: -1482 }, { n: '온기4', x: 6528, y: -52, z: -1570 }, { n: '온기5', x: 6567, y: -52, z: -1557 }] },
    { n: 9, name: '검을 뽑아라', x: 4592, y: 105, z: -2404 }
  ];

  var QILIN_ITEMS = [
    { n: 1, name: '무인의 기록', x: -1556, y: 78, z: -401,
      records: [{ n: '열쇠1', x: -1373, y: 24, z: -456 }, { n: '열쇠2', x: -1305, y: 1, z: -439 }, { n: '열쇠3', x: -1354, y: 33, z: -387 }, { n: '열쇠4', x: -1353, y: 55, z: -434 }, { n: '열쇠5', x: -1313, y: 9, z: -352 }, { n: '열쇠6', x: -1374, y: 17, z: -343 }] },
    { n: 2, name: '의원의 부탁', x: -3153, y: 95, z: 1324,
      records: [{ n: '우물', x: -3315, y: 78, z: 1006 }, { n: '집', x: -3153, y: 95, z: 1324 }] },
    { n: 3, name: '수색기록', x: -3497, y: 83, z: 1988,
      records: [{ n: '검1', x: -3481, y: 99, z: 1958 }, { n: '검2', x: -3495, y: 126, z: 1956 }, { n: '검3', x: -3500, y: 112, z: 1941 }] },
    { n: 4, name: '황신극명', x: -2507, y: 77, z: -5399 },
    { n: 5, name: '기지의양', x: 2019, y: 104, z: -2748 },
    { n: 6, name: '미니게임(태고)', x: 5185, y: 111, z: -2477 },
    { n: 7, name: '망월록', x: 3823, y: 85, z: -1260,
      records: [{ n: '단서1', x: 3782, y: 83, z: -1302 }, { n: '단서2', x: 3786, y: 83, z: -1311 }, { n: '단서3', x: 3797, y: 83, z: -1327 }, { n: '단서4', x: 3838, y: 78, z: -1290 }, { n: '단서5', x: 3849, y: 78, z: -1264 }, { n: '단서6', x: 3840, y: 101, z: -1219 }, { n: '단서7', x: 3780, y: 80, z: -1219 }] },
    { n: 8, name: '명혼비약', x: 3437, y: 130, z: 3516,
      records: [{ n: '재료1', x: -2441, y: -30, z: 4061 }, { n: '재료2', x: -2351, y: -24, z: 4086 }, { n: '재료3', x: -2356, y: -22, z: 4090 }, { n: '재료4', x: -2353, y: -24, z: 4098 }] },
    { n: 9, name: '간수의 수기', x: 2854, y: 247, z: 4787,
      records: [{ n: '열쇠1', x: 3475, y: 7, z: 4397 }, { n: '열쇠2', x: 3713, y: 14, z: 4489 }, { n: '열쇠3', x: 3733, y: 11, z: 4565 }, { n: '열쇠4', x: 3472, y: 25, z: 4488 }, { n: '열쇠5', x: 3500, y: 9, z: 4557 }, { n: '제단', x: 3617, y: 30, z: 4686 }] }
  ];

  // 탐색 항아리 — tool = 필요 도구
  var POT_ITEMS = [
    { x: -713, y: 156, z: 2862, item: '고목조각', tool: '탐색부적' },
    { x: -1758, y: 243, z: -838, item: '송진덩어리', tool: '탐색부적' },
    { x: 2179, y: 117, z: -529, item: '향목가루', tool: '탐령구' },
    { x: 5878, y: 154, z: 1155, item: '깨진옥장식', tool: '탐색부적' },
    { x: -5333, y: 155, z: 673, item: '깨진기와', tool: '탐색부적' },
    { x: -3784, y: 125, z: -1670, item: '낡은목간', tool: '탐색부적' },
    { x: -3313, y: 123, z: 3169, item: '청동파편', tool: '탐령구' },
    { x: 720, y: 150, z: 1800, item: '녹슨철패', tool: '탐령구' },
    { x: 6426, y: 112, z: 2392, item: '연마사', tool: '탐령구' },
    { x: -7368, y: 88, z: 1546, item: '잔존영석', tool: '탐령구' },
    { x: 2983, y: 137, z: -914, item: '봉인된철편', tool: '탐령구' },
    { x: 4113, y: 92, z: 2687, item: '마모된인장', tool: '탐령구' }
  ];

  var MYSTERY_BOXES = [
    { x: -4818, y: 85, z: -3812, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -6518, y: 89, z: 2366, name: '의문의 상자', item: '일반부적뽑기', entrance: 'x: -6523, y: 76, z: 2194' },
    { x: -6761, y: 91, z: 846, name: '의문의 상자', item: '고급주문서뽑기' },
    { x: -3317, y: 122, z: -4255, name: '의문의 상자', item: '일반부적뽑기' },
    { x: 3068, y: 172, z: 6312, name: '의문의 상자' },
    { x: 5107, y: 211, z: -1998, name: '의문의 상자' },
    { x: 2985, y: 179, z: -980, name: '의문의 상자' },
    { x: -1420, y: 128, z: -4655, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -1852, y: 143, z: 4290, name: '의문의 상자' },
    { x: -4395, y: 134, z: 5670, name: '의문의 상자', item: '일반부적뽑기' },
    { x: 805, y: 250, z: 1784, name: '의문의 상자', item: '일반부적뽑기' },
    { x: 7049, y: 142, z: 2874, name: '의문의 상자', item: '고급주문서뽑기' },
    { x: 5895, y: 119, z: -2180, name: '의문의 상자', item: '일반주문서뽑기' },
    { x: -5177, y: 137, z: -2995, name: '의문의 상자', item: '고급주문서뽑기', entrance: 'x: -5162, y: 130, z: -2982' },
    { x: 1124, y: 258, z: 1498, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -6533, y: 85, z: -2606, name: '의문의 상자', item: '고급주문서뽑기' },
    { x: -6582, y: 80, z: 6492, name: '의문의 상자', item: '고급주문서뽑기', entrance: '나무뿌리(계단블럭) 사이' },
    { x: -1618, y: 184, z: -2678, name: '의문의 상자', item: '고급주문서뽑기', entrance: '가장 꼭대기 폭포 안쪽' },
    { x: 3089, y: 117, z: -3032, name: '의문의 상자', item: '고급주문서뽑기', entrance: 'x: 3107, y: 84, z: -3350' },
    { x: 4336, y: 145, z: 6156, name: '의문의 상자', item: '고급주문서뽑기', entrance: 'x: 4282, y: 139, z: 6130' },
    { x: 4351, y: 47, z: 3545, name: '의문의 상자', item: '고급주문서뽑기', entrance: '백향초재배지 입장' },
    { x: -4023, y: 29, z: 2365, name: '의문의 상자(혈교도 던전 안)', item: '일반부적뽑기' },
    { x: 7139, y: 157, z: -4734, name: '의문의 상자', item: '고급부적뽑기' },
    { x: -2338, y: 108, z: 6142, name: '의문의 상자', item: '용린사' },
    { x: -1176, y: 95, z: -929, name: '의문의 상자', item: '5만전', entrance: '불상 뒤' },
    { x: 5258, y: 121, z: -59, name: '의문의 상자', item: '일반부적뽑기' },
    { x: 3349, y: 205, z: 3473, name: '의문의 상자', item: '일반부적뽑기', entrance: '검 놓여있는 위치 왼쪽 벽 통과' },
    { x: -4786, y: 70, z: 1459, name: '의문의 상자', item: '일반부적뽑기' },
    { x: 4814, y: 146, z: -5872, name: '의문의 상자', item: '용린사', entrance: 'x: 4811, y: 147, z: -5867' },
    { x: -417, y: 63, z: -6628, name: '의문의 상자', item: '용린사', entrance: '배 안쪽' },
    { x: 4089, y: 167, z: 5594, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -4349, y: 194, z: 1381, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -2077, y: 234, z: 434, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -5172, y: 140, z: -2984, name: '의문의 상자', item: '일반부적뽑기' },
    { x: -883, y: 127, z: -552, name: '의문의 상자', item: '용린사' },
    { x: -507, y: 75, z: 3191, name: '의문의 상자', item: '용린사' },
    { x: -1212, y: 63, z: 1444, name: '의문의 상자', item: '용린사' },
    { x: 2643, y: 189, z: -109, name: '의문의 상자', item: '보석주머니(+10)' },
    { x: -3871, y: 94, z: -4468, name: '의문의 상자', item: '강화주머니(+52)', entrance: 'x: -3939, y: 38, z: -4581' },
    { x: -3316, y: 148, z: -1672, name: '의문의 상자', item: '고급부적뽑기' },
    { x: -1424, y: 103, z: -4653, name: '의문의 상자', item: '일반부적뽑기' }
  ];
  /* ---- 약초 조합 (약초 조합 계산기에서 가져옴) ----
   * 약초 3~5개를 넣으면 등급 점수 합계로 결과 환이 정해진다.
   * A=1, B=2, C=3, S=4 점. 3개 미만이면 결과 없음.
   */
  var HERB_CALC_SOURCE = {
    name: '약초 조합 계산기',
    url: 'https://jeongsh214.github.io/herb_calculator/index.html',
    fetched: '2026-08-12'
  };
  var HERB_SCORE = { A: 1, B: 2, C: 3, S: 4 };
  var HERB_GROUPS = {
    A: ['녹태', '민들레', '생강', '영군버섯', '옥취엽'],
    B: ['백향초', '자운초', '적주과', '황초', '흑성과'],
    C: ['권엽', '금양광초', '옥향초', '인삼'],
    S: ['금향과', '빙백설화', '월계엽', '철목영지', '홍련업화']
  };
  // score = 점수 합계, name = 환 이름, effect = 효과, color = 표시색
  var HERB_RESULTS = [
    { score: 3,  name: '황토환', effect: '물약회복력 +5%',    color: '#f97316' },
    { score: 4,  name: '활생환', effect: '생명력 +5',         color: '#22c55e' },
    { score: 5,  name: '대력환', effect: '힘 +5',             color: '#f87171' },
    { score: 6,  name: '청심환', effect: '민첩 +5',           color: '#60a5fa' },
    { score: 7,  name: '명목환', effect: '경험치획득량 +4%',  color: '#facc15' },
    { score: 8,  name: '회생환', effect: '힘 +3%',            color: '#4ade80' },
    { score: 9,  name: '강근환', effect: '공격력 +10',        color: '#dc2626' },
    { score: 10, name: '황토환', effect: '물약회복력 +5%',    color: '#f97316' },
    { score: 11, name: '대력환', effect: '힘 +5',             color: '#f87171' },
    { score: 12, name: '명목환', effect: '경험치획득량 +4%',  color: '#facc15' },
    { score: 13, name: '천심환', effect: '치명타확률 +2%',    color: '#2563eb' },
    { score: 14, name: '천목환', effect: '경험치획득량 +6%',  color: '#facc15' },
    { score: 15, name: '만년환', effect: '드랍률 +10%',       color: '#16a34a' },
    { score: 16, name: '천세환', effect: '공격력 +3%',        color: '#1e40af' },
    { score: 17, name: '용력환', effect: '스킬속도 +3%',      color: '#991b1b' },
    { score: 18, name: '신목환', effect: '경험치획득량 +8%',  color: '#a16207' },
    { score: 19, name: '청심환', effect: '민첩 +5',           color: '#60a5fa' },
    { score: 20, name: '활생환', effect: '생명력 +5',         color: '#22c55e' }
  ];

  /** 약초 이름 → 등급(A/B/C/S). 없으면 null */
  function herbGrade(name) {
    var keys = Object.keys(HERB_GROUPS);
    for (var i = 0; i < keys.length; i++) {
      if (HERB_GROUPS[keys[i]].indexOf(name) >= 0) return keys[i];
    }
    return null;
  }

  /**
   * 약초 조합 결과.
   * @param {string[]} names 넣을 약초 이름 (3~5개)
   * @returns {object} total=점수합계, result=결과 환(없으면 null),
   *                   need=같은 환이 나오는 점수 목록, error=안내 문구
   */
  function herbCombo(names) {
    var list = (names || []).filter(function (n) { return herbGrade(n); });
    var total = list.reduce(function (s, n) { return s + HERB_SCORE[herbGrade(n)]; }, 0);
    var out = { picks: list, total: total, result: null, need: [], error: null };
    if (list.length > 5) { out.error = '약초는 최대 5개까지 넣을 수 있습니다.'; return out; }
    if (list.length < 3) { out.error = '약초를 3개 이상 넣어야 결과가 나옵니다.'; return out; }
    var hit = HERB_RESULTS.filter(function (r) { return r.score === total; })[0] || null;
    out.result = hit;
    if (hit) {
      out.need = HERB_RESULTS.filter(function (r) { return r.name === hit.name; })
        .map(function (r) { return r.score; });
    }
    return out;
  }

  // 비급 25종 — 획득처/제작 재료는 원본 웹맵 문구 그대로.
  // 나중에 상세(재료·비용·확률)를 채우려면 mats/cost/p 를 덧붙이면 된다.
  var SKILLS = [
    { name: '빙천검법', info: '필드보스(빙궁) - 설호 드랍' },
    { name: '사혼검결', info: '오색금강진연옥 + 무림맹비급 + 압축무공정수30개 + 고래기름 + 빙천검법 + 청수정200개, 화경 승급 후 제작 가능' },
    { name: '혈마검법', info: '파력검법 + 정련실2 + 옥문장식판2 + 설화강철 1 + 무공정수 50 + 3만전, 102레벨 메인퀘스트 보상' },
    { name: '홍매지폭', info: '부화검결 + 홍련업화 + 철목영지 + 정적주10 + 무공정수50 + 3만전' },
    { name: '매화중검', info: '매화쾌검1 + 초살선풍1 + 설화오금1 + 금향과2 + 녹슨철패5 + 무공정수60 + 10만전, 서고관리인 제작 (히든퀘스트로도 획득)' },
    { name: '마혼검결', info: '녹수정300 + 무림맹비급1 + 압축무공정수10 + 녹슨철패25 + 혈마검법1 + 금강한철3 + 100만전, 서고관리인 제작' },
    { name: '폭마공', info: '오색진연옥1 + 무림맹비급1 + 압축무공정수20 + 열화신공1 + 천살검법1 + 황수정200 + 200만전, 서고관리인 제작' },
    { name: '부화검결', info: '송진덩어리2 + 신선옥15 + 매화옥15 + 옥장식편1 + 백련강1 + 무공정수20 + 3만전, 도사 히든 퀘스트 보상' },
    { name: '열화신공', info: '대장장이불 100개 + 5만전' },
    { name: '천뢰공', info: '무림맹비급 + 벽력공 + 대장장이의불50 + 금향과1 + 철목영지1 + 무공정수60 + 10만전' },
    { name: '파천검법', info: '토끼내단 20개, 서고관리인 제작' },
    { name: '파력검법', info: '멸문-구렁이 드랍' },
    { name: '흑무검법', info: '필드보스(매화곡) - 오공 드랍' },
    { name: '청무검법', info: '필드보스(신선원) - 농장주인 드랍' },
    { name: '수류검법', info: '탐령구 획득(확정아님, 여러번 시도해야 합니다), 초반 메인퀘스트 보상' },
    { name: '초살선풍', info: '기와문양판1 + 무괴철1 + 갈옥15 + 무공정수30 + 3만전, 풍잔객 히든 퀘스트 보상' },
    { name: '빙설검법', info: '강철1 + 무공정수10, 서고관리인 제작' },
    { name: '혈사검법', info: '필드보스(검성지묘) - 검성 드랍' },
    { name: '매화초검', info: '목심재 + 옥장식편 + 매화옥20 + 무공정수10 + 3만전, 초반 메인 퀘스트 보상' },
    { name: '벽력공', info: '토끼내단10 + 1만전' },
    { name: '섬멸검법', info: '단섬검법 + 강철1 + 자금1 + 무공정수20 + 3만전, 초반 메인퀘스트 보상' },
    { name: '천살검법', info: '섬멸검법 + 혈사검법 + 월계엽1 + 한철단조석1 + 기문부적1 + 금강한철 + 10만전, 서고관리인 제작' },
    { name: '매화쾌검', info: '매화초검1 + 백현철2 + 백련정강1 + 기문부적2 + 강화목1 + 무공정수 30 + 3만전' },
    { name: '창천검법', info: '강오금1 + 백현철1 + 청동각인판1 + 청연광20 + 무공정수30 + 3만전, 연운객 히든 퀘스트 보상' },
    { name: '연검법', info: '튜토리얼 보상, 장로쥐 드랍' },
    { name: '월섬검법', info: '상점구매 (5,000전)' },
    { name: '단섬검법', info: '상점구매 (5,000전)' }
  ];

  var STATUES = [
    { name: '한월동상', x: -334, y: 255, z: -5519 },
    { name: '제천대성', x: 1513, y: 260, z: 3615 },
    { name: 'UNKNOWN', x: 2903, y: 243, z: 714 }
  ];

  // 비석 — 원본에 같은 비석이 두 번 적힌 것(문수산)은 하나로 합침
  var MOUNTAINS = [
    { name: '천보산', x: -2030, y: 80, z: -4142 },
    { name: '망운산', x: -2662, y: 80, z: -1556 },
    { name: '봉래산', x: -5278, y: 80, z: -2042 },
    { name: '신운산', x: -2984, y: 80, z: 72 },
    { name: '월랑산', x: -2720, y: 80, z: 2883 },
    { name: '사성산', x: 4356, y: 80, z: 3515 },
    { name: '용문산', x: 5378, y: 80, z: 3731 },
    { name: '삼악산', x: 5917, y: 80, z: 2453 },
    { name: '도덕산', x: 6498, y: 80, z: 67 },
    { name: '문수산', x: 919, y: 228, z: -734 },
    { name: '고헌산', x: -4137, y: 164, z: -3624 },
    { name: '치마산', x: 6535, y: 248, z: -1207 },
    { name: '축령산', x: 4120, y: 162, z: -844 },
    { name: '방장산', x: 2728, y: 233, z: 383 },
    { name: '무량산', x: 4853, y: 256, z: 4970 },
    { name: '척가산', x: -2759, y: 208, z: 1191 },
    { name: '청태산(탁본퀘스트)', x: 4191, y: 80, z: -2806 }
  ];

  // 공략 이미지 (웹맵 "공략 보기"에서 가져옴). 이미지는 웹맵 사이트에 있고,
  // guides/ 폴더에 받아두면(node download-guides.js) 오프라인에서도 보인다.
  var GUIDE_BASE = 'https://forky-g.github.io/HANWOL-WEBMAP/images/';
  var GUIDES = {
    '해태단': [
      { name: '낡은 비문', imgs: ['haetae_guide_2.jpg'] },
      { name: '제자의 수기', imgs: ['haetae_guide_3.jpg'] },
      { name: '누군가의 일지', imgs: ['haetae_guide_4.jpg'] },
      { name: '풍화된 기록', imgs: ['haetae_guide_5.jpg'] },
      { name: '낡은 두루마리', imgs: ['haetae_guide_6.jpg'] },
      { name: '무의 길', imgs: ['haetae_guide_7.jpg', 'haetae_guide_8.jpg'] },
      { name: '장인의 일지', imgs: ['haetae_guide_9.jpg'] },
      { name: '오인의 진법', imgs: ['haetae_guide_10.jpg', 'haetae_guide_11.jpg'] },
      { name: '검을 뽑아라', imgs: ['haetae_guide_12.jpg'] }
    ],
    '기린단': [
      { name: '무인의 기록', imgs: ['qilin_guide_2.jpg', 'qilin_guide_3.jpg', 'qilin_guide_4.jpg'] },
      { name: '의원의 부탁', imgs: ['qilin_guide_5.jpg'] },
      { name: '수색기록', imgs: ['qilin_guide_6.jpg'] },
      { name: '황신극명', imgs: ['qilin_guide_7.jpg'] },
      { name: '기지의양', imgs: ['qilin_guide_8.jpg'] },
      { name: '미니게임(태고)', imgs: ['qilin_guide_9.jpg'] },
      { name: '망월록', imgs: ['qilin_guide_10.jpg'] },
      { name: '명혼비약', imgs: ['qilin_guide_11.jpg'] },
      { name: '간수의 수기', imgs: ['qilin_guide_12.jpg', 'qilin_guide_13.jpg', 'qilin_guide_14.jpg'] }
    ],
    '적환단': [
      { name: '적환단 1', imgs: ['red1.png'] }, { name: '적환단 2', imgs: ['red2.png'] },
      { name: '적환단 3', imgs: ['red3.png'] }, { name: '적환단 4', imgs: ['red4.png'] },
      { name: '적환단 5', imgs: ['red5.png'] }, { name: '적환단 6', imgs: ['red6.png'] },
      { name: '적환단 7', imgs: ['red7.png'] }, { name: '적환단 8', imgs: ['red8.jpg'] },
      { name: '적환단 9', imgs: ['red9.jpg'] }, { name: '적환단 10', imgs: ['red10.png'] }
    ]
  };

  /** 공략 이미지 경로 — 로컬(guides/)과 원격(웹맵) 둘 다 반환 */
  function guideOf(kind, name) {
    var list = GUIDES[kind] || [];
    var g = list.filter(function (x) { return x.name === name; })[0];
    if (!g) return null;
    return {
      name: g.name,
      imgs: g.imgs.map(function (f) {
        return { local: 'guides/' + f, remote: GUIDE_BASE + f, file: f };
      })
    };
  }

  /** 지도 레이어별 색/세트 이름 */
  var MAP_LAYERS = {
    '사냥터':     { hex: '#7c3aed', set: '사냥터' },
    '약초':       { hex: '#65a30d', set: '약초' },      // 실제 색은 자생지(약초)별로 지정
    '적환단':     { hex: '#ef4444', set: '적환단' },
    '해태단':     { hex: '#f59e0b', set: '해태단' },
    '기린단':     { hex: '#22c55e', set: '기린단' },
    '항아리':     { hex: '#a16207', set: '항아리' },
    '의문의상자': { hex: '#0ea5e9', set: '의문의 상자' },
    '동상':       { hex: '#e879f9', set: '동상' },
    '비석':       { hex: '#94a3b8', set: '비석' }
  };

  /**
   * 사냥터/약초/단서/항아리/상자 웨이포인트.
   * 광산·NPC·스폰과 같은 webmap 출처지만 세트가 따로 나뉜다.
   */
  function extraWaypoints() {
    var out = [];
    function push(kind, name, o, note, ref, setSuffix, hex) {
      var L = MAP_LAYERS[kind];
      out.push({
        name: name, x: o.x, y: typeof o.y === 'number' ? o.y : 0, z: o.z,
        kind: kind, hex: hex || L.hex, set: L.set + (setSuffix || ''),
        note: note || '', ref: ref || o
      });
    }

    HUNTING_GROUNDS.forEach(function (h) {
      push('사냥터', h.name, h, 'Lv.' + h.lv + ' · ' + h.monsters, h);
    });

    // 약초는 자생지마다 약초별 고유 색 + 약초 이름별 세트
    HERBS.forEach(function (h) {
      h.spots.forEach(function (s, i) {
        push('약초', h.name + ' 자생지' + (i + 1), s,
             h.name + ' 자생지', h, ' ' + h.name, h.color);
      });
    });

    [['적환단', RED_ITEMS], ['해태단', HAE_ITEMS], ['기린단', QILIN_ITEMS]]
      .forEach(function (pair) {
        var kind = pair[0];
        pair[1].forEach(function (q) {
          push(kind, kind + ' ' + q.n + '. ' + q.name, q, kind + ' 단서', q);
          // 이름이 없는 항목(적환단)은 "N번"으로 세트를 나눈다
          var sub = q.name.indexOf(kind) === 0 ? q.n + '번' : q.name;
          (q.records || []).forEach(function (r) {
            push(kind, q.name + ' · ' + r.n, r, kind + ' ' + q.n + '번 세부 위치', q, ' ' + sub);
          });
        });
      });

    POT_ITEMS.forEach(function (p) {
      push('항아리', '항아리(' + p.item + ')', p, p.tool + ' 필요', p);
    });

    STATUES.forEach(function (s) { push('동상', s.name, s, '동상', s); });
    MOUNTAINS.forEach(function (m) { push('비석', m.name, m, '비석', m); });

    MYSTERY_BOXES.forEach(function (b, i) {
      var note = (b.item ? b.item : '내용물 미확인')
        + (b.entrance ? ' · 입구: ' + b.entrance : '');
      push('의문의상자', b.name + ' ' + (i + 1), b, note, b);
    });

    return out;
  }

  /** 지도 위치 종류별 개수 */
  function extraCounts() {
    var m = {};
    extraWaypoints().forEach(function (w) { m[w.kind] = (m[w.kind] || 0) + 1; });
    return m;
  }

  /**
   * 부적 리롤 확률 계산 (등급 내 균등 분포 가정).
   * @param {number} kinds  해당 등급의 부적 종류 수 N
   * @param {number} want   원하는 부적 가짓수 k (기본 1)
   * @param {number} rolls  리롤 횟수 n (기본 1)
   * @returns {object|null} each=1회 성공률(%), atLeast=n회 중 1번 이상(%),
   *                        expected=평균 소요 횟수, need90/need99=도달 필요 횟수
   */
  function talismanOdds(kinds, want, rolls) {
    var N = Math.floor(kinds), k = Math.floor(want == null ? 1 : want);
    var n = Math.floor(rolls == null ? 1 : rolls);
    if (!(N > 0) || !(k > 0) || k > N || !(n > 0)) return null;
    var p = k / N;
    var atLeast = 1 - Math.pow(1 - p, n);
    function need(target) {
      if (p >= 1) return 1;
      return Math.ceil(Math.log(1 - target) / Math.log(1 - p));
    }
    return {
      kinds: N, want: k, rolls: n,
      each: p * 100,
      atLeast: atLeast * 100,
      expected: 1 / p,
      need90: need(0.90),
      need99: need(0.99)
    };
  }

  /* ------------------------------------------------------------------ */

  return {
    SOURCE: SOURCE, PROB_SOURCE: PROB_SOURCE, SOURCES: SOURCES,
    EXTERNAL_LINKS: EXTERNAL_LINKS, linksByCategory: linksByCategory,
    GUIDE_VIDEOS: GUIDE_VIDEOS,
    MINES: MINES, MINE_RESOURCES: MINE_RESOURCES, MINE_COLORS: MINE_COLORS,
    MINE_PATHS: MINE_PATHS, MATERIAL_MINES: MATERIAL_MINES, SPAWN: SPAWN,
    minesOf: minesOf, whereToMine: whereToMine,
    ORIGIN: ORIGIN, ORIGIN_LABEL: ORIGIN_LABEL, MAP_WAYPOINTS: MAP_WAYPOINTS,
    setMapWaypoints: setMapWaypoints, webmapWaypoints: webmapWaypoints,
    waypoints: waypoints, waypointCounts: waypointCounts,
    mapWaypointSets: mapWaypointSets,
    MAP_LINK: MAP_LINK, setMapLink: setMapLink, mapUrl: mapUrl,
    CRAFT_NPCS: CRAFT_NPCS, MASTER_SMITH_CRAFTS: MASTER_SMITH_CRAFTS,
    MASTER_SMITH_COST: MASTER_SMITH_COST, hasCoords: hasCoords,
    SMITH_CRAFTS: SMITH_CRAFTS, MASTER_SMITH_NECKLACE: MASTER_SMITH_NECKLACE,
    ASSISTANT_ENHANCE: ASSISTANT_ENHANCE, ASSISTANT_SERVICES: ASSISTANT_SERVICES,
    ASSISTANT_CRAFTS: ASSISTANT_CRAFTS,
    SHIP_PARTS: SHIP_PARTS, SHIP_TIERS: SHIP_TIERS, SHIP_SHOP: SHIP_SHOP,
    SHIP_SHOP_COST: SHIP_SHOP_COST, SHIPWRIGHT_CRAFTS: SHIPWRIGHT_CRAFTS,
    LEADER_CRAFTS: LEADER_CRAFTS,
    LIBRARIAN_CRAFTS: LIBRARIAN_CRAFTS, LIBRARIAN_SHOP: LIBRARIAN_SHOP,
    SHOP_ITEMS: SHOP_ITEMS, shopPrice: shopPrice,
    NPC_RECIPES: NPC_RECIPES, npcCraftNames: npcCraftNames, npcPlan: npcPlan,
    parseMats: parseMats,
    DAN: DAN,
    SMITH_GEAR: SMITH_GEAR, ARMOR_PARTS: ARMOR_PARTS, SMITH_ACCESSORY: SMITH_ACCESSORY,
    LINE_COUNT_PROB: LINE_COUNT_PROB, POTENTIAL: POTENTIAL, EXTRA_ABILITY: EXTRA_ABILITY,
    GEAR_TIER_PROB: GEAR_TIER_PROB, GEAR_TIER_NOTE: GEAR_TIER_NOTE,
    DROP_TABLES: DROP_TABLES, WELL_STONE: WELL_STONE, BOSS_RAIDS: BOSS_RAIDS,
    HUNTING_GROUNDS: HUNTING_GROUNDS, HERBS: HERBS,
    RED_ITEMS: RED_ITEMS, HAE_ITEMS: HAE_ITEMS, QILIN_ITEMS: QILIN_ITEMS,
    POT_ITEMS: POT_ITEMS, MYSTERY_BOXES: MYSTERY_BOXES,
    SKILLS: SKILLS, STATUES: STATUES, MOUNTAINS: MOUNTAINS,
    MAP_LAYERS: MAP_LAYERS, extraWaypoints: extraWaypoints, extraCounts: extraCounts,
    GUIDES: GUIDES, GUIDE_BASE: GUIDE_BASE, guideOf: guideOf,
    HERB_CALC_SOURCE: HERB_CALC_SOURCE, HERB_GROUPS: HERB_GROUPS, HERB_SCORE: HERB_SCORE,
    HERB_RESULTS: HERB_RESULTS, herbGrade: herbGrade, herbCombo: herbCombo,
    TALISMAN: TALISMAN, TALISMAN_NOTE: TALISMAN_NOTE, TALISMAN_PACKAGE: TALISMAN_PACKAGE,
    TALISMAN_LIST_SOURCE: TALISMAN_LIST_SOURCE, TALISMAN_DIFF: TALISMAN_DIFF,
    TALISMAN_MYTHIC_OPTIONS: TALISMAN_MYTHIC_OPTIONS, TALISMAN_MYTHIC_STEPS: TALISMAN_MYTHIC_STEPS,
    talismanOdds: talismanOdds
  };
});
