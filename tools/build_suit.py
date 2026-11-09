# Готовит костюм (экраны Context / политика) из рисунков process/source/suit-*.png:
# подгоняет под размер фигуры в джинсах (поза down), пишет в assets/figure/suit/
# и печатает блок "suit" для figure.json. Для позы down ещё печатает клетки,
# на которые костюм рассыпается.
# Запуск: python3 tools/build_suit.py (нужны pillow, numpy)
import json, numpy as np
from PIL import Image

SRC = 'process/source/'; OUT = 'assets/figure/suit/'
CANVAS = (1292, 1246)
SOLE_Y, NECK_X = 1234, 645
POSES = ['up', 'wave', 'down']
PAD = {'up': 180, 'wave': 180, 'down': 0}   # запас по бокам холста для рук, px
CELL = 46                                    # размер «квадратика» при рассыпании, px холста

def shoulders(al, top):
    """Линия плеч (первая строка ниже шеи, где фигура резко шире) и ширина фигуры чуть ниже."""
    w = lambda y: (lambda xs: xs.max() - xs.min() if len(xs) else 0)(np.where(al[y])[0])
    neck_w = w(top + 20)
    y = next(y for y in range(top + 20, top + 400) if w(y) > neck_w * 4)
    return y, w(y + 60)

# эталон: фигура в джинсах, руки вниз
ja = np.array(Image.open('assets/figure/poses/down.webp').convert('RGBA'))[..., 3] > 128
jtop = next(y for y in range(len(ja)) if ja[y, 560:740].sum() > 5)
J_SH_Y, J_SH_W = shoulders(ja, jtop)
J_NECK = 307.0                                # куда садится голова у позы down (figure.json)

# масштаб по позе down костюма — тот же для всех поз (рисунки в одном масштабе)
d = np.array(Image.open(SRC + 'suit-down.png').convert('RGBA'))[..., 3] > 128
dys = np.where(d.any(1))[0]; dtop = next(y for y in range(len(d)) if d[y, 520:740].sum() > 5)
D_SH_Y, D_SH_W = shoulders(d, dtop)
SY = (SOLE_Y - J_SH_Y) / (dys.max() - D_SH_Y)  # плечи на той же высоте
SX = J_SH_W / D_SH_W                            # та же ширина плеч
NECK_ABOVE = J_SH_Y - J_NECK                    # голова над плечами — как у фигуры в джинсах

meta = {'poses': {}}
for name in POSES:
    a = np.array(Image.open(SRC + f'suit-{name}.png').convert('RGBA'))
    al = a[..., 3] > 128
    ys = np.where(al.any(1))[0]
    top = next(y for y in range(len(al)) if al[y, 520:740].sum() > 5)
    xs = np.where(al[top + 30, 520:740])[0] + 520
    nx = (xs.min() + xs.max()) / 2
    pad = PAD[name]; canvas = (CANVAS[0] + 2 * pad, CANVAS[1])
    ax, bx = SX, NECK_X + pad - SX * nx
    ay, by = SY, SOLE_Y - SY * ys.max()
    im = Image.fromarray(a).transform(canvas, Image.AFFINE, (1 / ax, 0, -bx / ax, 0, 1 / ay, -by / ay), resample=Image.BICUBIC)
    im.save(OUT + f'{name}.webp', quality=90)
    sh_y = ay * shoulders(al, top)[0] + by if name == 'down' else ay * D_SH_Y + by
    meta['poses'][name] = {'src': f'assets/figure/suit/{name}.webp', 'neck': [NECK_X, round(sh_y - NECK_ABOVE, 1)], 'pad': pad}
    if name == 'down':
        al2 = np.array(im)[..., 3]
        cells = []
        for y in range(0, CANVAS[1], CELL):
            for x in range(0, CANVAS[0], CELL):
                if (al2[y:y + CELL, x:x + CELL] > 40).sum() > CELL * CELL * 0.04:
                    cells.append([x, y])
        meta['crumble'] = {'cell': CELL, 'cells': cells}
meta['_fit'] = {'scaleX': round(SX, 3), 'scaleY': round(SY, 3)}
print(json.dumps(meta))
