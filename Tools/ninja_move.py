import math
from figure import render, size
from pix import blank, line, dilate, shape, rot
import character

BASE_PHI = math.degrees(math.atan2(1, -3))
LEN_A = math.hypot(3, 1)
LEN_B = math.hypot(2, 1)
SCAB_LO = (-5.5, 7.5)
SCAB_HI = (7.5, -5.5)
HILT_C = (8.0, -7.0)


def rnd(v):
    return int(math.floor(v + 0.5))


def turn(v, deg):
    return rot(v, (0, 0), deg)


def head_center(p):
    hx, hy = p["head"]
    hw, hh = p["hs"]
    return hx + hw / 2, hy + hh / 2


def torso_frame(p):
    (nx, ny), (bx, by) = p["torso"][0], p["torso"][-1]
    center = ((nx + bx) / 2 + 1, (ny + by) / 2 + 1)
    return center, math.degrees(math.atan2(nx - bx, by - ny))


def head_mask(p):
    m = blank(*size(p))
    hw, hh = p["hs"]
    shape(m, p["head"][0], p["head"][1], hw, hh, p.get("head_rows"))
    return m


def cut_slit(body, p):
    r = p.get("rot", 0)
    hm = head_mask(p)
    W, H = size(p)
    if r % 360 == 0:
        body[p["head"][1] + 3][hm[p["head"][1] + 3]] = False
        return
    c = head_center(p)
    o = turn((0, 0.5), r)
    d = turn((1, 0), r)
    px0, py0 = c[0] + o[0], c[1] + o[1]
    for y in range(H):
        for x in range(W):
            if hm[y, x]:
                dx, dy = x + 0.5 - px0, y + 0.5 - py0
                if abs(dx * d[1] - dy * d[0]) < 0.5:
                    body[y, x] = False


def tails(p, phi):
    r = p.get("rot", 0)
    c = head_center(p)
    a_off = turn((-5, -1), r)
    sa = (c[0] + a_off[0], c[1] + a_off[1])
    if 150 <= phi <= 175 and r % 360 == 0:
        sb = (sa[0], sa[1] + 3)
    else:
        t = math.radians(phi)
        sb = (sa[0] + 3 * math.sin(t), sa[1] - 3 * math.cos(t))
    phi_b = phi - 0.45 * (180 - phi)
    m = blank(*size(p))
    for s, ang, ln in ((sa, phi, LEN_A), (sb, phi_b, LEN_B)):
        t = math.radians(ang)
        e = (s[0] + ln * math.cos(t), s[1] + ln * math.sin(t))
        line(m, (rnd(s[0] - 1), rnd(s[1] - 1)), (rnd(e[0] - 1), rnd(e[1] - 1)), 2)
    return m


def scabbard(p, alpha):
    c, _ = torso_frame(p)
    lean = alpha - p.get("rot", 0)
    c = (c[0] - round(wrap(lean) / 15), c[1])
    alpha = p.get("rot", 0) + 0.25 * wrap(lean)
    m = blank(*size(p))
    lo, hi, hc = (turn(v, alpha) for v in (SCAB_LO, SCAB_HI, HILT_C))
    a = (math.floor(c[0] + lo[0]), math.floor(c[1] + lo[1]))
    b = (math.floor(c[0] + hi[0]), math.floor(c[1] + hi[1]))
    line(m, a, b, 1)
    hx, hy = rnd(c[0] + hc[0] - 1), rnd(c[1] + hc[1] - 1)
    m[max(0, hy):max(0, hy + 2), max(0, hx):max(0, hx + 2)] = True
    return m


def drop_specks(m):
    out = m.copy()
    h, w = m.shape
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                n = m[max(0, y - 1):y + 2, max(0, x - 1):x + 2].sum() - 1
                if n == 0:
                    out[y, x] = False
    return out


def ninja_frame(p, phi, alpha, scab=True):
    full = render(p)
    near = render(dict(p, armB=[])) if p.get("armB") else full.copy()
    far = full & ~near
    cut_slit(near, p)
    cut_slit(full, p)
    t = tails(p, phi) & ~dilate(near)
    body = near | t | (far & ~dilate(t))
    if scab:
        s = scabbard(p, alpha)
        body |= drop_specks(s & ~dilate(body))
    return body


def wrap(a):
    return (a + 180) % 360 - 180


PHI = dict(
    idle=[BASE_PHI] * 5 + [BASE_PHI - 6] * 8 + [BASE_PHI] * 3,
    run=[186, 192, 186, 180, 186, 192, 186, 180],
    jump_start=[BASE_PHI, 185, 205],
    rise=[215, 222, 215],
    apex=[205, 190, 175, 165],
    fall=[268, 262, 268, 274],
    land=[140, 150, 170, 168, BASE_PHI],
    double_jump=[160 + (40 + 45 * i) - 60 for i in range(7)] + [200],
    wall_slide=[250, 256, 250, 244],
    wall_kick=[245, 160, 165, 190, 215],
)
LOOPS = {"idle", "run", "fall", "wall_slide"}
NO_LAG = {("wall_kick", 4)}
NO_SCAB = {("double_jump", i) for i in range(7)}


def movement(name):
    poses = character.POSES[name]()
    phis = PHI[name]
    alphas = [torso_frame(p)[1] for p in poses]
    frames = []
    for i, p in enumerate(poses):
        prev = alphas[i - 1] if (i > 0 or name in LOOPS) else alphas[i]
        a = alphas[i] if (name, i) in NO_LAG else alphas[i] + 0.35 * wrap(prev - alphas[i])
        frames.append(ninja_frame(p, phis[i], a, scab=(name, i) not in NO_SCAB))
    return frames


MOVES = {name: (lambda n=name: movement(n)) for name in PHI}
