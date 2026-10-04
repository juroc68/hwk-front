// Géométrie du front : zones française / allemande, no man's land et flèches d'attaque.
// Chaque ligne de fronts.json va du nord au sud ; elle est rééchantillonnée à latitudes fixes
// pour pouvoir interpoler en douceur d'une phase à l'autre.

import polygonClipping from "polygon-clipping";

const { intersection, difference } = polygonClipping;

const N_SAMPLES = 900;
const M_LAT = 111320, M_LON = 111320 * Math.cos(47.86 * Math.PI / 180);

export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const fc = (features) => ({ type: "FeatureCollection", features });

export function createFront({ phases, zone, zone_combat }) {
  const latAt = (s) => zone.nord + (zone.sud - zone.nord) * s / (N_SAMPLES - 1);

  function sample(line) {
    const out = new Float64Array(N_SAMPLES);
    for (let s = 0; s < N_SAMPLES; s++) {
      const lat = latAt(s);
      let lon = line[0][0];
      if (lat <= line[line.length - 1][1]) lon = line[line.length - 1][0];
      else for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = line[i], [bx, by] = line[i + 1];
        if (lat <= ay && lat >= by) { lon = ax + (bx - ax) * (ay === by ? 0 : (ay - lat) / (ay - by)); break; }
      }
      out[s] = lon;
    }
    for (let pass = 0; pass < 4; pass++) { // léger lissage
      const c = out.slice();
      for (let s = 1; s < N_SAMPLES - 1; s++) out[s] = (c[s - 1] + 2 * c[s] + c[s + 1]) / 4;
    }
    return out;
  }
  const sampled = phases.map((p) => sample(p.front));

  function lineAt(t) {
    t = Math.max(0, Math.min(t, phases.length - 1));
    const k = Math.min(Math.floor(t), phases.length - 1), f = ease(t - k);
    const a = sampled[k], b = sampled[Math.min(k + 1, phases.length - 1)];
    const pts = [];
    for (let s = 0; s < N_SAMPLES; s++) pts.push([a[s] + (b[s] - a[s]) * f, latAt(s)]);
    return pts;
  }

  // Zone pilonnée (zone_combat) : à l'intérieur le front est marqué (ext = false),
  // au-delà il est discret (ext = true)
  const ring = zone_combat.contour;
  const zonePoly = [ring];
  const inside = ([x, y]) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  // découpe la ligne de front en tronçons intérieurs / extérieurs (le point de bascule
  // appartient aux deux tronçons pour que la ligne reste continue)
  function splitLine(line) {
    const parts = { in: [], out: [] };
    let cur = [line[0]], state = inside(line[0]);
    for (let i = 1; i < line.length; i++) {
      const s = inside(line[i]);
      cur.push(line[i]);
      if (s !== state) { parts[state ? "in" : "out"].push(cur); cur = [line[i]]; state = s; }
    }
    parts[state ? "in" : "out"].push(cur);
    return parts;
  }

  function geometry(t) {
    const line = lineAt(t);
    const { ouest: W, est: E, nord: N, sud: S } = zone;
    const fr = [[[W, N], ...line, [W, S], [W, N]]];
    const de = [[[E, N], ...line, [E, S], [E, N]]];
    const multi = (coords, camp, ext) => ({ type: "Feature", properties: { camp, ext }, geometry: { type: "MultiPolygon", coordinates: coords } });
    const lines = (coords, ext) => ({ type: "Feature", properties: { ext }, geometry: { type: "MultiLineString", coordinates: coords } });
    const parts = splitLine(line);
    return {
      zones: fc([
        multi(intersection(fr, zonePoly), "fr", false),
        multi(intersection(de, zonePoly), "de", false),
        multi(difference(fr, zonePoly), "fr", true),
        multi(difference(de, zonePoly), "de", true),
      ]),
      front: fc([lines(parts.in, false), lines(parts.out, true)]),
    };
  }

  // Flèches de la phase k, dessinées à la proportion p (0 → 1) de leur longueur
  function arrows(k, p) {
    const feats = [];
    if (k == null) return fc(feats);
    for (const a of phases[k].fleches || []) {
      const [x0, y0] = a.de, [x1, y1] = a.vers;
      const ex = x0 + (x1 - x0) * p, ey = y0 + (y1 - y0) * p;
      const dx = (ex - x0) * M_LON, dy = (ey - y0) * M_LAT, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, head = Math.min(90, len * 0.5), w = head * 0.6;
      const bx = ex - ux * head / M_LON, by = ey - uy * head / M_LAT;
      feats.push({ type: "Feature", properties: { camp: a.camp }, geometry: { type: "LineString", coordinates: [[x0, y0], [bx, by]] } });
      feats.push({ type: "Feature", properties: { camp: a.camp }, geometry: { type: "Polygon", coordinates: [[
        [ex, ey], [bx - uy * w / M_LON, by + ux * w / M_LAT], [bx + uy * w / M_LON, by - ux * w / M_LAT], [ex, ey]]] } });
    }
    return fc(feats);
  }

  return { geometry, arrows };
}
