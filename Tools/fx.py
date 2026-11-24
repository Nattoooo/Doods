import math
from pix import blank, shape, px, SHAPES

DOME3 = [".#.", "###", "###"]
DOME32 = [".#.", "###"]


def blobs(w, h, items, mirror=False):
    m = blank(w, h)
    for x, y, bw, bh, *rows in items:
        shape(m, x, y, bw, bh, rows[0] if rows else None)
        if mirror:
            shape(m, w - x - bw, y, bw, bh, [r[::-1] for r in (rows[0] if rows else SHAPES[(bw, bh)])])
    return m


def dust_step():
    seq = [
        [(4, 14, 2, 2), (7, 13, 3, 3, DOME3), (11, 14, 2, 2)],
        [(3, 12, 2, 2), (7, 11, 3, 3), (12, 12, 2, 2)],
        [(2, 10, 2, 1), (7, 9, 2, 2), (13, 10, 2, 1)],
        [(1, 9, 1, 1), (8, 7, 2, 1), (14, 9, 1, 1)],
        [(0, 8, 1, 1), (8, 5, 1, 1), (15, 8, 1, 1)],
    ]
    return [blobs(16, 16, f) for f in seq]


def dust_land():
    seq = [
        [(12, 10, 2, 2), (15, 9, 1, 3, ["#", "#", "#"])],
        [(7, 10, 2, 2), (10, 8, 3, 3, DOME3), (15, 8, 1, 2, ["#", "#"])],
        [(2, 6, 3, 3), (7, 3, 4, 4)],
        [(1, 4, 2, 2), (6, 1, 3, 3)],
        [(0, 3, 1, 1), (5, 0, 2, 2)],
        [(0, 2, 1, 1), (4, 0, 1, 1)],
    ]
    return [blobs(32, 12, f, mirror=True) for f in seq]


RINGS = [
    ["..####..",
     "##....##",
     "..####.."],
    ["..##########..",
     "##..........##",
     "##..........##",
     "..##########.."],
    [".....########.....",
     "..###........###..",
     "##..............##",
     "..###........###..",
     ".....########....."],
    [".....############.....",
     "..###............###..",
     "##..................##",
     "##..................##",
     "..###............###..",
     ".....############....."],
]


def ring(rows, w=24, h=8):
    m = blank(w, h)
    rw, rh = len(rows[0]), len(rows)
    shape(m, (w - rw) // 2, (h - rh) // 2, rw, rh, rows)
    return m


def dashed(m, on=2, off=1):
    h, w = m.shape
    cy, cx = (h - 1) / 2, (w - 1) / 2
    pts = sorted(zip(*m.nonzero()), key=lambda p: math.atan2(p[0] - cy, (p[1] - cx) / 3))
    out = m.copy()
    for i, (y, x) in enumerate(pts):
        if i % (on + off) >= on:
            out[y, x] = False
    return out


def air_ring():
    frames = [ring(r) for r in RINGS]
    frames.append(dashed(frames[-1]))
    return frames


def ray(m, t0, t1, kind, thick):
    for t in range(t0, t1 + 1):
        if kind == 0:
            ys = [7, 8] if thick == 2 else [7]
        elif kind == 1:
            top = 4 - (t + 1) // 2
            ys = [top, top + 1] if thick == 2 else [top + 1]
        else:
            bot = 11 + (t + 1) // 2
            ys = [bot - 1, bot] if thick == 2 else [bot - 1]
        for y in ys:
            px(m, t, y)


def wall_spark():
    plan = [
        [((0, 3), 2)],
        [((0, 6), 2)],
        [((1, 3), 2), ((5, 7), 2)],
        [((4, 6), 1), ((8, 9), 1)],
        [((10, 10), 1)],
    ]
    frames = []
    for segs in plan:
        m = blank(16, 16)
        for kind in (0, 1, 2):
            for (t0, t1), th in segs:
                ray(m, t0, t1, kind, th)
        frames.append(m)
    return frames


FX = dict(dust_step=(dust_step, 16, 16), dust_land=(dust_land, 32, 12),
          air_ring=(air_ring, 24, 8), wall_spark=(wall_spark, 16, 16))
