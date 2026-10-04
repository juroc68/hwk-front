"""Génère site/data/fronts.json : une ligne de front par phase (points du nord au sud).

Le tracé est volontairement découpé en trois tronçons :
  NORD  (Sudel -> Roche Fendue) : quasi immobile de 1915 à 1918
  CENTRE (sommet -> Hirtzenstein) : là où tout se joue, il change à chaque phase
  SUD   (Hirtzenstein -> Uffholtz) : quasi immobile
Les repères viennent d'OpenStreetMap (panneaux du sentier du HWK, Festen, stèles).
"""
import json, os

# Prolongement nord : Judenhut français / col du Judenhut allemand, puis à l'est du lac
# de la Lauch (Linthal et Sengern allemands) jusqu'au Hilsenfirst
NORD = [[7.0920, 47.9900], [7.0880, 47.9600], [7.0860, 47.9500], [7.0900, 47.9380], [7.1020, 47.9260],
        [7.1150, 47.9160], [7.1220, 47.9090], [7.1300, 47.9020],
        [7.1370, 47.8950], [7.1385, 47.8890], [7.1400, 47.8840], [7.1405, 47.8810],
        [7.1460, 47.8760], [7.1495, 47.8735], [7.1525, 47.8710], [7.1530, 47.8680]]
# Prolongement sud : à l'ouest de Steinbach et de Cernay (allemands), Vieux-Thann et
# Aspach-le-Haut français, Aspach-le-Bas et Schweighouse allemands
SUD = [[7.1630, 47.8400], [7.1610, 47.8350], [7.1600, 47.8300], [7.1500, 47.8220],
       [7.1480, 47.8150], [7.1490, 47.8050], [7.1440, 47.7900], [7.1420, 47.7780],
       [7.1480, 47.7650], [7.1520, 47.7600], [7.1530, 47.7540]]

# Ligne « de référence » : le front figé de 1916-1918 (tranchée française à l'ouest
# de la croix du sommet, première ligne allemande juste à l'est, Hirtzenstein allemand).
STABLE = [[7.1550, 47.8650], [7.1580, 47.8630], [7.1592, 47.8612], [7.1612, 47.8597],
          [7.1630, 47.8570], [7.1650, 47.8540], [7.1655, 47.8500], [7.1660, 47.8470],
          [7.1650, 47.8440]]

CENTRES = {
    "dec14": [[7.1560, 47.8655], [7.1620, 47.8635], [7.1650, 47.8612], [7.1660, 47.8590],
              [7.1665, 47.8560], [7.1670, 47.8520], [7.1665, 47.8480], [7.1655, 47.8445]],
    "jan15": [[7.1510, 47.8650], [7.1530, 47.8630], [7.1545, 47.8610], [7.1560, 47.8585],
              [7.1590, 47.8555], [7.1625, 47.8525], [7.1660, 47.8495], [7.1700, 47.8465],
              [7.1690, 47.8430]],
    "mar15": [[7.1545, 47.8655], [7.1570, 47.8630], [7.1580, 47.8612], [7.1595, 47.8590],
              [7.1615, 47.8560], [7.1640, 47.8530], [7.1670, 47.8495], [7.1705, 47.8465],
              [7.1690, 47.8430]],
    "mar26": [[7.1580, 47.8672], [7.1640, 47.8660], [7.1690, 47.8640], [7.1705, 47.8612],
              [7.1700, 47.8580], [7.1690, 47.8550], [7.1695, 47.8510], [7.1710, 47.8470],
              [7.1690, 47.8430]],
    "avr15": STABLE[:-3] + [[7.1680, 47.8500], [7.1705, 47.8465], [7.1690, 47.8430]],
    "oct15": [[7.1540, 47.8650], [7.1565, 47.8630], [7.1575, 47.8612], [7.1590, 47.8592],
              [7.1620, 47.8565], [7.1650, 47.8540], [7.1680, 47.8500], [7.1705, 47.8465],
              [7.1690, 47.8430]],
    "dec21": [[7.1600, 47.8675], [7.1680, 47.8655], [7.1740, 47.8625], [7.1765, 47.8590],
              [7.1760, 47.8550], [7.1750, 47.8500], [7.1745, 47.8460], [7.1720, 47.8420],
              [7.1680, 47.8390]],
    "dec22": STABLE[:-3] + [[7.1685, 47.8500], [7.1720, 47.8465], [7.1700, 47.8425]],
    "dec28": [[7.1560, 47.8655], [7.1610, 47.8645], [7.1650, 47.8630], [7.1650, 47.8608],
              [7.1630, 47.8590]] + STABLE[4:-3] + [[7.1685, 47.8500], [7.1720, 47.8465],
                                                   [7.1700, 47.8425]],
    "stable": STABLE,
}


def ligne(centre):
    pts = NORD + centre + SUD
    pts = sorted(pts, key=lambda p: -p[1])  # garantit l'ordre nord -> sud
    return [[round(x, 5), round(y, 5)] for x, y in pts]


SOMMET = [7.1610, 47.8609]
AUSSICHT = [7.1655, 47.8595]
HIRTZ = [7.1688, 47.8457]
REHF = [7.1680, 47.8640]

PHASES = [
    dict(id="dec14", date="1914-12-25", label="25 déc. 1914",
         titre="Les chasseurs prennent pied au sommet",
         texte="Une trentaine de chasseurs alpins du 28e BCA s'installent sur le plateau du Silberloch "
               "et poussent un poste avancé jusqu'au sommet. Le 28 décembre, sans le savoir, les Allemands "
               "établissent un observatoire à quelques dizaines de mètres, sur le versant est.",
         unites={"fr": "28e BCA", "de": "Landwehr"}, front="dec14",
         fleches=[dict(camp="fr", de=[7.1500, 47.8590], vers=[7.1595, 47.8612])]),
    dict(id="jan15", date="1915-01-22", label="19-22 janv. 1915",
         titre="Les Allemands s'emparent du sommet",
         texte="Après plusieurs assauts, les Allemands encerclent la compagnie du lieutenant Canavy, "
               "isolée sur le sommet. Les renforts français (18e, 27e et 53e BCA) échouent sous le feu des "
               "Minenwerfer. Les survivants se rendent le 22 janvier. Au sud, le 25e RI a pris le Hirtzenstein.",
         unites={"fr": "28e BCA (Cie Canavy), 18e, 27e, 53e BCA, 25e RI",
                 "de": "Landwehr-Inf.-Rgt. 123, Inf.-Rgt. 25"},
         front="jan15",
         fleches=[dict(camp="de", de=[7.1760, 47.8640], vers=[7.1600, 47.8612]),
                  dict(camp="fr", de=[7.1560, 47.8480], vers=[7.1680, 47.8460])]),
    dict(id="mar15", date="1915-03-23", label="5-23 mars 1915",
         titre="La reconquête pas à pas",
         texte="Le 13e BCA enlève la position de la Jägertanne le 5 mars. Le 152e RI le relève le 19 mars "
               "et, après un bombardement de 57 canons le 23, arrive à 150 mètres du sommet.",
         unites={"fr": "13e BCA, 152e RI", "de": "Inf.-Rgt. 161, Inf.-Rgt. 25"},
         front="mar15",
         fleches=[dict(camp="fr", de=[7.1490, 47.8620], vers=[7.1575, 47.8612])]),
    dict(id="mar26", date="1915-03-26", label="26 mars 1915",
         titre="Le 152e RI reprend le sommet",
         texte="Après trois heures et demie de bombardement, le 152e RI, appuyé par six bataillons de "
               "chasseurs, enlève le sommet, le rocher panorama (Aussichtsfelsen), le Bischofshut et les "
               "Rehfelsen supérieur et moyen. Les Allemands ne tiennent plus que le Rehfelsen inférieur. "
               "Depuis la crête, les Français voient la plaine d'Alsace jusqu'à Cernay.",
         unites={"fr": "152e RI, 7e, 13e, 15e, 27e, 28e, 53e BCA",
                 "de": "Inf.-Rgt. 25, Landwehr-Inf.-Rgt. 15, Res.-Inf.-Rgt. 75"},
         front="mar26",
         fleches=[dict(camp="fr", de=[7.1540, 47.8600], vers=[7.1660, 47.8605]),
                  dict(camp="fr", de=[7.1560, 47.8655], vers=[7.1660, 47.8650])]),
    dict(id="avr15", date="1915-04-26", label="25-26 avr. 1915",
         titre="Contre-attaque allemande, le sommet devient un no man's land",
         texte="Le 25 avril, un assaut allemand coordonné reprend le Rehfelsen supérieur et le rocher "
               "panorama. Près de 1 000 hommes du 152e RI et du 57e RIT sont encerclés et capturés. "
               "Les Français reviennent le lendemain, mais le sommet reste entre les lignes : le front "
               "court désormais du sommet au Rehfelsen inférieur et au Hirtzenstein.",
         unites={"fr": "152e RI, 57e RIT",
                 "de": "Res.-Inf.-Rgt. 75, Res.-Jäger-Btl. 8, Garde-Jäger, Landwehr-Inf.-Rgt. 56"},
         front="avr15",
         fleches=[dict(camp="de", de=[7.1760, 47.8615], vers=[7.1640, 47.8605]),
                  dict(camp="de", de=[7.1760, 47.8680], vers=[7.1670, 47.8645])]),
    dict(id="oct15", date="1915-10-15", label="15-16 oct. 1915",
         titre="Lance-flammes au sommet",
         texte="Après avoir employé pour la première fois des lance-flammes en septembre, les Allemands "
               "atteignent le sommet le 15 octobre. Dès le lendemain, après un violent tir d'artillerie, "
               "le 334e RI et le 15e BCP reprennent le terrain perdu.",
         unites={"fr": "334e RI, 15e BCP",
                 "de": "Garde-Schützen-Btl., Res.-Jäger-Btl. 8, Landwehr-Inf.-Rgt. 56, Garde-Pionier-Btl."},
         front="oct15",
         fleches=[dict(camp="de", de=[7.1700, 47.8612], vers=[7.1590, 47.8610])]),
    dict(id="dec21", date="1915-12-21", label="21 déc. 1915",
         titre="La grande offensive française",
         texte="Plus de 300 pièces d'artillerie tirent 25 000 obus en cinq heures. Les Français enlèvent "
               "le Hirtzenstein, les fortins Rohrburg et Grossherzog et s'enfoncent profondément vers les "
               "postes de commandement allemands. 1 400 Allemands sont faits prisonniers.",
         unites={"fr": "152e RI, 27e et 28e BCA (66e DI, général Serret)",
                 "de": "Jäger-Btl. 14, Res.-Inf.-Rgt. 78, Landwehr-Inf.-Rgt. 99"},
         front="dec21",
         fleches=[dict(camp="fr", de=[7.1600, 47.8612], vers=[7.1735, 47.8610]),
                  dict(camp="fr", de=[7.1620, 47.8540], vers=[7.1730, 47.8525]),
                  dict(camp="fr", de=[7.1620, 47.8470], vers=[7.1715, 47.8450])]),
    dict(id="dec22", date="1915-12-22", label="22 déc. 1915",
         titre="Les « Diables rouges » encerclés",
         texte="La contre-attaque allemande est immédiate. Le 152e RI est encerclé sur le sommet : environ "
               "600 tués et 1 500 prisonniers. Les Allemands reprennent l'essentiel du terrain ; les Français "
               "gardent le Hirtzenstein.",
         unites={"fr": "152e RI", "de": "Res.-Jäger-Btl. 8"},
         front="dec22",
         fleches=[dict(camp="de", de=[7.1780, 47.8640], vers=[7.1650, 47.8615]),
                  dict(camp="de", de=[7.1780, 47.8560], vers=[7.1660, 47.8565])]),
    dict(id="dec28", date="1915-12-28", label="28-30 déc. 1915",
         titre="Combats au Rehfelsen, le général Serret blessé",
         texte="Le 12e BCA enlève une partie du Rehfelsen inférieur le 28 décembre. Le lendemain, le général "
               "Serret, qui commande la 66e DI, est grièvement blessé ; il meurt le 6 janvier 1916. "
               "Le 30, la Garde reprend le Rehfelsen.",
         unites={"fr": "12e BCA, 66e DI", "de": "Res.-Inf.-Rgt. 74, Garde-Jäger"},
         front="dec28",
         fleches=[dict(camp="fr", de=[7.1560, 47.8660], vers=[7.1640, 47.8640])]),
    dict(id="jan16", date="1916-01-08", label="8 janv. 1916",
         titre="Retour au point de départ",
         texte="Dernière grande attaque : après cinq heures de préparation, les régiments allemands 188 et 189 "
               "reprennent le Hirtzenstein. Les deux armées se retrouvent presque exactement sur les lignes "
               "de janvier 1915. Le front ne bougera plus.",
         unites={"fr": "66e DI", "de": "Inf.-Rgt. 188, Inf.-Rgt. 189"},
         front="stable",
         fleches=[dict(camp="de", de=[7.1770, 47.8470], vers=[7.1670, 47.8455])]),
    dict(id="stable", date="1917-01-28", label="1916-1918",
         titre="Le front figé",
         texte="Plus d'offensive majeure : guerre de mines, coups de main et artillerie. Les deux camps "
               "bétonnent leurs positions (Festen allemandes, abris français). Le 28 janvier 1917, l'explosion "
               "d'un dépôt de munitions dans une galerie tue 63 soldats allemands du 124e Landwehr, "
               "toujours ensevelis sur place. Le 15 octobre 1918, des troupes américaines relèvent les Français.",
         unites={"fr": "Régiments territoriaux, puis troupes américaines (oct. 1918)",
                 "de": "Landwehr-Inf.-Rgt. 124"},
         front="stable", fleches=[]),
    dict(id="nov18", date="1918-11-11", label="11 nov. 1918",
         titre="Armistice",
         texte="Le dernier soldat allemand tué au HWK tombe le 4 novembre. L'arrière-garde du 124e Landwehr "
               "quitte la montagne le 15 novembre. Bilan : entre 20 000 et 30 000 morts selon l'historien "
               "Jean-Yves Le Naour (le chiffre souvent cité de 60 000 est exagéré).",
         unites={"fr": "", "de": "Landwehr-Inf.-Rgt. 124"},
         front="stable", fleches=[], fin=True),
]

def zone_combat():
    """Rectangle du secteur de la bataille (la zone détaillée d'origine, relief LiDAR haute résolution)."""
    o, su, e, n = 7.095, 47.830, 7.215, 47.895
    return [[o, n], [e, n], [e, su], [o, su], [o, n]]


REPERES = [
    dict(nom="Sommet", detail="956 m · Croix", pos=SOMMET, rang=1),
    dict(nom="Monument national", detail="Crypte et nécropole", pos=[7.1501, 47.8588], rang=1),
    dict(nom="Silberloch", detail="Arrière français", pos=[7.1575, 47.8574], rang=2),
    dict(nom="Nécropole du Silberloch", detail="1 264 tombes", pos=[7.15093, 47.85893], rang=3),
    dict(nom="Historial", detail="Franco-allemand, 2017", pos=[7.14905, 47.85774], rang=3),
    dict(nom="Roche Sermet", detail="Observatoire français", pos=[7.1570, 47.8616], rang=3),
    dict(nom="Aussichtsfelsen", detail="Rocher panorama", pos=AUSSICHT, rang=2),
    dict(nom="Feste Rohrburg", detail="Fortin allemand", pos=[7.1640, 47.8598], rang=3),
    dict(nom="Rehfelsen", detail="Rochers du versant est", pos=REHF, rang=3),
    dict(nom="Hirtzenstein", detail="Rocher, 572 m", pos=HIRTZ, rang=2),
    dict(nom="Molkenrain", detail="1125 m", pos=[7.1299, 47.8541], rang=2),
    dict(nom="Sudelkopf", detail="1012 m", pos=[7.1309, 47.8858], rang=3),
    dict(nom="Wattwiller", detail="Occupé par les Allemands", pos=[7.1805, 47.8372], rang=1),
    dict(nom="Hartmannswiller", detail="", pos=[7.2125, 47.8626], rang=1),
    dict(nom="Grand Ballon", detail="1424 m · Français", pos=[7.0984, 47.9008], rang=1),
    dict(nom="Judenhut", detail="Position française", pos=[7.1147, 47.9103], rang=2),
    dict(nom="Linthal", detail="Allemand", pos=[7.1288, 47.9481], rang=2),
    dict(nom="Cernay", detail="Allemand", pos=[7.1788, 47.8087], rang=1),
    dict(nom="Thann", detail="Français", pos=[7.1021, 47.8101], rang=1),
    dict(nom="Steinbach", detail="", pos=[7.1534, 47.8211], rang=2),
    dict(nom="Guebwiller", detail="Allemand", pos=[7.2113, 47.9095], rang=1),
    dict(nom="Wuenheim", detail="", pos=[7.2074, 47.8747], rang=2),
]

SOURCES = [
    dict(t="Bataille du Hartmannswillerkopf, Wikipédia", u="https://fr.wikipedia.org/wiki/Bataille_du_Hartmannswillerkopf"),
    dict(t="La Grande Guerre, commune de Wattwiller", u="https://wattwiller.fr/fr/rb/47374/la-grande-guerre-1914-1918"),
    dict(t="Le Judenhut, lieux-insolites.fr", u="https://www.lieux-insolites.fr/cicatrice/14-18/judenhut/judenhut.htm"),
    dict(t="Repères du sentier du HWK, OpenStreetMap", u="https://www.openstreetmap.org/#map=16/47.8605/7.1610"),
    dict(t="Relief LiDAR HD et orthophoto, IGN Géoplateforme", u="https://geoservices.ign.fr/"),
]

out = dict(
    _lisezmoi=("Fichier de données de la visualisation. Chaque phase a une ligne 'front' : une liste de "
               "points [longitude, latitude] allant du NORD au SUD. Les Français sont à l'ouest de la ligne, "
               "les Allemands à l'est. Pour corriger un tracé, modifiez les points ; pour ajouter une phase, "
               "copiez un bloc existant. Les flèches vont de 'de' vers 'vers' ; camp = 'fr' ou 'de'."),
    zone=dict(ouest=6.9434, sud=47.7541, est=7.3828, nord=47.9899),  # emprise texturée de la carte
    zone_combat=dict(nom="Zone de combat principale du HWK", contour=zone_combat()),
    phases=[{**{k: v for k, v in p.items() if k != "front"}, "front": ligne(CENTRES[p["front"]])} for p in PHASES],
    reperes=REPERES,
    sources=SOURCES,
)
dst = os.path.join(os.path.dirname(__file__), "..", "site", "data", "fronts.json")
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(out, open(dst, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("ok", len(out["phases"]), "phases")
