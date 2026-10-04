// Couleurs de la carte lues dans les variables CSS (clair / sombre)
export const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function onThemeChange(cb) {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", cb);
  new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

// Largeur au sol (mètres) convertie en pixels selon le zoom, avec un minimum pour rester
// visible de loin ; signe négatif pour un décalage vers l'est (line-offset)
export function meters(m, min = 0, sign = 1) {
  const e = ["interpolate", ["exponential", 2], ["zoom"]];
  for (let z = 10; z <= 20; z++) e.push(z, sign * Math.max(min, m / (52513 / 2 ** z)));
  return e;
}
