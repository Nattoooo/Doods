import copy
import math
from pix import blank, chain, shape, compose, box, rot

W = H = 24

LIMBS = ("legB", "legF", "armB", "armF")

BASE = dict(
    head=(10, 4),
    hs=(6, 6),
    torso=[(11, 10), (11, 14)],
    armB=[(8, 11), (7, 13), (7, 15)],
    armF=[(14, 11), (15, 13), (15, 15)],
    legB=[(11, 16), (8, 22)],
    legF=[(11, 16), (14, 22)],
)


def pose(base=BASE, **kw):
    p = copy.deepcopy(base)
    p.pop("fx", None)
    p.update(copy.deepcopy(kw))
    return p


def shift(p, dx=0, dy=0, parts=None):
    p = copy.deepcopy(p)
    keys = parts or ("head", "torso") + LIMBS
    for k in keys:
        if k == "head":
            p["head"] = (p["head"][0] + dx, p["head"][1] + dy)
        elif k in p:
            p[k] = [(x + dx, y + dy) for x, y in p[k]]
    return p


def move_pts(p, key, idx, dx=0, dy=0):
    p = copy.deepcopy(p)
    pts = list(p[key])
    for i in (idx if isinstance(idx, (list, tuple)) else [idx]):
        pts[i] = (pts[i][0] + dx, pts[i][1] + dy)
    p[key] = pts
    return p


def rnd(v):
    return int(math.floor(v + 0.5))


def rotate(p, deg, c=(12, 13)):
    p = copy.deepcopy(p)
    hw, hh = p["hs"]
    hc = rot((p["head"][0] + hw / 2, p["head"][1] + hh / 2), c, deg)
    p["head"] = (rnd(hc[0] - hw / 2), rnd(hc[1] - hh / 2))
    for k in ("torso",) + LIMBS:
        pts = []
        for x, y in p[k]:
            q = rot((x + 1, y + 1), c, deg)
            pts.append((rnd(q[0] - 1), rnd(q[1] - 1)))
        p[k] = pts
    p["rot"] = p.get("rot", 0) + deg
    return p


def size(p):
    return p.get("size", (W, H))


def hip_protect(p, r=1):
    w, h = size(p)
    m = blank(w, h)
    for k in ("legB", "legF"):
        if p.get(k):
            x, y = p[k][0]
            m |= box(w, h, x - r, y - r, x + 1 + r, y + 1 + r)
    return m


def render(p):
    W, H = size(p)
    modes = dict(legB="merge", legF="merge", armB="under", armF="over")
    modes.update(p.get("modes", {}))
    body = blank(W, H)
    hw, hh = p["hs"]
    shape(body, p["head"][0], p["head"][1], hw, hh, p.get("head_rows"))
    chain(body, p["torso"])
    prot = hip_protect(p, p.get("hip_r", 1))
    layers = [("merge", body, None)]
    order = p.get("order", ["legB", "legF", "armB", "armF"])
    for k in order:
        if k not in p or not p[k]:
            continue
        m = blank(W, H)
        chain(m, p[k])
        layers.append((modes[k], m, prot if k.startswith("leg") else None))
    for mode, fn in p.get("fx", []):
        m = blank(W, H)
        fn(m)
        layers.append((mode, m, None))
    out = compose(layers, W, H)
    for x, y in p.get("clear", []):
        if 0 <= x < W and 0 <= y < H:
            out[y, x] = False
    for x, y in p.get("add", []):
        if 0 <= x < W and 0 <= y < H:
            out[y, x] = True
    return out
