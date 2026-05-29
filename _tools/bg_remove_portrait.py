"""다크 비네트 BG 인물 포트레이트 배경 제거 (high-pass + alpha matting).

전략:
  - BG는 부드러운 radial gradient → heavy gaussian blur로 estimate.
  - 원본과 BG estimate 사이 잔차(residual)가 크면 캐릭터 (sharp edge/color contrast).
  - residual mask → closing + fill holes → 캐릭터 silhouette.
  - silhouette 내부의 캐릭터 픽셀 그대로 보존 (outline + 내부 색상 절대 손상 없음).

usage:
  python bg_remove_portrait.py <src> <dst>             # default params
  python bg_remove_portrait.py <src> <dst> <res_thr>   # 잔차 임계값 조정
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import (
    binary_closing, binary_dilation, binary_fill_holes,
    binary_erosion, gaussian_filter, label,
)

BG_BLUR_SIGMA = 120       # 매우 큰 sigma — vignette+halo 전체 부드럽게 평균
DEFAULT_RES_THRESH = 30   # 색 거리 임계 — 캐릭터(sharp)만 잡고 halo gradient는 컷
CLOSE_ITER = 10
EXPAND_ITER = 3
FEATHER_SIGMA = 1.2
PAD = 14


def remove_bg(src_path: str, dst_path: str, res_thresh: int = DEFAULT_RES_THRESH) -> None:
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    # 1) BG estimate = heavy blur of each channel
    bg_r = gaussian_filter(arr[..., 0], sigma=BG_BLUR_SIGMA)
    bg_g = gaussian_filter(arr[..., 1], sigma=BG_BLUR_SIGMA)
    bg_b = gaussian_filter(arr[..., 2], sigma=BG_BLUR_SIGMA)
    bg = np.stack([bg_r, bg_g, bg_b], axis=-1)

    # 2) residual: 원본과 부드러운 BG의 색 차이. 색 거리(L2)로 측정.
    diff = arr - bg
    residual = np.sqrt((diff ** 2).sum(axis=-1))

    # 3) 캐릭터 후보 = residual > threshold
    char = residual > res_thresh

    # 4) closing + fill holes → 캐릭터 내부 균일색 영역까지 silhouette에 흡수
    char = binary_closing(char, iterations=CLOSE_ITER)
    char = binary_fill_holes(char)

    # 가장 큰 컴포넌트 + (main의 1/30 이상 크기 컴포넌트들) 흡수
    lab, n = label(char)
    if n == 0:
        print(f'{src_path}: no character found')
        return
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    main_size = sizes.max()
    keep_threshold = max(800, main_size // 30)
    main = np.zeros_like(char)
    for lbl in range(1, n + 1):
        if sizes[lbl] >= keep_threshold:
            main |= (lab == lbl)

    # 5) silhouette 살짝 확장 — 캐릭터 외곽선 픽셀이 잔차 임계치 직전이라 빠질 수 있음
    main = binary_dilation(main, iterations=EXPAND_ITER)
    main = binary_fill_holes(main)

    # 6) alpha = main mask, 외곽 feather
    alpha = main.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=FEATHER_SIGMA)
    # 외곽으로 너무 퍼진 부분 컷 — safe_zone = main을 살짝 더 dilate
    safe = binary_dilation(main, iterations=2)
    alpha[~safe] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    # 7) 색상은 원본 그대로 (outline + 내부 손상 없음)
    fg_color = arr.astype(np.uint8)
    rgba = np.dstack([fg_color, (alpha * 255).astype(np.uint8)])

    # crop with padding
    ys, xs = np.where(main)
    y0, y1 = max(0, ys.min() - PAD), min(h, ys.max() + PAD + 1)
    x0, x1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
    cropped = rgba[y0:y1, x0:x1]
    Image.fromarray(cropped, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({cropped.shape[1]}x{cropped.shape[0]})')


if __name__ == '__main__':
    thr = int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_RES_THRESH
    remove_bg(sys.argv[1], sys.argv[2], thr)
