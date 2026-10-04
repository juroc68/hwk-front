// Chronologie : récit de la phase, frise, lecture automatique et transitions animées
import { $, HOLD, TRANS, reduceMotion } from "./config.js";
import { ease } from "./front.js";

export function createTimeline(map, phases, front) {
  const n = phases.length;
  let t = 0, playing = false, holdStart = 0, transStart = 0, from = 0, target = 0;
  let arrowKey = "", shownPhase = -1, lastT = 0, dir = 1;

  function render() {
    const g = front.geometry(t);
    map.getSource("zones").setData(g.zones);
    map.getSource("front").setData(g.front);
    $("scrub").value = t / (n - 1);
  }

  function setStory(k) {
    if (k === shownPhase) return;
    shownPhase = k;
    const p = phases[k];
    $("stDate").textContent = p.label;
    $("stCount").textContent = `${k + 1} / ${n}`;
    $("stTitle").textContent = p.titre;
    $("stText").textContent = p.texte;
    $("stFr").textContent = p.unites.fr || "—";
    $("stDe").textContent = p.unites.de || "—";
    $("epilogue").hidden = !p.fin;
    document.querySelectorAll(".tick").forEach((el, i) => el.classList.toggle("on", i === k));
    document.querySelectorAll(".years span").forEach((el) => el.classList.toggle("cur", +el.dataset.k === k));
  }

  // Flèches : celles de la phase vers laquelle on va se dessinent au même rythme que le front
  // (même courbe d'accélération) et atteignent leur pointe quand la ligne arrive.
  function drawArrows() {
    if (t !== lastT) dir = t > lastT ? 1 : -1;
    lastT = t;
    const base = Math.floor(t), frac = t - base;
    let phase = base, progress = 1;
    if (frac > 1e-6) {
      if (dir > 0) { phase = base + 1; progress = ease(frac); } // en avant : la phase suivante se dessine
      else progress = 1 - ease(frac); // en arrière : on revient vers la phase précédente
    }
    const key = `${phase}:${progress.toFixed(3)}`;
    if (key === arrowKey) return; // ne redessiner que si quelque chose change
    arrowKey = key;
    map.getSource("arrows").setData(front.arrows(phase, progress));
  }

  function startTransition(k) {
    from = t; target = Math.max(0, Math.min(n - 1, k)); transStart = performance.now();
  }

  function frame(now) {
    if (t !== target) {
      // (l'horodatage de l'image peut précéder transStart : on borne à 0)
      const f = reduceMotion ? 1 : Math.max(0, Math.min(1, (now - transStart) / (TRANS * Math.max(1, Math.abs(target - from) * 0.5))));
      t = from + (target - from) * f;
      if (f >= 1) { t = target; holdStart = now; }
      render();
    } else if (playing && now - holdStart > HOLD) {
      if (target >= n - 1) setPlaying(false);
      else startTransition(target + 1);
    }
    const k = Math.round(t);
    setStory(k);
    drawArrows();
    requestAnimationFrame(frame);
  }

  function setPlaying(on) {
    playing = on;
    const btn = $("play");
    btn.querySelector(".play-label").textContent = on ? "pause" : "lecture";
    btn.setAttribute("aria-label", on ? "Pause" : "Lecture");
    btn.setAttribute("aria-pressed", on);
    if (on) {
      if (Math.round(t) >= n - 1) { t = 0; target = 0; render(); }
      else if (t === target && t !== Math.round(t)) startTransition(Math.round(t));
      holdStart = performance.now() - HOLD + 1200;
    }
  }
  const goTo = (k) => { setPlaying(false); startTransition(k); };

  // frise : un repère par phase, une étiquette par année
  const track = $("track"), years = $("years");
  const at = (i) => `calc(8px + (100% - 16px) * ${i / (n - 1)})`;
  phases.forEach((p, i) => {
    const tick = document.createElement("span");
    tick.className = "tick"; tick.style.left = at(i);
    track.appendChild(tick);
    const y = p.date.slice(0, 4);
    if (i !== phases.findIndex((q) => q.date.slice(0, 4) === y)) return;
    const s = document.createElement("span");
    s.textContent = p.id === "stable" ? "1916-18" : y; s.dataset.k = i; s.style.left = at(i);
    years.appendChild(s);
  });
  $("scrub").addEventListener("input", (e) => { setPlaying(false); t = +e.target.value * (n - 1); target = t; render(); });
  $("scrub").addEventListener("change", () => startTransition(Math.round(t)));

  $("play").onclick = () => setPlaying(!playing);
  $("prev").onclick = () => goTo(Math.round(t) - 1);
  $("next").onclick = () => goTo(Math.round(t) + 1);
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, button, summary")) { if (e.key !== " " || e.target.tagName === "BUTTON") return; }
    if (e.key === " ") { e.preventDefault(); setPlaying(!playing); }
    if (e.key === "ArrowRight" && !e.target.closest("input")) goTo(Math.round(t) + 1);
    if (e.key === "ArrowLeft" && !e.target.closest("input")) goTo(Math.round(t) - 1);
  });

  render(); setStory(0);
  requestAnimationFrame(frame);
}
