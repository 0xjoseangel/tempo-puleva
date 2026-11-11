// Hojas imprimibles a tamaño real (1:1): etiquetas envolventes de los shots y paneles de la caja.
// Reutiliza el mismo dibujo que las texturas 3D de la web.
import { drawLabel, loadLabelFonts } from '../src/three/label.js';
import { drawBack, drawFront, BOX } from '../src/three/box.js';
import { dimensions } from '../src/three/bottle.js';
import { loadBrandLogo } from '../src/brand.js';
import { products, productById, packs, coreRange } from '../src/data/products.js';

const PX_PER_MM = 14; // ~355 ppp
const OVERLAP = 8; // mm de solapa para pegar la etiqueta sobre sí misma

// Medidas de la etiqueta, igual que en bottle.js
const d = dimensions();
const labelBottom = d.bottomR + 0.12;
export const LABEL = {
  h: (d.bodyH - labelBottom - 0.08) * 10,
  wrap: 2 * Math.PI * d.r * 10,
  bottom: labelBottom * 10,
};

function canvas(wMm, hMm) {
  const c = document.createElement('canvas');
  c.width = Math.round(wMm * PX_PER_MM);
  c.height = Math.round(hMm * PX_PER_MM);
  return c;
}

// Imagen con marcas de corte a tamaño físico
function sheetItem(c, wMm, hMm, caption) {
  const fig = document.createElement('figure');
  fig.className = 'item';
  fig.style.setProperty('--w', `${wMm}mm`);
  fig.style.setProperty('--h', `${hMm}mm`);
  fig.innerHTML = `<div class="crop"><img src="${c.toDataURL('image/png')}" alt=""></div><figcaption>${caption}</figcaption>`;
  return fig;
}

const mm = (n) => n.toFixed(1).replace('.', ',');

function labelCanvas(p) {
  const { h, wrap } = LABEL;
  const c = canvas(wrap + OVERLAP, h);
  const inner = canvas(wrap, h);
  drawLabel(inner.getContext('2d'), inner.width, inner.height, p);
  const ctx = c.getContext('2d');
  const tab = OVERLAP * PX_PER_MM;
  // Solapa a la izquierda: estira la última columna del diseño (sin texto) y queda tapada al envolver
  ctx.drawImage(inner, inner.width - 2, 0, 2, c.height, 0, 0, tab, c.height);
  ctx.drawImage(inner, tab, 0);
  ctx.save();
  ctx.strokeStyle = 'rgba(27,42,65,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(tab, 0);
  ctx.lineTo(tab, c.height);
  ctx.stroke();
  ctx.translate(tab / 2, c.height * 0.42);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(27,42,65,0.45)';
  ctx.font = `700 ${Math.round(tab * 0.32)}px 'Atkinson Hyperlegible', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PEGA AQUÍ · QUEDA DEBAJO', 0, 0);
  ctx.restore();
  return c;
}

function page(...children) {
  const s = document.createElement('section');
  s.className = 'page';
  s.append(...children);
  document.body.append(s);
  return s;
}

function header(title, note) {
  const h = document.createElement('header');
  h.innerHTML = `<h1>${title}</h1><p>${note}</p><div class="ruler"><span></span>Control de escala: esta barra mide 50 mm</div>`;
  return h;
}

export async function renderLabels() {
  await Promise.all([loadLabelFonts(), loadBrandLogo()]);
  const perPage = 3;
  for (let i = 0; i < products.length; i += perPage) {
    page(
      header(
        'Tempo by Puleva · Etiquetas de los shots',
        `Imprime al 100 % (sin ajustar a página) en papel adhesivo o normal. Cada etiqueta mide ${mm(LABEL.wrap + OVERLAP)} × ${mm(LABEL.h)} mm: rodea el envase con el centro del diseño al frente, con el borde inferior a ${mm(LABEL.bottom)} mm de la base, pon pegamento en la solapa de ${OVERLAP} mm (a la izquierda, marcada) y cierra el otro extremo encima.`,
      ),
      ...products.slice(i, i + perPage).map((p) => sheetItem(labelCanvas(p), LABEL.wrap + OVERLAP, LABEL.h, `${p.name} · ${p.moment} · ${p.benefit}`)),
    );
  }
}

export async function renderBox() {
  await Promise.all([loadLabelFonts(), loadBrandLogo()]);
  const { slots, slotW, backH, frontH, T } = BOX;
  const W = (slots * slotW + T * 2) * 10;
  const cronos = packs.find((p) => p.id === 'cronos');
  const variants = [
    { title: cronos.label, subtitle: cronos.subtitle, colors: cronos.items.map((id) => productById[id].color) },
    ...coreRange.map((id) => {
      const p = productById[id];
      return { title: `Pack ${p.range}`, subtitle: `${p.moment} · ${p.benefit}`, colors: [p.color] };
    }),
  ];
  for (const v of variants) {
    const back = canvas(W, backH * 10);
    drawBack(back, v.colors);
    const front = canvas(W, frontH * 10);
    drawFront(front, v.title, v.subtitle, v.colors);
    page(
      header(
        `Caja del pack · ${v.title}`,
        'Imprime al 100 % y pega cada panel en su pared de la caja impresa en 3D (caja-pack.3mf). El panel trasero va en la cara interior de la pared alta, la que se ve por encima de los botes; el frontal, en la cara exterior de la pared baja.',
      ),
      sheetItem(back, W, backH * 10, `Panel trasero (interior pared alta) · ${mm(W)} × ${mm(backH * 10)} mm`),
      sheetItem(front, W, frontH * 10, `Panel frontal (exterior pared baja) · ${mm(W)} × ${mm(frontH * 10)} mm`),
    );
  }
}
