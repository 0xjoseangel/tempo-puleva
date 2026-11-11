import '../styles/tokens.css';
import './fonts.css';
import './pitch.css';
import { gsap } from 'gsap';
import { hasWebGL } from '../three/renderer.js';
import { loadLabelFonts } from '../three/label.js';
import { loadBrandLogo } from '../brand.js';
import { createPitchStage } from './stage.js';

const root = document.documentElement;
const deck = document.getElementById('deck');
const slides = [...deck.querySelectorAll('.slide')];
const mainCount = slides.filter((s) => !s.hasAttribute('data-backup')).length;
const hud = deck.querySelector('.hud');
const notesPanel = document.getElementById('notes');
const blackout = document.getElementById('blackout');
const video = deck.querySelector('.ad');

// ---------- Escala del lienzo 1920 × 1080 ----------
let stage3d = null;
function fit() {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  root.style.setProperty('--scale', scale);
  stage3d?.setPixelRatio(Math.min(2, scale * devicePixelRatio));
}
addEventListener('resize', fit);
fit();

// ---------- Cielo: la presentación dura un día ----------
const SKY = [
  [5.5, '#0F1830', '#232A4D', '#5B3F6B'],
  [6.5, '#1E2747', '#7A4E6E', '#E9A27E'],
  [7.0, '#F6CFA9', '#FBE6CC', '#F6B26B'],
  [7.5, '#FCE7C8', '#F7F2EA', '#F6C77A'],
  [11, '#FFF3DC', '#F7F2EA', '#FFE2A0'],
  [16, '#FDEBD0', '#F7F2EA', '#FFD28A'],
  [19, '#F7D3B0', '#F7EBDD', '#F2A06A'],
  [20, '#E9A27E', '#F3D9C4', '#E4572E'],
  [21, '#3D348B', '#1B2A41', '#6A4C93'],
  [23, '#141F33', '#1B2A41', '#2B2F5C'],
  [24, '#0E1626', '#16223A', '#2B2F5C'],
];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(' ')})`;
const clamp = (x) => Math.max(0, Math.min(1, x));
const hours = (s) => { const [h, m] = s.split(':').map(Number); return h + m / 60; };
const isDark = (h) => h < 7 || h >= 21;

function paintSky(h) {
  let i = SKY.findIndex((k) => k[0] > h);
  if (i <= 0) i = i === 0 ? 1 : SKY.length - 1;
  const [h0, ...a] = SKY[i - 1];
  const [h1, ...b] = SKY[i];
  const t = clamp((h - h0) / (h1 - h0));
  root.style.setProperty('--sky-top', mix(a[0], b[0], t));
  root.style.setProperty('--sky-bottom', mix(a[1], b[1], t));
  root.style.setProperty('--glow', mix(a[2], b[2], t));
  const p = clamp((h - 6) / 15);
  root.style.setProperty('--sun-x', `${10 + 80 * p}%`);
  root.style.setProperty('--sun-y', `${88 - 70 * Math.sin(Math.PI * p)}%`);
  root.style.setProperty('--sun-o', h < 7 ? clamp((h - 6) / 1) : 1 - clamp((h - 20.2) / 0.8));
  root.style.setProperty('--moon-o', h < 7 ? clamp((7 - h) / 0.6) : clamp((h - 20.5) / 0.8));
  const mins = Math.round(h * 60) % (24 * 60);
  clockEl.textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

const stars = document.querySelector('.sky__stars');
for (let i = 0; i < 90; i++) {
  const s = document.createElement('i');
  s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 65}%;animation-delay:${-Math.random() * 3}s;scale:${0.6 + Math.random() * 1.2}`;
  stars.append(s);
}

const clockEl = document.getElementById('clock');
const momentEl = document.getElementById('moment');
const moment = (h) => (h < 7 ? 'Amanecer' : h < 12 ? 'Mañana' : h < 15 ? 'Mediodía' : h < 21 ? 'Tarde' : 'Noche');
const sky = { h: hours(slides[0].dataset.time) };

// ---------- HUD: un tramo por persona y momento del día ----------
const SECTIONS = ['impulso', 'fuerza', 'firme', 'pausa'];
const sectionOf = (s) => s.dataset.section || 'impulso';
const bar = document.getElementById('bar');
const segs = SECTIONS.map((id) => {
  const el = document.createElement('span');
  el.style.setProperty('--c', `var(--c-${id})`);
  el.style.setProperty('--n', slides.slice(0, mainCount).filter((s) => sectionOf(s) === id).length);
  bar.append(el);
  return el;
});

// ---------- Gráficos ----------
const fmt = (n, dec = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function buildRuler() {
  const el = document.getElementById('ruler');
  const max = 2.6;
  const x = (v) => `calc(380px + (100% - 380px) * ${v / max})`;
  const rows = [
    ['Suplementos', 'comprimidos y cápsulas', 0.07, 0.47, 'var(--c-night-soft)'],
    ['Lácteo funcional', 'Actimel, Danacol', 0.5, 0.75, 'var(--c-firme)'],
    ['Shots funcionales', 'jengibre, cúrcuma', 1.25, 2.0, 'var(--c-impulso)'],
    ['Proteína bebible', 'batidos y yogures', 1.59, 2.49, 'var(--c-fuerza)'],
    ['Tempo', 'de 1,29 a 2,29 €', 1.29, 2.29, ''],
  ];
  el.innerHTML =
    rows.map(([n, sub, a, b, c], i) => `
      <div class="ruler__row${n === 'Tempo' ? ' ruler__row--tempo' : ''}" style="top:${i * 90}px">
        <span class="ruler__name">${n}<small>${sub}</small></span>
        <i class="ruler__band" style="left:${x(a)};width:calc((100% - 380px) * ${(b - a) / max});--b:${c}"></i>
        ${n === 'Tempo' ? '' : `<span class="ruler__val" style="left:calc(${x(b)} + 16px)">${fmt(a, 2)}–${fmt(b, 2)} €</span>`}
      </div>`).join('') +
    '<div class="ruler__axis"></div>' +
    [0, 0.5, 1, 1.5, 2, 2.5].map((v) => `<span class="ruler__tick" style="left:${x(v)}">${fmt(v, 2)} €</span>`).join('');
}

function buildChart() {
  const el = document.getElementById('chart');
  const years = [
    { y: 'Año 1', rev: 1.12, ebitda: -2.3 },
    { y: 'Año 2', rev: 2.56, ebitda: -0.8 },
    { y: 'Año 3', rev: 4.97, ebitda: 0.42 },
  ];
  const top = 40, h = 520, lo = -2.6, hi = 5.4;
  const Y = (v) => top + ((hi - v) / (hi - lo)) * h;
  const bw = 120;
  const bars = years.map((d, i) => {
    const cx = 170 + i * 300;
    const bar = (v, x, color, cls) => {
      const y0 = Y(0), y1 = Y(v);
      const label = `${v > 0 && cls === 'ebitda' ? '+' : ''}${fmt(v, 2)}`;
      return `<rect class="bar" x="${x}" y="${Math.min(y0, y1)}" width="${bw}" height="${Math.abs(y1 - y0)}" rx="10" fill="${color}" data-y0="${y0}"/>
        <text class="val" x="${x + bw / 2}" y="${v >= 0 ? y1 - 16 : y1 + 40}" text-anchor="middle" font-size="30" font-weight="800">${label}</text>`;
    };
    return bar(d.rev, cx - bw - 6, 'var(--c-firme)', 'rev') +
      bar(d.ebitda, cx + 6, d.ebitda < 0 ? 'var(--c-fuerza)' : 'var(--c-activo)', 'ebitda') +
      `<text x="${cx}" y="${top + h + 60}" text-anchor="middle" font-size="30" font-weight="700" opacity="0.7">${d.y}</text>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 1000 640">
    <line x1="20" x2="980" y1="${Y(0)}" y2="${Y(0)}" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"/>
    ${bars}
    <g font-size="26" font-weight="600">
      <rect x="20" y="0" width="22" height="22" rx="6" fill="var(--c-firme)"/><text x="54" y="19">Facturación neta (M€)</text>
      <rect x="400" y="0" width="22" height="22" rx="6" fill="var(--c-fuerza)"/><text x="434" y="19">EBITDA (M€)</text>
    </g>
  </svg>`;
}

function buildDots() {
  const el = document.getElementById('dots');
  const mixCounts = { impulso: 5, fuerza: 4, firme: 3, activo: 6, pausa: 6 };
  el.innerHTML = Object.entries(mixCounts).flatMap(([id, n]) => Array(n).fill(`<i style="--c: var(--c-${id})"></i>`)).join('');
}

buildRuler();
buildChart();
buildDots();

// ---------- Animaciones de entrada ----------
function countUp(scope) {
  scope.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const dec = Number(el.dataset.dec || 0);
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v, dec)) });
  });
}

function animateCharts(scope) {
  scope.querySelectorAll('.ruler__band').forEach((b, i) =>
    gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 0.9, delay: 0.4 + i * 0.15, ease: 'power3.out' }));
  scope.querySelectorAll('.ruler__val').forEach((b, i) =>
    gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.9 + i * 0.15 }));
  scope.querySelectorAll('.chart .bar').forEach((b, i) =>
    gsap.fromTo(b, { attr: { y: b.dataset.y0, height: 0 } }, { attr: { y: b.getAttribute('y'), height: b.getAttribute('height') }, duration: 0.9, delay: 0.3 + i * 0.12, ease: 'power3.out' }));
  scope.querySelectorAll('.chart .val').forEach((b, i) =>
    gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.9 + i * 0.12 }));
  scope.querySelectorAll('.stores__col i').forEach((b, i) =>
    gsap.fromTo(b, { scaleY: 0 }, { scaleY: 1, duration: 1, delay: 0.4 + i * 0.18, ease: 'power3.out' }));
}

function enterAnim(slide) {
  const ins = slide.querySelectorAll('.in');
  gsap.fromTo(ins, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.25, stagger: 0.12, ease: 'power3.out', overwrite: true });
  ins.forEach((el) => el.closest('.step') || countUp(el));
  animateCharts(slide);
  if (slide.classList.contains('slide--range')) {
    gsap.fromTo(slide.querySelectorAll('[data-follow]'), { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.2, stagger: 0.1 });
  }
}

// ---------- Acciones de los pasos ----------
const pills = [...document.querySelectorAll('.pills span')];
pills.forEach((p, i) => gsap.to(p, { y: '+=26', rotation: `+=${i % 2 ? 4 : -4}`, duration: 2.4 + (i % 4) * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));

const mixSteps = [...document.querySelectorAll('.steps-row li')];
const actions = {
  calm(instant) {
    gsap.killTweensOf(pills, 'opacity,scale,filter');
    gsap.to(pills, { opacity: 0, scale: 0.6, filter: 'blur(12px)', duration: instant ? 0 : 0.9, stagger: instant ? 0 : 0.04, ease: 'power2.in' });
  },
  uncalm() {
    gsap.killTweensOf(pills, 'opacity,scale,filter');
    gsap.to(pills, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6 });
  },
  powder(instant) {
    mixSteps[0].classList.add('is-on');
    if (instant) { mixSteps.forEach((s) => s.classList.add('is-on')); return; }
    stage3d?.powder('activo');
    [1.9, 2.7].forEach((t, i) => gsap.delayedCall(t, () => {
      if (slides[index].classList.contains('slide--mix')) {
        gsap.to(mixSteps[i + 1], { opacity: 1, y: 0, duration: 0.4 });
        mixSteps[i + 1].classList.add('is-on');
      }
    }));
  },
  unpowder() {
    mixSteps.forEach((s) => s.classList.remove('is-on'));
    gsap.set(mixSteps.slice(1), { opacity: 0 });
    stage3d?.resetPowder('activo');
  },
  dots(instant) {
    gsap.fromTo('#dots i', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: instant ? 0 : 0.4, stagger: instant ? 0 : 0.04, ease: 'back.out(2)' });
  },
};

// ---------- Navegación ----------
let index = -1;
let step = 0;
const stepsOf = (s) => [...s.querySelectorAll('.step')];

function showStep(el, instant = false) {
  gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: instant ? 0 : 0.7, ease: 'power3.out' });
  if (!instant) countUp(el);
  const a = el.dataset.action;
  if (a) actions[a](instant);
}

function hideStep(el) {
  gsap.to(el, { opacity: 0, y: 30, duration: 0.35 });
  const a = el.dataset.action;
  if (a) actions[`un${a}`]?.();
}

function go(i, { atEnd = false, instant = false } = {}) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  const prev = slides[index];
  const slide = slides[i];
  if (prev && prev !== slide) {
    prev.classList.remove('is-active');
    if (prev.contains(video)) video.pause();
    stepsOf(prev).forEach((el) => {
      const a = el.dataset.action;
      if (a && a !== 'powder') actions[`un${a}`]?.();
    });
  }
  index = i;
  slide.classList.add('is-active');

  const steps = stepsOf(slide);
  if (steps.length) gsap.set(steps, { opacity: 0 });
  if (slide.classList.contains('slide--mix')) actions.unpowder();
  if (slide.classList.contains('slide--hook')) actions.uncalm();
  step = atEnd ? steps.length : 0;
  steps.slice(0, step).forEach((el) => showStep(el, true));
  enterAnim(slide);

  // Hora, cielo y modo oscuro
  const h = hours(slide.dataset.time);
  document.body.classList.toggle('dark', isDark(h));
  gsap.to(sky, { h, duration: instant ? 0 : 1.6, ease: 'power2.inOut', overwrite: true, onUpdate: () => paintSky(sky.h) });
  paintSky(sky.h);
  momentEl.textContent = `· ${moment(h)}`;

  // HUD
  const sec = sectionOf(slide);
  root.style.setProperty('--accent', `var(--c-${sec})`);
  const backup = slide.hasAttribute('data-backup');
  SECTIONS.forEach((id, k) => {
    const inSec = slides.slice(0, mainCount).filter((s) => sectionOf(s) === id);
    const pos = inSec.indexOf(slide);
    const done = backup || SECTIONS.indexOf(sec) > k ? 1 : pos >= 0 ? (pos + 1) / inSec.length : 0;
    segs[k].style.setProperty('--p', done);
  });
  document.getElementById('page').textContent = backup ? 'Reserva' : `${String(i + 1).padStart(2, '0')} / ${mainCount}`;
  hud.classList.toggle('is-hidden', slide.classList.contains('slide--ad'));

  if (slide.contains(video)) {
    video.currentTime = 0;
    video.play().catch(() => {});
  }

  stage3d?.setScene(slide.dataset.scene || 'hidden', { instant });
  history.replaceState(null, '', `#${i + 1}`);
  updateNotes();
}

function next() {
  const steps = stepsOf(slides[index]);
  if (step < steps.length) showStep(steps[step++]);
  else if (index < slides.length - 1) go(index + 1);
}

function prev() {
  const steps = stepsOf(slides[index]);
  if (step > 0) hideStep(steps[--step]);
  else if (index > 0) go(index - 1, { atEnd: true });
}

// ---------- Notas del presentador y cronómetro ----------
let t0 = 0;
const timerEl = document.getElementById('timer');
setInterval(() => {
  if (!t0) return;
  const s = Math.floor((Date.now() - t0) / 1000);
  timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}, 500);
function updateNotes() {
  const n = slides[index].querySelector('.notes');
  document.getElementById('notes-text').textContent = n ? n.textContent.trim().replace(/\s+/g, ' ') : '';
  document.getElementById('target').textContent = `Diapositiva ${index + 1} · ${slides[index].dataset.time}`;
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { t0 ||= Date.now(); next(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) prev();
  else if (k === 'Home') go(0);
  else if (k === 'End') go(mainCount - 1);
  else if (k === 'r' || k === 'R') go(mainCount);
  else if (k === 'f' || k === 'F') document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen();
  else if (k === 'n' || k === 'N') notesPanel.hidden = !notesPanel.hidden;
  else if (k === 'b' || k === 'B' || k === '.') blackout.hidden = !blackout.hidden;
  else if (k === 't' || k === 'T') { t0 = Date.now(); timerEl.textContent = '00:00'; }
  else return;
  e.preventDefault();
});
deck.addEventListener('click', (e) => {
  if (e.target.closest('video')) return;
  (e.clientX < innerWidth * 0.25 ? prev : next)();
});

// ---------- 3D ----------
const startAt = Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1);
// ?pasos abre la diapositiva con todos sus pasos (útil para revisarla o capturarla)
const allSteps = new URLSearchParams(location.search).has('pasos');
if (allSteps) gsap.ticker.lagSmoothing(0);
go(startAt, { instant: true, atEnd: allSteps });
if (hasWebGL()) {
  // Si alguna fuente se atasca, la escena arranca igual a los 3 s
  await Promise.race([Promise.all([loadLabelFonts(), loadBrandLogo(), document.fonts.ready]), new Promise((r) => setTimeout(r, 3000))]);
  stage3d = createPitchStage(document.getElementById('stage3d'));
  if (import.meta.env.DEV) window.__pitch = stage3d;
  fit();
  stage3d.setScene(slides[index].dataset.scene || 'hidden', { instant: true });
  // Las etiquetas de la gama siguen a cada bote
  const tags = [...document.querySelectorAll('[data-follow]')];
  stage3d.onTick(() => {
    if (!slides[index]?.classList.contains('slide--range')) return;
    for (const tag of tags) {
      const p = stage3d.project(tag.dataset.follow);
      tag.style.setProperty('--fx', `${p.x}px`);
      tag.style.setProperty('--fy', `${p.y + 34}px`);
    }
  });
}
