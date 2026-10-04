# Front du Hartmannswillerkopf, 1914-1918

Carte 3D interactive du Hartmannswillerkopf (Vieil Armand, Haut-Rhin) sur le relief LiDAR de l'IGN :
zones tenues par les armées française et allemande phase par phase, modèles 3D des lieux de mémoire
(croix sommitale, monument national, nécropole du Silberloch, Historial, fortins allemands).

Réalisée pour l'Amicale du Hartmannswillerkopf. Les tracés du front sont approximatifs et à valider.

## Structure

- `site/` : la page publiée (`index.html`) et ses données
  - `data/fronts.json` : phases, lignes de front (points nord → sud), repères, sources
  - `data/modeles.json` : modèles 3D (générés)
  - `dem/`, `lidar/`, `lidar-hd/`, `ortho/` : tuiles de relief et d'images IGN
- `scripts/` : génération des données
  - `build_dem.py` : relief IGN (RGE ALTI) en tuiles Terrarium
  - `build_imagery.py` : ombrage LiDAR HD et orthophoto IGN
  - `build_fronts.py` : `fronts.json` (c'est ici qu'on corrige les tracés)
  - `build_models.py` : `modeles.json` à partir d'OpenStreetMap

Les scripts qui utilisent Pillow se lancent avec `PYTHONPATH=.pylib`
(installation locale : `python -m pip install --target scripts/.pylib pillow`).

## Sources

Relief, ombrage LiDAR HD et orthophoto : IGN (Licence Ouverte). Repères et contours : © contributeurs OpenStreetMap.
Historique : Wikipédia, commune de Wattwiller, lieux-insolites.fr.
