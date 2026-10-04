// Commandes : barre latérale, panneau d'affichage, boussole de navigation, bouton molette, plein écran
import { $, HOME, reduceMotion } from "./config.js";

const ORBIT_SPEED = 0.45, PITCH_SPEED = 0.35;

// glisser sur un élément : appelle fn(dx, dy, event) à chaque mouvement
function dragOn(el, fn, { button = 0, filter = () => true } = {}) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== button || !filter(e)) return;
    e.preventDefault(); e.stopPropagation();
    let x = e.clientX, y = e.clientY;
    el.setPointerCapture(e.pointerId);
    const move = (ev) => { fn(ev.clientX - x, ev.clientY - y, ev); x = ev.clientX; y = ev.clientY; };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
}

// Barre latérale repliable (ordinateur) et récit repliable (mobile)
function setupPanels(map) {
  const setSide = (open) => {
    document.body.classList.toggle("side-collapsed", !open);
    // la carte change de largeur à la fin de l'animation : MapLibre doit recalculer sa taille
    setTimeout(() => map.resize(), 320);
    (open ? $("sideClose") : $("sideOpen")).focus();
  };
  $("sideClose").onclick = () => setSide(false);
  $("sideOpen").onclick = () => setSide(true);

  const toggle = $("stToggle"), story = $("story");
  toggle.onclick = () => {
    const open = !story.classList.contains("open");
    story.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Réduire le récit" : "Lire le récit");
    toggle.title = toggle.getAttribute("aria-label");
  };
}

// Disposition sur ordinateur : cadres flottants (par défaut) ou barre latérale (choix retenu par le navigateur)
function setupLayout(map) {
  const setLayout = (mode, save = true) => {
    document.body.classList.toggle("layout-float", mode === "float");
    if (mode === "float") document.body.classList.remove("side-collapsed"); // les cadres restent toujours affichés
    $("layoutSide").setAttribute("aria-pressed", mode !== "float");
    $("layoutFloat").setAttribute("aria-pressed", mode === "float");
    setTimeout(() => map.resize(), 320);
    if (save) try { localStorage.setItem("hwk-disposition", mode); } catch { /* stockage indisponible */ }
  };
  $("layoutSide").onclick = () => setLayout("side");
  $("layoutFloat").onclick = () => setLayout("float");
  setLayout(document.body.classList.contains("layout-float") ? "float" : "side", false);
}

// Disposition de départ, appliquée avant la création de la carte pour qu'elle naisse à la bonne taille
export function applyInitialLayout() {
  let saved = null;
  try { saved = localStorage.getItem("hwk-disposition"); } catch { /* stockage indisponible */ }
  document.body.classList.toggle("layout-float", saved !== "side");
}

// Panneau « affichage » : fond de carte, interrupteurs des couches, actions
function setupDisplay(map) {
  const ctl = document.querySelector(".view-ctl"), btn = $("viewBtn");
  // sur mobile, le bouton se place juste sous le cadre du titre, dont la hauteur varie
  const head = document.querySelector(".side-head");
  new ResizeObserver(() => document.documentElement.style.setProperty("--head-h", `${head.offsetHeight}px`)).observe(head);
  const setOpen = (open) => { ctl.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); };
  btn.onclick = () => setOpen(!ctl.classList.contains("open"));
  // un clic hors du panneau ou la touche Échap le referment
  document.addEventListener("click", (e) => { if (!e.target.closest(".view-ctl")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ctl.classList.contains("open")) { setOpen(false); btn.focus(); } });

  const visible = (ids, on) => {
    for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  };
  const setBg = (which) => {
    for (const [id, mode] of [["bgMix", "mix"], ["bgLidar", "lidar"], ["bgOrtho", "photo"]]) {
      $(id).setAttribute("aria-pressed", which === mode);
      visible([`tex-${mode}`], which === mode);
    }
  };
  $("bgMix").onclick = () => setBg("mix");
  $("bgLidar").onclick = () => setBg("lidar");
  $("bgOrtho").onclick = () => setBg("photo");

  const toggles = {
    // front au-delà de la zone de combat : affiché (discret) ou masqué
    tgExt: (on) => { for (const id of ["zones", "nml", "front-fr", "front-de"]) map.setFilter(id, on ? null : ["!", ["get", "ext"]]); },
    tgZone: (on) => visible(["combat"], on),
    tgArrows: (on) => visible(["arrow-shaft", "arrow-head"], on),
    tgPins: (on) => document.body.classList.toggle("no-pins", !on),
    tgModels: (on) => visible(["modeles"], on),
  };
  for (const [id, apply] of Object.entries(toggles)) $(id).addEventListener("change", (e) => apply(e.target.checked));
}

export function setupNavigation(map) {
  setupPanels(map);
  setupLayout(map);
  setupDisplay(map);

  // boussole : l'anneau pivote (cap + inclinaison), le centre déplace la vue
  const orbitBy = (dx, dy) => map.jumpTo({
    bearing: map.getBearing() - dx * ORBIT_SPEED,
    pitch: Math.max(0, Math.min(78, map.getPitch() - dy * PITCH_SPEED)),
  });
  const panBy = (dx, dy) => map.panBy([-dx, -dy], { duration: 0 });
  dragOn($("gzOrbit"), orbitBy, { filter: (e) => !e.target.closest(".pan") });
  dragOn($("gzPan"), (dx, dy) => panBy(dx * 2, dy * 2));
  $("gzPan").addEventListener("keydown", (e) => {
    const k = { ArrowLeft: [-60, 0], ArrowRight: [60, 0], ArrowUp: [0, -60], ArrowDown: [0, 60] }[e.key];
    if (k) { e.preventDefault(); e.stopPropagation(); map.panBy(k, { duration: 300 }); }
  });
  $("gzIn").onclick = () => map.zoomIn({ duration: 400 });
  $("gzOut").onclick = () => map.zoomOut({ duration: 400 });
  $("gzNorth").onclick = () => map.easeTo({ bearing: 0, duration: reduceMotion ? 0 : 600 });

  // bouton molette (comme dans Blender) : pivoter ; Maj + molette : déplacer
  const canvasBox = map.getCanvasContainer();
  canvasBox.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); }); // pas de défilement automatique
  canvasBox.addEventListener("auxclick", (e) => { if (e.button === 1) e.preventDefault(); });
  dragOn(canvasBox, (dx, dy, ev) => (ev.shiftKey ? panBy(dx, dy) : orbitBy(dx, dy)), { button: 1 });

  // rose des vents : graduations, puis rotation avec le cap de la carte
  const ticks = document.querySelector("#gzRose .ticks");
  for (let i = 0; i < 36; i++) {
    const a = rad10(i), r1 = i % 9 === 0 ? 36 : 40;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 50 + Math.sin(a) * r1); l.setAttribute("y1", 50 - Math.cos(a) * r1);
    l.setAttribute("x2", 50 + Math.sin(a) * 47); l.setAttribute("y2", 50 - Math.cos(a) * 47);
    ticks.appendChild(l);
  }
  const rose = $("gzRose");
  const sync = () => rose.setAttribute("transform", `rotate(${-map.getBearing()} 50 50)`);
  map.on("rotate", sync); sync();

  $("resetView").onclick = () => map.flyTo({ ...HOME, duration: reduceMotion ? 0 : 2200 });
  $("fullscreen").onclick = () => {
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen().catch(() => {});
    else (d.documentElement.requestFullscreen?.() || Promise.reject()).catch(() => { $("fullscreen").hidden = true; });
  };
  if (!document.documentElement.requestFullscreen) $("fullscreen").hidden = true;
}

const rad10 = (i) => i * 10 * Math.PI / 180;
