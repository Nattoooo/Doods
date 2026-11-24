import math
from figure import pose, shift
from pix import line, px
from ninja_move import ninja_frame, torso_frame, BASE_PHI
from character import hstreak


def blade(a, b, mode="over"):
    def f(m):
        line(m, a, b, 1)
    return (mode, f)


def thick_blade(a, b, mode="over"):
    def f(m):
        line(m, a, b, 1)
        line(m, (a[0], a[1] + 1), (b[0], b[1] + 1), 1)
    return (mode, f)


def dots(*pts, mode="under"):
    def f(m):
        for x, y in pts:
            px(m, x, y)
    return (mode, f)


def nf(p, phi, alpha=None, scab=True):
    if alpha is None:
        alpha = torso_frame(p)[1]
    return ninja_frame(p, phi, alpha, scab)


def chop():
    S = (40, 24)
    f1 = pose(size=S, head=(14, 4), torso=[(17, 10), (19, 14)],
              legF=[(19, 15), (23, 17), (23, 21)], legB=[(19, 15), (16, 18), (15, 21)],
              armF=[(15, 10), (13, 7), (11, 5)], armB=[(21, 11), (23, 13), (25, 14)],
              modes=dict(armF="under", armB="under"))
    f1["fx"] = [blade((10, 4), (0, 13), "under")]
    f2 = pose(size=S, head=(21, 4), torso=[(21, 9), (17, 14)],
              legF=[(17, 15), (20, 18), (21, 21)], legB=[(17, 15), (11, 17), (6, 18)],
              armF=[(23, 10), (25, 9), (27, 8)], armB=[(17, 10), (14, 12)],
              modes=dict(armF="under", armB="under"))
    f2["fx"] = [blade((30, 7), (37, 0))]
    f3 = pose(size=S, head=(20, 3), torso=[(21, 9), (17, 13)],
              legF=[(17, 14), (21, 17), (22, 20)], legB=[(17, 14), (10, 16), (4, 17)],
              armF=[(23, 10), (25, 10)], armB=[(16, 10), (12, 11)],
              modes=dict(armF="under", armB="under"))
    f3["fx"] = [blade((28, 10), (38, 10))]
    f4 = pose(size=S, head=(20, 4), torso=[(20, 9), (18, 14)],
              legF=[(18, 15), (21, 18), (21, 21)], legB=[(18, 15), (13, 18), (9, 19)],
              armF=[(22, 10), (25, 12), (27, 14)], armB=[(16, 11), (13, 13)],
              modes=dict(armF="under", armB="under"))
    f4["fx"] = [blade((29, 15), (38, 20)), ("under", hstreak(2, 9, 21)), ("under", hstreak(5, 11, 19))]
    f5 = pose(size=S, head=(19, 3), torso=[(19, 9), (19, 14)],
              legF=[(19, 15), (21, 18), (22, 21)], legB=[(19, 15), (15, 18), (13, 21)],
              armF=[(22, 10), (24, 13), (25, 15)], armB=[(16, 10), (15, 13)],
              modes=dict(armF="under", armB="under"))
    f5["fx"] = [blade((26, 17), (34, 22)), ("under", hstreak(3, 10, 22)), ("under", hstreak(6, 11, 20))]
    f6 = pose(size=S, head=(18, 3), torso=[(19, 9), (19, 14)],
              legF=[(19, 15), (22, 21)], legB=[(19, 15), (16, 21)],
              armF=[(22, 10), (23, 13), (24, 15)], armB=[(16, 10), (15, 13), (15, 15)],
              modes=dict(armF="under", armB="under"))
    f6["fx"] = [blade((25, 17), (31, 23))]
    phis = [200, 172, 180, 182, 176, 168]
    return [nf(p, phi, scab=False) for p, phi in zip((f1, f2, f3, f4, f5, f6), phis)]


def throw():
    S = (32, 24)
    legs = dict(legB=[(15, 16), (12, 22)], legF=[(15, 16), (18, 22)])
    f1 = pose(size=S, head=(13, 4), torso=[(14, 10), (15, 14)], **legs,
              armF=[(12, 11), (9, 9), (7, 7)], armB=[(18, 11), (20, 12), (22, 12)],
              modes=dict(armF="under"))
    f2 = pose(size=S, head=(15, 4), torso=[(16, 10), (15, 14)], **legs,
              armF=[(19, 11), (23, 11), (26, 11)], armB=[(12, 11), (10, 13), (9, 15)])
    f2["fx"] = [dots((29, 10), (30, 9), (29, 13), (30, 14), mode="under")]
    f3 = pose(size=S, head=(15, 4), torso=[(16, 10), (15, 14)], **legs,
              armF=[(19, 12), (22, 15), (24, 18)], armB=[(12, 11), (11, 13), (11, 15)])
    f4 = pose(size=S, head=(14, 4), torso=[(15, 10), (15, 14)], **legs,
              armF=[(18, 11), (20, 13), (21, 15)], armB=[(12, 11), (11, 13), (11, 15)])
    f5 = shift(pose(), 4, 0)
    f5["size"] = S
    phis = [150, 192, 178, 168, BASE_PHI]
    return [nf(p, phi) for p, phi in zip((f1, f2, f3, f4, f5), phis)]


def stab():
    S = (40, 24)
    frames = []
    flutter = [180, 186, 180, 174]
    rows = [(7, 0), (18, 3), (20, 6)]
    for k in range(4):
        p = pose(size=S, head=(23, 9), torso=[(21, 11), (17, 11)], rot=90,
                 legF=[(16, 11), (10, 12), (4, 13)], legB=[(16, 11), (10, 10), (4, 9)],
                 armF=[(22, 15), (25, 15), (27, 15)], armB=[(22, 16), (24, 16)],
                 modes=dict(armF="under", armB="under"))
        fx = [thick_blade((32, 14), (37, 14)), ("over", lambda m: (px(m, 38, 14))),
              ("over", lambda m: [px(m, 30, y) for y in range(13, 18)])]
        for y, ph in rows:
            fx.append(("under", stripes(y, 0, 14, 8, 5, ph + 2 * k)))
        p["fx"] = fx
        frames.append(nf(p, flutter[k], 90, scab=False))
    return frames


def stripes(y, x0, x1, period, on, phase):
    def f(m):
        for x in range(x0, x1 + 1):
            if (x + phase) % period < on:
                px(m, x, y)
    return f


def heli():
    S = (48, 48)
    lengths = [44, 24, 10, 44, 24, 10]
    frames = []
    for k in range(6):
        p = pose(size=S, head=(21, 15), torso=[(23, 21), (23, 25)],
                 armB=[(19, 22), (19, 16), (21, 13)], armF=[(28, 22), (28, 16), (26, 13)],
                 legB=[(23, 26), (20, 28), (21, 31)], legF=[(23, 26), (27, 27), (27, 31)],
                 modes=dict(armF="merge", armB="merge", legF="over"))
        half = lengths[k] // 2
        theta = math.degrees(math.acos(min(1.0, lengths[k] / 44)))
        fx = [("over", rotor(24 - half, 24 + half - 1)), ("under", heli_arcs(theta))]
        p["fx"] = fx
        frames.append(nf(p, (90 + 60 * k) % 360, 0, scab=False))
    return frames


def rotor(x0, x1):
    def f(m):
        for x in range(x0, x1 + 1):
            px(m, x, 10)
            px(m, x, 11)
    return f


def heli_arcs(theta):
    def f(m):
        n = 90
        for i in range(n + 1):
            t = math.radians(theta - 55 + 43 * i / n)
            for sign in (1, -1):
                x = 24 + sign * 22 * math.cos(t)
                y = 11 - sign * 4 * math.sin(t)
                px(m, int(math.floor(x)), int(math.floor(y)))
    return f


def hurt():
    f1 = pose(head=(8, 4), torso=[(10, 10), (11, 15)],
              armF=[(13, 11), (16, 9), (19, 8)], armB=[(7, 12), (4, 11), (1, 10)],
              legB=[(11, 16), (8, 22)], legF=[(11, 16), (14, 22)])
    f2 = pose(head=(7, 5), torso=[(9, 11), (11, 15)],
              armF=[(13, 12), (16, 9), (18, 6)], armB=[(6, 13), (3, 12), (0, 12)],
              legB=[(11, 16), (8, 22)], legF=[(11, 16), (14, 22)])
    f3 = pose(head=(9, 4), torso=[(10, 10), (11, 14)],
              armF=[(14, 11), (16, 12), (17, 14)], armB=[(7, 11), (6, 13), (5, 15)],
              legB=[(11, 16), (8, 22)], legF=[(11, 16), (14, 22)])
    phis = [205, 222, 185]
    return [nf(p, phi) for p, phi in zip((f1, f2, f3), phis)]


ABILITIES = dict(chop=chop, throw=throw, stab=stab, heli=heli, hurt=hurt)
