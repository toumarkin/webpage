# Готовит костюм выпускницы (экран University) из двух рисунков:
#   process/source/pose-gown.png — тело в мантии без головы, машет рукой
#   process/source/face-cap.png  — голова в шапочке (кудрявая)
# Пишет в assets/figure/gown/ и печатает числа для figure.json ("gown").
# Запуск: python3 tools/build_gown.py (нужны pillow, numpy, scipy)
import json, numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'process/source/'; OUT = 'assets/figure/gown/'
CANVAS = (1292, 1246)            # холст поз (figure.json → pose)
SOLE_Y, NECK_X = 1234, 645       # куда встают низ сандалий и центр шеи (как у позы wave)

body = np.array(Image.open(SRC + 'pose-gown.png').convert('RGBA'))
al = body[..., 3] > 128
ys = np.where(al.any(1))[0]
# верх «пенька» шеи и его центр
top = next(y for y in range(len(al)) if al[y, 500:760].sum() > 5)
xs = np.where(al[top + 30, 500:760])[0] + 500
neck_src = ((xs.min() + xs.max()) / 2, top)
s = (1234 - 296.5) / (ys.max() - top)          # шея→подошва как у позы wave
tx, ty = NECK_X - s * neck_src[0], SOLE_Y - s * ys.max()
P = lambda x, y: (round(s * x + tx, 1), round(s * y + ty, 1))

# поднятая рука (кисть + предплечье) отдельно — чтобы махала
r, g, b = [body[..., i].astype(int) for i in range(3)]
skin = (body[..., 3] > 200) & (r > 170) & (r - b > 35)
reg = np.zeros_like(skin); reg[:260, 940:] = True
hand = ndimage.binary_dilation(skin & reg, iterations=7) & (body[..., 3] > 0) & reg
hand_rows = np.where(skin[:260, 940:].any(1))[0]
hy = hand_rows.max()                             # где предплечье уходит в рукав
hx = np.where(skin[hy - 4, 940:])[0].mean() + 940
pivot = P(hx, hy - 4)

def place(rgba):
    im = Image.fromarray(rgba)
    return im.transform(CANVAS, Image.AFFINE, (1 / s, 0, -tx / s, 0, 1 / s, -ty / s), resample=Image.BICUBIC)

# кисть чуть заходит на рукав (перекрытие на шве), стирается из мантии ровно по hand
hand_ext = ndimage.binary_dilation(hand, structure=np.ones((9, 1), bool)) & (body[..., 3] > 0)
piece = np.zeros_like(body); piece[hand_ext] = body[hand_ext]
piece_full = place(piece)

# ткань мантии отдельно (без шеи, рук, джинсов и сандалий): она падает сверху и «надевается»,
# и её же вытягиваем вниз (ROBE_STRETCH), чтобы мантия была длиннее
ROBE_STRETCH = 1.09
yy_, xx_ = np.mgrid[:body.shape[0], :body.shape[1]]
jeans = (b > r + 8) & (b > 130)
bare = (r > 190) & (g > 130) & (b > 105) & (r - b > 40)          # кожа (не золото: у него мало синего)
low_hand = (xx_ > 400) & (xx_ < 500) & (yy_ > 580) & (yy_ < 760)  # опущенная кисть
neck_zone = (yy_ < top + 95) & (xx_ > 560) & (xx_ < 700)             # «пенёк» шеи и ворот футболки
off = ((bare & (low_hand | neck_zone)) | (yy_ < top + 45) | jeans | (yy_ > ys.max() - 70)) & (body[..., 3] > 0)
off = ndimage.binary_dilation(off, iterations=4)
fabric = (body[..., 3] > 0) & ~off & ~hand & (yy_ < 1068)        # 1068 — низ подола на рисунке
lab_, n_ = ndimage.label(fabric); sz_ = ndimage.sum(fabric, lab_, range(1, n_ + 1))
fabric = np.isin(lab_, [i + 1 for i, v in enumerate(sz_) if v > 3000])
fabric = ndimage.binary_fill_holes(fabric) & (body[..., 3] > 0) & ~off
lowhand = ndimage.binary_dilation(bare & low_hand, iterations=4) & low_hand & (body[..., 3] > 0) & ~fabric

def only(mask, src=body):
    out = np.zeros_like(src); out[mask] = src[mask]; return place(out)

# дырку от опущенной кисти в ткани заливаем соседней тканью (кисть потом кладём сверху)
hole = ndimage.binary_fill_holes(fabric | lowhand) & ~fabric
_, (iy, ix) = ndimage.distance_transform_edt(~fabric, return_indices=True)
filled = body.copy(); filled[hole] = body[iy[hole], ix[hole]]
robe_im = only(fabric | hole, filled)
Ya = robe_im.getbbox()[1]                        # верх мантии на холсте: отсюда тянем вниз
def remap_rows(im, src_of):
    a = np.asarray(im).astype(np.float32); al_ = a[..., 3:4] / 255; pm = a[..., :3] * al_
    src = np.clip(src_of(np.arange(a.shape[0], dtype=np.float32)), 0, a.shape[0] - 1)
    i0 = np.floor(src).astype(int); w = (src - i0)[:, None, None]; i1 = np.minimum(i0 + 1, a.shape[0] - 1)
    pm2 = pm[i0] * (1 - w) + pm[i1] * w; al2 = al_[i0] * (1 - w) + al_[i1] * w
    rgb = np.where(al2 > 0, pm2 / np.maximum(al2, 1e-6), 0)
    out = np.dstack([rgb, al2 * 255]); out[(src < 0) | (src > a.shape[0] - 1)] = 0
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))
robe_im = remap_rows(robe_im, lambda y: np.where(y < Ya, y, Ya + (y - Ya) / ROBE_STRETCH))

# опущенная кисть едет вниз вместе с рукавом
hand_im = only(lowhand); hb = hand_im.getbbox()
dy = round(((hb[1] + hb[3]) / 2 - Ya) * (ROBE_STRETCH - 1))
moved = Image.new('RGBA', CANVAS); moved.alpha_composite(hand_im, (0, dy))
# под мантией остаются только ноги (джинсы, сандалии), шея и опущенная кисть
base_im = only((body[..., 3] > 0) & ((yy_ > 1000) & ~fabric | (yy_ < top + 62) | (yy_ < top + 100) & (xx_ > 540) & (xx_ < 720) & ~fabric) & ~lowhand & ~hand)
base_im.alpha_composite(robe_im); base_im.alpha_composite(moved)

# вся фигура в мантии чуть выше: тянем вверх от сандалий, чтобы голова была на той же
# высоте, что у остальных поз (сандалии не меняются)
BODY_STRETCH = 1.125
Ys = P(0, 1145)[1]                               # верх сандалий на холсте
up = lambda y: np.where(y >= Ys, y, Ys - (Ys - y) / BODY_STRETCH)
MY = lambda y: round(y if y >= Ys else Ys - (Ys - y) * BODY_STRETCH, 1)   # точка → точка
base_im = remap_rows(base_im, up); robe_im = remap_rows(robe_im, up); piece_full = remap_rows(piece_full, up)
base_im.save(OUT + 'gown.webp', quality=90); robe_im.save(OUT + 'gown-robe.webp', quality=90)
bb = piece_full.getbbox(); piece_full.crop(bb).save(OUT + 'gown-hand.webp', quality=92)
pivot = (pivot[0], MY(pivot[1]))

# голова в шапочке: масштаб к лицам face-1…9 (по глазам/подбородку/шее)
face = np.array(Image.open(SRC + 'face-cap.png').convert('RGBA'))
# белая футболка под шеей не нужна — под голову встаёт мантия
fy = np.mgrid[:face.shape[0], :face.shape[1]][0]
white = (face[..., :3].min(2) > 200) & (np.ptp(face[..., :3].astype(int), 2) < 30) & (fy > 1000)
face[white, 3] = 0
K = 0.41                                        # px рисунка → единицы лиц
fb = Image.fromarray(((face[..., 3] > 40) * 255).astype(np.uint8)).getbbox()
neck_face = (595, 1065)
crop = Image.fromarray(face).crop(fb)
crop.putalpha(Image.fromarray(np.where(np.array(crop)[..., 3] > 40, np.array(crop)[..., 3], 0).astype(np.uint8)))
fw, fh = crop.size
crop.resize((round(fw * K * 2), round(fh * K * 2)), Image.LANCZOS).save(OUT + 'face-cap.webp', quality=92)

# шапочка отдельно — её подбрасывают
fr, fg, fbl = [face[..., i].astype(int) for i in range(3)]
fa = face[..., 3] > 0
yy, xx = np.mgrid[:face.shape[0], :face.shape[1]]
hair = (fr - fbl > 55) & (fr > 110) & (fr - fg > 25)
gold = (fr > 140) & (fg > 95) & (fbl < 110) & (fr - fbl > 70)
cap = fa & ~hair & ((yy < 300) | (xx < 330) & (yy < 345) | (xx > 780) & (yy < 400))
cap |= fa & (xx > 832) & (yy < 615) | fa & gold & (xx > 740) & (yy < 615)
cap = ndimage.binary_opening(cap, iterations=1)
lab, n = ndimage.label(cap); sizes = ndimage.sum(cap, lab, range(1, n + 1))
cap = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > 2000])
capimg = np.zeros_like(face); capimg[cap] = face[cap]
ci = Image.fromarray(capimg); cb = ci.getbbox(); ci = ci.crop(cb)
ci.resize((round(ci.width * K * 2), round(ci.height * K * 2)), Image.LANCZOS).save(OUT + 'cap.webp', quality=92)

u = lambda v: round(v * K, 1)                    # px рисунка → единицы лиц
meta = {
    'src': 'assets/figure/gown/gown.webp', 'robe': 'assets/figure/gown/gown-robe.webp',
    'neck': [NECK_X, MY(P(*neck_src)[1] + 80 * s)], 'neckPlain': [NECK_X, MY(P(*neck_src)[1])],
    'hand': {'src': 'assets/figure/gown/gown-hand.webp', 'box': [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]], 'pivot': list(pivot)},
    'face': {'src': 'assets/figure/gown/face-cap.webp', 'width': u(fw), 'height': u(fh),
             'neck': [u(neck_face[0] - fb[0]), u(neck_face[1] - fb[1])]},
    'cap': {'src': 'assets/figure/gown/cap.webp', 'box': [u(cb[0] - fb[0]), u(cb[1] - fb[1]), u(cb[2] - cb[0]), u(cb[3] - cb[1])]},
}
print(json.dumps(meta, indent=2, ensure_ascii=False))
