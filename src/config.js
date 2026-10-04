// Emprises géographiques [ouest, sud, est, nord] des données publiées dans public/
export const OUTER = [7.095, 47.830, 7.215, 47.895]; // secteur du HWK : relief et images détaillés
export const CORE = [7.130, 47.838, 7.190, 47.882]; // cœur du champ de bataille : ombrage LiDAR le plus fin
export const WIDE = [6.98, 47.76, 7.34, 47.96]; // contexte : Vosges du sud et plaine d'Alsace
// Emprise de la carte affichée = étendue des textures (photo et LiDAR) : le relief est découpé à ses bords
export const MAP = [6.9434, 47.7541, 7.3828, 47.9899];
export const OUTSIDE_ELEVATION = 0; // altitude du socle hors carte : la carte apparaît comme une maquette

export const HOME = { center: [7.1605, 47.8590], zoom: 13.9, pitch: 60, bearing: -22 };
export const TERRAIN_EXAGGERATION = 1.5;

// Chronologie : durée d'affichage d'une phase et de la transition vers la suivante (ms)
export const HOLD = 6500;
export const TRANS = 2200;

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const $ = (id) => document.getElementById(id);

// Chemin d'un fichier de public/, valable en développement comme une fois publié dans un sous-dossier
export const asset = (path) => import.meta.env.BASE_URL + path;
