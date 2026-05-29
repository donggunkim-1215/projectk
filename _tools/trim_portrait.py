"""사용자 제공 RGBA PNG의 빈 공간 trim (alpha bbox 기준 + 여백 PAD).

bg 제거는 이미 사용자가 완료. 1024x1536 같은 큰 캔버스에 캐릭터가 작게 들어있어서
필요 없는 transparent 영역만 잘라낸다.

usage: python trim_portrait.py <src> <dst>
"""
import sys
import numpy as np
from PIL import Image

PAD = 8
ALPHA_THRESHOLD = 64  # alpha > 이 값을 fg로 간주 (캐릭터 본체만, 흩어진 dust/halo 제외)


def trim(src_path: str, dst_path: str) -> None:
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img)
    alpha = arr[..., 3]
    fg = alpha > ALPHA_THRESHOLD
    if not fg.any():
        print(f'{src_path}: empty')
        return
    ys, xs = np.where(fg)
    h, w = arr.shape[:2]
    y0 = max(0, ys.min() - PAD)
    y1 = min(h, ys.max() + PAD + 1)
    x0 = max(0, xs.min() - PAD)
    x1 = min(w, xs.max() + PAD + 1)
    cropped = arr[y0:y1, x0:x1]
    Image.fromarray(cropped, 'RGBA').save(dst_path)
    print(f'saved {dst_path}  ({cropped.shape[1]}x{cropped.shape[0]})')


if __name__ == '__main__':
    trim(sys.argv[1], sys.argv[2])
