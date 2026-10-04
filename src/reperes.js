// Repères nommés sur le relief, contour de la zone de combat et liste des sources
import maplibregl from "maplibre-gl";
import { $ } from "./config.js";

export function addMarkers(map, reperes) {
  const markers = reperes.map((r) => {
    const el = document.createElement("div");
    el.className = "pin" + (r.rang === 1 ? " major" : "");
    const name = document.createElement("div");
    name.className = "name"; name.textContent = r.nom;
    if (r.detail) { const s = document.createElement("small"); s.textContent = r.detail; name.appendChild(s); }
    el.append(name, Object.assign(document.createElement("div"), { className: "stem" }), Object.assign(document.createElement("div"), { className: "dot" }));
    return [new maplibregl.Marker({ element: el, anchor: "bottom", opacityWhenCovered: "0" }).setLngLat(r.pos).addTo(map), r.rang];
  });
  // rang 1 toujours visible, rangs 2 et 3 en se rapprochant
  const vis = () => {
    const z = map.getZoom();
    for (const [m, rang] of markers) m.getElement().style.visibility = (rang === 1 || (rang === 2 && z > 13.3) || (rang === 3 && z > 14.4)) ? "visible" : "hidden";
  };
  map.on("zoom", vis); vis();
}

export function showCombatZone(map, zone) {
  map.getSource("combat").setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: zone.contour } });
}

export function listSources(sources) {
  const ul = $("sourcesList");
  for (const s of sources) {
    const li = document.createElement("li"), a = document.createElement("a");
    a.href = s.u; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.t;
    li.appendChild(a); ul.appendChild(li);
  }
}
