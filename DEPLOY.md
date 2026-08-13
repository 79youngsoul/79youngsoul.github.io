# 웹사이트로 올리기

정적 파일만 있으면 된다. 서버 코드·빌드 도구 없음. 폴더를 그대로 올리면 끝.

## 1. 올릴 파일

```
index.html            계산기 본체
craft-core.js         계산 로직
game-data.js          광산·NPC·위치·확률·부적·약초 데이터
game-updates.js       한월RPG 업데이트 내역 (선택)
map-waypoints.js      지도 웨이포인트 (선택)
guides/               공략 이미지 34장 (선택, 35MB)
map/
  index.html          지도 뷰어
  tiles/              지도 타일 321MB  ← 용량 대부분
  heights.js          높이 메타 8KB
  heights.bin         높이 본체 2.6MB (지도를 만질 때만 받음)
  overlays.js         약초 자생지 목록 2KB
  overlays/           자생지 색칠 이미지 19장 5MB (켤 때만 받음)
```

**빼도 되는 것**

| 파일 | 이유 |
|---|---|
| `map/heights-data.js` (3.5MB) | `file://`(더블클릭) 전용 사본. 웹에서는 `heights.bin`만 씀 |
| `*.py`, `test-*.js`, `import-*.js`, `download-*.js`, `verify-source.js` | 개발용 스크립트 |
| `discord-updates.txt`, `대장장이&화로.txt` | 원본 메모 |
| `node_modules/` | 테스트용 jsdom |
| `versions/` | 버전 스냅샷 보관함 (개발용) |

## 2. 첫 로딩 용량

| 페이지 | 처음 받는 양 |
|---|---|
| 계산기 (`index.html`) | 약 300KB (gzip 켜면 ~80KB) |
| 지도 (`map/index.html`) | 약 370KB + 보이는 타일만 |
| 지도에서 커서 움직일 때 | `heights.bin` 2.6MB 한 번 |
| 약초 자생지 켤 때 | 켠 약초 이미지만 (1장 ≈ 250KB) |

무거운 건 전부 **필요할 때만** 받는다. 타일도 화면에 보이는 것만.

## 2-1. 파일 하나만 올리는 곳 (IPFS/Pinata·첨부·USB)

```bash
node build-standalone.js     # dist/한월공략소.html (326KB)
```

- `index.html` 만 올리면 **백지**가 된다 — 스크립트가 따로 있는 파일이라서. 반드시 합친 파일을 쓸 것
- 합친 파일은 외부 파일을 하나도 안 부른다 (지도 타일 제외)
- 서버가 필요 없는 앱이라 어디에 올려도 그대로 돈다 (설정은 브라우저 저장 + JSON 내보내기)

## 3. 호스팅

- **GitHub Pages** — 저장소 용량 권장 1GB, 파일 1개 100MB 제한. 타일 321MB라 아슬아슬하지만 가능.
  파일 개수(17,000개)가 많아 `git push`가 오래 걸린다. `.nojekyll` 파일을 루트에 만들 것
  (밑줄로 시작하는 폴더가 무시되는 걸 막음)
- **Cloudflare Pages / Netlify** — 무료 한도가 넉넉하고 업로드가 빠름. 추천
- 서버가 있으면 그냥 정적 폴더로 두면 된다

### 서버 설정 (있으면 좋음)

```
gzip/brotli: html, js, json, bin        # heights.bin 은 이미 압축돼 있어 큰 차이 없음
Cache-Control: tiles/, guides/, overlays/  → max-age=31536000, immutable
Cache-Control: index.html, *.js            → no-cache (갱신 반영되게)
```

## 4. 사이트에 적어둘 것

**필수**

1. **이건 팬 제작 비공식 도구** — 게임사·운영진과 무관. 문의는 여기로 하지 말 것
2. **데이터 출처와 확인 날짜** (앱 요약 탭 "데이터 출처" 표와 동일하게)
   - [HANWOL-WEBMAP](https://forky-g.github.io/HANWOL-WEBMAP/) — 광산·NPC·사냥터·약초·단서·항아리·상자·공략 이미지
   - [확률 공개 시트](https://docs.google.com/spreadsheets/d/1bXZ8gICXNbS6Wn0z-YfMnqHLxjpEbSnrWbf854Lj9xY/edit?gid=0#gid=0) — 잠재/추가능력·티어·드랍 확률
   - [부적표 시트](https://docs.google.com/spreadsheets/d/1sXR0Dq3tM-S_O94Qu1vA_uXdDxM8cln7AR77iM0WsPw/edit?gid=1075389289#gid=1075389289) — 부적 189종
   - [약초 조합 계산기](https://jeongsh214.github.io/herb_calculator/index.html) — 약초 등급·조합 결과
   - 디스코드 공지 — 게임 업데이트 내역
   - 인게임 직접 확인 — 대장장이·화로·대장장이 조수
3. **원작자 표기** — 공략 이미지·자생지 색칠·지도 좌표는 웹맵(FORKY_G) 것을 가져온 것.
   재배포에 문제가 있으면 연락 달라는 문구와 연락처
   → **문의처: 디스코드 `79youngsoul`** (앱 푸터에 이미 박혀 있음)
4. **계산은 기댓값** — 실제는 운에 따라 크게 흔들린다는 안내 (확률 시뮬 탭 참고)
5. **마지막 갱신 날짜 / 앱 버전** — 앱 상단 "업데이트 내역" 버튼과 동일

**있으면 좋음**

- 한 줄 소개: "한월 공략소 — 곡괭이·화로 재료를 역산하고, 지도·위치·확률·업데이트를 한곳에서"
- 사용법 3줄: ① 목표 아이템 추가 ② 보유 재료 입력 ③ 필요 재료·비용·시간 확인
- 단축키 안내: `Ctrl+K` 통합검색, `1`~`9`·`0`·`-`·`[`·`]` 탭 전환
- 데이터가 게임과 다를 때 제보받을 곳 → **디스코드 `79youngsoul`**
- 브라우저 저장 안내: **입력값은 내 브라우저에만 저장**되고 서버로 안 보냄. 기기 바꾸면 JSON 내보내기/불러오기 사용
- 지도 타일이 크니 **모바일 데이터 주의** 문구

**메타 태그 (검색·공유용)**

```html
<meta name="description" content="한월 공략소 — 곡괭이·화로 재료 역산, 광산·사냥터·약초 지도, 확률·부적, 업데이트 내역">
<meta property="og:title" content="한월 공략소">
<meta property="og:description" content="재료·비용·시간 역산 / 지도·위치 / 확률·부적 / 업데이트 내역">
<meta property="og:image" content="썸네일.png">
```

> 위 내용은 **앱 하단 푸터에 이미 들어가 있다**(비공식 안내·기댓값 안내·브라우저 저장 안내·출처 링크·
> 문의처 `79youngsoul`·버전/갱신일). 사이트 소개 페이지를 따로 만든다면 같은 내용을 옮겨 적으면 된다.

## 4-1. 모바일

- 계산기·지도 모두 모바일/태블릿에서 동작한다 (탭 가로 스크롤, 표는 좌우 스크롤, 터치 버튼 크기 확보,
  iOS 입력 확대 방지, 지도 높이 최대 70vh)
- 지도는 **한 손가락 끌기 = 이동**, **두 손가락 = 확대/축소**
- 타일이 커서 모바일 데이터로 지도를 많이 돌리면 통신량이 늘어난다 — 사이트에 한 줄 적어두면 좋다

## 5. 갱신 절차

```bash
node import-discord-updates.js     # 공지 글 갱신 (discord-updates.txt 붙여넣기 후)
node import-map-waypoints.js       # 지도 다시 빌드했을 때
node inject-map-waypoints.js       # 위치 데이터를 지도 웨이포인트로 주입
python build-heightmap.py          # 지도 다시 빌드했을 때만 (약 6분)
node download-guides.js            # 공략 이미지 (한 번이면 됨)
node download-overlays.js          # 자생지 색칠 (한 번이면 됨)

node test-core.js && node test-ui.js && node test-integrity.js && node test-responsive.js && node test-heights.js && node verify-source.js
node snapshot.js --note "이번에 바뀐 것"    # 올리기 전에 버전 스냅샷 남기기
```

전부 통과하면 그대로 올린다.
