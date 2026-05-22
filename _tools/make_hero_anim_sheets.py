"""영웅별 IDLE/WALK/ATTACK/SKILL anim 시퀀스를 배경 제거 + 한 사이클 프레임 추출 + sprite sheet 생성.

영웅 추가 흐름:
  1. 사용자가 `C:\\icecat\\projectG\\Recordings\\{영웅명}\\{idle|walk|attack|skill}\\Image Sequence_*.png` 폴더 보냄
  2. HEROES 아래에 entry 추가 (id, src_root, anims spec)
  3. python make_hero_anim_sheets.py 실행 → assets/hero_{id}_{anim}.png 생성
  4. game.js: preload spritesheet + anim create + HEROES def + animKeys (die는 'hero_shared_die' 공용)

각 anim 별 spec:
  - int      → 등간격 N프레임
  - list[int] → 명시 인덱스 (multi-cycle 원본에서 한 사이클만 뽑을 때)

die는 모든 영웅이 공용 hero_shared_die.png 사용 — 영웅별 die 자산 생성 안 함.

usage: python make_hero_anim_sheets.py
"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_fill_holes, gaussian_filter, label

BASE_DST = r'C:\icecat\ProjectK\assets'

# 영웅별 spec — 새 영웅 추가 시 여기에 entry 추가
HEROES = {
    'warrior_handsome': {
        'src_root': r'C:\icecat\projectG\Recordings\미남 전사',
        'anims': {
            'idle':   [2, 5, 7, 9, 12, 14],
            'walk':   7,
            'attack': [10, 11, 12, 14, 16, 19, 22, 24],
            'skill':  list(range(0, 10)),
        },
    },
    'archer_robin': {
        'src_root': r'C:\icecat\projectG\Recordings\로빈훗',
        'anims': {
            'idle':   [0, 3, 6, 8, 11, 13],
            'walk':   7,
            'attack': [0, 2, 5, 7, 8, 9, 10, 12],
            'skill':  list(range(0, 11)),
        },
    },
    'mage_ice': {
        'src_root': r'C:\icecat\projectG\Recordings\꽁꽁술사',
        'anims': {
            # idle 29f, sine wave 한 사이클 ~15f → 등간격 6f
            'idle':   [0, 3, 6, 7, 11, 13],
            # walk 23f, step ~5f → 등간격 7f
            'walk':   7,
            # attack 43f에 마법 swing 3회 반복 (xr peak 9/24/39). 한 사이클(0~13) 8f, 시전 peak frame 9
            'attack': [0, 3, 5, 8, 9, 10, 12, 14],
            # skill 33f에 3 사이클 → 첫 사이클 11f
            'skill':  list(range(0, 11)),
        },
    },
}

BG_COLOR = np.array([38.0, 38.0, 38.0])
BG_THRESH = 18
CLOSE_ITER = 2
SIGMA = 0.6
PAD = 6


def extract_mask(arr):
    diff = np.abs(arr - BG_COLOR).max(axis=-1)
    fg = diff > BG_THRESH
    fg = binary_closing(fg, iterations=CLOSE_ITER)
    lab, n = label(fg)
    if n == 0:
        return fg
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    main = (lab == sizes.argmax())
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
    return np.concatenate([fg_color, (alpha * 255).astype(np.uint8)[..., None]], axis=-1)


def pick_indices(total, count):
    if count <= 1:
        return [0]
    return [round((total - 1) * i / (count - 1)) for i in range(count)]


def process_anim(hero_id, anim_name, src_folder, frame_spec):
    if not os.path.isdir(src_folder):
        print(f'[{hero_id}/{anim_name}] folder missing — skip')
        return
    files = sorted([f for f in os.listdir(src_folder) if f.endswith('.png')])
    total = len(files)
    if isinstance(frame_spec, list):
        indices = [i for i in frame_spec if 0 <= i < total]
    else:
        indices = pick_indices(total, frame_spec)
    selected = [files[i] for i in indices]
    print(f'[{hero_id}/{anim_name}] total={total} selected={indices}')

    arrs = []
    masks = []
    for f in selected:
        im = Image.open(os.path.join(src_folder, f)).convert('RGB')
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

    frames = []
    for arr, m in zip(arrs, masks):
        rgba = process_frame(arr, m)
        frames.append(rgba[y0:y1, x0:x1])

    n = len(frames)
    sheet = np.zeros((fh, fw * n, 4), dtype=np.uint8)
    for i, fr in enumerate(frames):
        sheet[:, i * fw:(i + 1) * fw] = fr

    dst_filename = f'hero_{hero_id}_{anim_name}.png'
    dst = os.path.join(BASE_DST, dst_filename)
    Image.fromarray(sheet, 'RGBA').save(dst)
    print(f'  saved {dst_filename}  sheet={sheet.shape[1]}x{sheet.shape[0]}  frame={fw}x{fh}')


def main():
    for hero_id, spec in HEROES.items():
        src_root = spec['src_root']
        for anim_name, frame_spec in spec['anims'].items():
            src_folder = os.path.join(src_root, anim_name)
            process_anim(hero_id, anim_name, src_folder, frame_spec)


if __name__ == '__main__':
    main()
