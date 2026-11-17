// Troquel de la caja del pack en cartulina, a tamaño real (1:1) en dos A4.
// Hoja 1: base + pared trasera + frontal doble. Hoja 2: laterales con pestañas y separadores.
// Mismas medidas y mismo dibujo que la caja 3D de la web (src/three/box.js).
import { loadLabelFonts } from '../src/three/label.js';
import { drawBack, drawFront, BOX } from '../src/three/box.js';
import { loadBrandLogo, getBrandLogo } from '../src/brand.js';
import { productById, packs, coreRange } from '../src/data/products.js';
import { canvas, page, header } from './hojas.js';

const NIGHT = '#1B2A41';
const CARD = '#FFFCF7';
const INSIDE = '#E6DCCB';
const TAB = 10; // mm de las pestañas de pegado
const FOOT = 8; // mm del pie de los separadores

const { slots, slotW, depth: D0, backH: BH0, frontH: FH0, T } = BOX;
const W = (slots * slotW + T * 2) * 10;
const D = D0 * 10;
const BH = BH0 * 10;
const FH = FH0 * 10;
const DIV_H = FH * 0.8;
const DIV_L = D - 1.5; // holgura para que entre entre las paredes

const mm = (n) => n.toFixed(1).replace('.', ',');
const pts = (p) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

// Pestaña trapezoidal sobre el segmento a→b, hacia fuera (normal a la izquierda de a→b)
function tab(a, b, depth = TAB, taper = 0.3) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy);
  const [ux, uy] = [dx / len, dy / len];
  const [nx, ny] = [uy, -ux];
  const t = Math.min(depth * taper * 1.6, len * 0.3);
  return [a, [a[0] + nx * depth + ux * t, a[1] + ny * depth + uy * t], [b[0] + nx * depth - ux * t, b[1] + ny * depth - uy * t], b];
}

const line = (a, b, kind) => `<line class="${kind}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
const img = (c, x, y, w, h, clip) =>
  `<image href="${c.toDataURL('image/png')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"${clip ? ` clip-path="url(#${clip})"` : ''}/>`;
const glue = (poly) => `<polygon class="glue" points="${pts(poly)}"/>`;
function label(x, y, text, { size = 2.6, rot = 0, cls = 'note' } = {}) {
  return `<text class="${cls}" x="${x}" y="${y}" font-size="${size}" transform="rotate(${rot} ${x} ${y})" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
}

function fill(wMm, hMm, color) {
  const c = canvas(wMm, hMm);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// Lateral: fondo claro, franja de colores abajo y la marca centrada en la parte baja
function sideArt(colors) {
  const c = fill(D, BH, CARD);
  const ctx = c.getContext('2d');
  const k = c.width / D;
  const sw = c.width / colors.length;
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * sw, c.height - 3.5 * k, sw + 1, 3.5 * k);
  });
  ctx.fillStyle = NIGHT;
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(9 * k)}px 'Outfit', sans-serif`;
  ctx.fillText('Tempo', c.width / 2, c.height - 17 * k);
  const logo = getBrandLogo();
  if (logo) {
    const lh = 4.2 * k;
    const lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, c.width / 2 - lw / 2, c.height - 13 * k, lw, lh);
  }
  return c;
}

// Contorno del lateral visto desde fuera; rearRight: la pared alta queda a la derecha
function sideOutline(x0, y0, rearRight) {
  // Mismo perfil que la curva de box.js: u de −D/2 (trasera, alta) a D/2 (frontal, baja)
  const u2x = (u) => x0 + (rearRight ? D / 2 - u : u + D / 2);
  const h2y = (h) => y0 + BH - h;
  const P = (u, h) => [u2x(u), h2y(h)];
  const curve = [];
  const p0 = [D / 2, FH], c1 = [D * 0.1, FH], c2 = [D * 0.05, BH], p3 = [-D / 2, BH];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, s = 1 - t;
    const b = (k) => s * s * s * p0[k] + 3 * s * s * t * c1[k] + 3 * s * t * t * c2[k] + t * t * t * p3[k];
    curve.push(P(b(0), b(1)));
  }
  return { bottomFront: P(D / 2, 0), bottomRear: P(-D / 2, 0), topFront: P(D / 2, FH), topRear: P(-D / 2, BH), curve };
}

function svg(defs, body) {
  return `<svg class="die" viewBox="0 0 210 297" width="210mm" height="297mm" xmlns="http://www.w3.org/2000/svg">
    <defs>${defs}</defs>${body}</svg>`;
}

function legend(y) {
  return `<g transform="translate(14 ${y})">
    ${line([0, 0], [10, 0], 'cut')}${label(13, 0.1, 'Cortar', { cls: 'legend' })}
    ${line([34, 0], [44, 0], 'valley')}${label(47, 0.1, 'Doblar hacia ti (valle)', { cls: 'legend' })}
    ${line([84, 0], [94, 0], 'mountain')}${label(97, 0.1, 'Doblar hacia atrás (monte)', { cls: 'legend' })}
    <rect class="glue" x="140" y="-2" width="8" height="4"/>${label(151, 0.1, 'Pegamento', { cls: 'legend' })}
  </g>`;
}

const STYLE = `<style>
  .die { position: absolute; inset: 0; }
  .cut { stroke: #000; stroke-width: 0.25; fill: none; }
  .valley { stroke: #000; stroke-width: 0.2; stroke-dasharray: 2 1.2; }
  .mountain { stroke: #000; stroke-width: 0.2; stroke-dasharray: 3 0.8 0.5 0.8; }
  .glue { fill: #D9D9D9; }
  .slot { stroke: #8C7F6A; stroke-width: 0.2; stroke-dasharray: 0.8 0.8; }
  text { font-family: 'Atkinson Hyperlegible', sans-serif; fill: #1B2A41; }
  .note { font-weight: 700; fill: rgba(27,42,65,0.55); letter-spacing: 0.2px; }
  .legend { font-size: 2.6px; text-anchor: start; }
  .steps { font-size: 2.9px; }
</style>`;

function sheet(title, note, defs, body) {
  const s = page(header(title, note));
  s.classList.add('troquel');
  s.insertAdjacentHTML('beforeend', svg(defs, body));
  return s;
}

// Variantes de impresión, igual que la caja de la web (src/sections/pack.js):
// 'cronos' = uno de cada; un id de coreRange = Pack ×4 de esa gama
export function packVariant(id = 'cronos') {
  if (id === 'cronos') {
    const cronos = packs.find((p) => p.id === 'cronos');
    return { title: cronos.label, subtitle: cronos.subtitle, colors: cronos.items.map((i) => productById[i].color) };
  }
  if (!coreRange.includes(id)) throw new Error(`Pack desconocido: ${id}`);
  const p = productById[id];
  return { title: `Pack ${p.range}`, subtitle: `${p.moment} · ${p.benefit}`, colors: [p.color] };
}

export async function renderDieline(id) {
  await Promise.all([loadLabelFonts(), loadBrandLogo()]);
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style>.page.troquel { position: relative; padding: 0; display: block; }
      .page.troquel header { position: absolute; top: 9mm; left: 14mm; right: 14mm; width: auto; z-index: 1; }</style>`,
  );
  const { title, subtitle, colors } = packVariant(id);

  /* ---------- Hoja 1: cuerpo ---------- */
  const x0 = (210 - W) / 2;
  const yBack = 42;
  const yBase = yBack + BH;
  const yFront = yBase + D;
  const yOuter = yFront + FH;
  const yEnd = yOuter + FH;
  const xR = x0 + W;

  const back = canvas(W, BH);
  drawBack(back, colors);
  const front = canvas(W, FH);
  drawFront(front, title, subtitle, colors);

  let body = STYLE;
  body += img(back, x0, yBack, W, BH);
  body += img(fill(W, D + FH, INSIDE), x0, yBase, W, D + FH);
  body += img(front, x0, yOuter, W, FH);
  // Dónde van los separadores
  for (let i = 1; i < slots; i++) {
    const x = x0 + (W / slots) * i;
    body += line([x, yBase + 1.5], [x, yFront - 1.5], 'slot');
  }
  body += label(x0 + W / 2, yBase + D / 2, 'BASE · aquí van los botes; las líneas de puntos marcan los separadores', { size: 2.4 });
  body += label(x0 + W / 2, yFront + FH / 2, 'FRONTAL INTERIOR · pega encima el panel de abajo', { size: 2.4 });
  body += `<polygon class="cut" points="${pts([[x0, yBack], [xR, yBack], [xR, yEnd], [x0, yEnd]])}"/>`;
  body += line([x0, yBase], [xR, yBase], 'valley');
  body += line([x0, yFront], [xR, yFront], 'valley');
  body += line([x0, yOuter], [xR, yOuter], 'mountain');
  body += legend(yEnd + 12);

  sheet(
    `Caja ${title} · Hoja 1 de 2: cuerpo`,
    `Imprime las dos hojas al 100 % (tamaño real, sin «ajustar a página») en cartulina A4 de 200–250 g. Caja montada: ${mm(W)} × ${mm(D)} mm de planta, ${mm(BH)} mm de alto detrás y ${mm(FH)} mm delante; cuatro huecos de ${mm(W / slots)} mm para los shots (Ø ${mm(39.9)} mm). Antes de doblar, repasa las líneas de pliegue con un bolígrafo sin tinta y una regla.`,
    '',
    body,
  );

  /* ---------- Hoja 2: laterales y separadores ---------- */
  let defs = '';
  body = STYLE;
  const art = sideArt(colors);
  const ySide = 46;
  [
    { x: 14 + TAB, rearRight: false, name: 'LATERAL IZQUIERDO' },
    { x: 14 + TAB + D + TAB + 14 + TAB, rearRight: true, name: 'LATERAL DERECHO' },
  ].forEach(({ x, rearRight, name }, i) => {
    const o = sideOutline(x, ySide, rearRight);
    // De fuera: la pestaña trasera queda junto a la pared alta, la frontal junto a la baja
    const outline = rearRight
      ? [o.bottomFront, o.bottomRear, o.topRear, ...o.curve.slice().reverse(), o.topFront]
      : [o.bottomRear, o.bottomFront, o.topFront, ...o.curve, o.topRear];
    defs += `<clipPath id="side${i}"><polygon points="${pts(outline)}"/></clipPath>`;
    // El dibujo es simétrico: sirve igual para los dos lados
    body += img(art, x, ySide, D, BH, `side${i}`);
    // Pestañas: abajo (bajo la base), detrás (sobre la cara exterior de la trasera), delante (entre las dos capas del frontal)
    const tabs = rearRight
      ? [tab(o.bottomRear, o.bottomFront), tab(o.topRear, o.bottomRear), tab(o.bottomFront, o.topFront)]
      : [tab(o.bottomFront, o.bottomRear), tab(o.bottomRear, o.topRear), tab(o.topFront, o.bottomFront)];
    for (const t of tabs) body += glue(t);
    // Contorno de corte continuo: panel + pestañas
    const [tBottom, tRear, tFront] = tabs;
    const cutPath = rearRight
      ? [...tBottom.slice(0, 3), o.bottomFront, ...tFront.slice(1, 3), o.topFront, ...o.curve, ...tRear.slice(1, 3), o.bottomRear]
      : [...tBottom.slice(0, 3), o.bottomRear, ...tRear.slice(1, 3), o.topRear, ...o.curve.slice().reverse(), ...tFront.slice(1, 3), o.bottomFront];
    body += `<polygon class="cut" points="${pts(cutPath)}"/>`;
    for (const t of tabs) body += line(t[0], t[3], 'mountain');
    const cx = x + D / 2;
    body += label(cx, ySide + BH + TAB / 2, 'PEGA BAJO LA BASE', { size: 2 });
    const rx = rearRight ? x + D + TAB / 2 : x - TAB / 2;
    const fx = rearRight ? x - TAB / 2 : x + D + TAB / 2;
    body += label(rx, ySide + BH * 0.55, 'PEGA FUERA DE LA TRASERA', { size: 2, rot: -90 });
    body += label(fx, ySide + BH - FH / 2, 'FRONTAL', { size: 2, rot: -90 });
    body += label(cx, ySide + BH * 0.6, name, { size: 2.4 });
  });

  // Separadores: tira doblada en dos con un pie a cada lado
  const yDiv = ySide + BH + TAB + 12;
  const stripH = FOOT * 2 + DIV_H * 2;
  const gap = (210 - 28 - (slots - 1) * DIV_L) / (slots - 1);
  for (let i = 0; i < slots - 1; i++) {
    const x = 14 + gap / 2 + i * (DIV_L + gap);
    body += img(fill(DIV_L, DIV_H * 2, INSIDE), x, yDiv + FOOT, DIV_L, DIV_H * 2);
    body += glue([[x + 2, yDiv], [x + DIV_L - 2, yDiv], [x + DIV_L, yDiv + FOOT], [x, yDiv + FOOT]]);
    body += glue([[x, yDiv + stripH - FOOT], [x + DIV_L, yDiv + stripH - FOOT], [x + DIV_L - 2, yDiv + stripH], [x + 2, yDiv + stripH]]);
    body += `<polygon class="cut" points="${pts([[x + 2, yDiv], [x + DIV_L - 2, yDiv], [x + DIV_L, yDiv + FOOT], [x + DIV_L, yDiv + stripH - FOOT], [x + DIV_L - 2, yDiv + stripH], [x + 2, yDiv + stripH], [x, yDiv + stripH - FOOT], [x, yDiv + FOOT]])}"/>`;
    body += line([x, yDiv + FOOT], [x + DIV_L, yDiv + FOOT], 'valley');
    body += line([x, yDiv + FOOT + DIV_H], [x + DIV_L, yDiv + FOOT + DIV_H], 'mountain');
    body += line([x, yDiv + stripH - FOOT], [x + DIV_L, yDiv + stripH - FOOT], 'valley');
    body += label(x + DIV_L / 2, yDiv + FOOT / 2, 'PIE', { size: 2 });
    body += label(x + DIV_L / 2, yDiv + stripH - FOOT / 2, 'PIE', { size: 2 });
    body += label(x + DIV_L / 2, yDiv + FOOT + DIV_H / 2, `SEPARADOR ${i + 1}`, { size: 2.2 });
  }

  const steps = [
    '1. Recorta todas las piezas por la línea continua y marca los pliegues.',
    '2. Hoja 1: dobla la trasera y el frontal hacia arriba (valle). El panel azul se dobla hacia fuera y queda por delante.',
    '3. Laterales: dobla las tres pestañas hacia la cara sin imprimir. Pega la de abajo bajo la base y la trasera por fuera de la pared alta.',
    '4. La pestaña delantera de cada lateral va por fuera del frontal interior; pega encima el panel azul para taparlas.',
    '5. Separadores: dobla cada tira por la mitad, pega las dos caras, abre los pies y pégalos sobre las líneas de puntos de la base.',
  ];
  const yS = yDiv + stripH + 9;
  body += steps.map((s, i) => `<text class="steps" x="14" y="${yS + i * 4.6}">${s}</text>`).join('');
  body += legend(287);

  sheet(
    `Caja ${title} · Hoja 2 de 2: laterales y separadores`,
    'Imprime al 100 % en la misma cartulina. Las piezas grises son pestañas de pegado: usa cola blanca o barra adhesiva fuerte y sujeta con pinzas un par de minutos.',
    defs,
    body,
  );
}

