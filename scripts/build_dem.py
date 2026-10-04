"""Télécharge le MNT IGN (RGE ALTI) autour du Hartmannswillerkopf et l'encode
en tuiles Terrarium 512 px (Web Mercator), lisibles par MapLibre (raster-dem).

Sortie : public/dem/{z}/{x}/{y}.png  +  public/dem/meta.json
Pur Python (pas de numpy) : le PNG est écrit à la main avec zlib.
"""
import json, math, os, struct, sys, urllib.request, zlib
from concurrent.futures import ThreadPoolExecutor

BBOX = (7.095, 47.830, 7.215, 47.895)  # lon_min, lat_min, lon_max, lat_max
ZOOMS = range(12, 15)                    # z14 en 512 px ≈ 3,2 m / pixel
SIZE = 512
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "dem")
R = 6378137.0
WMS = ("https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
       "&LAYERS=ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES&STYLES=&CRS=EPSG:3857"
       "&BBOX={},{},{},{}&WIDTH={s}&HEIGHT={s}&FORMAT=image/x-bil;bits=32")


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def tile_bbox(x, y, z):
    n = 2 ** z
    s = 2 * math.pi * R / n
    o = math.pi * R
    return (x * s - o, o - (y + 1) * s, (x + 1) * s - o, o - y * s)


def png_rgb(w, h, rows):
    """rows : liste de bytes RGB ; filtre 'Sub' pour une meilleure compression."""
    raw = bytearray()
    for row in rows:
        raw.append(1)
        prev = bytes(3) + row[:-3]
        raw += bytes((a - b) & 255 for a, b in zip(row, prev))

    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def fetch(z, x, y):
    path = os.path.join(OUT, str(z), str(x), f"{y}.png")
    if os.path.exists(path):
        return z, x, y, None
    url = WMS.format(*tile_bbox(x, y, z), s=SIZE)
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(url, timeout=60).read()
            if len(data) == SIZE * SIZE * 4:
                break
        except Exception as e:  # noqa
            print("retry", z, x, y, e, file=sys.stderr)
    vals = struct.unpack(f"<{SIZE * SIZE}f", data)
    rows, hmin, hmax = [], 1e9, -1e9
    for r in range(SIZE):
        row = bytearray()
        for v in vals[r * SIZE:(r + 1) * SIZE]:
            if v < -100 or v > 5000:  # nodata (hors France) : niveau de la plaine
                v = 230.0
            hmin, hmax = min(hmin, v), max(hmax, v)
            t = round((v + 32768) * 256)
            row += bytes(((t >> 16) & 255, (t >> 8) & 255, t & 255))
        rows.append(bytes(row))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png_rgb(SIZE, SIZE, rows))
    return z, x, y, (hmin, hmax)


WIDE = (6.98, 47.76, 7.34, 47.96)  # contexte basse résolution autour de la zone
jobs = []
for z in list(ZOOMS) + [10, 11]:
    b = WIDE if z <= 12 else BBOX
    x0, y0 = lonlat_to_tile(b[0], b[3], z)
    x1, y1 = lonlat_to_tile(b[2], b[1], z)
    jobs += [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
print(len(jobs), "tuiles")
with ThreadPoolExecutor(6) as ex:
    for z, x, y, mm in ex.map(lambda j: fetch(*j), jobs):
        print(z, x, y, mm)
json.dump({"bounds": BBOX, "minzoom": min(ZOOMS), "maxzoom": max(ZOOMS), "tileSize": SIZE},
          open(os.path.join(OUT, "meta.json"), "w"))
