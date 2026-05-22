"""인벤토리 카드 BG sprite 상단 두 코너에 라운드 알파 마스크 적용.

display 시 R_INNER=8px 라운드 효과가 나오도록 source 픽셀 기준 비율로 적용.
하단은 사선 strip이 덮으므로 직각 유지.
"""
import numpy as np
from PIL import Image, ImageDraw
from pathlib import Path

ASSETS = Path('C:/icecat/ProjectK/assets/ui')
RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'exotic']

# 카드 inner W ≈ 118 (122-4), 표시 R_INNER=8
# source W ≈ 283 → source radius = 8 * 283/118 ≈ 19
SOURCE_R = 20


def round_top_corners(src: Path, r: int) -> None:
    img = Image.open(src).convert('RGBA')
    w, h = img.size
    # Build alpha mask: rounded top corners, square bottom
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    # Top: rounded rect 형태 (상단 r 만큼 둥글게)
    # 전체 채우기 + 네 코너 중 TL/TR만 라운딩
    draw.rectangle([0, r, w, h], fill=255)              # 하단 영역 (직각)
    draw.rectangle([r, 0, w - r, r], fill=255)          # 상단 중앙
    draw.pieslice([0, 0, 2 * r, 2 * r], 180, 270, fill=255)  # TL 코너
    draw.pieslice([w - 2 * r, 0, w, 2 * r], 270, 360, fill=255)  # TR 코너

    # 기존 알파와 곱해서 적용 (sprite의 컬러 영역 유지)
    src_alpha = img.split()[-1]
    new_alpha = Image.eval(Image.composite(src_alpha, Image.new('L', (w, h), 0), mask), lambda x: x)
    # 더 정확하게: pixel-wise min(src_alpha, mask)
    src_a = np.array(src_alpha)
    msk_a = np.array(mask)
    out_a = np.minimum(src_a, msk_a)
    rgb = np.array(img)[..., :3]
    out = np.dstack([rgb, out_a])
    Image.fromarray(out, 'RGBA').save(src)
    print(f'{src.name}: rounded TL/TR with r={r}')


if __name__ == '__main__':
    for r in RARITIES:
        round_top_corners(ASSETS / f'inv_card_bg_{r}.png', SOURCE_R)
