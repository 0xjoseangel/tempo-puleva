import * as THREE from 'three';
import { getBrandLogo } from '../brand.js';

const NIGHT = '#1B2A41';
const PAPER = '#FFFCF7';
const DISPLAY = "'Outfit', system-ui, sans-serif";
const TEXT = "'Atkinson Hyperlegible', system-ui, sans-serif";

// Asegura que las fuentes estén listas antes de pintar en el canvas.
export function loadLabelFonts() {
  return Promise.all([
    document.fonts.load(`700 100px ${DISPLAY}`),
    document.fonts.load(`500 100px ${DISPLAY}`),
    document.fonts.load(`400 100px ${TEXT}`),
    document.fonts.load(`700 100px ${TEXT}`),
  ]).catch(() => {});
}

/**
 * Crea la textura de la etiqueta envolvente.
 * aspect = circunferencia / altura de la etiqueta, para que el texto no se deforme.
 * El centro horizontal del canvas (u = 0.5) queda en la cara frontal del envase.
 */
const canvasCache = new Map();

export function createLabelTexture(product, aspect, renderer) {
  const H = 1024;
  const W = Math.min(4096, Math.round(H * aspect));
  const key = `${product.id}:${W}`;
  let canvas = canvasCache.get(key);
  if (!canvas) {
    // El dibujo se reutiliza en todas las escenas; cada una sube su propia textura
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    drawLabel(canvas.getContext('2d'), W, H, product);
    canvasCache.set(key, canvas);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  tex.needsUpdate = true;
  return tex;
}

function drawLabel(ctx, W, H, p) {
  const c = p.color;

  // Fondo papel con un leve degradado
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, PAPER);
  bg.addColorStop(1, '#F6EFE4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Banda inferior de color de gama + filete superior
  const bandH = H * 0.2;
  ctx.fillStyle = c;
  ctx.fillRect(0, H - bandH, W, bandH);
  ctx.fillRect(0, 0, W, H * 0.035);

  // Onda suave "ritmo" que separa banda y cuerpo
  ctx.beginPath();
  ctx.moveTo(0, H - bandH);
  const waves = Math.max(3, Math.round(W / 700));
  for (let i = 0; i <= waves * 40; i++) {
    const x = (i / (waves * 40)) * W;
    const y = H - bandH - 14 - Math.sin((i / 40) * Math.PI * 2) * 14;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H - bandH);
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Panel frontal: ~30 % de la circunferencia centrado
  const fw = Math.min(W * 0.3, H * 0.95);
  const cx = W / 2;
  const left = cx - fw / 2;

  // Icono
  const iconSize = Math.min(fw * 0.5, H * 0.27);
  drawIcon(ctx, p.icon, cx, H * 0.2, iconSize, c);

  // Wordmark "Tempo"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NIGHT;
  fitText(ctx, 'Tempo', cx, H * 0.5, fw * 0.92, H * 0.2, `700 SIZEpx ${DISPLAY}`, -0.02);

  // Nombre de gama
  ctx.fillStyle = shade(c, -0.22);
  fitText(ctx, p.range.toUpperCase(), cx, H * 0.6, fw * 0.8, H * 0.075, `600 SIZEpx ${DISPLAY}`, 0.18);

  // Beneficio · momento
  ctx.fillStyle = NIGHT;
  const line = `${p.benefit} · ${p.moment}`;
  ctx.font = `400 ${Math.round(H * 0.055)}px ${TEXT}`;
  if (ctx.measureText(line).width <= fw * 0.85) {
    fitText(ctx, line, cx, H * 0.69, fw * 0.85, H * 0.055, `400 SIZEpx ${TEXT}`);
  } else {
    // Textos largos: beneficio y momento en dos líneas
    fitText(ctx, p.benefit, cx, H * 0.675, fw * 0.85, H * 0.05, `700 SIZEpx ${TEXT}`);
    fitText(ctx, p.moment, cx, H * 0.735, fw * 0.85, H * 0.045, `400 SIZEpx ${TEXT}`);
  }

  // Banda: "by Puleva" + tamaño
  const logo = getBrandLogo();
  if (logo) drawLogoBadge(ctx, logo, cx, H - bandH / 2, fw * 0.62, bandH * 0.62);
  else {
    ctx.fillStyle = isLight(c) ? NIGHT : '#FFFFFF';
    fitText(ctx, 'by Puleva', cx, H - bandH * 0.38, fw * 0.6, H * 0.06, `italic 500 SIZEpx ${DISPLAY}`, 0.02);
  }

  // Laterales: claim (izquierda) e información (derecha)
  const sideW = Math.min(fw * 0.85, (W - fw) / 2 - H * 0.12);
  if (sideW > H * 0.35) {
    const lx = left - H * 0.08 - sideW;
    ctx.textAlign = 'left';
    ctx.fillStyle = NIGHT;
    ctx.font = `700 ${Math.round(H * 0.04)}px ${TEXT}`;
    let ly = wrapText(ctx, p.ingredients, lx, H * 0.18, sideW, H * 0.048, 3) + H * 0.02;
    ctx.font = `400 ${Math.round(H * 0.034)}px ${TEXT}`;
    wrapText(ctx, p.claim, lx, ly, sideW, H * 0.044, 12);

    const rx = cx + fw / 2 + H * 0.08;
    ctx.font = `600 ${Math.round(H * 0.05)}px ${DISPLAY}`;
    ctx.fillStyle = shade(c, -0.22);
    ctx.fillText(p.size, rx, H * 0.24, sideW);
    ctx.fillStyle = NIGHT;
    ctx.font = `400 ${Math.round(H * 0.038)}px ${TEXT}`;
    const lines = [
      `Momento: ${p.moment.toLowerCase()}`,
      p.storage === 'Refrigerado' ? 'Conservar refrigerado' : 'Conservar a temperatura ambiente',
    ];
    if (p.usage) lines.push(p.usage);
    let y = H * 0.33;
    for (const l of lines) y = wrapText(ctx, l, rx, y, sideW, H * 0.05, 2) + H * 0.02;
  }
}

/* ---------- Logo oficial ---------- */

// Sello blanco con "by" + logo, para que el logo conserve sus colores sobre cualquier gama.
function drawLogoBadge(ctx, img, cx, cy, maxW, maxH) {
  const byW = maxH * 0.42;
  const ratio = img.naturalWidth / img.naturalHeight;
  let lh = maxH * 0.62;
  let lw = lh * ratio;
  if (lw + byW > maxW * 0.86) {
    lw = maxW * 0.86 - byW;
    lh = lw / ratio;
  }
  const pw = lw + byW + maxH * 0.5;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cx - pw / 2, cy - maxH / 2, pw, maxH, maxH / 2);
  ctx.fill();
  const x0 = cx - (lw + byW) / 2;
  ctx.fillStyle = NIGHT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 500 ${Math.round(maxH * 0.3)}px ${DISPLAY}`;
  ctx.fillText('by', x0, cy);
  ctx.drawImage(img, x0 + byW, cy - lh / 2, lw, lh);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
}

/* ---------- Iconos ---------- */

function drawIcon(ctx, type, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lw = s * 0.07;
  ctx.lineWidth = lw;
  ctx.strokeStyle = NIGHT;
  ctx.fillStyle = color;

  if (type === 'sunrise') {
    // Sol saliendo sobre el horizonte
    const r = s * 0.28;
    const base = s * 0.18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-s, -s, s * 2, s + base);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(0, base, r, Math.PI, 0);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i + 0.5) * (Math.PI / 5);
      ray(ctx, 0, base, a, r * 1.35, r * 1.75);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, base);
    ctx.lineTo(s * 0.5, base);
    ctx.stroke();
  } else if (type === 'sun') {
    const r = s * 0.24;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) ray(ctx, 0, 0, (i / 8) * Math.PI * 2, r * 1.4, r * 1.95);
  } else if (type === 'sunBone') {
    // Sol pequeño arriba a la derecha + hueso estilizado
    const r = s * 0.13;
    const sx = s * 0.26;
    const sy = -s * 0.24;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = lw * 0.8;
    for (let i = 0; i < 8; i++) ray(ctx, sx, sy, (i / 8) * Math.PI * 2, r * 1.45, r * 2);
    ctx.lineWidth = lw;
    drawBone(ctx, -s * 0.06, s * 0.1, s * 0.62, -Math.PI / 6);
  } else if (type === 'sunBonePlus') {
    // Sol de tarde (más bajo, a la izquierda) + hueso + "+" (creatina)
    const r = s * 0.12;
    const sx = -s * 0.28;
    const sy = -s * 0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = lw * 0.8;
    for (let i = 0; i < 8; i++) ray(ctx, sx, sy, (i / 8) * Math.PI * 2, r * 1.45, r * 2);
    ctx.lineWidth = lw;
    drawBone(ctx, s * 0.02, s * 0.14, s * 0.6, Math.PI / 6);
    ctx.lineWidth = lw * 1.1;
    ctx.strokeStyle = color;
    const px = s * 0.3;
    const py = -s * 0.24;
    const pr = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(px - pr, py);
    ctx.lineTo(px + pr, py);
    ctx.moveTo(px, py - pr);
    ctx.lineTo(px, py + pr);
    ctx.stroke();
  } else if (type === 'moon') {
    const r = s * 0.3;
    // Media luna: círculo lleno recortado por otro desplazado
    ctx.save();
    ctx.beginPath();
    ctx.rect(-s, -s, s * 2, s * 2);
    ctx.arc(r * 0.5, -r * 0.3, r * 0.82, 0, Math.PI * 2);
    ctx.clip('evenodd');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    star(ctx, s * 0.32, -s * 0.28, s * 0.07);
    star(ctx, s * 0.42, s * 0.05, s * 0.045);
  }
  ctx.restore();
}

function ray(ctx, x, y, a, r0, r1) {
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
  ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  ctx.stroke();
}

function drawBone(ctx, x, y, len, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = len * 0.14;
  const k = len * 0.11;
  const lw = ctx.lineWidth;
  // Silueta = rectángulo + 4 círculos; contorno pintando la silueta expandida debajo
  const shape = (pad) => {
    ctx.beginPath();
    ctx.rect(-len / 2 + k, -w / 2 - pad, len - 2 * k, w + pad * 2);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx * (len / 2 - k);
        const cy = sy * w * 0.55;
        ctx.moveTo(cx + k + pad, cy);
        ctx.arc(cx, cy, k + pad, 0, Math.PI * 2);
      }
    }
    ctx.fill('nonzero');
  };
  ctx.fillStyle = NIGHT;
  shape(lw / 2);
  ctx.fillStyle = '#FFFFFF';
  shape(-lw / 2);
  ctx.restore();
}

function star(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = NIGHT;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ---------- Utilidades de texto y color ---------- */

function fitText(ctx, text, x, y, maxW, size, fontTpl, tracking = 0) {
  let s = size;
  const set = () => {
    ctx.font = fontTpl.replace('SIZE', Math.round(s));
    ctx.letterSpacing = `${(tracking * s).toFixed(1)}px`;
  };
  set();
  while (ctx.measureText(text).width > maxW && s > 8) {
    s *= 0.94;
    set();
  }
  ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = w;
      if (++n >= maxLines) return y;
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isLight(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(Math.max(0, Math.min(255, v * (1 + amt)))));
  return `rgb(${r} ${g} ${b})`;
}
