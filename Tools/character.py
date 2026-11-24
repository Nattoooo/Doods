import math
from figure import pose, shift, render, rotate, W, H
from pix import px, line


def hstreak(x0, x1, y):
    def f(m):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            px(m, x, y)
    return f


def vstreak(x, y0, y1):
    def f(m):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            px(m, x, y)
    return f


def dstreak(x0, y0, x1, y1):
    def f(m):
        line(m, (x0, y0), (x1, y1), 1)
    return f


def pixels(*pts):
    def f(m):
        for x, y in pts:
            px(m, x, y)
    return f


def arc(r, a0, a1, c=(12, 13), t=1.0):
    def f(m):
        span = (a1 - a0) % 360
        for y in range(H):
            for x in range(W):
                dx, dy = x + 0.5 - c[0], y + 0.5 - c[1]
                if r - t / 2 <= math.hypot(dx, dy) < r + t / 2:
                    a = math.degrees(math.atan2(dy, dx))
                    if (a - a0) % 360 <= span:
                        m[y, x] = True
    return f


def idle():
    b = pose()
    out1 = pose(armB=[(8, 11), (7, 13), (6, 15)], armF=[(14, 11), (15, 13), (16, 15)])
    down = shift(out1, 0, 1, ["armB", "armF"])
    head = pose(down, head=(10, 5), torso=[(11, 11), (11, 14)])
    knees = pose(head, legB=[(11, 16), (10, 19), (8, 22)], legF=[(11, 16), (13, 18), (14, 22)])
    half = [b, b, out1, down, head, knees, knees, knees]
    seq = half + half[::-1]
    return [render(p) for p in seq]


def run():
    dys = [1, 0, -1, 0]
    legs = [
        (lambda h: [h, (13, 19), (15, 22)], lambda h: [h, (9, 20), (6, 21)]),
        (lambda h: [h, (13, 19), (12, 22)], lambda h: [h, (9, 19), (6, 19)]),
        (lambda h: [h, (11, 18), (10, 22)], lambda h: [h, (14, 17), (15, 20)]),
        (lambda h: [h, (10, 19), (8, 22)], lambda h: [h, (14, 18), (16, 20)]),
    ]
    near_arm = [
        [(9, 12), (7, 14), (4, 15)],
        [(9, 12), (8, 15), (6, 17)],
        [(15, 12), (15, 15), (16, 17)],
        [(16, 12), (17, 15), (19, 16)],
        [(16, 11), (18, 13), (21, 13)],
        [(16, 12), (17, 15), (19, 16)],
        [(15, 12), (15, 15), (16, 17)],
        [(9, 12), (8, 15), (6, 17)],
    ]
    far_arm = [
        [(16, 12), (18, 13)],
        [(16, 12), (17, 14)],
        [],
        [(9, 12), (8, 14)],
        [(9, 12), (7, 13)],
        [(9, 12), (8, 14)],
        [],
        [(16, 12), (17, 14)],
    ]
    streak_on = [False, True, True, False]
    frames = []
    for i in range(8):
        k = i % 4
        dy = dys[k]
        h = (11, 16 + dy)
        la, lb = legs[k]
        lift = lambda pts: [(x, y + dy) for x, y in pts]
        p = pose(head=(12, 4 + dy), torso=[(13, 10 + dy), (11, 15 + dy)], legF=la(h), legB=lb(h),
                 armF=lift(near_arm[i]), armB=lift(far_arm[i]), modes=dict(armF="under", armB="under"),
                 order=["legB", "legF", "armF", "armB"])
        if streak_on[k]:
            f = min(la(h)[-1], lb(h)[-1])
            p["fx"] = [("under", hstreak(f[0] - 5, f[0] - 2, f[1] + 1))]
        frames.append(render(p))
    return frames


def jump_start():
    f1 = pose(head=(12, 8), torso=[(13, 14), (11, 17)],
              legF=[(11, 18), (15, 19), (14, 22)], legB=[(11, 18), (8, 20), (8, 22)],
              armB=[(10, 13), (7, 14), (4, 15)], armF=[(9, 16), (6, 17), (4, 18)],
              modes=dict(armF="under"))
    f2 = pose(head=(12, 2), torso=[(13, 8), (12, 14)],
              legB=[(12, 15), (11, 19), (11, 22)], legF=[(12, 15), (13, 19), (14, 22)],
              armB=[], armF=[(16, 9), (19, 10), (21, 10)])
    f3 = pose(head=(11, 1), torso=[(12, 7), (12, 13)],
              legB=[(12, 14), (10, 20)], legF=[(12, 14), (14, 20)],
              armB=[(9, 9), (7, 5), (6, 2)], armF=[(16, 9), (19, 5), (20, 2)])
    return [render(p) for p in (f1, f2, f3)]


RISE = pose(head=(11, 1), torso=[(12, 7), (12, 13)],
            legB=[(12, 14), (10, 20)], legF=[(12, 14), (14, 20)],
            armB=[(9, 9), (7, 5), (7, 2)], armF=[(16, 9), (19, 5), (21, 2)])


def rise():
    f1 = pose(RISE)
    f2 = pose(RISE, armB=[(9, 9), (7, 5), (6, 3)], armF=[(16, 9), (19, 6), (21, 3)])
    f3 = pose(RISE, head=(11, 2), torso=[(12, 8), (12, 14)],
              legB=[(12, 15), (11, 18), (10, 20)], legF=[(12, 15), (14, 18), (14, 20)],
              armB=[(9, 10), (6, 7), (5, 4)], armF=[(16, 10), (19, 7), (21, 5)])
    return [render(p) for p in (f1, f2, f3)]


TUCK_APEX = pose(head=(11, 4), torso=[(12, 10), (11, 14)],
                 legB=[(11, 15), (13, 17), (11, 19)], legF=[(11, 15), (15, 15), (15, 19)],
                 armB=[(8, 11), (5, 11), (2, 11)], armF=[(17, 11), (20, 11), (22, 11)],
                 modes=dict(legF="over"))


def apex():
    f1 = pose(head=(11, 2), torso=[(12, 8), (12, 14)],
              legB=[(12, 15), (11, 18), (10, 20)], legF=[(12, 15), (14, 18), (14, 20)],
              armB=[(9, 10), (6, 7), (4, 5)], armF=[(16, 10), (19, 7), (21, 6)])
    f2 = pose(head=(11, 3), torso=[(12, 9), (12, 14)],
              legB=[(12, 15), (12, 18), (10, 20)], legF=[(12, 15), (15, 17), (15, 20)],
              armB=[(9, 11), (6, 9), (3, 8)], armF=[(16, 10), (19, 9), (21, 8)])
    f3 = pose(head=(11, 4), torso=[(12, 10), (11, 14)],
              legB=[(11, 15), (12, 18), (11, 20)], legF=[(11, 15), (14, 16), (15, 19)],
              armB=[(8, 11), (5, 10), (2, 9)], armF=[(17, 11), (20, 10), (22, 9)],
              modes=dict(legF="over"))
    f4 = pose(TUCK_APEX)
    return [render(p) for p in (f1, f2, f3, f4)]


def fall():
    frames = []
    for lift in (0, 1, 0, -1):
        frames.append(render(pose(head=(10, 6), torso=[(11, 12), (11, 17)],
                                  legB=[(11, 18), (9, 21), (9, 22)], legF=[(11, 18), (13, 21), (14, 22)],
                                  armB=[(8, 12), (6, 8), (4, 5 - lift)], armF=[(14, 12), (17, 8), (19, 5 - lift)])))
    return frames


def land():
    f1 = pose(head=(10, 11), torso=[(11, 17), (11, 18)],
              legB=[(11, 19), (8, 20), (7, 22)], legF=[(11, 19), (14, 20), (15, 22)],
              armB=[(8, 17), (5, 16), (2, 15)], armF=[(14, 17), (17, 16), (20, 15)])
    f2 = pose(head=(10, 12), hs=(7, 5), torso=[(11, 17), (11, 18)],
              legB=[(11, 19), (7, 20), (7, 22)], legF=[(11, 19), (15, 20), (15, 22)],
              armB=[(8, 17), (5, 17), (2, 17)], armF=[(14, 17), (17, 17), (20, 17)])
    f3 = pose(head=(10, 9), torso=[(11, 15), (11, 17)],
              legB=[(11, 18), (8, 20), (7, 22)], legF=[(11, 18), (14, 20), (15, 22)],
              armB=[(8, 15), (6, 16), (4, 17)], armF=[(14, 15), (16, 16), (18, 17)])
    f4 = pose(head=(10, 5), torso=[(11, 11), (11, 15)],
              legB=[(11, 16), (8, 22)], legF=[(11, 16), (14, 22)],
              armB=[(8, 12), (7, 14), (6, 16)], armF=[(14, 12), (15, 14), (16, 16)])
    f5 = pose()
    return [render(p) for p in (f1, f2, f3, f4, f5)]


TUCK = pose(head=(9, 6), torso=[(9, 12), (8, 15)], legB=[],
            legF=[(8, 16), (12, 13), (12, 18)], armF=[(14, 12), (15, 15), (15, 17)], armB=[])


def double_jump():
    frames = []
    head0 = -90
    for i in range(7):
        th = 40 + 45 * i
        p = rotate(TUCK, th)
        if 1 <= i <= 6:
            h = head0 + th
            p["fx"] = [("under", arc(9.5, h - 70, h - 25)), ("under", arc(9.5, h - 115, h - 82))]
        frames.append(render(p))
    end = pose(head=(11, 2), torso=[(12, 8), (12, 14)],
               legB=[(12, 15), (11, 18), (10, 20)], legF=[(12, 15), (14, 18), (14, 20)],
               armB=[(9, 10), (6, 7), (4, 5)], armF=[(16, 10), (19, 7), (21, 6)])
    frames.append(render(end))
    return frames


MERGE = dict(armB="merge", armF="merge", legF="merge", legB="merge")

SLIDE = pose(head=(11, 2), torso=[(12, 8), (12, 10), (10, 13)],
             armB=[(8, 1), (8, 6), (9, 8)], armF=[(15, 9), (17, 11), (20, 11)],
             legF=[(10, 14), (14, 15), (13, 19)], legB=[(10, 14), (8, 17)], modes=MERGE)


def wall_slide():
    body = ["head", "torso", "legB", "legF", "armF"]
    up = pose(SLIDE)
    down = shift(SLIDE, 0, 1, body)
    down["fx"] = [("under", pixels((8, 21), (8, 23)))]
    shuffle = pose(SLIDE, legF=[(10, 14), (14, 15), (12, 19)], legB=[(10, 14), (8, 16)])
    shuffle_down = shift(shuffle, 0, 1, body)
    shuffle_down["fx"] = [("under", pixels((8, 20), (8, 22)))]
    return [render(p) for p in (up, down, shuffle, shuffle_down)]


def wall_kick():
    f1 = pose(head=(13, 9), torso=[(14, 15), (12, 19)],
              legF=[(12, 19), (10, 14), (8, 17)], legB=[(12, 19), (10, 20), (8, 21)],
              armF=[(16, 16), (17, 18), (16, 20)], armB=[])
    f2 = pose(head=(14, 5), torso=[(14, 11), (11, 16)],
              legF=[(11, 17), (10, 21)], legB=[(11, 17), (9, 19), (9, 21)],
              armF=[(16, 12), (19, 10), (21, 8)], armB=[])
    f3 = pose(head=(13, 3), torso=[(13, 9), (10, 14)],
              legF=[(10, 15), (7, 20)], legB=[(10, 15), (8, 21)],
              armF=[(17, 10), (19, 7), (21, 4)], armB=[])
    f3["fx"] = [("under", dstreak(3, 20, 5, 17)), ("under", dstreak(4, 23, 6, 20)), ("under", dstreak(6, 16, 7, 14))]
    f4 = pose(head=(12, 2), torso=[(13, 8), (12, 14)],
              legF=[(12, 15), (13, 20)], legB=[(12, 15), (9, 19)],
              armF=[(16, 9), (19, 6), (21, 3)], armB=[(9, 9), (8, 6), (8, 3)])
    f4["fx"] = [("under", dstreak(6, 22, 7, 21)), ("under", dstreak(9, 23, 10, 22))]
    f5 = pose(RISE)
    return [render(p) for p in (f1, f2, f3, f4, f5)]


ANIMS = dict(idle=idle, run=run, jump_start=jump_start, rise=rise, apex=apex, fall=fall, land=land,
             double_jump=double_jump, wall_slide=wall_slide, wall_kick=wall_kick)
