"""sprite hue shift + 외곽선 두껍게.

기존 검정 outline ring을 안쪽으로 N px 확장한 뒤,
target hue의 어두운 톤(검정에 가까운)으로 칠해서 시각적으로 또렷한 외곽선 만듦.

usage: python recolor_with_outline.py <src> <dst> <hue_shift_deg> <outline_thicken_px>
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation


def recolor(src_path: str, dst_path: str, shift_deg: float, thicken: int) -> None:
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    rgb = arr[..., :3] / 255.0
    alpha = arr[..., 3]

    # Hue shift (vectorized HSV)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.max(rgb, axis=-1)
    mn = np.min(rgb, axis=-1)
    diff = mx - mn
    hue = np.zeros_like(mx)
    mask_r = (mx == r) & (diff > 0)
    mask_g = (mx == g) & (diff > 0)
    mask_b = (mx == b) & (diff > 0)
    hue[mask_r] = ((g[mask_r] - b[mask_r]) / diff[mask_r]) % 6
    hue[mask_g] = ((b[mask_g] - r[mask_g]) / diff[mask_g]) + 2
    hue[mask_b] = ((r[mask_b] - g[mask_b]) / diff[mask_b]) + 4
    hue = hue * 60.0
    sat = np.where(mx > 0, diff / np.where(mx > 0, mx, 1), 0)
    val = mx

    new_hue = (hue + shift_deg) % 360.0
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
    new_rgb = np.clip(new_rgb, 0, 255)

    # 외곽선 두껍게 — 기존 검정 픽셀 마스크를 안쪽으로 dilation
    gray_src = (rgb * 255.0).mean(axis=-1)
    opaque = alpha > 200
    outline_mask = (gray_src < 60) & opaque
    if thicken > 0:
        thick_mask = binary_dilation(outline_mask, iterations=thicken) & opaque
    else:
        thick_mask = outline_mask
    # 외곽선 색 — target hue의 매우 어두운 톤 (val 0.15, sat 0.9)
    # HSV (target_hue, 0.9, 0.15) → RGB
    th = ((60 + shift_deg) % 360) / 60.0   # yellow=60° 기준
    tsat = 0.9; tval = 0.15
    tc = tval * tsat
    tx = tc * (1 - abs((th % 2) - 1))
    tm = tval - tc
    sector = int(th) % 6
    if sector == 0:   outline_rgb = (tc, tx, 0)
    elif sector == 1: outline_rgb = (tx, tc, 0)
    elif sector == 2: outline_rgb = (0, tc, tx)
    elif sector == 3: outline_rgb = (0, tx, tc)
    elif sector == 4: outline_rgb = (tx, 0, tc)
    else:             outline_rgb = (tc, 0, tx)
    outline_rgb = np.array([(c + tm) * 255 for c in outline_rgb])
    new_rgb[thick_mask] = outline_rgb

    out = np.dstack([new_rgb.astype(np.uint8), alpha.astype(np.uint8)])
    Image.fromarray(out, 'RGBA').save(dst_path)
    print(f'saved {dst_path} (shift {shift_deg}°, thicken +{thicken}px)')


if __name__ == '__main__':
    recolor(sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]))
