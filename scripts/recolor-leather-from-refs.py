from PIL import Image
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'png', 'resources', 'leather')
HIDE_REF = r'C:\Users\Mikra\.cursor\projects\c-Users-Mikra-Desktop-chronicles-of-etheria-main\assets\c__Users_Mikra_AppData_Roaming_Cursor_User_workspaceStorage_a884019e6ff6d5bef43aad72848889df_images_Image__7_-23dfc1ed-52a6-42e5-96be-c2ba6e10ca48.png'
SCALE_REF = r'C:\Users\Mikra\.cursor\projects\c-Users-Mikra-Desktop-chronicles-of-etheria-main\assets\c__Users_Mikra_AppData_Roaming_Cursor_User_workspaceStorage_a884019e6ff6d5bef43aad72848889df_images_Image__5_-13624242-bf85-4bcd-81ad-9a33774474ca.png'

os.makedirs(OUT, exist_ok=True)

def rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def remove_white_bg(im):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 10 or (r > 238 and g > 238 and b > 238):
                px[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im

def pixel_fit(im, size=128, margin=10):
    max_side = max(im.size)
    scale = max(1, (size - margin * 2) // max_side)
    im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
    if im.width > size - margin * 2 or im.height > size - margin * 2:
        ratio = min((size - margin * 2) / im.width, (size - margin * 2) / im.height)
        im = im.resize((max(1, int(im.width * ratio)), max(1, int(im.height * ratio))), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return canvas

def recolor_template(template, palette, accent=None):
    """Recolor non-transparent pixels by luminance while preserving template shading."""
    im = template.copy().convert('RGBA')
    px = im.load()
    colors = [rgb(c) for c in palette]
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255
            # Keep very dark source details dark, map the rest to a 5-step palette.
            idx_float = lum * (len(colors) - 1)
            idx = min(len(colors) - 2, max(0, int(idx_float)))
            t = idx_float - idx
            nr, ng, nb = mix(colors[idx], colors[idx + 1], t)
            # Preserve source contrast a bit.
            boost = 0.88 + lum * 0.22
            nr, ng, nb = min(255, int(nr * boost)), min(255, int(ng * boost)), min(255, int(nb * boost))
            px[x, y] = (nr, ng, nb, a)

    if accent:
        # Replace warm source highlights with the accent color for special materials.
        ar, ag, ab = rgb(accent)
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                if r > g + 18 and r > b + 18 and r > 95:
                    px[x, y] = (int(ar * 0.9 + r * 0.1), int(ag * 0.9 + g * 0.1), int(ab * 0.9 + b * 0.1), a)
    return pixel_fit(im)

hide_template = remove_white_bg(Image.open(HIDE_REF))
scale_template = remove_white_bg(Image.open(SCALE_REF))

HIDES = {
    # первая фотка: волк, медведь, тигр, йети, кролик, лиса, белка
    'wolf-hide.png':        (['#14171a', '#29323a', '#596775', '#aab4bf', '#f0f4f8'], None),
    'bear-hide.png':        (['#1c120b', '#3c2414', '#6a4327', '#a9794d', '#e4c39d'], None),
    'tiger-hide.png':       (['#1b0f07', '#5a250c', '#b95b13', '#f0a137', '#ffd98a'], None),
    'yeti-hide.png':        (['#3b4a58', '#6c7f91', '#b9cad8', '#edf7ff', '#ffffff'], None),
    'rabbit-hide.png':      (['#4a403a', '#78675d', '#b9a99c', '#e8ddd1', '#fff7ed'], None),
    'fox-hide.png':         (['#2a1106', '#7a3210', '#c8641e', '#f0a04a', '#ffe1ad'], None),
    'small-hide.png':       (['#23180e', '#594026', '#92724b', '#c6a678', '#efd7ad'], None),
}

SCALES = {
    # вторая фотка: остальные материалы, каждый со своей гаммой
    'dragon-scale.png':     (['#1a0808', '#531212', '#9a2421', '#d95535', '#ffb080'], '#ffd24a'),
    'dragon-hide.png':      (['#160909', '#3b1412', '#76221c', '#b9462e', '#f0a060'], '#ffc05a'),
    'phoenix-hide.png':     (['#240a02', '#7a2208', '#d94b12', '#ff9a28', '#fff06a'], '#ffe530'),
    'leviathan-hide.png':   (['#061728', '#0f3a5c', '#1d79a5', '#51c2e0', '#c4f5ff'], '#8eeaff'),
    'leather.png':          (['#2a1b10', '#5c3920', '#94613a', '#c8945e', '#f0c790'], None),
    'thick-leather.png':    (['#1f150d', '#4a2e1a', '#76502f', '#a97a4d', '#d8b080'], None),
    'tanned-leather.png':   (['#331b0e', '#744018', '#b46e2d', '#e29c52', '#ffd194'], None),
    'hardened-leather.png': (['#101217', '#303541', '#5f6674', '#999faa', '#d7d9de'], '#ffe24a'),
    'lizard-hide.png':      (['#09200e', '#195c28', '#39933e', '#82cf5a', '#cdf58a'], '#f0df24'),
    'elemental-hide.png':   (['#081329', '#173d75', '#2e7fc4', '#66d4ff', '#e4fbff'], '#72e8ff'),
    'hydra-scale.png':      (['#061c12', '#145033', '#28865a', '#63c287', '#c9ffd5'], '#fff04a'),
    'beholder-hide.png':    (['#16091f', '#42175e', '#7b30a5', '#c874f0', '#ffd7ff'], '#ff6bd6'),
    'titan-hide.png':       (['#171614', '#3e3b35', '#706b60', '#a9a194', '#e2d8c8'], '#d4c070'),
    'aspect-scale.png':     (['#10091e', '#273267', '#2a8ea0', '#82df64', '#ffe35a'], '#ff4ff0'),
}

for name, (palette, accent) in HIDES.items():
    recolor_template(hide_template, palette, accent).save(os.path.join(OUT, name), optimize=True)

for name, (palette, accent) in SCALES.items():
    recolor_template(scale_template, palette, accent).save(os.path.join(OUT, name), optimize=True)

print('generated from first reference:', len(HIDES))
print('generated from second reference:', len(SCALES))
