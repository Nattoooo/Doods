import math
import numpy as np
from PIL import Image


def blank(w, h):
    return np.zeros((h, w), dtype=bool)


def stamp(m, x, y, s=2):
    h, w = m.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(w, x + s), min(h, y + s)
    if x0 < x1 and y0 < y1:
        m[y0:y1, x0:x1] = True


def px(m, x, y):
    h, w = m.shape
    if 0 <= x < w and 0 <= y < h:
        m[y, x] = True


def bresenham(x0, y0, x1, y1):
    pts = []
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
    return pts


def _r(v):
    return int(math.floor(v + 0.5))


def line(m, a, b, s=2):
    x0, y0, x1, y1 = int(a[0]), int(a[1]), int(b[0]), int(b[1])
    if s == 1:
        for x, y in bresenham(x0, y0, x1, y1):
            px(m, x, y)
        return
    dx, dy = x1 - x0, y1 - y0
    if abs(dy) >= abs(dx):
        n = abs(dy)
        sy = 1 if dy >= 0 else -1
        for i in range(n + 1):
            x = _r(x0 + dx * i / n) if n else x0
            y = y0 + sy * i
            for k in range(s):
                px(m, x + k, y)
        for j in range(1, s):
            yy = y1 + j if sy >= 0 else y0 + j
            xx = x1 if sy >= 0 else x0
            for k in range(s):
                px(m, xx + k, yy)
    else:
        n = abs(dx)
        sx = 1 if dx >= 0 else -1
        for i in range(n + 1):
            y = _r(y0 + dy * i / n)
            x = x0 + sx * i
            for k in range(s):
                px(m, x, y + k)
        for j in range(1, s):
            xx = x1 + j if sx >= 0 else x0 + j
            yy = y1 if sx >= 0 else y0
            for k in range(s):
                px(m, xx, yy + k)


def chain(m, pts, s=2):
    for a, b in zip(pts, pts[1:]):
        line(m, a, b, s)
    if len(pts) == 1:
        stamp(m, pts[0][0], pts[0][1], s)


SHAPES = {
    (6, 6): [".####.", "######", "######", "######", "######", ".####."],
    (6, 5): [".####.", "######", "######", "######", ".####."],
    (7, 5): [".#####.", "#######", "#######", "#######", ".#####."],
    (5, 6): [".###.", "#####", "#####", "#####", "#####", ".###."],
    (5, 7): [".###.", "#####", "#####", "#####", "#####", "#####", ".###."],
    (4, 4): [".##.", "####", "####", ".##."],
    (3, 3): [".#.", "###", ".#."],
    (3, 2): [".#.", "###"],
    (2, 2): ["##", "##"],
    (2, 1): ["##"],
    (1, 2): ["#", "#"],
    (1, 1): ["#"],
}


def shape(m, x, y, w, h=None, rows=None):
    rows = rows or SHAPES[(w, h if h is not None else w)]
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c == "#":
                px(m, x + i, y + j)


def dilate(m):
    out = m.copy()
    h, w = m.shape
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            ys0, ys1 = max(0, dy), h + min(0, dy)
            xs0, xs1 = max(0, dx), w + min(0, dx)
            out[ys0:ys1, xs0:xs1] |= m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def compose(layers, w, h):
    c = blank(w, h)
    for mode, layer, protect in layers:
        p = protect if protect is not None else blank(w, h)
        if mode == "over":
            c &= ~(dilate(layer) & ~p)
            c |= layer
        elif mode == "under":
            c |= layer & ~(dilate(c) & ~p)
        else:
            c |= layer
    return c


def box(w, h, x0, y0, x1, y1):
    m = blank(w, h)
    m[max(0, y0):max(0, y1 + 1), max(0, x0):max(0, x1 + 1)] = True
    return m


def save_strip(frames, path):
    h, w = frames[0].shape
    img = np.zeros((h, w * len(frames), 4), dtype=np.uint8)
    for i, f in enumerate(frames):
        img[:, i * w:(i + 1) * w][f] = (255, 255, 255, 255)
    Image.fromarray(img, "RGBA").save(path)


def preview(rows, path, scale=10, guides=None):
    gap = 4
    maxw = max(sum(f.shape[1] for f in r) + gap * (len(r) - 1) for r, _ in rows)
    toth = sum(r[0].shape[0] + gap for r, _ in rows)
    img = np.full((toth * scale, maxw * scale, 3), 40, dtype=np.uint8)
    yo = 0
    for frames, g in rows:
        xo = 0
        for f in frames:
            h, w = f.shape
            cell = np.full((h, w, 3), 70, dtype=np.uint8)
            if g:
                gx0, gy0, gx1, gy1 = g
                cell[gy0:gy1 + 1, gx0:gx1 + 1] = (85, 85, 105)
            cell[f] = (255, 255, 255)
            big = cell.repeat(scale, 0).repeat(scale, 1)
            big[::scale, :] = (big[::scale, :] * 0.8).astype(np.uint8)
            big[:, ::scale] = (big[:, ::scale] * 0.8).astype(np.uint8)
            img[yo * scale:(yo + h) * scale, xo * scale:(xo + w) * scale] = big
            xo += w + gap
        yo += frames[0].shape[0] + gap
    Image.fromarray(img).save(path)


def rot(p, c, deg):
    a = math.radians(deg)
    dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))
