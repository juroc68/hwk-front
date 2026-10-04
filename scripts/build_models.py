"""Génère site/data/modeles.json : les lieux de mémoire modélisés en 3D.

Contours réels issus d'OpenStreetMap (osm_batiments.json), altitude du sol
lue dans les tuiles de relief IGN (site/dem/14). Coordonnées en mètres locaux :
x vers l'est, y vers le nord, z = altitude réelle (non exagérée), origine au sommet.
Lancer avec : PYTHONPATH=.pylib python build_models.py
"""
import json, math, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
ORIGINE = (7.16102, 47.86090)  # croix sommitale (OSM node 2805761238)
M_LAT = 111320.0
M_LON = 111320.0 * math.cos(math.radians(ORIGINE[1]))

# ---------- altitude du sol (tuiles Terrarium z14, 512 px) ----------
Z, SIZE = 14, 512
_tiles = {}


def _tile(x, y):
    if (x, y) not in _tiles:
        _tiles[(x, y)] = Image.open(os.path.join(SITE, "dem", str(Z), str(x), f"{y}.png")).convert("RGB").load()
    return _tiles[(x, y)]


def elev(lon, lat):
    n = 2 ** Z
    fx = (lon + 180) / 360 * n * SIZE
    fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n * SIZE

    def px(ix, iy):
        r, g, b = _tile(ix // SIZE, iy // SIZE)[ix % SIZE, iy % SIZE]
        return r * 256 + g + b / 256 - 32768

    x0, y0 = int(fx - 0.5), int(fy - 0.5)
    tx, ty = fx - 0.5 - x0, fy - 0.5 - y0
    return ((px(x0, y0) * (1 - tx) + px(x0 + 1, y0) * tx) * (1 - ty)
            + (px(x0, y0 + 1) * (1 - tx) + px(x0 + 1, y0 + 1) * tx) * ty)


def local(lon, lat):
    return [round((lon - ORIGINE[0]) * M_LON, 2), round((lat - ORIGINE[1]) * M_LAT, 2)]


def lonlat(x, y):
    return ORIGINE[0] + x / M_LON, ORIGINE[1] + y / M_LAT


def inside(pt, poly):
    x, y, c = pt[0], pt[1], False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


osm = {e["id"]: e for e in json.load(open(os.path.join(HERE, "osm_batiments.json"), encoding="utf8"))["elements"]}


def contour(way_id):
    g = osm[way_id]["geometry"]
    pts = [local(p["lon"], p["lat"]) for p in g]
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def extrusion(way_id, nom, matiere, hauteur, enfoui=0.5, detail=""):
    """Bloc posé sur la pente : base sous le point le plus bas, toit plat au-dessus du plus haut."""
    pts = contour(way_id)
    zs = [elev(*lonlat(*p)) for p in pts]
    return dict(type="bloc", nom=nom, detail=detail, matiere=matiere, contour=pts,
                base=round(min(zs) - enfoui, 2), toit=round(max(zs) + hauteur, 2))


def croix_dans(way_id, pas_rang, pas_ligne, axe_deg, max_n=None, allee=0.0):
    """Rangées de tombes alignées sur un axe (degrés depuis l'est), en évitant une allée centrale."""
    poly = contour(way_id)
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    a = math.radians(axe_deg)
    ux, uy, vx, vy = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
    out = []
    r = 120
    for i in range(-int(r / pas_ligne), int(r / pas_ligne) + 1):
        for j in range(-int(r / pas_rang), int(r / pas_rang) + 1):
            along, across = i * pas_ligne, j * pas_rang
            if abs(across) < allee / 2:
                continue
            x, y = cx + ux * along + vx * across, cy + uy * along + vy * across
            # marge de 3 m sur le bord
            if inside((x, y), poly) and all(inside((x + dx, y + dy), poly) for dx, dy in ((3, 0), (-3, 0), (0, 3), (0, -3))):
                out.append((along, across, x, y))
    out.sort(key=lambda t: (t[0], t[1]))
    if max_n and len(out) > max_n:
        step = len(out) / max_n
        out = [out[int(k * step)] for k in range(max_n)]
    return [[round(x, 2), round(y, 2), round(elev(*lonlat(x, y)), 2)] for _, _, x, y in out], (cx, cy)


objets = []

# Croix sommitale : 22 m, béton blanc, inaugurée en 1930, illuminée depuis 1936
x0, y0 = local(*ORIGINE)
objets.append(dict(type="croix", nom="Croix sommitale", detail="22 m, béton, 1930",
                   pos=[x0, y0, round(elev(*ORIGINE), 2)], hauteur=22, bras=9, section=1.3))

# Monument national : enceinte, crypte surmontée de l'Autel de la Patrie
objets.append(extrusion(159671164, "Monument national", "pierre", 1.2, enfoui=1.0))
crypte = extrusion(827113119, "Crypte", "pierre", 3.5, enfoui=0.8)
objets.append(crypte)
cpts = crypte["contour"]
ccx, ccy = sum(p[0] for p in cpts) / len(cpts), sum(p[1] for p in cpts) / len(cpts)
axe = math.degrees(math.atan2(y0 - ccy, x0 - ccx))  # axe autel -> croix
objets.append(dict(type="autel", nom="Autel de la Patrie", pos=[round(ccx, 2), round(ccy, 2), crypte["toit"]],
                   largeur=9, profondeur=4, hauteur=2.6, axe=round(axe, 1)))

# Nécropole du Silberloch : 1 264 tombes identifiées, mât tricolore dans l'axe de la croix
tombes, (ncx, ncy) = croix_dans(159708695, 1.7, 3.4, axe, max_n=1264, allee=7)
objets.append(dict(type="tombes", nom="Nécropole du Silberloch", detail="1 264 tombes", camp="fr", points=tombes))
objets.append(dict(type="mat", pos=[round(ncx, 2), round(ncy, 2), round(elev(*lonlat(ncx, ncy)), 2)], hauteur=14))

# Historial franco-allemand (2017)
objets.append(extrusion(539721243, "Historial franco-allemand", "historial", 6.5, enfoui=1.0, detail="2017"))

# Fortins allemands (Festen) près du sommet
for wid, nom in ((1097814180, "Feste Rohrburg"), (1097814181, "Feste Grossherzog"), (1097814179, "Abri allemand")):
    objets.append(extrusion(wid, nom, "beton", 1.8, enfoui=1.0))

# Cimetières militaires allemands du versant est
for wid in (624217065, 760215454, 621462235, 627326019, 624217066, 624216647):
    pts, _ = croix_dans(wid, 2.2, 3.0, 90)
    camp = "fr" if wid == 627326019 else "de"  # Bonnegoutte : cimetière de chasseurs français
    objets.append(dict(type="tombes", nom=osm[wid]["tags"].get("name", ""), camp=camp, points=pts))

dst = os.path.join(SITE, "data", "modeles.json")
json.dump(dict(origine=ORIGINE, objets=objets), open(dst, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
for o in objets:
    print(o["type"], o.get("nom", ""), len(o.get("points", [])) or "", o.get("base", ""), o.get("toit", o.get("pos", "")))
print(os.path.getsize(dst) // 1024, "Ko")
