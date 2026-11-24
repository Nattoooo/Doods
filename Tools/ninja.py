import math
from figure import BASE, render
from pix import blank, line, dilate, shape

TAILS = [
    (6, 5), (7, 5), (8, 5), (6, 6), (7, 6), (8, 6), (4, 6), (5, 6), (4, 7), (5, 7),
    (7, 8), (8, 8), (7, 9), (8, 9), (5, 9), (6, 9), (5, 10), (6, 10),
]
SCABBARD = ((6, 20), (19, 7))
HILT = (19, 5)


def ninja_base():
    m = render(BASE)
    m[7, 10:16] = False
    for x, y in TAILS:
        m[y, x] = True
    sc = blank(24, 24)
    line(sc, SCABBARD[0], SCABBARD[1], 1)
    hx, hy = HILT
    sc[hy:hy + 2, hx:hx + 2] = True
    return m | (sc & ~dilate(m))


def from_rows(rows):
    m = blank(len(rows[0]), len(rows))
    shape(m, 0, 0, len(rows[0]), len(rows), rows)
    return m


def shuriken():
    return from_rows([
        "....#...",
        "...##...",
        "..####..",
        "###..##.",
        ".##..###",
        "..####..",
        "...##...",
        "...#....",
    ])


def kunai():
    return from_rows([
        "............",
        "###....###..",
        "#.###.######",
        "###....###..",
        "............",
    ])


def katana():
    blade_end = 23
    rows = [[" "] * 28 for _ in range(7)]
    for x in range(0, 6):
        rows[2][x] = rows[3][x] = "#"
    for y in range(1, 6):
        rows[y][7] = rows[y][8] = "#"
    for x in range(10, blade_end + 1):
        rows[2][x] = rows[3][x] = "#"
    for x in range(blade_end + 1, 27):
        rows[1][x] = rows[2][x] = "#"
    rows[1][27] = "#"
    return from_rows(["".join(r).replace(" ", ".") for r in rows])


def radial(w, h, cx, cy, rule):
    m = blank(w, h)
    for y in range(h):
        for x in range(w):
            dx, dy = abs(x + 0.5 - cx), abs(y + 0.5 - cy)
            u, v = max(dx, dy), min(dx, dy)
            if rule(u, v, math.hypot(dx, dy)):
                m[y, x] = True
    return m


def octant(u, v):
    return math.degrees(math.atan2(v, u))


def ring(r_in, r_out, gap_at=(22.5,), gap_w=0.6):
    def rule(u, v, r):
        if not (r_in < r <= r_out):
            return False
        a = octant(u, v)
        return all(r * math.sin(math.radians(abs(a - g))) >= gap_w for g in gap_at)
    return rule


def rays(r0, r1):
    return lambda u, v, r: r0 <= r <= r1 and (v <= 1 or u - v <= 1)


def any_of(*rules):
    return lambda u, v, r: any(f(u, v, r) for f in rules)


def slash():
    m = blank(40, 32)
    cx, cy = 6, 16
    for y in range(32):
        for x in range(40):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx < 0:
                continue
            outer = (dx / 32) ** 2 + (dy / 14) ** 2 <= 1
            inner = (dx / 29) ** 2 + (dy / 13) ** 2 < 1
            if outer and not inner:
                m[y, x] = True
    return m


def hit():
    return radial(24, 24, 12, 12, any_of(lambda u, v, r: u + v <= 2, rays(3, 10)))


def smoke():
    m = blank(32, 32)
    shape(m, 13, 13, 7, 7, ["..###..", ".#####.", "#######", "#######", "#######", ".#####.", "..###.."])
    for bx in (7, 21):
        for by in (7, 21):
            shape(m, bx, by, 5, 5, [".###.", "#####", "#####", "#####", ".###."])
    return m


def star8(R, ri):
    p1 = (R, 0.0)
    a = math.radians(22.5)
    p2 = (ri * math.cos(a), ri * math.sin(a))

    def rule(u, v, r):
        ang = octant(u, v)
        if ang > 22.5:
            ang = 45 - ang
        t = math.radians(ang)
        d = (math.cos(t), math.sin(t))
        ex, ey = p2[0] - p1[0], p2[1] - p1[1]
        den = d[0] * ey - d[1] * ex
        s = (p1[0] * ey - p1[1] * ex) / den
        return r <= s
    return rule


def flashbomb():
    return radial(64, 64, 32, 32, any_of(star8(8, 4.5), ring(17, 20, gap_w=0.75)))


def aura():
    spark = lambda u, v, r: v <= 1 and 14 <= u <= 16
    return radial(32, 32, 16, 16, any_of(ring(12, 13, gap_at=(0, 45), gap_w=1.0), spark))


NINJA = dict(base=(ninja_base, "Ninja/base.png"), shuriken=(shuriken, "Ninja/shuriken.png"),
             kunai=(kunai, "Ninja/kunai.png"), katana=(katana, "Ninja/katana.png"),
             slash=(slash, "Fx/slash.png"), hit=(hit, "Fx/hit.png"), smoke=(smoke, "Fx/smoke.png"),
             flashbomb=(flashbomb, "Fx/flashbomb.png"), aura=(aura, "Fx/aura.png"))
