"""Create local 4:5 WebP garment illustrations for the storefront demo."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import json
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images"
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((ROOT / "src" / "data" / "products.json").read_text(encoding="utf-8"))
FILES = sorted({image.rsplit("/", 1)[-1] for product in DATA for image in product["images"]})
FILES += ["hero-01.webp", "hero-02.webp", "hero-03.webp", "deal.webp", "store.webp", "about.webp"]
FILES += [f"category-{name}.webp" for name in ("t-shirts", "shirts", "jeans", "cargos")]
FILES += [f"fit-{name}.webp" for name in ("slim", "regular", "relaxed")]
FILES += [f"social-{i}.webp" for i in range(1, 7)]

COLORS = {
    "crimson": "#b72d3b", "black": "#20242b", "white": "#f8f7f3", "navy": "#1a2b4a",
    "blue": "#5876a3", "stone": "#b8ad9c", "stripe": "#405b7b", "olive": "#67724d",
    "sky": "#85a9c7", "sand": "#c4b59b", "sage": "#89947a", "check": "#405d7d",
    "indigo": "#273957", "dark": "#252d38", "light": "#a9b6c3", "charcoal": "#4c5055",
    "khaki": "#a79674",
}
BACKGROUNDS = ["#e8edf2", "#eee9e1", "#e2e8ee", "#e9ece3", "#e8e5e3"]

def rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i+2], 16) for i in (0, 2, 4))

def shade(color, amount):
    return tuple(max(0, min(255, int(c * amount))) for c in rgb(color))

def draw_garment(draw, name, color):
    kind = name.split("-")[0]
    primary = rgb(color)
    darker = shade(color, .72)
    lighter = shade(color, 1.18)
    if kind == "tee":
        shape = [(265,190),(335,150),(400,202),(465,150),(535,190),(620,340),(548,382),(520,323),(520,765),(280,765),(280,323),(252,382),(180,340)]
        draw.polygon([(x+9,y+14) for x,y in shape], fill=(0,0,0,24))
        draw.polygon(shape, fill=primary)
        draw.line([(280,320),(280,750),(520,750),(520,320)], fill=darker, width=5)
        draw.ellipse((360,175,440,237), fill=rgb(BACKGROUNDS[0]))
        draw.arc((355,164,445,238), 0, 180, fill=darker, width=7)
        if "stripe" in name:
            for y in (370,455,540,625): draw.line((286,y,514,y), fill=lighter, width=18)
        if "pocket" in name:
            draw.rectangle((438,345,493,420), outline=darker, width=5)
    elif kind == "shirt":
        shape = [(275,188),(350,155),(400,214),(450,155),(525,188),(630,330),(550,375),(520,320),(520,770),(280,770),(280,320),(250,375),(170,330)]
        draw.polygon([(x+9,y+14) for x,y in shape], fill=(0,0,0,24))
        draw.polygon(shape, fill=primary)
        draw.polygon([(350,155),(400,214),(380,287),(329,190)], fill=lighter)
        draw.polygon([(450,155),(400,214),(420,287),(471,190)], fill=darker)
        draw.line((400,220,400,740), fill=darker, width=5)
        for y in (300,380,460,540,620,700): draw.ellipse((394,y,406,y+12), fill=lighter)
        draw.rectangle((450,363,498,425), outline=darker, width=4)
    elif kind == "jeans":
        shape = [(285,205),(515,205),(532,350),(520,775),(421,775),(400,423),(379,775),(280,775),(268,350)]
        draw.polygon([(x+8,y+12) for x,y in shape], fill=(0,0,0,24))
        draw.polygon(shape, fill=primary)
        draw.rectangle((285,205,515,270), fill=darker)
        draw.line((400,267,400,410), fill=lighter, width=5)
        draw.line((296,340,296,742), fill=lighter, width=3)
        draw.line((504,340,504,742), fill=darker, width=3)
        draw.arc((292,230,365,323), 180, 280, fill=lighter, width=4)
        draw.arc((435,230,508,323), 260, 360, fill=lighter, width=4)
        draw.line((382,746,293,746), fill=darker, width=5)
        draw.line((507,746,419,746), fill=darker, width=5)
    else:
        shape = [(283,205),(517,205),(532,348),(520,775),(420,775),(400,425),(380,775),(280,775),(268,348)]
        draw.polygon([(x+8,y+12) for x,y in shape], fill=(0,0,0,24))
        draw.polygon(shape, fill=primary)
        draw.rectangle((283,205,517,270), fill=darker)
        draw.line((400,270,400,420), fill=lighter, width=5)
        for y in (330,455):
            draw.polygon([(285,y),(365,y+10),(358,y+92),(287,y+82)], fill=darker)
            draw.polygon([(435,y+10),(515,y),(513,y+82),(442,y+92)], fill=darker)
            draw.line((296,y+18,356,y+24), fill=lighter, width=3)
            draw.line((444,y+24,504,y+18), fill=lighter, width=3)
        draw.line((289,748,379,748), fill=darker, width=5)
        draw.line((421,748,511,748), fill=darker, width=5)

def draw_model(draw, color, variant=0):
    skin = (190, 143, 111)
    cloth = rgb(color)
    x = 400 + (variant % 3 - 1) * 34
    draw.ellipse((x-88, 116, x+88, 292), fill=(40, 38, 38))
    draw.ellipse((x-72, 146, x+72, 304), fill=skin)
    draw.rounded_rectangle((x-127, 283, x+127, 693), 80, fill=cloth)
    draw.polygon([(x-110,665),(x+110,665),(x+82,990),(x+10,990),(x,735),(x-22,990),(x-92,990)], fill=(34,45,66))
    draw.line((x-55,370,x-55,620), fill=shade(color,.72), width=7)

def make_image(filename, index):
    token = filename[:-5].split("-")
    key = token[-1] if token[-1] in COLORS else "navy"
    color = COLORS[key]
    bg = rgb(BACKGROUNDS[index % len(BACKGROUNDS)])
    base = Image.new("RGB", (800, 1000), bg)
    pixels = base.load()
    top = rgb("#f7f8fa")
    for y in range(1000):
        ratio = y/1000
        row = tuple(int(top[c]*(1-ratio*.36)+bg[c]*(ratio*.36)) for c in range(3))
        for x in range(800): pixels[x,y] = row
    shadow = Image.new("RGBA", base.size, (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((150,790,650,875), fill=(10,26,63,38))
    shadow = shadow.filter(ImageFilter.GaussianBlur(25))
    base = Image.alpha_composite(base.convert("RGBA"), shadow)
    overlay = Image.new("RGBA", base.size, (0,0,0,0)); d = ImageDraw.Draw(overlay)
    if filename.startswith(("hero", "category", "fit", "social", "store", "about", "deal")):
        draw_model(d, color, index)
    else:
        draw_garment(d, filename[:-5], color)
    base = Image.alpha_composite(base, overlay)
    draw = ImageDraw.Draw(base)
    draw.line((48,952,752,952), fill=(255,255,255,125), width=2)
    base.convert("RGB").save(OUT/filename, "WEBP", quality=86, method=6)

for i, filename in enumerate(sorted(set(FILES))):
    make_image(filename, i)
print(f"Generated {len(set(FILES))} local WebP placeholders in {OUT}")
