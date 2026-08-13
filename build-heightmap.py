#!/usr/bin/env python3
"""지도 원본(Xaero 리전 파일)에서 높이(y) 정보를 뽑아 지도 뷰어용 파일로 만든다.

    python build-heightmap.py                # 기본 경로에서 찾아 map/heights.js 생성
    python build-heightmap.py --step 4       # 더 촘촘하게 (기본 8블록 간격)
    python build-heightmap.py --stats        # 만들지 않고 통계만

왜 필요한가:
    웹 지도 타일은 그냥 그림이라 커서 밑의 높이를 알 수 없다. 리전 파일에는
    블록마다 height 값이 들어 있으므로, 그걸 일정 간격으로 뽑아 뷰어가
    커서 위치의 y를 표시할 수 있게 한다.

출력:
    map/heights.js — 뷰어가 <script>로 읽는 파일 (file:// 에서도 동작).
    간격 step 블록마다 uint16 1개(y+64). 매핑 안 된 칸은 0.
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
import time
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
DEFAULT_SRC = Path(r'D:\백업\한월\제로소 지도')
REGION_GLOB = 'xaero/world-map/*/null/mw$default/*.zip'
OUT = ROOT / 'map' / 'heights.js'          # 메타(작음) — 항상 읽힘
BIN = ROOT / 'map' / 'heights.bin'         # 본체(zlib) — 웹에서 fetch
DATA_JS = ROOT / 'map' / 'heights-data.js'  # file:// 대비 base64 사본

SIZE = 512          # 리전 한 변 (블록)
Y_OFFSET = 64       # y = 값 - 64 (마인크래프트 최저 y가 -64)


def load_parser(src: Path):
    """지도 프로젝트의 리전 파서를 그대로 빌려 쓴다."""
    if not (src / 'xaeroweb' / 'region.py').exists():
        sys.exit(f'지도 프로젝트를 찾지 못했습니다: {src}\n'
                 f'--src 로 경로를 지정하세요.')
    sys.path.insert(0, str(src))
    from xaeroweb.region import read_region_file   # noqa: E402
    return read_region_file


def region_files(src: Path) -> list[Path]:
    files = sorted(src.glob(REGION_GLOB))
    if not files:                      # 폴더 이름이 다른 경우까지 훑어본다
        files = sorted(p for p in src.glob('xaero/world-map/*/*/*/*.zip')
                       if p.parent.name.startswith('mw'))
    return files


def parse_xz(path: Path) -> tuple[int, int]:
    x, _, z = path.stem.partition('_')
    return int(x), int(z)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', type=Path, default=DEFAULT_SRC, help='지도 프로젝트 폴더')
    ap.add_argument('--step', type=int, default=8, help='몇 블록마다 1개씩 뽑을지 (기본 8)')
    ap.add_argument('--stats', action='store_true', help='만들지 않고 통계만 출력')
    args = ap.parse_args()

    step = max(1, args.step)
    if SIZE % step:
        sys.exit(f'--step 은 512의 약수여야 합니다 (지금 {step})')

    read_region_file = load_parser(args.src)
    files = region_files(args.src)
    if not files:
        sys.exit(f'리전 파일(.zip)을 찾지 못했습니다: {args.src / REGION_GLOB}')

    per = SIZE // step               # 리전 한 변에서 뽑는 표본 수
    print(f'리전 {len(files)}개 · {step}블록 간격 · 리전당 {per}x{per} 표본')

    started = time.time()
    tiles: dict[str, np.ndarray] = {}
    y_min, y_max = 10 ** 9, -10 ** 9
    mapped_total = 0
    failed = []

    for i, path in enumerate(files, 1):
        try:
            region = read_region_file(path)
        except Exception as exc:                      # 깨진 리전은 건너뛴다
            failed.append(f'{path.name}: {exc}')
            continue
        mapped = region.mapped
        if not mapped.any():
            continue

        height = region.height.astype(np.int32)
        # step x step 칸마다 대표값 1개 — 매핑된 칸의 중앙값 대신 최빈 대신
        # 단순히 "매핑된 것 중 첫 값"을 쓰면 튀므로 중앙값을 쓴다
        h = height.reshape(per, step, per, step)
        m = mapped.reshape(per, step, per, step)
        summed = np.where(m, h, 0).sum(axis=(1, 3))
        count = m.sum(axis=(1, 3))
        avg = np.where(count > 0, summed // np.maximum(count, 1), 0)

        y_min = min(y_min, int(height[mapped].min()))
        y_max = max(y_max, int(height[mapped].max()))
        mapped_total += int(count.sum())

        # y는 -64~320 범위라 1바이트로는 부족 → uint16 (리틀엔디안)
        value = np.clip(avg + Y_OFFSET, 1, 65535).astype('<u2')
        value[count == 0] = 0                        # 0 = 데이터 없음
        rx, rz = parse_xz(path)
        tiles[f'{rx},{rz}'] = value

        if i % 100 == 0 or i == len(files):
            print(f'  {i}/{len(files)} 처리 ({time.time() - started:.0f}s)')

    if not tiles:
        sys.exit('높이 데이터를 하나도 뽑지 못했습니다.')

    print(f'매핑된 블록 {mapped_total:,}개 · y 범위 {y_min} ~ {y_max}')
    if failed:
        print(f'읽기 실패 {len(failed)}개: {failed[:3]}')

    raw = b''.join(tiles[k].tobytes() for k in sorted(tiles))
    packed = zlib.compress(raw, 9)
    print(f'원본 {len(raw) / 1e6:.1f}MB → 압축 {len(packed) / 1e6:.1f}MB '
          f'→ base64 {len(packed) * 4 / 3 / 1e6:.1f}MB')

    if args.stats:
        print('--stats 라서 파일은 만들지 않았습니다.')
        return

    meta = {
        'step': step,
        'size': SIZE,
        'per': per,
        'yOffset': Y_OFFSET,
        'yMin': y_min,
        'yMax': y_max,
        'bin': 'heights.bin',
        'regions': sorted(tiles),                    # 순서 = 데이터 순서
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)

    # 웹(http)에서는 작은 메타 파일만 읽고 본체는 필요할 때 fetch 한다.
    BIN.write_bytes(packed)
    OUT.write_text(
        '/* 자동 생성 파일 — 직접 고치지 마세요.\n'
        ' * 다시 만들기: python build-heightmap.py\n'
        ' * 원본: Xaero 리전 파일의 블록별 height 값\n'
        f' * {step}블록 간격 · 리전 {len(tiles)}개 · y {y_min}~{y_max}\n'
        ' * 본체는 heights.bin (웹에서는 fetch, file://에서는 heights-data.js)\n'
        ' */\n'
        'window.MapHeights = ' + json.dumps(meta, separators=(',', ':')) + ';\n',
        encoding='utf-8')

    # file:// 로 열면 fetch가 막히므로 base64 사본도 같이 만든다 (필요할 때만 읽음).
    DATA_JS.write_text(
        '/* 자동 생성 파일 — file:// 전용 사본. 웹에서는 heights.bin을 씁니다. */\n'
        'window.MapHeightsData = "' + base64.b64encode(packed).decode('ascii') + '";\n',
        encoding='utf-8')

    print(f'생성: {OUT.name} {OUT.stat().st_size / 1e3:.0f}KB · '
          f'{BIN.name} {BIN.stat().st_size / 1e6:.1f}MB · '
          f'{DATA_JS.name} {DATA_JS.stat().st_size / 1e6:.1f}MB(file:// 대비용)')


if __name__ == '__main__':
    main()
