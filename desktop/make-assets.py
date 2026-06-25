#!/usr/bin/env python3
"""Generate Token Saver app icon (png/ico/icns) and a DMG background."""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "build")
os.makedirs(OUT, exist_ok=True)

# Brand gradient stops (blue -> purple -> green)
STOPS = [(0.0, (59, 130, 246)), (0.55, (139, 92, 246)), (1.0, (16, 185, 129))]

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def grad_color(t):
    for i in range(len(STOPS) - 1):
        t0, c0 = STOPS[i]; t1, c1 = STOPS[i + 1]
        if t0 <= t <= t1:
            return lerp(c0, c1, (t - t0) / (t1 - t0))
    return STOPS[-1][1]

def diagonal_gradient(size):
    """Diagonal brand gradient image (RGB)."""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = grad_color(t)
    return g

def squircle_bg(size):
    """Dark rounded-square background with a subtle vertical gradient + glow."""
    bg = Image.new("RGB", (size, size))
    px = bg.load()
    top = (10, 12, 24); bot = (5, 5, 9)
    for y in range(size):
        t = y / size
        px[0, y] = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    for y in range(size):
        c = px[0, y]
        for x in range(size):
            px[x, y] = c
    # rounded mask (macOS-ish squircle approximated by big radius)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.225), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out

def hexagon_points(cx, cy, r):
    pts = []
    for k in range(6):
        ang = math.radians(60 * k - 90)  # pointy-top
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts

def build_emblem_mask(size):
    """White emblem on black: hexagon ring + bold downward arrow."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    cx = cy = size / 2
    r = size * 0.30
    pts = hexagon_points(cx, cy, r)
    # hexagon ring
    ring = int(size * 0.045)
    d.line(pts + [pts[0]], fill=255, width=ring, joint="curve")
    for p in pts:  # round the corners
        d.ellipse([p[0] - ring / 2, p[1] - ring / 2, p[0] + ring / 2, p[1] + ring / 2], fill=255)
    # downward arrow inside
    aw = size * 0.115           # stem half-width
    stem_top = cy - size * 0.135
    stem_bot = cy + size * 0.02
    d.rectangle([cx - aw, stem_top, cx + aw, stem_bot], fill=255)
    head_w = size * 0.235
    head_top = cy - size * 0.01
    head_tip = cy + size * 0.165
    d.polygon([(cx - head_w, head_top), (cx + head_w, head_top), (cx, head_tip)], fill=255)
    return m

def make_icon(size=1024):
    base = squircle_bg(size)
    grad = diagonal_gradient(size).convert("RGBA")
    emblem_mask = build_emblem_mask(size)

    # soft glow behind emblem
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_src = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_src.paste((124, 92, 246, 255), (0, 0), emblem_mask)
    glow = glow_src.filter(ImageFilter.GaussianBlur(size * 0.05))
    base = Image.alpha_composite(base, glow)

    # gradient emblem through mask
    emblem = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    emblem.paste(grad, (0, 0), emblem_mask)
    base = Image.alpha_composite(base, emblem)

    # clip everything to the squircle
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.225), fill=255)
    final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final.paste(base, (0, 0), mask)
    return final

icon = make_icon(1024)
icon.save(os.path.join(OUT, "icon.png"))
# Windows .ico (multi-size)
icon.save(os.path.join(OUT, "icon.ico"),
          sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
# NOTE: we intentionally do NOT ship a Pillow-generated icon.icns.
# Pillow's .icns can be rejected by electron-builder/iconutil. Instead we point
# mac.icon at icon.png (1024x1024) and let electron-builder generate a valid .icns.

# ---- DMG background ----
def dmg_background(w=660, h=420):
    img = Image.new("RGB", (w, h))
    px = img.load()
    top = (12, 12, 22); bot = (6, 6, 12)
    for y in range(h):
        t = y / h
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    d = ImageDraw.Draw(img)
    # arrow from app (left) to Applications (right)  [RTL-friendly visual]
    ay = int(h * 0.46)
    d.line([(int(w * 0.40), ay), (int(w * 0.60), ay)], fill=(139, 92, 246), width=6)
    d.polygon([(int(w * 0.60), ay - 14), (int(w * 0.60), ay + 14), (int(w * 0.645), ay)], fill=(16, 185, 129))
    try:
        f1 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
        f2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        d.text((w / 2, 40), "TOKEN SAVER", font=f1, fill=(255, 255, 255), anchor="mm")
        d.text((w / 2, h - 36), "Drag the app into Applications to install", font=f2, fill=(148, 163, 184), anchor="mm")
    except Exception as e:
        print("dmg text skipped:", e)
    img.save(os.path.join(OUT, "dmg-background.png"))
    img.resize((w * 2, h * 2)).save(os.path.join(OUT, "dmg-background@2x.png"))

dmg_background()
print("assets written to", OUT)
