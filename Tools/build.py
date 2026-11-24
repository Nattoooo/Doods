import os
import sys
from pix import save_strip, preview
from figure import BASE, render
import character
import fx
import ninja

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Sprites")

CHARACTER = {
    "idle": 16, "run": 8, "jump_start": 3, "rise": 3, "apex": 4, "fall": 4,
    "land": 5, "double_jump": 8, "wall_slide": 4, "wall_kick": 5,
}
FX_FRAMES = {"dust_step": 5, "dust_land": 6, "air_ring": 5, "wall_spark": 5}


def out(*parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def build():
    sheets = {}
    base = render(BASE)
    save_strip([base], out("Character", "base.png"))
    sheets["base"] = [base]
    for name, count in CHARACTER.items():
        frames = character.ANIMS[name]()
        assert len(frames) == count, (name, len(frames))
        save_strip(frames, out("Character", f"{name}.png"))
        sheets[name] = frames
    for name, count in FX_FRAMES.items():
        frames = fx.FX[name][0]()
        assert len(frames) == count, (name, len(frames))
        save_strip(frames, out("Fx", f"{name}.png"))
        sheets[name] = frames
    for name, (make, path) in ninja.NINJA.items():
        frame = make()
        save_strip([frame], out(*path.split("/")))
        sheets[f"ninja_{name}"] = [frame]
    return sheets


if __name__ == "__main__":
    sheets = build()
    if len(sys.argv) > 1:
        rows = [(f, None) for f in sheets.values()]
        preview(rows, sys.argv[1], scale=6)
