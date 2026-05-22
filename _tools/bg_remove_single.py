"""AI 아이콘(검정 외곽선 + 그라데이션 회색 배경)용 배경 제거.

Sobel 그라디언트로 강한 엣지 찾고, 가장자리에서 flood fill 해서 외곽선 안쪽을 fg로 분리.

usage: python bg_remove_single.py <src> <dst>
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_dilation, gaussian_filter, label, sobel

EDGE_THRESH = 50          # gradient magnitude — 강한 엣지(=외곽선)
DILATE = 2                # 엣지 두께 약간 확장 — 외곽선 닫기
SIGMA = 0.8
PAD = 6


def remove_bg(src_path: str, dst_path: str) -> None:
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img)
    h, w = arr.shape[:2]

    gray = arr.mean(axis=-1).astype(np.float32)
    gx = sobel(gray, axis=1)
    gy = sobel(gray, axis=0)
    mag = np.hypot(gx, gy)

    edge = mag > EDGE_THRESH
    edge = binary_dilation(edge, iterations=DILATE)

    # 가장자리에서 flood fill: edge가 아닌 영역만 자유 이동
    free = ~edge
    lab, _ = label(free)
    edge_labels = set()
    edge_labels.update(np.unique(lab[0, :]))
    edge_labels.update(np.unique(lab[-1, :]))
    edge_labels.update(np.unique(lab[:, 0]))
    edge_labels.update(np.unique(lab[:, -1]))
    edge_labels.discard(0)
    exterior_free = np.isin(lab, list(edge_labels))

    # fg = 가장자리에서 도달 못한 영역 (외곽선 + 내부)
    fg = ~exterior_free

    # 가장 큰 컴포넌트만
    lab2, n = label(fg)
    if n == 0:
        print('no fg'); return
    sizes = np.bincount(lab2.ravel())
    sizes[0] = 0
    main = (lab2 == sizes.argmax())
    main = binary_closing(main, iterations=2)

    alpha = main.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=SIGMA)
    alpha[~main] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    rgba = np.concatenate([arr, (alpha * 255).astype(np.uint8)[..., None]], axis=-1)

    ys, xs = np.where(main)
    y0, y1 = max(0, ys.min() - PAD), min(h, ys.max() + PAD + 1)
    x0, x1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
    cropped = rgba[y0:y1, x0:x1]
    Image.fromarray(cropped, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({cropped.shape[1]}x{cropped.shape[0]})')


if __name__ == '__main__':
    remove_bg(sys.argv[1], sys.argv[2])
