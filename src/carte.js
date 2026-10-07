// Carte MapLibre : relief 3D, textures, couches du front
import maplibregl from "maplibre-gl";
import { HOME, MAP, TERRAIN_EXAGGERATION } from "./config.js";
import { css, meters, onThemeChange } from "./theme.js";
import { registerProtocols } from "./tuiles.js";

const empty = { type: "geojson", data: { type: "FeatureCollection", features: [] } };
const camp = (fr, de) => ["match", ["get", "camp"], "fr", fr, de];
const ext = (outside, inside) => ["case", ["get", "ext"], outside, inside];
const sky = () => ({ "sky-color": css("--sky"), "horizon-color": css("--map-bg"), "fog-color": css("--map-bg"), "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.4, "fog-ground-blend": 0.75 });

export function createMap(container) {
  registerProtocols(maplibregl);
  const fr = css("--fr"), de = css("--de");
  const map = new maplibregl.Map({
    container,
    ...HOME,
    minZoom: 11.3, maxZoom: 17.6, maxPitch: 78,
    maxBounds: [[MAP[0], MAP[1]], [MAP[2], MAP[3]]],
    attributionControl: false,
    canvasContextAttributes: { antialias: true },
    // les écrans de téléphone (×3) quadrupleraient presque le travail du GPU pour une différence invisible
    pixelRatio: Math.min(devicePixelRatio, 2),
    style: {
      version: 8,
      sources: {
        dem: { type: "raster-dem", tiles: ["hwkdem://{z}/{x}/{y}"], tileSize: 512, encoding: "terrarium", minzoom: 6, maxzoom: 14 },
        "tex-mix": { type: "raster", tiles: ["hwktex://mix/{z}/{x}/{y}"], tileSize: 1024, minzoom: 6, maxzoom: 15, bounds: MAP },
        "tex-lidar": { type: "raster", tiles: ["hwktex://lidar/{z}/{x}/{y}"], tileSize: 1024, minzoom: 6, maxzoom: 15, bounds: MAP },
        "tex-photo": { type: "raster", tiles: ["hwktex://photo/{z}/{x}/{y}"], tileSize: 1024, minzoom: 6, maxzoom: 14, bounds: MAP },
        zones: empty, front: empty, arrows: empty, combat: empty,
      },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": css("--map-bg") } },
        { id: "tex-mix", type: "raster", source: "tex-mix", paint: { "raster-fade-duration": 0 } },
        { id: "tex-lidar", type: "raster", source: "tex-lidar", layout: { visibility: "none" }, paint: { "raster-fade-duration": 0 } },
        { id: "tex-photo", type: "raster", source: "tex-photo", layout: { visibility: "none" }, paint: { "raster-fade-duration": 0 } },
        { id: "zones", type: "fill", source: "zones", paint: { "fill-color": camp(fr, de), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, ext(0.1, 0.38), 14, ext(0.08, 0.3), 16, ext(0.05, 0.14)], "fill-antialias": false } },
        { id: "nml", type: "line", source: "front", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": css("--nml"), "line-opacity": ext(0.25, 0.75), "line-width": meters(32, 3) } },
        { id: "front-fr", type: "line", source: "front", layout: { "line-join": "round" }, paint: { "line-color": fr, "line-opacity": ext(0.3, 1), "line-width": 2.5, "line-offset": meters(17, 2.5) } },
        { id: "front-de", type: "line", source: "front", layout: { "line-join": "round" }, paint: { "line-color": de, "line-opacity": ext(0.3, 1), "line-width": 2.5, "line-offset": meters(17, 2.5, -1) } },
        { id: "combat", type: "line", source: "combat", paint: { "line-color": css("--zone"), "line-width": 1.5, "line-dasharray": [3, 3] } },
        { id: "arrow-shaft", type: "line", source: "arrows", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round" }, paint: { "line-color": camp(fr, de), "line-width": meters(22, 4), "line-opacity": 0.95 } },
        { id: "arrow-head", type: "fill", source: "arrows", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": camp(fr, de), "fill-opacity": 0.95 } },
      ],
      terrain: { source: "dem", exaggeration: TERRAIN_EXAGGERATION },
      sky: sky(),
    },
  });
  window.hwkMap = map; // accessible dans la console pour le débogage

  onThemeChange(() => applyTheme(map));
  map.on("load", () => applyTheme(map));
  return map;
}

function applyTheme(map) {
  if (!map.isStyleLoaded()) return;
  const fr = css("--fr"), de = css("--de");
  map.setPaintProperty("bg", "background-color", css("--map-bg"));
  map.setPaintProperty("zones", "fill-color", camp(fr, de));
  map.setPaintProperty("nml", "line-color", css("--nml"));
  map.setPaintProperty("combat", "line-color", css("--zone"));
  map.setPaintProperty("front-fr", "line-color", fr);
  map.setPaintProperty("front-de", "line-color", de);
  map.setPaintProperty("arrow-shaft", "line-color", camp(fr, de));
  map.setPaintProperty("arrow-head", "fill-color", camp(fr, de));
  for (const id of ["tex-mix", "tex-lidar", "tex-photo"]) map.setPaintProperty(id, "raster-brightness-max", +css("--raster-max"));
  map.setSky(sky());
}
