"""흰 배경 + 검정 외곽선 AI 아이콘에서 외곽 잔여 흰 픽셀(halo) 제거.

bg_remove_single보다:
- DILATE 줄임 (1)
- 마지막에 erosion으로 외곽 1px 안쪽으로 깎음 → 흰 halo 제거
- decontamination 으로 부분 알파 픽셀의 흰 bg 영향 제거

usage: python bg_remove_clean.py <src> <dst>
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_dilation, binary_erosion, gaussian_filter, label, sobel

EDGE_THRESH = 40
DILATE = 1
ERODE = 1
SIGMA = 0.6
PAD = 8


def remove_bg(src_path: str, dst_path: str) -> None:
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    gray = arr.mean(axis=-1)
    gx = sobel(gray, axis=1)
    gy = sobel(gray, axis=0)
    mag = np.hypot(gx, gy)

    edge = mag > EDGE_THRESH
    edge = binary_dilation(edge, iterations=DILATE)

    free = ~edge
    lab, _ = label(free)
    edge_labels = set()
    edge_labels.update(np.unique(lab[0, :]))
    edge_labels.update(np.unique(lab[-1, :]))
    edge_labels.update(np.unique(lab[:, 0]))
    edge_labels.update(np.unique(lab[:, -1]))
    edge_labels.discard(0)
    exterior_free = np.isin(lab, list(edge_labels))

    fg = ~exterior_free
    fg = binary_closing(fg, iterations=2)

    lab2, n = label(fg)
    if n == 0:
        print('no fg'); return
    sizes = np.bincount(lab2.ravel())
    sizes[0] = 0
    main = (lab2 == sizes.argmax())

    # 외곽 halo 제거 — erosion 으로 1px 안쪽으로 깎음
    main = binary_erosion(main, iterations=ERODE)

    alpha = main.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=SIGMA)
    alpha[~main] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    # decontamination — 부분 알파(외곽) 픽셀에서 흰 bg 영향 제거
    bg_color = np.array([255.0, 255.0, 255.0])
    a3 = alpha[..., None]
    safe_a = np.where(a3 < 1e-3, 1.0, a3)
    fg_color = (arr - bg_color * (1.0 - a3)) / safe_a
    fg_color = np.clip(fg_color, 0, 255)

    # 외곽선 두껍게 — 알파 경계 안쪽 ring을 진한 검정으로 덮어 halo 흡수 + 시각적 굵기
    inner = binary_erosion(main, iterations=8)
    outline_band = main & ~inner   # 경계 8px ring
    outline_color = np.array([26.0, 22.0, 18.0])
    fg_color[outline_band] = outline_color
    fg_color = fg_color.astype(np.uint8)

    rgba = np.concatenate([fg_color, (alpha * 255).astype(np.uint8)[..., None]], axis=-1)

    ys, xs = np.where(main)
    y0, y1 = max(0, ys.min() - PAD), min(h, ys.max() + PAD + 1)
    x0, x1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
    cropped = rgba[y0:y1, x0:x1]
    Image.fromarray(cropped, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({cropped.shape[1]}x{cropped.shape[0]})')


if __name__ == '__main__':
    remove_bg(sys.argv[1], sys.argv[2])
