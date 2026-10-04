// Tuiles servies depuis public/ par des protocoles MapLibre :
//  - hwkdem://z/x/y        relief (Terrarium), complété à partir d'un niveau plus grossier
//  - hwktex://mode/z/x/y   texture : "photo", "lidar" ou "mix" (photo assombrie par l'ombrage LiDAR)
import { OUTER, CORE, WIDE, MAP, OUTSIDE_ELEVATION, asset } from "./config.js";

export const tileOf = (lon, lat, z) => {
  const n = 2 ** z;
  return [Math.floor((lon + 180) / 360 * n),
          Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n)];
};
const inRange = (b, z, x, y) => {
  const [x0, y0] = tileOf(b[0], b[3], z), [x1, y1] = tileOf(b[2], b[1], z);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
};

// Partie d'une tuile située dans le carré de la carte, en fraction de tuile (0 → 1) ;
// null si la tuile est entièrement dehors. Les bords du carré sont des droites en Web Mercator.
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function inMap(z, x, y) {
  const n = 2 ** z;
  const X = (lon) => (lon + 180) / 360 * n - x;
  const Y = (lat) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n - y;
  const c = { x0: clamp01(X(MAP[0])), x1: clamp01(X(MAP[2])), y0: clamp01(Y(MAP[3])), y1: clamp01(Y(MAP[1])) };
  if (c.x0 >= c.x1 || c.y0 >= c.y1) return null;
  c.full = c.x0 === 0 && c.y0 === 0 && c.x1 === 1 && c.y1 === 1;
  return c;
}

/* ---------- Relief ---------- */
const DEM = 512;
const demExists = (z, x, y) => (z >= 13 && z <= 14 && inRange(OUTER, z, x, y)) || (z >= 10 && z <= 12 && inRange(WIDE, z, x, y));
const decoded = new Map();

function decodeDem(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (!decoded.has(key)) {
    decoded.set(key, (async () => {
      const bmp = await createImageBitmap(await (await fetch(asset(`dem/${key}.png`))).blob());
      const c = new OffscreenCanvas(DEM, DEM), g = c.getContext("2d");
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, DEM, DEM).data, h = new Float32Array(DEM * DEM);
      for (let i = 0; i < h.length; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
      return h;
    })());
  }
  return decoded.get(key);
}

async function encodeDem(sample) {
  const c = new OffscreenCanvas(DEM, DEM), g = c.getContext("2d");
  const img = g.createImageData(DEM, DEM), d = img.data;
  for (let j = 0; j < DEM; j++) for (let i = 0; i < DEM; i++) {
    const v = Math.round((sample(i, j) + 32768) * 256), k = (j * DEM + i) * 4;
    d[k] = (v >> 16) & 255; d[k + 1] = (v >> 8) & 255; d[k + 2] = v & 255; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return (await c.convertToBlob({ type: "image/png" })).arrayBuffer();
}

// Relief découpé au carré de la carte : dehors, le terrain descend au niveau du socle
async function demTile(z, x, y) {
  const c = inMap(z, x, y);
  if (!c) return encodeDem(() => OUTSIDE_ELEVATION);
  const data = await demSource(z, x, y);
  if (c.full) return data;
  const cv = new OffscreenCanvas(DEM, DEM), g = cv.getContext("2d");
  g.drawImage(await createImageBitmap(new Blob([data])), 0, 0);
  const img = g.getImageData(0, 0, DEM, DEM), d = img.data;
  const v = Math.round((OUTSIDE_ELEVATION + 32768) * 256);
  for (let j = 0; j < DEM; j++) for (let i = 0; i < DEM; i++) {
    const u = (i + 0.5) / DEM, w = (j + 0.5) / DEM;
    if (u >= c.x0 && u < c.x1 && w >= c.y0 && w < c.y1) continue;
    const k = (j * DEM + i) * 4;
    d[k] = (v >> 16) & 255; d[k + 1] = (v >> 8) & 255; d[k + 2] = v & 255;
  }
  g.putImageData(img, 0, 0);
  return (await cv.convertToBlob({ type: "image/png" })).arrayBuffer();
}

async function demSource(z, x, y) {
  if (demExists(z, x, y)) return (await fetch(asset(`dem/${z}/${x}/${y}.png`))).arrayBuffer();
  if (z < 10) {
    // relief lointain (vue inclinée) : assemblage réduit des tuiles de niveau 10,
    // au plus proche voisin pour ne pas mélanger les octets du codage Terrarium
    const d = 10 - z, n = 2 ** d, span = DEM / n, jobs = [];
    const cv = new OffscreenCanvas(DEM, DEM), g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    const v = Math.round((OUTSIDE_ELEVATION + 32768) * 256);
    g.fillStyle = `rgb(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255})`;
    g.fillRect(0, 0, DEM, DEM);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (x << d) + i, cy = (y << d) + j;
      if (!demExists(10, cx, cy)) continue;
      jobs.push(fetch(asset(`dem/10/${cx}/${cy}.png`)).then((r) => r.blob()).then(createImageBitmap)
        .then((b) => g.drawImage(b, i * span, j * span, span, span)));
    }
    await Promise.all(jobs);
    return (await cv.convertToBlob({ type: "image/png" })).arrayBuffer();
  }
  // Pas de fichier à ce niveau : on rééchantillonne (bilinéaire) l'ancêtre le plus proche
  for (let az = Math.min(z - 1, 14); az >= 10; az--) {
    const d = z - az, ax = x >> d, ay = y >> d;
    if (!demExists(az, ax, ay)) continue;
    const h = await decodeDem(az, ax, ay), span = DEM / 2 ** d;
    const ox = (x - (ax << d)) * span, oy = (y - (ay << d)) * span;
    return encodeDem((i, j) => {
      const fx = Math.min(ox + (i + 0.5) * span / DEM - 0.5, DEM - 1.001), fy = Math.min(oy + (j + 0.5) * span / DEM - 0.5, DEM - 1.001);
      const x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy)), tx = fx - x0, ty = fy - y0;
      const a = h[y0 * DEM + x0], b = h[y0 * DEM + x0 + 1], c = h[(y0 + 1) * DEM + x0], e = h[(y0 + 1) * DEM + x0 + 1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
    });
  }
  return encodeDem(() => 230); // hors données : niveau de la plaine
}

/* ---------- Textures ---------- */
const TEX = 1024;
const texExists = (set, z, x, y) => set === "lidar-hd"
  ? z === 15 && inRange(CORE, z, x, y)
  : (z === 12 && inRange(WIDE, z, x, y)) || (z >= 13 && z <= 14 && inRange(OUTER, z, x, y));
const bitmaps = new Map();

function loadBitmap(path) {
  if (!bitmaps.has(path)) {
    bitmaps.set(path, fetch(asset(path)).then((r) => { if (!r.ok) throw new Error(path); return r.blob(); }).then(createImageBitmap));
    if (bitmaps.size > 40) bitmaps.delete(bitmaps.keys().next().value);
  }
  return bitmaps.get(path);
}

// Dessine la meilleure tuile disponible, la portion agrandie d'un niveau plus grossier,
// ou (vue lointaine) l'assemblage réduit des tuiles de niveau 12
async function drawTex(g, set, z, x, y) {
  const sets = set === "lidar" ? ["lidar-hd", "lidar"] : [set];
  if (z < 12) {
    const d = 12 - z, n = 2 ** d, span = TEX / n, jobs = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = (x << d) + i, cy = (y << d) + j;
      if (texExists(set, 12, cx, cy)) jobs.push(loadBitmap(`${set}/12/${cx}/${cy}.jpg`).then((b) => g.drawImage(b, i * span, j * span, span, span)));
    }
    await Promise.all(jobs);
    return jobs.length > 0;
  }
  for (let az = z; az >= 12; az--) {
    const d = z - az, ax = x >> d, ay = y >> d, s = sets.find((k) => texExists(k, az, ax, ay));
    if (!s) continue;
    const bmp = await loadBitmap(`${s}/${az}/${ax}/${ay}.jpg`), span = TEX / 2 ** d;
    g.drawImage(bmp, (x - (ax << d)) * span, (y - (ay << d)) * span, span, span, 0, 0, TEX, TEX);
    return true;
  }
  return false;
}

async function texTile(mode, z, x, y) {
  const clip = inMap(z, x, y);
  if (!clip) throw new Error("hors carte");
  const c = new OffscreenCanvas(TEX, TEX), g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  if (!await drawTex(g, mode === "lidar" ? "lidar" : "ortho", z, x, y)) throw new Error("hors zone");
  if (mode === "mix") {
    // l'ombrage LiDAR assombrit la photo : les tranchées et entonnoirs ressortent sous la forêt
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 0.85;
    await drawTex(g, "lidar", z, x, y);
  }
  if (!clip.full) {
    // efface ce qui dépasse du carré de la carte
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const { x0, x1, y0, y1 } = clip;
    g.clearRect(0, 0, TEX, y0 * TEX);
    g.clearRect(0, y1 * TEX, TEX, TEX);
    g.clearRect(0, 0, x0 * TEX, TEX);
    g.clearRect(x1 * TEX, 0, TEX, TEX);
  }
  // PNG quand une partie est transparente (bords de la carte, vue lointaine)
  return (await c.convertToBlob(z < 12 || !clip.full ? { type: "image/png" } : { type: "image/jpeg", quality: 0.9 })).arrayBuffer();
}

export function registerProtocols(maplibregl) {
  maplibregl.addProtocol("hwkdem", async ({ url }) => {
    const [z, x, y] = url.replace("hwkdem://", "").split("/").map(Number);
    return { data: await demTile(z, x, y) };
  });
  maplibregl.addProtocol("hwktex", async ({ url }) => {
    const [mode, ...zxy] = url.replace("hwktex://", "").split("/");
    const [z, x, y] = zxy.map(Number);
    return { data: await texTile(mode, z, x, y) };
  });
}

// Précharge les textures de la vue d'ensemble pour que le terrain soit habillé sans attente
export async function prefetchOverview() {
  const files = [];
  for (const set of ["ortho", "lidar"]) for (const [z, b] of [[12, WIDE], [13, OUTER]]) {
    const [x0, y0] = tileOf(b[0], b[3], z), [x1, y1] = tileOf(b[2], b[1], z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) files.push(`${set}/${z}/${x}/${y}.jpg`);
  }
  for (const f of files) await fetch(asset(f)).catch(() => {});
}
