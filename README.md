# Front du Hartmannswillerkopf, 1914-1918

Carte 3D interactive du Hartmannswillerkopf (Vieil Armand, Haut-Rhin) sur le relief LiDAR de l'IGN :
zones tenues par les armées française et allemande phase par phase, modèles 3D des lieux de mémoire
(croix sommitale, monument national, nécropole du Silberloch, Historial, fortins allemands).

Réalisée pour l'Amicale du Hartmannswillerkopf. Les tracés du front sont approximatifs et à valider.

## Développement

Prérequis : Node.js 20 ou plus récent.

```
npm install
npm run dev              # http://localhost:8766, rechargement instantané
npm run build            # site statique dans dist/, à héberger n'importe où (GitHub Pages, Netlify…)
npm run preview          # sert dist/ pour vérifier le build
```

La carte est accessible dans la console du navigateur sous `hwkMap`.

## Structure

- `index.html` : la page
- `src/` : le code
  - `main.js` : démarrage
  - `config.js` : emprises, vue de départ, durées de la chronologie
  - `carte.js` : carte MapLibre, couches et thème clair / sombre
  - `tuiles.js` : relief et textures (photo, LiDAR, mélange) servis depuis `public/`
  - `front.js` : géométrie des zones, du no man's land et des flèches
  - `chronologie.js` : récit, frise, lecture automatique
  - `modeles3d.js` : modèles three.js des lieux de mémoire
  - `reperes.js` : repères nommés, contour de la zone de combat, sources
  - `navigation.js` : disposition (cadres flottants ou barre latérale), panneau « affichage »
    (fond de carte, interrupteurs des couches), boussole 3D, bouton molette, plein écran
  - `style.css`
- `public/` : fichiers servis tels quels
  - `data/fronts.json` : phases, lignes de front (points nord → sud), repères, sources
  - `data/modeles.json` : modèles 3D (générés)
  - `dem/`, `lidar/`, `lidar-hd/`, `ortho/` : tuiles de relief et d'images IGN
- `scripts/` : génération des données
  - `build_fronts.py` : `fronts.json` (c'est ici qu'on corrige les tracés)
  - `build_models.py` : `modeles.json` à partir d'OpenStreetMap
  - `build_dem.py` : relief IGN (RGE ALTI) en tuiles Terrarium
  - `build_imagery.py` : ombrage LiDAR HD et orthophoto IGN

Les scripts Python qui utilisent Pillow se lancent avec `PYTHONPATH=scripts/.pylib`
(installation locale : `python -m pip install --target scripts/.pylib pillow`).

## Sources

Relief, ombrage LiDAR HD et orthophoto : IGN (Licence Ouverte). Repères et contours : © contributeurs OpenStreetMap.
Historique : Wikipédia, commune de Wattwiller, lieux-insolites.fr.
