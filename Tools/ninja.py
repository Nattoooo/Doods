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


SPIN = [
    None,
    [".....#..", "....##..", "######..", ".##..#..", "..#..##.", "..######", "..##....", "..#....."],
    ["#......#", ".##..##.", ".######.", "..#..#..", "..#..#..", ".######.", ".##..##.", "#......#"],
    ["...#....", "..##....", "..#####.", "..#..###", "###..#..", ".#####..", "....##..", "....#..."],
]


def shuriken_spin():
    return [shuriken()] + [from_rows(r) for r in SPIN[1:]]


def ellipse_pts(a, b, cx, cy, p0, p1, n=400):
    pts = []
    for i in range(n + 1):
        t = math.radians(p0 + (p1 - p0) * i / n)
        pts.append((int(math.floor(cx + a * math.cos(t))), int(math.floor(cy + b * math.sin(t)))))
    out = []
    for q in pts:
        if not out or out[-1] != q:
            out.append(q)
    return out


def arc_span(length, a=32, b=14):
    acc, prev, t = 0.0, None, 0.0
    while t < 90:
        q = (a * math.cos(math.radians(t)), b * math.sin(math.radians(t)))
        if prev:
            acc += math.hypot(q[0] - prev[0], q[1] - prev[1])
        if acc * 2 >= length:
            return t
        prev = q
        t += 0.25
    return 90


def slash_anim():
    f1 = blank(40, 32)
    s = arc_span(16)
    for x, y in ellipse_pts(32, 14, 6, 16, -s, s):
        f1[y, x] = True
    f2 = blank(40, 32)
    s = arc_span(30)
    for y in range(32):
        for x in range(40):
            dx, dy = x + 0.5 - 6, y + 0.5 - 16
            if dx < 0 or abs(math.degrees(math.atan2(dy / 14, dx / 32))) > s:
                continue
            if (dx / 32) ** 2 + (dy / 14) ** 2 <= 1 and (dx / 30) ** 2 + (dy / 13.4) ** 2 >= 1:
                f2[y, x] = True
    f4 = blank(40, 32)
    for i, (x, y) in enumerate(ellipse_pts(32, 14, 6, 16, -90, 90)):
        if i % 5 != 4:
            f4[y, x] = True
    f5 = blank(40, 32)
    pts = ellipse_pts(32, 14, 6, 16, -90, 90)
    for k in (len(pts) // 6, len(pts) // 2, 5 * len(pts) // 6):
        for x, y in pts[k:k + 2]:
            f5[y, x] = True
    return [f1, f2, slash(), f4, f5]


def hit_anim():
    diamond = lambda n: (lambda u, v, r: u + v <= n)
    pin = lambda u, v, r: (u == 11.5 and v == 0.5) or (u == v == 7.5)
    return [
        radial(24, 24, 12, 12, diamond(3)),
        radial(24, 24, 12, 12, any_of(diamond(2), rays(4, 8))),
        hit(),
        radial(24, 24, 12, 12, rays(8, 11)),
        radial(24, 24, 12, 12, pin),
    ]


BLOB = {
    7: ["..###..", ".#####.", "#######", "#######", "#######", ".#####.", "..###.."],
    5: [".###.", "#####", "#####", "#####", ".###."],
    4: [".##.", "####", "####", ".##."],
    3: [".#.", "###", ".#."],
    2: ["##", "##"],
    1: ["#"],
}


def blob(m, cx, cy, n):
    shape(m, int(round(cx - n / 2)), int(round(cy - n / 2)), n, n, BLOB[n])


def smoke_anim():
    plan = [
        (3.5, 5, None), (6.5, 5, None), None, (13, 4, 4), (14, 3, 2), (14.5, 1, None),
    ]
    frames = []
    for step in plan:
        if step is None:
            frames.append(smoke())
            continue
        off, n, mid = step
        m = blank(32, 32)
        for sx in (-1, 1):
            for sy in (-1, 1):
                blob(m, 16 + sx * off, 16 + sy * off, n)
        if mid:
            blob(m, 16, 16, mid)
        frames.append(m)
    return frames


def full_ring(r_in, r_out, gaps, gap_w):
    def rule(dx, dy):
        r = math.hypot(dx, dy)
        if not (r_in < r <= r_out):
            return False
        a = math.degrees(math.atan2(dy, dx))
        for g in gaps:
            d = math.radians(a - g)
            if math.cos(d) > 0 and r * abs(math.sin(d)) < gap_w:
                return False
        return True
    return rule


def plane(size, *rules):
    m = blank(size, size)
    c = size / 2
    for y in range(size):
        for x in range(size):
            dx, dy = x + 0.5 - c, y + 0.5 - c
            if any(f(dx, dy) for f in rules):
                m[y, x] = True
    return m


def flashbomb_anim():
    twelve = [15 + 30 * k for k in range(12)]
    dash = lambda r0, r1: (lambda u, v, r: r0 <= r <= r1 and u - v <= 1 and v > 1.5)
    seg_dash = full_ring(29.5, 30.5, [k * 30 + d for k in range(12) for d in (-9, -4.5, 0, 4.5, 9, 15)], 1.0)

    def specks(dx, dy):
        for k in range(12):
            t = math.radians(k * 30)
            if int(math.floor(31 * math.cos(t))) == int(math.floor(dx)) and int(math.floor(31 * math.sin(t))) == int(math.floor(dy)):
                return True
        return False
    return [
        radial(64, 64, 32, 32, star8(6, 3.2)),
        radial(64, 64, 32, 32, lambda u, v, r: r <= 15),
        radial(64, 64, 32, 32, any_of(lambda u, v, r: 20 < r <= 26, rays(28, 46))),
        radial(64, 64, 32, 32, any_of(lambda u, v, r: 27 < r <= 30, dash(33, 36), dash(39, 42))),
        plane(64, full_ring(28, 30, twelve, 1.0)),
        plane(64, seg_dash),
        plane(64, specks),
    ]


def aura_anim():
    frames = []
    for k in range(8):
        rot_ = 5.625 * k
        ring_rule = full_ring(12, 13, [rot_ + 45 * j for j in range(8)], 1.0)
        m = plane(32, ring_rule)
        bright = k % 4 < 2
        rs, n = (15.0, 2) if bright else (14.5, 1)
        for j in range(4):
            t = math.radians(11.25 * k + 90 * j)
            cx, cy = 16 + rs * math.cos(t), 16 + rs * math.sin(t)
            x0, y0 = int(round(cx - n / 2)), int(round(cy - n / 2))
            m[max(0, y0):max(0, y0 + n), max(0, x0):max(0, x0 + n)] = True
        frames.append(m)
    return frames


STRIPS = dict(shuriken=(shuriken_spin, "Ninja/shuriken.png"), slash=(slash_anim, "Fx/slash.png"),
              hit=(hit_anim, "Fx/hit.png"), smoke=(smoke_anim, "Fx/smoke.png"),
              flashbomb=(flashbomb_anim, "Fx/flashbomb.png"), aura=(aura_anim, "Fx/aura.png"))
