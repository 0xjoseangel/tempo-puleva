// Logo oficial de Puleva: si existe en public/brand/ se usa; si no, wordmark de texto.
const CANDIDATES = ['brand/puleva-logo.svg', 'brand/puleva-logo.png'];

let logo = null;

function tryLoad(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? img : null);
    img.onerror = () => resolve(null);
    img.src = import.meta.env.BASE_URL + src;
  });
}

export async function loadBrandLogo() {
  for (const src of CANDIDATES) {
    logo = await tryLoad(src);
    if (logo) break;
  }
  if (logo) {
    // Sustituye los wordmarks de texto del HTML por el logo
    for (const el of document.querySelectorAll('.wordmark')) applyLogo(el);
  }
  return logo;
}

export const getBrandLogo = () => logo;

/** Convierte un elemento .wordmark en "by" + logo oficial (si está disponible). */
export function applyLogo(el) {
  if (!logo || el.dataset.logo) return;
  el.dataset.logo = '1';
  el.innerHTML = `<span class="wordmark__by">by</span><img class="wordmark__logo" src="${logo.src}" alt="Puleva" />`;
}
