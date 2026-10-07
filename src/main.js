import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { $, asset } from "./config.js";
import { createMap } from "./carte.js";
import { createFront } from "./front.js";
import { createTimeline } from "./chronologie.js";
import { addMarkers, showCombatZone, listSources } from "./reperes.js";
import { applyInitialLayout, setupNavigation } from "./navigation.js";
import { prefetchOverview } from "./tuiles.js";

const json = (path) => fetch(asset(path)).then((r) => r.json());
applyInitialLayout();
const map = createMap("map");
setupNavigation(map);

Promise.all([json("data/fronts.json"), json("data/modeles.json"), new Promise((res) => map.on("load", res))])
  .then(([data, modeles]) => {
    listSources(data.sources);
    showCombatZone(map, data.zone_combat);
    addMarkers(map, data.reperes);
    createTimeline(map, data.phases, createFront(data));

    const done = () => { $("loading").hidden = true; };
    map.once("idle", () => {
      done();
      // three.js (modèles 3D) n'est chargé qu'une fois le relief affiché
      import("./modeles3d.js").then(({ modelsLayer }) => {
        map.addLayer(modelsLayer(modeles));
        if (!$("tgModels").checked) map.setLayoutProperty("modeles", "visibility", "none");
      });
      prefetchOverview();
    });
    setTimeout(done, 8000);
  })
  .catch((err) => { $("loading").textContent = "Impossible de charger les données : " + err.message; });
