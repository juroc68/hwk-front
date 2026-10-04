// Modèles 3D des lieux de mémoire (three.js dans un calque personnalisé MapLibre).
// Les données (public/data/modeles.json) sont en mètres locaux autour de la croix sommitale :
// x vers l'est, y vers le nord, z = altitude réelle ; le tout est exagéré verticalement comme le relief.
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { TERRAIN_EXAGGERATION as EXAG } from "./config.js";

const rad = (deg) => deg * Math.PI / 180;

function buildScene(M) {
  const scene = new THREE.Scene();
  // three.js utilise des intensités physiques : facteur π pour retrouver l'éclairage d'origine
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a5546, 0.9 * Math.PI));
  const sun = new THREE.DirectionalLight(0xfff6e8, 0.7 * Math.PI);
  sun.position.set(-0.6, -0.8, 1.2);
  scene.add(sun);

  const lambert = (color, emissive = 0) => new THREE.MeshLambertMaterial({ color, emissive });
  const mat = {
    pierre: lambert(0xd8d2c2), beton: lambert(0x84857d), historial: lambert(0x6a5c4e),
    croix: lambert(0xffffff, 0x3a3a3a), autel: lambert(0x9a7a46), mat: lambert(0xe8e8e8),
    tombefr: lambert(0xf5f5f0, 0x222222), tombede: lambert(0x3b3d39),
  };
  const box = (w, d, h, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), m);
    o.position.set(x, y, z + h / 2);
    return o;
  };
  const placed = (g, [x, y, z], angle) => {
    g.position.set(x, y, z * EXAG);
    g.rotation.z = rad(angle);
    return g;
  };
  // axe croix - autel - mât : la croix, l'Autel de la Patrie et le mât de la nécropole sont alignés
  const axe = (M.objets.find((o) => o.type === "autel") || { axe: 0 }).axe;

  for (const o of M.objets) {
    if (o.type === "bloc") {
      const shape = new THREE.Shape(o.contour.map(([x, y]) => new THREE.Vector2(x, y)));
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: (o.toit - o.base) * EXAG, bevelEnabled: false }), mat[o.matiere]);
      mesh.position.z = o.base * EXAG;
      scene.add(mesh);
    } else if (o.type === "croix") {
      // socle, fût et traverse ; les bras sont perpendiculaires à l'axe
      const g = new THREE.Group(), H = o.hauteur * EXAG, c = o.section;
      g.add(box(5, 5, 2.5, mat.pierre, 0, 0, -1));
      g.add(box(c, c, H, mat.croix, 0, 0, 1.5));
      g.add(box(c, o.bras, c * 1.3, mat.croix, 0, 0, 1.5 + H * 0.68));
      scene.add(placed(g, o.pos, axe));
    } else if (o.type === "autel") {
      const g = new THREE.Group();
      g.add(box(o.profondeur, o.largeur, o.hauteur * EXAG, mat.autel, 0, 0, 0));
      scene.add(placed(g, o.pos, o.axe));
    } else if (o.type === "mat") {
      // mât et drapeau tricolore
      const g = new THREE.Group(), H = o.hauteur * EXAG;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, H, 8), mat.mat);
      pole.rotation.x = Math.PI / 2;
      pole.position.z = H / 2;
      g.add(pole);
      [0x1f3f8f, 0xffffff, 0xd02b2b].forEach((c, i) => g.add(box(0.05, 1.2, 2.4 * EXAG, lambert(c), 0, 0.3 + 1.2 * i, H - 2.4 * EXAG)));
      scene.add(placed(g, o.pos, axe));
    } else if (o.type === "tombes" && o.points.length) {
      // chaque tombe : une petite croix (montant + traverse), instanciée
      const m = o.camp === "fr" ? mat.tombefr : mat.tombede, n = o.points.length;
      const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 1.1 * EXAG), m, n);
      const bar = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.7, 0.16), m, n);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad(o.camp === "fr" ? axe : 90));
      const one = new THREE.Vector3(1, 1, 1), mtx = new THREE.Matrix4();
      o.points.forEach(([x, y, z], i) => {
        post.setMatrixAt(i, mtx.compose(new THREE.Vector3(x, y, z * EXAG + 0.55 * EXAG - 0.1), q, one));
        bar.setMatrixAt(i, mtx.compose(new THREE.Vector3(x, y, z * EXAG + 0.8 * EXAG), q, one));
      });
      scene.add(post, bar);
    }
  }
  return scene;
}

export function modelsLayer(M) {
  const merc = maplibregl.MercatorCoordinate.fromLngLat(M.origine, 0);
  const s = merc.meterInMercatorCoordinateUnits();
  const local = new THREE.Matrix4().makeTranslation(merc.x, merc.y, merc.z).scale(new THREE.Vector3(s, -s, s));
  const scene = buildScene(M), camera = new THREE.Camera();
  let renderer;
  return {
    id: "modeles", type: "custom", renderingMode: "3d",
    onAdd(map, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, args) {
      camera.projectionMatrix = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix).multiply(local);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}
