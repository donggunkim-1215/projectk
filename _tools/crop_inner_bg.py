"""인벤토리 카드 BG sprite에서 컬러 그라데이션 영역만 추출.

외곽 dark border + 하단 dark bar 제거. 각 등급 png 모두 처리.
"""
import sys
import numpy as np
from PIL import Image
from pathlib import Path

ASSETS = Path('C:/icecat/ProjectK/assets/ui')
RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'exotic']


def crop_inner(src: Path, dst: Path) -> None:
    img = np.array(Image.open(src).convert('RGB')).astype(np.int32)
    h, w = img.shape[:2]
    gray = img.mean(-1)

    cy, cx = h // 2, w // 2

    # top: dark border 끝나는 행
    top = next(y for y in range(h) if gray[y, cx] > 100)
    # left/right
    left = next(x for x in range(w) if gray[cy, x] > 100)
    right = next(x for x in range(w - 1, -1, -1) if gray[cy, x] > 100)

    # 하단 bar 시작 행 — 컬럼 중앙에서 RGB 거리가 sharp change 하는 지점
    # 그라데이션은 채널별 1-2씩 천천히 변하고, bar 진입은 채널별 큰 jump
    bar_top = h
    for y in range(top + 30, h - 5):
        d = np.linalg.norm(img[y, cx] - img[y - 1, cx])
        if d > 20:
            bar_top = y
            break
    if bar_top == h:
        bar_top = int(h * 0.88)

    top += 1
    bot = bar_top - 1
    left += 1
    right -= 1

    cropped = img[top:bot, left:right].astype(np.uint8)
    Image.fromarray(cropped, 'RGB').save(dst)
    print(f'{src.name}: {w}x{h} -> {cropped.shape[1]}x{cropped.shape[0]}  '
          f'(top={top} bot={bot} L={left} R={right})')


if __name__ == '__main__':
    for r in RARITIES:
        p = ASSETS / f'inv_card_bg_{r}.png'
        crop_inner(p, p)
