"""sprite를 hue shift로 색상 변환. 노란색 sprite → 빨강/초록 변형.

usage: python recolor_sprite.py <src> <dst> <hue_shift_degrees>
   hue_shift_degrees: 양수는 hue 증가 (yellow → green = +60), 음수는 감소 (yellow → red = -60)
"""
import sys
import numpy as np
from PIL import Image
import colorsys


def hue_shift(src_path: str, dst_path: str, shift_deg: float) -> None:
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    rgb = arr[..., :3] / 255.0
    alpha = arr[..., 3]

    # Vectorized RGB → HSV
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.max(rgb, axis=-1)
    mn = np.min(rgb, axis=-1)
    diff = mx - mn

    # Hue
    hue = np.zeros_like(mx)
    mask_r = (mx == r) & (diff > 0)
    mask_g = (mx == g) & (diff > 0)
    mask_b = (mx == b) & (diff > 0)
    hue[mask_r] = ((g[mask_r] - b[mask_r]) / diff[mask_r]) % 6
    hue[mask_g] = ((b[mask_g] - r[mask_g]) / diff[mask_g]) + 2
    hue[mask_b] = ((r[mask_b] - g[mask_b]) / diff[mask_b]) + 4
    hue = hue * 60.0  # 0~360
    sat = np.where(mx > 0, diff / mx, 0)
    val = mx

    # Hue shift (only for saturated pixels — black/white 안 영향)
    new_hue = (hue + shift_deg) % 360.0

    # HSV → RGB (vectorized)
    h60 = new_hue / 60.0
    c = val * sat
    x = c * (1 - np.abs((h60 % 2) - 1))
    m = val - c

    new_rgb = np.zeros_like(rgb)
    sectors = h60.astype(np.int32) % 6
    for s in range(6):
        sel = (sectors == s)
        if s == 0:   new_rgb[sel] = np.stack([c[sel], x[sel], np.zeros_like(c[sel])], axis=-1)
        elif s == 1: new_rgb[sel] = np.stack([x[sel], c[sel], np.zeros_like(c[sel])], axis=-1)
        elif s == 2: new_rgb[sel] = np.stack([np.zeros_like(c[sel]), c[sel], x[sel]], axis=-1)
        elif s == 3: new_rgb[sel] = np.stack([np.zeros_like(c[sel]), x[sel], c[sel]], axis=-1)
        elif s == 4: new_rgb[sel] = np.stack([x[sel], np.zeros_like(c[sel]), c[sel]], axis=-1)
        elif s == 5: new_rgb[sel] = np.stack([c[sel], np.zeros_like(c[sel]), x[sel]], axis=-1)
    new_rgb = (new_rgb + m[..., None]) * 255.0
    new_rgb = np.clip(new_rgb, 0, 255).astype(np.uint8)

    out = np.dstack([new_rgb, alpha.astype(np.uint8)])
    Image.fromarray(out, 'RGBA').save(dst_path)
    print(f'saved {dst_path} (shift {shift_deg}°)')


if __name__ == '__main__':
    hue_shift(sys.argv[1], sys.argv[2], float(sys.argv[3]))
