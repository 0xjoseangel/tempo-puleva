import * as THREE from 'three';
import { coreRange, productById } from '../data/products.js';
import { createStage, fitCamera } from '../three/renderer.js';
import { createShot } from '../three/bottle.js';
import { gsap, ScrollTrigger, reduced, float } from './fx.js';

// El ritmo del día: sección fijada; al hacer scroll el cielo pasa de amanecer
// a mediodía y a noche, el sol/luna recorre su arco y cambia el shot.
const SKY = [
  { at: 0, sky: '#FCE1BC', ink: '#1B2A41', orb: '#F2A33A' }, // amanecer
  { at: 0.3, sky: '#FFF1D6', ink: '#1B2A41', orb: '#FFC94D' }, // mañana
  { at: 0.55, sky: '#D6E9F5', ink: '#1B2A41', orb: '#FFD866' }, // mediodía
  { at: 0.72, sky: '#F3C6A5', ink: '#1B2A41', orb: '#E4572E' }, // atardecer
  { at: 0.88, sky: '#1B2A41', ink: '#FFFFFF', orb: '#E9E4FF' }, // noche
  { at: 1, sky: '#141F33', ink: '#FFFFFF', orb: '#E9E4FF' },
];

function skyAt(p) {
  let i = 0;
  while (i < SKY.length - 2 && p > SKY[i + 1].at) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const k = THREE.MathUtils.clamp((p - a.at) / (b.at - a.at), 0, 1);
  const mix = (x, y) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), k).getHexString();
  return { sky: mix(a.sky, b.sky), orb: mix(a.orb, b.orb), ink: k < 0.5 ? a.ink : b.ink };
}

export function initRhythm() {
  const pin = document.querySelector('.rhythm__pin');
  const stepsEl = pin.querySelector('.rhythm__steps');
  const dotsEl = pin.querySelector('.rhythm__dots');
  const orb = pin.querySelector('.rhythm__orb');
  const ids = coreRange;

  stepsEl.innerHTML = ids
    .map((id, i) => {
      const p = productById[id];
      return `<article class="rhythm__step" aria-hidden="${i ? 'true' : 'false'}" style="--c: var(--c-${id})">
        <p class="rhythm__moment">${p.moment}</p>
        <h3 class="rhythm__name">${p.range}</h3>
        <p class="rhythm__benefit">${p.benefit}</p>
        <p class="rhythm__claim">${p.claim}</p>
      </article>`;
    })
    .join('');
  dotsEl.innerHTML = ids.map(() => '<li></li>').join('');
  const steps = [...stepsEl.children];
  const dots = [...dotsEl.children];

  // 3D: un shot por momento, todos en el mismo sitio; se intercambian
  const container = document.getElementById('rhythm-stage');
  let shots = [];
  let stage = null;
  if (container) {
    stage = createStage(container, { background: null, label: 'Shot Tempo del momento del día' });
    stage.floor.material.opacity = 0.12;
    shots = ids.map((id, i) => {
      const s = createShot(productById[id], stage.renderer);
      s.visible = i === 0;
      s.userData.swap = { t: i === 0 ? 1 : 0 };
      stage.scene.add(s);
      return s;
    });
    const h = shots[0].userData.height;
    stage.onResize((w, hh) =>
      fitCamera(stage.camera, {
        width: 9,
        height: h * 1.4,
        target: new THREE.Vector3(0, h * 0.5, 0),
        dir: new THREE.Vector3(0, 0.2, 1),
        padding: w / hh < 1 ? 1.2 : 1.55,
      }),
    );
    stage.onTick((dt, t) => {
      for (const s of shots) {
        if (!s.visible) continue;
        const k = s.userData.swap.t;
        s.scale.setScalar(0.6 + 0.4 * k);
        s.position.y = (1 - k) * -3 + float(t, 0, 0.25) + 0.3;
        s.rotation.y += dt * (reduced() ? 0 : 0.35) ;
      }
    });
  }

  let current = -1;
  function setStep(i) {
    if (i === current) return;
    const prev = current;
    current = i;
    steps.forEach((el, j) => el.setAttribute('aria-hidden', String(j !== i)));
    dots.forEach((el, j) => el.classList.toggle('is-active', j === i));
    if (!reduced()) {
      gsap.fromTo(steps[i].children, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06, overwrite: true });
    }
    shots.forEach((s, j) => {
      const on = j === i;
      gsap.killTweensOf(s.userData.swap);
      if (on) {
        s.visible = true;
        s.rotation.y = -0.6;
        gsap.to(s.userData.swap, { t: 1, duration: reduced() ? 0 : 0.7, ease: 'back.out(1.8)' });
      } else if (j === prev) {
        gsap.to(s.userData.swap, { t: 0, duration: reduced() ? 0 : 0.35, ease: 'power2.in', onComplete: () => (s.visible = false) });
      } else s.visible = false;
    });
  }

  function paint(p) {
    const c = skyAt(p);
    pin.style.setProperty('--sky', c.sky);
    pin.style.setProperty('--ink', c.ink);
    pin.style.setProperty('--orb', c.orb);
    // Arco del sol: sale por la izquierda, culmina arriba, se pone por la derecha
    const x = 42 + p * 52;
    const y = 78 - Math.sin(Math.PI * Math.min(p / 0.85, 1)) * 62;
    orb.style.left = `${x}%`;
    orb.style.top = `${p > 0.85 ? 20 : y}%`;
    // De noche el orbe se convierte en luna (sombra que la recorta)
    const moon = THREE.MathUtils.clamp((p - 0.82) / 0.1, 0, 1);
    orb.style.boxShadow = moon
      ? `inset ${-moon * 28}px ${-moon * 6}px 0 0 ${c.sky}, 0 0 60px 10px rgb(233 228 255 / ${0.25 * moon})`
      : '';
    setStep(Math.min(ids.length - 1, Math.floor(p * ids.length)));
  }

  paint(0);
  ScrollTrigger.create({
    trigger: pin,
    start: 'top top',
    end: () => `+=${window.innerHeight * 3}`,
    pin: true,
    scrub: reduced() ? true : 0.6,
    onUpdate: (st) => paint(st.progress),
  });
}
