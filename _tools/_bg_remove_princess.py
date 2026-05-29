"""공주 캐릭터 (어두운 그라데이션 BG + 글로우) 배경 제거.
bg_remove_dark.py 기반, V_THRESH 높임."""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_dilation, binary_erosion, gaussian_filter, label

V_THRESH = 70
DILATE = 6
CLOSE = 3
SIGMA = 0.7
ERODE = 1
PAD = 8


def remove_bg(src_path, dst_path):
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]

    val = arr.max(axis=-1)
    seed = val > V_THRESH

    seed = binary_dilation(seed, iterations=DILATE)
    seed = binary_closing(seed, iterations=CLOSE)

    # 가장 큰 연결 영역만 (캐릭터)
    lab, n = label(seed)
    if n == 0:
        print('no fg'); return
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    main = (lab == sizes.argmax())

    main = binary_erosion(main, iterations=ERODE)

    alpha = main.astype(np.float32)
    alpha = gaussian_filter(alpha, sigma=SIGMA)
    alpha[~main] = 0.0
    alpha = np.clip(alpha, 0.0, 1.0)

    out = np.dstack([arr.astype(np.uint8), (alpha * 255).astype(np.uint8)])

    # crop transparent border + padding
    ys, xs = np.where(alpha > 0)
    if len(ys) == 0:
        print('empty'); return
    y0, y1 = ys.min(), ys.max()
    x0, x1 = xs.min(), xs.max()
    y0 = max(0, y0 - PAD); y1 = min(h, y1 + PAD + 1)
    x0 = max(0, x0 - PAD); x1 = min(w, x1 + PAD + 1)
    out = out[y0:y1, x0:x1]

    Image.fromarray(out, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({out.shape[1]}x{out.shape[0]})')


if __name__ == '__main__':
    remove_bg(sys.argv[1], sys.argv[2])
