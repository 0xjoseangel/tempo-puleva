import * as THREE from 'three';
import { coreRange, productById } from '../data/products.js';
import { createStage, fitCamera } from '../three/renderer.js';
import { createShot } from '../three/bottle.js';
import { enablePicking } from '../three/interaction.js';
import { openSheet } from '../ui/sheet.js';
import { gsap, reduced, float, animateSplit } from './fx.js';

// Hero: los 4 shots del pack caen con rebote y flotan; siguen al puntero.
export function initHero() {
  const section = document.querySelector('.hero');
  animateSplit(document.getElementById('hero-title'), { delay: 0.2, scroll: false });
  if (!reduced()) {
    gsap.from('.hero__eyebrow, .hero__lead, .hero__ctas, .hero__chips li', {
      y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.5,
    });
  }

  const container = document.getElementById('hero-stage');
  if (!container) return;
  const stage = createStage(container, {
    background: null,
    label: 'Los cuatro shots de Tempo: Impulso, Fuerza, Ritmo y Pausa',
  });
  stage.floor.material.opacity = 0.1;

  const rig = new THREE.Group();
  stage.scene.add(rig);
  const gap = 5;
  const shots = coreRange.map((id, i) => {
    const shot = createShot(productById[id], stage.renderer);
    const x = (i - 1.5) * gap;
    shot.position.set(x, 0, -Math.abs(x) * 0.28);
    shot.rotation.y = -x * 0.05;
    shot.userData.contact.visible = false; // flotan: basta la sombra real
    shot.userData.drop = { y: reduced() ? 0 : 22, phase: i * 1.3 };
    rig.add(shot);
    return shot;
  });
  const h = shots[0].userData.height;
  const target = new THREE.Vector3(0, h * 0.55, 0);
  stage.onResize((w, hh) => {
    const narrow = w / hh < 1;
    fitCamera(stage.camera, {
      width: gap * 4.2,
      height: h * (narrow ? 1.35 : 1.5),
      target,
      dir: new THREE.Vector3(0, 0.22, 1),
      padding: narrow ? 1.05 : 1.12,
    });
  });

  // Entrada: caen escalonados con rebote
  shots.forEach((s, i) => {
    gsap.to(s.userData.drop, { y: 0, duration: 1.3, ease: 'bounce.out', delay: 0.35 + i * 0.14 });
  });

  // Parallax con el puntero
  const pointer = { x: 0, y: 0 };
  section.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  stage.onTick((dt, t) => {
    shots.forEach((s) => {
      s.position.y = 0.6 + s.userData.drop.y + float(t, s.userData.drop.phase, 0.4);
      if (!reduced()) s.rotation.y += dt * 0.15;
    });
    if (!reduced()) {
      rig.rotation.y += (pointer.x * 0.28 - rig.rotation.y) * 0.05;
      rig.rotation.x += (pointer.y * 0.06 - rig.rotation.x) * 0.05;
    }
  });

  enablePicking(stage, shots, { onSelect: (p) => openSheet(p) });
}
