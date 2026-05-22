"""IDLE 시퀀스 PNG에서 선택된 프레임을 배경 제거 + 공통 bbox 정렬 sprite sheet으로 저장.

배경: 단색 어두운 회색 RGB(38,38,38). 캐릭터: 검정 외곽선 + 컬러 내부.
배경 거리 기반 mask + closing + alpha gaussian + decontamination.
모든 선택 프레임의 mask union으로 글로벌 bbox 결정 → 동일 좌표로 crop → 가로 sprite sheet.

usage: python make_idle_sheet.py
"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_dilation, binary_erosion, binary_fill_holes, gaussian_filter, label

SRC_FOLDER = r'C:\icecat\projectG\Recordings\미남 전사'
DST_SHEET = r'C:\icecat\ProjectK\assets\hero_warrior_handsome_idle.png'

# IDLE 한 사이클 균등 분포 6프레임 (분석으로 결정)
FRAME_INDICES = [2, 5, 7, 9, 12, 14]

BG_COLOR = np.array([38.0, 38.0, 38.0])
BG_THRESH = 18         # 배경 거리 임계값
CLOSE_ITER = 2         # 외곽선 끊김 메움
SIGMA = 0.6            # alpha gaussian blur
PAD = 6                # bbox padding


def extract_mask(arr):
    diff = np.abs(arr - BG_COLOR).max(axis=-1)
    fg = diff > BG_THRESH
    fg = binary_closing(fg, iterations=CLOSE_ITER)
    # 가장 큰 컴포넌트만
    lab, n = label(fg)
    if n == 0:
        return fg
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    main = (lab == sizes.argmax())
    # 캐릭터 내부의 알파 구멍(어두운 갈색이 BG와 가까워서 빠진 픽셀) 메움
    main = binary_fill_holes(main)
    return main


def process_frame(arr, mask):
    alpha = mask.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=SIGMA)
    alpha[~mask] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    a3 = alpha[..., None]
    safe_a = np.where(a3 < 1e-3, 1.0, a3)
    fg_color = (arr - BG_COLOR * (1.0 - a3)) / safe_a
    fg_color = np.clip(fg_color, 0, 255).astype(np.uint8)

    rgba = np.concatenate([fg_color, (alpha * 255).astype(np.uint8)[..., None]], axis=-1)
    return rgba


def main():
    files = sorted([f for f in os.listdir(SRC_FOLDER) if f.endswith('.png')])
    selected = [files[i] for i in FRAME_INDICES]
    print(f'selected {len(selected)} frames: {FRAME_INDICES}')

    # 1pass: 모든 마스크 모으고 union bbox 산출
    arrs = []
    masks = []
    for f in selected:
        im = Image.open(os.path.join(SRC_FOLDER, f)).convert('RGB')
        arr = np.array(im).astype(np.float32)
        m = extract_mask(arr)
        arrs.append(arr)
        masks.append(m)

    union = np.zeros_like(masks[0])
    for m in masks:
        union |= m

    ys, xs = np.where(union)
    h, w = union.shape
    y0 = max(0, ys.min() - PAD)
    y1 = min(h, ys.max() + PAD + 1)
    x0 = max(0, xs.min() - PAD)
    x1 = min(w, xs.max() + PAD + 1)
    fh, fw = y1 - y0, x1 - x0
    print(f'frame bbox: y={y0}-{y1} x={x0}-{x1} → {fw}x{fh}')

    # 2pass: 각 프레임 처리 후 같은 bbox로 crop
    frames = []
    for arr, m in zip(arrs, masks):
        rgba = process_frame(arr, m)
        cropped = rgba[y0:y1, x0:x1]
        frames.append(cropped)

    # 가로 sprite sheet
    n = len(frames)
    sheet = np.zeros((fh, fw * n, 4), dtype=np.uint8)
    for i, fr in enumerate(frames):
        sheet[:, i * fw:(i + 1) * fw] = fr

    Image.fromarray(sheet, 'RGBA').save(DST_SHEET)
    print(f'saved {DST_SHEET}  sheet={sheet.shape[1]}x{sheet.shape[0]}  frameSize={fw}x{fh} count={n}')


if __name__ == '__main__':
    main()
