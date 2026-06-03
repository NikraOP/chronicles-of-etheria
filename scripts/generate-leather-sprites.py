# -*- coding: utf-8 -*-
"""Generate premium pixel-art leather/hide sprites for leatherworking."""
from PIL import Image, ImageDraw
import os
import math

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'png', 'resources', 'leather')
os.makedirs(OUT, exist_ok=True)
S = 96
FINAL = 128


def rgba(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def canvas():
    return Image.new('RGBA', (S, S), (0, 0, 0, 0))


def shadow(d, box=(28, 72, 68, 82)):
    d.ellipse(box, fill=(0, 0, 0, 40))
    d.ellipse((box[0] + 4, box[1] + 2, box[2] - 4, box[3] - 2), fill=(0, 0, 0, 22))


def grad_poly(img, pts, top, mid, bot):
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    ys = [p[1] for p in pts]
    y0, y1 = max(0, min(ys)), min(S - 1, max(ys))
    grad = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(y0, y1 + 1):
        t = 0 if y1 == y0 else (y - y0) / (y1 - y0)
        col = lerp(top, mid, t * 2) if t < 0.5 else lerp(mid, bot, (t - 0.5) * 2)
        gd.line([(0, y), (S, y)], fill=(*col, 255))
    img.alpha_composite(Image.composite(grad, Image.new('RGBA', (S, S), (0, 0, 0, 0)), mask))


def outline(d, pts, col='#2a2218', w=2):
    d.line(pts + [pts[0]], fill=rgba(col), width=w)


def sparkle(d, x, y, col='#fff8e8'):
    c = rgba(col)
    for p in [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]:
        if 0 <= p[0] < S and 0 <= p[1] < S:
            d.point(p, fill=c)


def fur_texture(d, box, col, density=12):
    x1, y1, x2, y2 = box
    for i in range(density):
        x = x1 + (i * 7) % max(1, x2 - x1)
        y = y1 + (i * 5) % max(1, y2 - y1)
        d.line([(x, y), (x + 2, y - 1)], fill=rgba(col), width=1)


def pelt_fold(d, pal, w=44, h=36, cx=48, cy=52, tilt=0):
    dark, mid, light, hi, out = pal
    pts = [
        (cx - w // 2 + tilt, cy - h // 2),
        (cx + w // 2 + tilt, cy - h // 2 + 6),
        (cx + w // 2 - 4, cy + h // 2),
        (cx - w // 2 + 6, cy + h // 2),
    ]
    return pts, (dark, mid, light, hi, out)


def make_pelt(pal, fur_col=None, extra=None):
    img = canvas()
    d = ImageDraw.Draw(img)
    shadow(d)
    pts, _ = pelt_fold(d, pal)
    grad_poly(img, pts, rgba(pal[2])[:3], rgba(pal[1])[:3], rgba(pal[0])[:3])
    outline(d, pts, pal[4])
    cx = sum(p[0] for p in pts) // 4
    cy = sum(p[1] for p in pts) // 4
    d.line([(pts[0][0] + 4, pts[0][1] + 4), (cx, cy - 8)], fill=rgba(pal[3]), width=2)
    if fur_col:
        fur_texture(d, (pts[0][0], pts[0][1], pts[2][0], pts[2][1]), fur_col)
    if extra:
        extra(d, img)
    sparkle(d, cx - 8, cy - 10, pal[3])
    return img


def make_roll(pal, band=None):
    img = canvas()
    d = ImageDraw.Draw(img)
    shadow(d, (24, 74, 72, 84))
    dark, mid, light, hi, out = pal
    body = [(28, 38), (68, 34), (72, 58), (30, 62)]
    grad_poly(img, body, rgba(light)[:3], rgba(mid)[:3], rgba(dark)[:3])
    outline(d, body, out)
    d.ellipse((26, 36, 70, 64), outline=rgba(out), width=2)
    d.arc((26, 36, 70, 64), 200, 340, fill=rgba(hi), width=2)
    if band:
        d.rectangle((32, 44, 66, 50), fill=rgba(band))
    sparkle(d, 40, 40, hi)
    return img


def make_scales(pal, count=5, glow=None):
    img = canvas()
    d = ImageDraw.Draw(img)
    shadow(d)
    dark, mid, light, hi, out = pal
    positions = [(38, 58), (52, 48), (58, 62), (44, 68), (54, 72)]
    for i, (x, y) in enumerate(positions[:count]):
        w, h = 14, 10
        pts = [(x, y - h), (x + w, y), (x, y + h), (x - w, y)]
        grad_poly(img, pts, rgba(light)[:3], rgba(mid)[:3], rgba(dark)[:3])
        outline(d, pts, out, 1)
        d.line([(x, y - h + 2), (x, y + h - 2)], fill=rgba(hi), width=1)
    if glow:
        for p in [(30, 50), (62, 55)]:
            sparkle(d, p[0], p[1], glow)
    return img


def make_sheet(pal, stitch=True):
    img = canvas()
    d = ImageDraw.Draw(img)
    shadow(d, (26, 76, 70, 86))
    dark, mid, light, hi, out = pal
    rect = [22, 32, 74, 68]
    d.rounded_rectangle(rect, radius=6, fill=rgba(mid), outline=rgba(out), width=2)
    d.polygon([(24, 34), (72, 34), (70, 48), (26, 48)], fill=rgba(light))
    d.polygon([(26, 50), (70, 50), (68, 66), (28, 66)], fill=rgba(dark))
    if stitch:
        for x in range(30, 68, 8):
            d.line([(x, 36), (x, 64)], fill=rgba('#5a4030'), width=1)
    sparkle(d, 34, 38, hi)
    return img


GENERATORS = {
    'rabbit-hide.png': lambda: make_pelt(
        ('#6b5848', '#a88972', '#e8d4c0', '#fff6ea', '#3d3228'),
        '#d9c4b0',
    ),
    'fox-hide.png': lambda: make_pelt(
        ('#7a3d18', '#c56a28', '#f0a04a', '#ffe2b8', '#4a2410'),
        '#ffb878',
        lambda d, im: d.ellipse((52, 44, 58, 50), fill=rgba('#2a2218')),
    ),
    'small-hide.png': lambda: make_pelt(
        ('#5a4e42', '#8a7a68', '#c4b6a4', '#efe4d4', '#352c24'),
        '#b8aa98',
    ),
    'leather.png': lambda: make_sheet(
        ('#4a3628', '#7a563c', '#b8895c', '#f0d0a8', '#2e2218'),
    ),
    'thick-leather.png': lambda: make_roll(
        ('#3f2e20', '#6d4c30', '#a67448', '#e8c090', '#241810'),
        '#8b5c38',
    ),
    'tanned-leather.png': lambda: make_sheet(
        ('#5c4228', '#946640', '#c9925c', '#ffd8a8', '#342418'),
        True,
    ),
    'hardened-leather.png': lambda: make_sheet(
        ('#3a3a44', '#5c5c68', '#8a8a98', '#d8d8e8', '#222228'),
        True,
    ),
    'lizard-hide.png': lambda: make_scales(
        ('#1f5a38', '#2f8a52', '#6fd68a', '#c8ffd8', '#0f2e20'),
        6,
        '#a8ffbe',
    ),
    'elemental-hide.png': lambda: make_pelt(
        ('#1a4a6e', '#2f8ab8', '#7ed4ff', '#e8fbff', '#0f2838'),
        '#9ee8ff',
        lambda d, im: (
            d.line([(34, 40), (58, 52)], fill=rgba('#8fe8ff'), width=2),
            d.line([(60, 44), (44, 64)], fill=rgba('#5fc8ff'), width=2),
        ),
    ),
    'yeti-hide.png': lambda: make_pelt(
        ('#6a7f96', '#9eb4c8', '#e8f4ff', '#ffffff', '#3a4654'),
        '#f0f8ff',
        lambda d, im: fur_texture(d, (30, 36, 66, 66), '#ffffff', 18),
    ),
    'hydra-scale.png': lambda: make_scales(
        ('#1a5a42', '#2a8a5c', '#5fd68a', '#b8ffcc', '#0f3020'),
        7,
        '#7affa8',
    ),
    'dragon-scale.png': lambda: make_scales(
        ('#6a1818', '#a82828', '#e85848', '#ffc8b8', '#3a0808'),
        6,
        '#ffb0a0',
    ),
    'phoenix-hide.png': lambda: make_pelt(
        ('#8a2808', '#d85010', '#ff9830', '#ffe8a0', '#4a1404'),
        '#ffb060',
        lambda d, im: (
            d.line([(36, 48), (50, 40), (62, 50)], fill=rgba('#ffcc50'), width=2),
            sparkle(d, 54, 42, '#fff6b0'),
        ),
    ),
    'beholder-hide.png': lambda: make_pelt(
        ('#4a2868', '#7a48a0', '#c080e0', '#f0d0ff', '#2a1438'),
        '#d8a8ff',
        lambda d, im: d.ellipse((44, 46, 52, 54), fill=rgba('#ffe8ff'), outline=rgba('#6a3088')),
    ),
    'titan-hide.png': lambda: make_roll(
        ('#4a4038', '#7a6a58', '#b8a090', '#f0e0d0', '#2a2420'),
        '#c8b0a0',
    ),
    'leviathan-hide.png': lambda: make_pelt(
        ('#123858', '#1f6898', '#4ab0d8', '#b8ecff', '#081c30'),
        '#7ad8ff',
        lambda d, im: (
            d.line([(32, 56), (48, 44), (64, 58)], fill=rgba('#5ec8f0'), width=2),
            fur_texture(d, (34, 40, 62, 64), '#8ee8ff', 8),
        ),
    ),
    'aspect-scale.png': lambda: make_scales(
        ('#4a2088', '#7a38c8', '#c878ff', '#ffe8ff', '#2a1048'),
        7,
        '#ffd0ff',
    ),
}


def finish(img, name):
    img = img.resize((FINAL, FINAL), Image.Resampling.NEAREST)
    img.save(os.path.join(OUT, name), optimize=True)


if __name__ == '__main__':
    for name, fn in GENERATORS.items():
        finish(fn(), name)
    print('generated', len(GENERATORS), 'files in', OUT)
