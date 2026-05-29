"""다크 비네트 BG 인물 포트레이트 배경 제거 (high-pass 방식).

전략:
  1) 배경은 부드러운 radial gradient → heavy gaussian blur로 BG estimate.
  2) 원본과 BG estimate 사이 잔차(residual)가 크면 캐릭터 (sharp edge/color contrast),
     작으면 배경 (gradient에 부합).
  3) residual mask → closing + fill holes로 캐릭터 silhouette 완성.
  4) 캐릭터 silhouette 안=alpha 1, 밖=alpha 0. 가장자리 gaussian feather.
  5) 색상은 원본 그대로 유지 (caracter outline + interior 손상 없음).

usage: python bg_remove_portrait.py <src> <dst>
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import (
    binary_closing, binary_dilation, binary_fill_holes, gaussian_filter, label,
)

BG_BLUR_SIGMA = 40        # bg estimate용 heavy blur
RES_THRESH = 18           # 잔차 임계값 — 이보다 크면 캐릭터
CLOSE_ITER = 6            # 캐릭터 mask 내부 작은 구멍 메우기
EDGE_FEATHER_SIGMA = 0.8  # 외곽 안티앨리어스
PAD = 14


def remove_bg(src_path: str, dst_path: str) -> None:
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    # 1) BG estimate = heavy gaussian blur of original (smooth gradient 보존)
    gray = arr.mean(axis=-1)
    bg_estimate = gaussian_filter(gray, sigma=BG_BLUR_SIGMA)

    # 2) residual = sharp deviation from smooth bg → 캐릭터 픽셀
    residual = np.abs(gray - bg_estimate)

    # 캐릭터 후보 mask: 잔차가 임계값 이상
    char = residual > RES_THRESH

    # 3) closing + fill holes → 캐릭터 내부의 단조로운 색 구역(잔차 낮음)까지 채움
    char = binary_closing(char, iterations=CLOSE_ITER)
    char = binary_fill_holes(char)

    # 가장 큰 컴포넌트 선택 + 같은 등급 작은 컴포넌트 흡수
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

    # 4) alpha: 캐릭터 mask 안=1, 밖=0, feather
    alpha = main.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=EDGE_FEATHER_SIGMA)
    # 캐릭터 밖에서 너무 멀리 퍼진 부분 컷 (살짝 dilate 후 그 밖은 무조건 0)
    safe_zone = binary_dilation(main, iterations=2)
    alpha[~safe_zone] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    # 5) 색상은 원본 그대로
    fg_color = arr.astype(np.uint8)
    rgba = np.dstack([fg_color, (alpha * 255).astype(np.uint8)])

    ys, xs = np.where(main)
    y0, y1 = max(0, ys.min() - PAD), min(h, ys.max() + PAD + 1)
    x0, x1 = max(0, xs.min() - PAD), min(w, xs.max() + PAD + 1)
    cropped = rgba[y0:y1, x0:x1]
    Image.fromarray(cropped, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({cropped.shape[1]}x{cropped.shape[0]})')


if __name__ == '__main__':
    remove_bg(sys.argv[1], sys.argv[2])
