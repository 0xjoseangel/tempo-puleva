import * as THREE from 'three';
import { getBrandLogo } from '../brand.js';

const NIGHT = '#1B2A41';
const DISPLAY = "'Outfit', system-ui, sans-serif";
const TEXT = "'Atkinson Hyperlegible', system-ui, sans-serif";

/**
 * Caja-bandeja abierta para 4 shots: trasera alta impresa, frontal bajo impreso,
 * laterales y separadores. Origen en el centro de la base.
 * slots: posiciones X de cada hueco.
 */
export function createPackBox({ slots = 4, slotW = 4.6, depth = 5.2, backH = 10.5, frontH = 3.6 } = {}) {
  const group = new THREE.Group();
  const T = 0.18;
  const W = slots * slotW + T * 2;
  const card = new THREE.MeshStandardMaterial({ color: 0xf3ebdd, roughness: 0.85 });
  const inside = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.95 });

  const backCanvas = makeCanvas(1600, Math.round((1600 * backH) / W));
  const frontCanvas = makeCanvas(2048, Math.round((2048 * frontH) / W));
  const backTex = toTexture(backCanvas);
  const frontTex = toTexture(frontCanvas);
  const backPrint = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.75 });
  const frontPrint = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.75 });

  // Materiales de BoxGeometry: [+x, -x, +y, -y, +z, -z]
  const wall = (w, h, d, mats) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.castShadow = m.receiveShadow = true;
    return m;
  };

  const base = wall(W, T, depth, inside);
  base.position.y = T / 2;

  const back = wall(W, backH, T, [card, card, card, card, backPrint, card]);
  back.position.set(0, backH / 2, -depth / 2 + T / 2);

  const front = wall(W, frontH, T, [card, card, card, card, frontPrint, inside]);
  front.position.set(0, frontH / 2, depth / 2 - T / 2);

  // Laterales en escalón: altos detrás, bajos delante
  const sideShape = new THREE.Shape();
  sideShape.moveTo(-depth / 2, 0);
  sideShape.lineTo(depth / 2, 0);
  sideShape.lineTo(depth / 2, frontH);
  sideShape.bezierCurveTo(depth * 0.1, frontH, depth * 0.05, backH, -depth / 2, backH);
  sideShape.closePath();
  const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: T, bevelEnabled: false });
  const sides = [-1, 1].map((sx) => {
    const m = new THREE.Mesh(sideGeo, card);
    m.rotation.y = -Math.PI / 2;
    m.position.x = sx > 0 ? W / 2 : -W / 2 + T;
    m.castShadow = m.receiveShadow = true;
    return m;
  });

  // Separadores bajos entre huecos
  const dividers = [];
  for (let i = 1; i < slots; i++) {
    const dv = wall(T * 0.6, frontH * 0.8, depth - T * 2, inside);
    dv.position.set(-W / 2 + T + i * slotW, (frontH * 0.8) / 2, 0);
    dividers.push(dv);
  }

  group.add(base, back, front, ...sides, ...dividers);

  const slotX = Array.from({ length: slots }, (_, i) => -W / 2 + T + slotW * (i + 0.5));

  return {
    group,
    slotX,
    width: W,
    /** Redibuja la impresión: title (p. ej. "Pack Cronos"), colors de los shots */
    print({ title, subtitle, colors }) {
      drawBack(backCanvas, colors);
      drawFront(frontCanvas, title, subtitle, colors);
      backTex.needsUpdate = frontTex.needsUpdate = true;
    },
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function drawBack(c, colors) {
  const ctx = c.getContext('2d');
  const { width: W, height: H } = c;
  ctx.fillStyle = '#FFFCF7';
  ctx.fillRect(0, 0, W, H);

  // Arco de "ritmo": franjas de color que suben como un amanecer
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.fillStyle = colors[i];
    const r = W * (0.62 - i * 0.075);
    ctx.arc(W / 2, H * 0.98, r, Math.PI, 0);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.fillStyle = '#FFFCF7';
  ctx.arc(W / 2, H * 0.98, W * (0.62 - n * 0.075), Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = NIGHT;
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(W * 0.15)}px ${DISPLAY}`;
  ctx.letterSpacing = `${-W * 0.003}px`;
  ctx.fillText('Tempo', W / 2, H * 0.2);
  ctx.letterSpacing = '0px';
  ctx.font = `500 ${Math.round(W * 0.05)}px ${DISPLAY}`;
  ctx.fillText('A tu ritmo.', W / 2, H * 0.29);

  const logo = getBrandLogo();
  if (logo) {
    const lh = W * 0.06;
    const lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.font = `italic 500 ${Math.round(lh * 0.5)}px ${DISPLAY}`;
    ctx.textAlign = 'right';
    ctx.fillText('by', W / 2 - lw / 2 - 10, H * 0.38 + lh * 0.65);
    ctx.drawImage(logo, W / 2 - lw / 2, H * 0.38, lw, lh);
  } else {
    ctx.font = `italic 500 ${Math.round(W * 0.035)}px ${DISPLAY}`;
    ctx.fillText('by Puleva', W / 2, H * 0.4);
  }
}

function drawFront(c, title, subtitle, colors) {
  const ctx = c.getContext('2d');
  const { width: W, height: H } = c;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);
  // Franja de colores de la gama en la parte superior
  const sw = W / colors.length;
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * sw, 0, sw + 1, H * 0.1);
  });
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(H * 0.34)}px ${DISPLAY}`;
  ctx.fillText(title, W * 0.04, H * 0.58, W * 0.6);
  ctx.font = `400 ${Math.round(H * 0.17)}px ${TEXT}`;
  ctx.fillStyle = '#D9E0EA';
  ctx.fillText(subtitle, W * 0.04, H * 0.84, W * 0.6);
  ctx.textAlign = 'right';
  ctx.font = `700 ${Math.round(H * 0.5)}px ${DISPLAY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('×4', W * 0.96, H * 0.76);
}
