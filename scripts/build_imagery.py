"""Télécharge l'ombrage LiDAR HD et l'orthophoto IGN (WMTS Géoplateforme)
et les assemble en tuiles JPEG de 1024 px (4 x 4 tuiles IGN de niveau z+2).

Les tuiles sont servies avec le site (public/) : la page ne dépend pas des serveurs de l'IGN.
Sortie : public/lidar/{z}/{x}/{y}.jpg, public/lidar-hd/..., public/ortho/...
"""
import io, math, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

OUTER = (7.095, 47.830, 7.215, 47.895)
CORE = (7.130, 47.838, 7.190, 47.882)
WIDE = (6.98, 47.76, 7.34, 47.96)  # contexte : niveau 12 seulement
ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
WMTS = ("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER={layer}"
        "&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT={fmt}")
LIDAR = ("IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW", "image/png")
ORTHO = ("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg")

# (dossier, couche, zone, niveaux de tuiles 1024 px, qualité JPEG)
SETS = [
    ("lidar", LIDAR, WIDE, range(12, 13), 72),
    ("lidar", LIDAR, OUTER, range(13, 15), 72),
    ("lidar-hd", LIDAR, CORE, range(15, 16), 72),
    ("ortho", ORTHO, WIDE, range(12, 13), 70),
    ("ortho", ORTHO, OUTER, range(13, 15), 70),
]


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    return (int((lon + 180) / 360 * n),
            int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n))


def tiles(bbox, z):
    x0, y0 = lonlat_to_tile(bbox[0], bbox[3], z)
    x1, y1 = lonlat_to_tile(bbox[2], bbox[1], z)
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def get(layer, z, x, y):
    url = WMTS.format(layer=layer[0], fmt=layer[1], z=z, x=x, y=y)
    for _ in range(4):
        try:
            r = urllib.request.urlopen(url, timeout=60)
            return Image.open(io.BytesIO(r.read())).convert("RGB")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
        except Exception as e:  # noqa
            print("retry", z, x, y, e, file=sys.stderr)
    return None


def build(folder, layer, z, x, y, q):
    path = os.path.join(ROOT, folder, str(z), str(x), f"{y}.jpg")
    if os.path.exists(path):
        return
    img = Image.new("RGB", (1024, 1024), (255, 255, 255))
    for dx in range(4):
        for dy in range(4):
            t = get(layer, z + 2, x * 4 + dx, y * 4 + dy)
            if t:
                img.paste(t, (dx * 256, dy * 256))
    if folder.startswith("lidar"):
        img = img.convert("L")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, quality=q, optimize=True, progressive=True)


jobs = [(f, l, z, x, y, q) for f, l, b, zs, q in SETS for z in zs for x, y in tiles(b, z)]
print(len(jobs), "tuiles 1024 px")
with ThreadPoolExecutor(8) as ex:
    for i, _ in enumerate(ex.map(lambda j: build(*j), jobs)):
        if i % 20 == 0:
            print(i, flush=True)
