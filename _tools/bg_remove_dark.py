"""검정 배경 + 검정 외곽선 AI 아이콘 배경 제거.

기존 Sobel 방식이 외곽선과 BG가 모두 검정이라 edge를 못 잡아 실패.
대신 "유채색 픽셀"(V>threshold)을 fg seed로 잡고 dilation으로 외곽선까지 흡수.

usage: python bg_remove_dark.py <src> <dst>
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_dilation, binary_erosion, gaussian_filter, label

V_THRESH = 25            # 이 값 이상의 V(밝기) = 유채색 → fg seed
DILATE = 8               # 외곽선 흡수용 dilation (검정 outline까지 포함)
CLOSE = 3
SIGMA = 0.7
ERODE = 1
OUTLINE_THICK = 8        # 외곽선 두껍게 (bg_remove_clean과 동일 패턴)
PAD = 8


def remove_bg(src_path: str, dst_path: str) -> None:
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    val = arr.max(axis=-1)
    seed = val > V_THRESH

    # 외곽선 흡수
    fg = binary_dilation(seed, iterations=DILATE)
    fg = binary_closing(fg, iterations=CLOSE)

    # 가장 큰 컴포넌트
    lab, n = label(fg)
    if n == 0:
        print('no fg'); return
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    main = (lab == sizes.argmax())

    # 외곽 halo 정리
    main = binary_erosion(main, iterations=ERODE)

    alpha = main.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=SIGMA)
    alpha[~main] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    # decontamination — 검정 bg 영향 제거
    bg_color = np.array([0.0, 0.0, 0.0])
    a3 = alpha[..., None]
    safe_a = np.where(a3 < 1e-3, 1.0, a3)
    fg_color = (arr - bg_color * (1.0 - a3)) / safe_a
    fg_color = np.clip(fg_color, 0, 255)

    # 외곽선 두껍게 — 알파 경계 ring을 진한 검정으로
    inner = binary_erosion(main, iterations=OUTLINE_THICK)
    outline_band = main & ~inner
    fg_color[outline_band] = np.array([26.0, 22.0, 18.0])
    fg_color = fg_color.astype(np.uint8)

    rgba = np.dstack([fg_color, (alpha * 255).astype(np.uint8)])

    ys, xs = np.where(main)
    y0, y1 = max(0, ys.min() - PAD), min(h, ys.max() + PAD + 1)
    x0, x1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
    cropped = rgba[y0:y1, x0:x1]
    Image.fromarray(cropped, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({cropped.shape[1]}x{cropped.shape[0]})')


if __name__ == '__main__':
    remove_bg(sys.argv[1], sys.argv[2])
